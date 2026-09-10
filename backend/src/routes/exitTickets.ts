import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
// import { authenticate } from '../middleware/auth'; // <-- adjust to your actual auth middleware

const router = Router();

/** Confirms a professor is assigned to the subject that owns a given module. */
async function professorOwnsModule(professorId: string, moduleId: string): Promise<boolean> {
  const { data: moduleRow, error: moduleErr } = await supabase
    .from('modules')
    .select('subject_id')
    .eq('id', moduleId)
    .single();

  if (moduleErr || !moduleRow) return false;

  const { data, error } = await supabase
    .from('professor_subjects')
    .select('id')
    .eq('professor_id', professorId)
    .eq('subject_id', moduleRow.subject_id)
    .eq('is_active', true)
    .maybeSingle();

  return !error && !!data;
}

/** Confirms a student is enrolled in the subject that owns a given module. */
async function studentEnrolledInModule(studentId: string, moduleId: string): Promise<boolean> {
  const { data: moduleRow, error: moduleErr } = await supabase
    .from('modules')
    .select('subject_id')
    .eq('id', moduleId)
    .single();

  if (moduleErr || !moduleRow) return false;

  const { data, error } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', studentId)
    .eq('subject_id', moduleRow.subject_id)
    .eq('status', 'active') // adjust if your enrollments.status values differ
    .maybeSingle();

  return !error && !!data;
}

// =============================================================================
// ADMIN — Template CRUD (module_exit_tickets + exit_ticket_questions)
// =============================================================================

/**
 * GET /exit-tickets
 * List all templates with their question count. Admin management view.
 */
router.get('/', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('module_exit_tickets')
    .select('*, exit_ticket_questions(count)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * GET /exit-tickets/:id
 * Full template detail: metadata + ordered questions. Used by admin (edit view)
 * and indirectly reused by the student "fill" flow below.
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: ticket, error: ticketErr } = await supabase
    .from('module_exit_tickets')
    .select('*')
    .eq('id', id)
    .single();

  if (ticketErr || !ticket) return res.status(404).json({ error: 'Exit ticket not found' });

  const { data: questions, error: qErr } = await supabase
    .from('exit_ticket_questions')
    .select('*')
    .eq('exit_ticket_id', id)
    .order('question_order', { ascending: true });

  if (qErr) return res.status(500).json({ error: qErr.message });

  res.json({ ...ticket, questions });
});

/**
 * POST /exit-tickets
 * Create a new template, optionally with its questions in the same call.
 * Body: { title, description?, is_active?, available_from?, due_at?, questions?: [...] }
 */
router.post('/', async (req: Request, res: Response) => {
  const { title, description, is_active, available_from, due_at, questions } = req.body;

  if (!title) return res.status(400).json({ error: 'title is required' });

  const { data, error: ticketErr } = await supabase
    .from('module_exit_tickets')
    .insert({
      title,
      description: description ?? null,
      is_active: is_active ?? true,
      available_from: available_from ?? null,
      due_at: due_at ?? null,
    })
    .select();

  if (ticketErr || !data || data.length === 0) {
    return res.status(500).json({ error: ticketErr?.message || 'Error creating exit ticket' });
  }

  const ticket = data[0];

  if (Array.isArray(questions) && questions.length > 0) {
    const rows = questions.map((q: any, idx: number) => ({
      exit_ticket_id: ticket.id,
      question_order: q.question_order ?? idx,
      type: q.type,
      title: q.title,
      description: q.description ?? null,
      config: q.config ?? null,
      required: q.required ?? true,
    }));

    const { error: qErr } = await supabase.from('exit_ticket_questions').insert(rows);
    if (qErr) return res.status(500).json({ error: qErr.message });
  }

  res.status(201).json(ticket);
});

/**
 * PUT /exit-tickets/:id
 * Update template metadata only. Question management is handled by the
 * dedicated /:id/questions routes below.
 */
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, is_active, available_from, due_at } = req.body;

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (available_from !== undefined) updateData.available_from = available_from;
  if (due_at !== undefined) updateData.due_at = due_at;

  const { data, error } = await supabase
    .from('module_exit_tickets')
    .update(updateData)
    .eq('id', id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data && data.length > 0 ? data[0] : { id });
});

/**
 * DELETE /exit-tickets/:id
 * Deletes a template and everything hanging off it: answers, responses,
 * questions, and module attachments. Sequential deletes — if you have FK
 * cascades set up in Postgres already, most of this can be trimmed down to
 * just the final delete.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: responses } = await supabase
    .from('student_exit_ticket_responses')
    .select('id')
    .eq('exit_ticket_id', id);

  const responseIds = (responses ?? []).map((r) => r.id);

  if (responseIds.length > 0) {
    await supabase.from('student_exit_ticket_answers').delete().in('response_id', responseIds);
    await supabase.from('student_exit_ticket_responses').delete().in('id', responseIds);
  }

  await supabase.from('exit_ticket_questions').delete().eq('exit_ticket_id', id);
  await supabase.from('module_exit_ticket_attachments').delete().eq('exit_ticket_id', id);

  const { error } = await supabase.from('module_exit_tickets').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  res.status(204).send();
});

// =============================================================================
// ADMIN — Question CRUD
// =============================================================================

/**
 * POST /exit-tickets/:id/questions
 * Add a single question to an existing template.
 */
router.post('/:id/questions', async (req: Request, res: Response) => {
  const { id } = req.params; // exit_ticket_id
  const { question_order, type, title, description, config, required } = req.body;

  if (!type || !title) return res.status(400).json({ error: 'type and title are required' });

  const { data, error } = await supabase
    .from('exit_ticket_questions')
    .insert({
      exit_ticket_id: id,
      question_order: question_order ?? 0,
      type,
      title,
      description: description ?? null,
      config: config ?? {},
      required: required ?? true,
    })
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data && data.length > 0 ? data[0] : data);
});

/**
 * PUT /exit-tickets/questions/:questionId
 * Update a single question (label, config, order, required, etc.)
 */
router.put('/questions/:questionId', async (req: Request, res: Response) => {
  const { questionId } = req.params;
  const { question_order, type, title, description, config, required } = req.body;

  const updateData: any = {};
  if (question_order !== undefined) updateData.question_order = question_order;
  if (type !== undefined) updateData.type = type;
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (config !== undefined) updateData.config = config;
  if (required !== undefined) updateData.required = required;

  const { data, error } = await supabase
    .from('exit_ticket_questions')
    .update(updateData)
    .eq('id', questionId)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data && data.length > 0 ? data[0] : { id: questionId });
});

/**
 * DELETE /exit-tickets/questions/:questionId
 */
router.delete('/questions/:questionId', async (req: Request, res: Response) => {
  const { questionId } = req.params;

  // Clean up any answers already given to this question first.
  await supabase.from('student_exit_ticket_answers').delete().eq('question_id', questionId);

  const { error } = await supabase.from('exit_ticket_questions').delete().eq('id', questionId);
  if (error) return res.status(500).json({ error: error.message });

  res.status(204).send();
});

/**
 * PUT /exit-tickets/:id/questions/bulk
 * Atomically replace ALL questions for a template.
 * Deletes every existing question first (cascading any answers), then
 * inserts the supplied array in order. This avoids unique-constraint
 * collisions on (exit_ticket_id, question_order) that arise when doing
 * sequential per-row updates/inserts.
 *
 * Body: { questions: Array<{ type, title, description?, config?, required? }> }
 */
router.put('/:id/questions/bulk', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { questions } = req.body as {
    questions: Array<{
      type: string;
      title: string;
      description?: string;
      config?: Record<string, any>;
      required?: boolean;
    }>;
  };

  if (!Array.isArray(questions)) {
    return res.status(400).json({ error: '`questions` must be an array' });
  }

  // 1. Find all existing question IDs so we can clean up answers first.
  const { data: existingQuestions } = await supabase
    .from('exit_ticket_questions')
    .select('id')
    .eq('exit_ticket_id', id);

  const existingIds = (existingQuestions ?? []).map((q: any) => q.id);

  if (existingIds.length > 0) {
    await supabase
      .from('student_exit_ticket_answers')
      .delete()
      .in('question_id', existingIds);
  }

  // 2. Delete all existing questions for this ticket.
  const { error: deleteErr } = await supabase
    .from('exit_ticket_questions')
    .delete()
    .eq('exit_ticket_id', id);

  if (deleteErr) return res.status(500).json({ error: deleteErr.message });

  // 3. Re-insert if there are any questions.
  if (questions.length === 0) {
    return res.json([]);
  }

  const rows = questions.map((q, idx) => ({
    exit_ticket_id: id,
    question_order: idx,
    type: q.type,
    title: q.title,
    description: q.description ?? null,
    config: q.config ?? {},
    required: q.required ?? true,
  }));

  const { data: inserted, error: insertErr } = await supabase
    .from('exit_ticket_questions')
    .insert(rows)
    .select();

  if (insertErr) return res.status(500).json({ error: insertErr.message });

  res.json(inserted ?? []);
});

// =============================================================================
// ADMIN — Attach / Detach templates to a module
// (mounted here under /exit-tickets/modules/:moduleId — see note at bottom
//  about mounting, or move these two routes into modules.ts if you'd rather
//  keep module-scoped concerns together there)
// =============================================================================

/**
 * GET /exit-tickets/modules/:moduleId
 * List templates currently attached to a module.
 * - admin/teacher: all attached templates regardless of is_active/dates
 * - student: only active templates within their available window, plus
 *   whether the student has already submitted a response
 */
router.get('/modules/:moduleId', async (req: Request, res: Response) => {
  const { moduleId } = req.params;
  const user = (req as any).user;

  const { data: attachments, error } = await supabase
    .from('module_exit_ticket_attachments')
    .select('exit_ticket_id, created_at, module_exit_tickets(*)')
    .eq('module_id', moduleId);

  if (error) return res.status(500).json({ error: error.message });

  let tickets = (attachments ?? []).map((a: any) => a.module_exit_tickets).filter(Boolean);

  if (false) {
    const enrolled = await studentEnrolledInModule(user.id, moduleId);
    if (!enrolled) return res.status(403).json({ error: 'Not enrolled in this module' });

    const now = new Date();
    tickets = tickets.filter((t: any) => {
      if (!t.is_active) return false;
      if (t.available_from && new Date(t.available_from) > now) return false;
      return true;
    });

    // Attach submission status per ticket for this student.
    const ticketIds = tickets.map((t: any) => t.id);
    if (ticketIds.length > 0) {
      const { data: responses } = await supabase
        .from('student_exit_ticket_responses')
        .select('exit_ticket_id, status, submitted_at')
        .eq('student_id', user.id)
        .in('exit_ticket_id', ticketIds);

      const byTicket = new Map((responses ?? []).map((r) => [r.exit_ticket_id, r]));
      tickets = tickets.map((t: any) => ({ ...t, my_response: byTicket.get(t.id) ?? null }));
    }
  }

  res.json(tickets);
});

/**
 * POST /exit-tickets/modules/:moduleId
 * Attach one or more templates to a module.
 * Body: { exit_ticket_ids: string[] }
 */
router.post('/modules/:moduleId', async (req: Request, res: Response) => {
  const { moduleId } = req.params;
  const { exit_ticket_ids } = req.body;

  if (!Array.isArray(exit_ticket_ids) || exit_ticket_ids.length === 0) {
    return res.status(400).json({ error: 'exit_ticket_ids must be a non-empty array' });
  }

  // Check existing attachments to avoid duplicate insertions without relying on DB constraint names
  const { data: existing } = await supabase
    .from('module_exit_ticket_attachments')
    .select('exit_ticket_id')
    .eq('module_id', moduleId);

  const existingTicketIds = new Set((existing ?? []).map((e: any) => e.exit_ticket_id));
  const newRows = exit_ticket_ids
    .filter((id: string) => !existingTicketIds.has(id))
    .map((exitTicketId: string) => ({
      module_id: moduleId,
      exit_ticket_id: exitTicketId,
    }));

  if (newRows.length === 0) {
    return res.status(200).json([]);
  }

  const { data, error } = await supabase
    .from('module_exit_ticket_attachments')
    .insert(newRows)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

/**
 * DELETE /exit-tickets/modules/:moduleId/:exitTicketId
 * Detach a single template from a module. Does NOT delete the template or
 * any responses already collected — it only removes the module link.
 */
router.delete('/modules/:moduleId/:exitTicketId', async (req: Request, res: Response) => {
  const { moduleId, exitTicketId } = req.params;

  const { error } = await supabase
    .from('module_exit_ticket_attachments')
    .delete()
    .eq('module_id', moduleId)
    .eq('exit_ticket_id', exitTicketId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// =============================================================================
// STUDENT — Fill and submit a response
// =============================================================================

/**
 * GET /exit-tickets/:id/my-response?module_id=...
 * A student can now have a separate response per module the ticket is
 * attached to, so module_id disambiguates which one to return.
 */
router.get('/:id/my-response', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { module_id } = req.query;
  const user = (req as any).user;

  if (!module_id) {
    return res.status(400).json({ error: 'module_id query param is required' });
  }

  const { data: response, error } = await supabase
    .from('student_exit_ticket_responses')
    .select('*, student_exit_ticket_answers(*)')
    .eq('exit_ticket_id', id)
    .eq('student_id', user.id)
    .eq('module_id', module_id as string)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  res.json(response ?? null);
});

/**
 * POST /exit-tickets/:id/responses
 * Body: { module_id, answers: [{ question_id, answer }] }
 */
router.post('/:id/responses', async (req: Request, res: Response) => {
  const { id } = req.params; // exit_ticket_id
  const user = (req as any).user;
  const { module_id, answers } = req.body;

  if (!module_id) {
    return res.status(400).json({ error: 'module_id is required' });
  }
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'answers must be a non-empty array' });
  }

  // 1. Confirm this ticket is actually attached to that module.
  const { data: attachment } = await supabase
    .from('module_exit_ticket_attachments')
    .select('id')
    .eq('module_id', module_id)
    .eq('exit_ticket_id', id)
    .maybeSingle();

  if (!attachment) {
    return res.status(400).json({ error: 'This exit ticket is not attached to that module' });
  }

  // 2. Confirm the student is enrolled in the subject that owns the module.
  const enrolled = await studentEnrolledInModule(user.id, module_id);
  if (!enrolled) {
    return res.status(403).json({ error: 'Not enrolled in this module' });
  }

  // 3. Prevent duplicate submissions for this specific module.
  const { data: existing } = await supabase
    .from('student_exit_ticket_responses')
    .select('id')
    .eq('exit_ticket_id', id)
    .eq('student_id', user.id)
    .eq('module_id', module_id)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: 'You have already submitted a response for this exit ticket in this module' });
  }

  const now = new Date().toISOString();

  // 4. Create the response as in_progress FIRST — inserting it as
  // 'submitted' directly trips the prevent_answer_edit_after_submit
  // trigger once the answers are inserted below.
  const { data: response, error: respErr } = await supabase
    .from('student_exit_ticket_responses')
    .insert({
      exit_ticket_id: id,
      student_id: user.id,
      module_id,
      status: 'in_progress',
      started_at: now,
    })
    .select()
    .single();

  if (respErr) return res.status(500).json({ error: respErr.message });

  // 5. Insert answers while still in_progress.
  const answerRows = answers.map((a: any) => ({
    response_id: response.id,
    question_id: a.question_id,
    answer: a.answer,
  }));

  const { error: ansErr } = await supabase.from('student_exit_ticket_answers').insert(answerRows);

  if (ansErr) {
    await supabase.from('student_exit_ticket_responses').delete().eq('id', response.id);
    return res.status(500).json({ error: ansErr.message });
  }

  // 6. Only now flip it to submitted.
  const { data: submitted, error: submitErr } = await supabase
    .from('student_exit_ticket_responses')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', response.id)
    .select()
    .single();

  if (submitErr) return res.status(500).json({ error: submitErr.message });

  res.status(201).json({ ...submitted, answers: answerRows });
});
// =============================================================================
// TEACHER — View responses from their subjects' modules
// =============================================================================

/**
 * GET /exit-tickets/modules/:moduleId/:exitTicketId/responses
 * All student responses to one exit ticket, scoped to a specific module,
 * restricted to teachers assigned to that module's subject.
 */
router.get(
  '/modules/:moduleId/:exitTicketId/responses',
  async (req: Request, res: Response) => {
    const { moduleId, exitTicketId } = req.params;
    const user = (req as any).user;

    if (user.role === 'teacher') {
      const owns = await professorOwnsModule(user.id, moduleId);
      if (!owns) return res.status(403).json({ error: 'Not assigned to this module' });
    }

    // Confirm the ticket is actually attached to this module.
    const { data: attachment } = await supabase
      .from('module_exit_ticket_attachments')
      .select('id')
      .eq('module_id', moduleId)
      .eq('exit_ticket_id', exitTicketId)
      .maybeSingle();

    if (!attachment) return res.status(404).json({ error: 'This exit ticket is not attached to that module' });

    const { data, error } = await supabase
      .from('student_exit_ticket_responses')
      .select(
        '*, users:student_id(id, full_name, email), student_exit_ticket_answers(*, exit_ticket_questions(title, type))'
      )
      .eq('exit_ticket_id', exitTicketId)
      .eq('module_id', moduleId)
      .order('submitted_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  }
);

/**
 * GET /exit-tickets/responses/:responseId
 * Single response detail (e.g. clicking into one student's submission).
 * Access control walks response -> exit ticket -> module -> subject.
 */
router.get('/responses/:responseId', async (req: Request, res: Response) => {
  const { responseId } = req.params;
  const user = (req as any).user;

  const { data: response, error } = await supabase
    .from('student_exit_ticket_responses')
    .select(
      '*, users:student_id(id, full_name, email), student_exit_ticket_answers(*, exit_ticket_questions(title, type, config))'
    )
    .eq('id', responseId)
    .single();

  if (error || !response) return res.status(404).json({ error: 'Response not found' });

  if (user.role === 'teacher') {
    const { data: moduleLink } = await supabase
      .from('module_exit_ticket_attachments')
      .select('module_id')
      .eq('exit_ticket_id', response.exit_ticket_id);

    const moduleIds = (moduleLink ?? []).map((m) => m.module_id);
    const ownershipChecks = await Promise.all(moduleIds.map((mId) => professorOwnsModule(user.id, mId)));

    if (!ownershipChecks.some(Boolean)) {
      return res.status(403).json({ error: 'Not authorized to view this response' });
    }
  }

  res.json(response);
});

export default router;