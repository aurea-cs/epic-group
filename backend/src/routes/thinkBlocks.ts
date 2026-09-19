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
// ADMIN — Block CRUD (think_blocks + think_block_prompts)
// No "attach to module" step exists here on purpose: a block is authored
// once against curriculum_module_id, and every `modules` row that shares
// that curriculum_module_id automatically shows it. Nothing to link/detach.
// =============================================================================

/**
 * GET /think-blocks
 * List all think blocks with their prompt count. Admin management view.
 * Optional ?curriculum_module_id= to filter to one canonical module.
 */
router.get('/', async (req: Request, res: Response) => {
  const { curriculum_module_id } = req.query;

  let query = supabase
    .from('think_blocks')
    .select('*, think_block_prompts(count)')
    .order('curriculum_module_id', { ascending: true })
    .order('order_index', { ascending: true });

  if (curriculum_module_id) {
    query = query.eq('curriculum_module_id', curriculum_module_id as string);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * GET /think-blocks/:id
 * Full block detail: metadata + ordered prompts.
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: block, error: blockErr } = await supabase
    .from('think_blocks')
    .select('*')
    .eq('id', id)
    .single();

  if (blockErr || !block) return res.status(404).json({ error: 'Think block not found' });

  const { data: prompts, error: pErr } = await supabase
    .from('think_block_prompts')
    .select('*')
    .eq('block_id', id)
    .order('prompt_order', { ascending: true });

  if (pErr) return res.status(500).json({ error: pErr.message });

  res.json({ ...block, prompts });
});

/**
 * POST /think-blocks
 * Create a new think block, optionally with its prompts in the same call.
 * Body: { curriculum_module_id, fun_fact_md, image_url?, order_index?, is_active?, prompts?: [...] }
 */
router.post('/', async (req: Request, res: Response) => {
  const { curriculum_module_id, fun_fact_md, image_url, order_index, is_active, prompts } = req.body;
  const user = (req as any).user;

  if (!curriculum_module_id) return res.status(400).json({ error: 'curriculum_module_id is required' });
  if (!fun_fact_md) return res.status(400).json({ error: 'fun_fact_md is required' });

  const { data, error: blockErr } = await supabase
    .from('think_blocks')
    .insert({
      curriculum_module_id,
      fun_fact_md,
      image_url: image_url ?? null,
      order_index: order_index ?? 0,
      is_active: is_active ?? true,
      created_by: user?.id ?? null,
    })
    .select();

  if (blockErr || !data || data.length === 0) {
    return res.status(500).json({ error: blockErr?.message || 'Error creating think block' });
  }

  const block = data[0];

  if (Array.isArray(prompts) && prompts.length > 0) {
    const rows = prompts.map((p: any, idx: number) => ({
      block_id: block.id,
      prompt_type: p.prompt_type ?? 'piensa',
      icon: p.icon ?? null,
      label: p.label ?? null,
      prompt_md: p.prompt_md,
      prompt_order: p.prompt_order ?? idx,
    }));

    const { error: pErr } = await supabase.from('think_block_prompts').insert(rows);
    if (pErr) return res.status(500).json({ error: pErr.message });
  }

  res.status(201).json(block);
});

/**
 * PUT /think-blocks/:id
 * Update block metadata only (fact text, image, order, active flag, or
 * which curriculum module it belongs to). Prompt management is handled by
 * the dedicated /:id/prompts routes below.
 */
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { fun_fact_md, image_url, order_index, is_active, curriculum_module_id } = req.body;

  const updateData: any = { updated_at: new Date().toISOString() };
  if (fun_fact_md !== undefined) updateData.fun_fact_md = fun_fact_md;
  if (image_url !== undefined) updateData.image_url = image_url;
  if (order_index !== undefined) updateData.order_index = order_index;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (curriculum_module_id !== undefined) updateData.curriculum_module_id = curriculum_module_id;

  const { data, error } = await supabase
    .from('think_blocks')
    .update(updateData)
    .eq('id', id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data && data.length > 0 ? data[0] : { id });
});

/**
 * DELETE /think-blocks/:id
 * Deletes a block and everything hanging off it: student answers and
 * prompts. Sequential deletes — trim down if you rely on the FK cascades
 * already set up in the migration.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: prompts } = await supabase
    .from('think_block_prompts')
    .select('id')
    .eq('block_id', id);

  const promptIds = (prompts ?? []).map((p: any) => p.id);

  if (promptIds.length > 0) {
    await supabase.from('student_think_block_answers').delete().in('prompt_id', promptIds);
  }

  await supabase.from('think_block_prompts').delete().eq('block_id', id);

  const { error } = await supabase.from('think_blocks').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  res.status(204).send();
});

// =============================================================================
// ADMIN — Prompt CRUD (the individual Piensa / Observa / Experimenta items)
// =============================================================================

/**
 * POST /think-blocks/:id/prompts
 * Add a single prompt to an existing block.
 */
router.post('/:id/prompts', async (req: Request, res: Response) => {
  const { id } = req.params; // block_id
  const { prompt_type, icon, label, prompt_md, prompt_order } = req.body;

  if (!prompt_md) return res.status(400).json({ error: 'prompt_md is required' });

  const { data, error } = await supabase
    .from('think_block_prompts')
    .insert({
      block_id: id,
      prompt_type: prompt_type ?? 'piensa',
      icon: icon ?? null,
      label: label ?? null,
      prompt_md,
      prompt_order: prompt_order ?? 0,
    })
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data && data.length > 0 ? data[0] : data);
});

/**
 * PUT /think-blocks/prompts/:promptId
 */
router.put('/prompts/:promptId', async (req: Request, res: Response) => {
  const { promptId } = req.params;
  const { prompt_type, icon, label, prompt_md, prompt_order } = req.body;

  const updateData: any = {};
  if (prompt_type !== undefined) updateData.prompt_type = prompt_type;
  if (icon !== undefined) updateData.icon = icon;
  if (label !== undefined) updateData.label = label;
  if (prompt_md !== undefined) updateData.prompt_md = prompt_md;
  if (prompt_order !== undefined) updateData.prompt_order = prompt_order;

  const { data, error } = await supabase
    .from('think_block_prompts')
    .update(updateData)
    .eq('id', promptId)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data && data.length > 0 ? data[0] : { id: promptId });
});

/**
 * DELETE /think-blocks/prompts/:promptId
 */
router.delete('/prompts/:promptId', async (req: Request, res: Response) => {
  const { promptId } = req.params;

  await supabase.from('student_think_block_answers').delete().eq('prompt_id', promptId);

  const { error } = await supabase.from('think_block_prompts').delete().eq('id', promptId);
  if (error) return res.status(500).json({ error: error.message });

  res.status(204).send();
});

/**
 * PUT /think-blocks/:id/prompts/bulk
 * Atomically replace ALL prompts for a block — same rationale as the quiz
 * bulk-replace route: avoids order collisions from sequential updates.
 * Body: { prompts: Array<{ prompt_type?, icon?, label?, prompt_md }> }
 */
router.put('/:id/prompts/bulk', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { prompts } = req.body as {
    prompts: Array<{ prompt_type?: string; icon?: string; label?: string; prompt_md: string }>;
  };

  if (!Array.isArray(prompts)) {
    return res.status(400).json({ error: '`prompts` must be an array' });
  }

  const { data: existingPrompts } = await supabase
    .from('think_block_prompts')
    .select('id')
    .eq('block_id', id);

  const existingIds = (existingPrompts ?? []).map((p: any) => p.id);

  if (existingIds.length > 0) {
    await supabase.from('student_think_block_answers').delete().in('prompt_id', existingIds);
  }

  const { error: deleteErr } = await supabase.from('think_block_prompts').delete().eq('block_id', id);
  if (deleteErr) return res.status(500).json({ error: deleteErr.message });

  if (prompts.length === 0) {
    return res.json([]);
  }

  const rows = prompts.map((p, idx) => ({
    block_id: id,
    prompt_type: p.prompt_type ?? 'piensa',
    icon: p.icon ?? null,
    label: p.label ?? null,
    prompt_md: p.prompt_md,
    prompt_order: idx,
  }));

  const { data: inserted, error: insertErr } = await supabase
    .from('think_block_prompts')
    .insert(rows)
    .select();

  if (insertErr) return res.status(500).json({ error: insertErr.message });

  res.json(inserted ?? []);
});

// =============================================================================
// STUDENT / TEACHER — View the stack of think blocks for a module
// =============================================================================

/**
 * GET /think-blocks/modules/:moduleId
 * List the think blocks that apply to a module, resolved through
 * modules.curriculum_module_id — there is no attach/detach step, a block
 * simply applies to every module sharing its curriculum_module_id.
 * - teacher: every block for that curriculum module, regardless of is_active
 * - student: only active blocks, each prompt annotated with their own saved answer
 */
router.get('/modules/:moduleId', async (req: Request, res: Response) => {
  const { moduleId } = req.params;
  const { student_id } = req.query;
  const user = (req as any).user;
  const studentId = (student_id as string) || (req.headers['x-user-id'] as string) || user?.id;

  const { data: moduleRow, error: modErr } = await supabase
    .from('modules')
    .select('id, curriculum_module_id')
    .eq('id', moduleId)
    .single();

  if (modErr || !moduleRow) return res.status(404).json({ error: 'Module not found' });
  if (!moduleRow.curriculum_module_id) return res.json([]);

  if (user?.role === 'teacher') {
    const owns = await professorOwnsModule(user.id, moduleId);
    if (!owns) return res.status(403).json({ error: 'Not assigned to this module' });
  }

  let query = supabase
    .from('think_blocks')
    .select('*, think_block_prompts(*)')
    .eq('curriculum_module_id', moduleRow.curriculum_module_id)
    .order('order_index', { ascending: true });

  if (user?.role === 'student') {
    query = query.eq('is_active', true);
  }

  const { data: blocks, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Sort embedded prompts by prompt_order (nested selects aren't ordered by Supabase).
  let rows = (blocks ?? []).map((b: any) => ({
    ...b,
    think_block_prompts: (b.think_block_prompts ?? []).sort(
      (a: any, c: any) => a.prompt_order - c.prompt_order
    ),
  }));

  const promptIds = rows.flatMap((b: any) => (b.think_block_prompts ?? []).map((p: any) => p.id));
  if (studentId && promptIds.length > 0) {
    const { data: answers } = await supabase
      .from('student_think_block_answers')
      .select('prompt_id, answer_md, updated_at')
      .eq('student_id', studentId)
      .in('prompt_id', promptIds);

    const byPrompt = new Map((answers ?? []).map((a: any) => [a.prompt_id, a]));
    rows = rows.map((b: any) => ({
      ...b,
      think_block_prompts: (b.think_block_prompts ?? []).map((p: any) => ({
        ...p,
        my_answer: byPrompt.get(p.id)?.answer_md ?? null,
      })),
    }));
  }

  res.json(rows);
});

// =============================================================================
// STUDENT — Save / update answers
// Ungraded free text — there's no formal "submit" step like quizzes have.
// Students can revisit a card and edit their answer any time, so every
// write here is an upsert on (prompt_id, student_id).
// =============================================================================

/**
 * PUT /think-blocks/prompts/:promptId/answer
 * Upserts a single answer. Body: { student_id, answer_md }
 */
router.put('/prompts/:promptId/answer', async (req: Request, res: Response) => {
  const { promptId } = req.params;
  const { answer_md, student_id } = req.body;
  const userId = student_id || (req as any).user?.id || (req.headers['x-user-id'] as string);

  if (!userId) return res.status(400).json({ error: 'student_id is required' });

  const { data, error } = await supabase
    .from('student_think_block_answers')
    .upsert(
      {
        prompt_id: promptId,
        student_id: userId,
        answer_md: answer_md ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'prompt_id,student_id' }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * PUT /think-blocks/:id/answers
 * Save several answers for one block in a single call — e.g. whatever the
 * student has filled in on the card before navigating away.
 * Body: { student_id, answers: [{ prompt_id, answer_md }] }
 */
router.put('/:id/answers', async (req: Request, res: Response) => {
  const { id } = req.params; // block_id, used to validate the prompts belong to it
  const { answers, student_id } = req.body;
  const userId = student_id || (req as any).user?.id || (req.headers['x-user-id'] as string);

  if (!userId) return res.status(400).json({ error: 'student_id is required' });
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'answers must be a non-empty array' });
  }

  const { data: prompts, error: pErr } = await supabase
    .from('think_block_prompts')
    .select('id')
    .eq('block_id', id);

  if (pErr) return res.status(500).json({ error: pErr.message });
  const validPromptIds = new Set((prompts ?? []).map((p: any) => p.id));

  const rows = answers
    .filter((a: any) => validPromptIds.has(a.prompt_id))
    .map((a: any) => ({
      prompt_id: a.prompt_id,
      student_id: userId,
      answer_md: a.answer_md ?? null,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return res.status(400).json({ error: 'None of the given prompt_ids belong to this block' });
  }

  const { data, error } = await supabase
    .from('student_think_block_answers')
    .upsert(rows, { onConflict: 'prompt_id,student_id' })
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * GET /think-blocks/:id/my-answers?student_id=...
 * A student's saved answers for every prompt in one block, to pre-fill
 * the form when they return to a card.
 */
router.get('/:id/my-answers', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { student_id } = req.query;
  const userId = (student_id as string) || (req as any).user?.id || (req.headers['x-user-id'] as string);

  if (!userId) return res.status(400).json({ error: 'student_id is required' });

  const { data: prompts, error: pErr } = await supabase
    .from('think_block_prompts')
    .select('id')
    .eq('block_id', id);

  if (pErr) return res.status(500).json({ error: pErr.message });
  const promptIds = (prompts ?? []).map((p: any) => p.id);
  if (promptIds.length === 0) return res.json([]);

  const { data, error } = await supabase
    .from('student_think_block_answers')
    .select('*')
    .eq('student_id', userId)
    .in('prompt_id', promptIds);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =============================================================================
// TEACHER — Read (never grade) their students' answers
// =============================================================================

/**
 * GET /think-blocks/modules/:moduleId/:blockId/answers
 * All student answers to one block, scoped to a specific module and
 * restricted to teachers assigned to that module's subject. Read-only —
 * there is no grading endpoint, since these are never scored.
 */
router.get('/modules/:moduleId/:blockId/answers', async (req: Request, res: Response) => {
  const { moduleId, blockId } = req.params;
  const user = (req as any).user;

  if (user?.role === 'teacher') {
    const owns = await professorOwnsModule(user.id, moduleId);
    if (!owns) return res.status(403).json({ error: 'Not assigned to this module' });
  }

  const { data: moduleRow, error: modErr } = await supabase
    .from('modules')
    .select('subject_id, curriculum_module_id')
    .eq('id', moduleId)
    .single();

  if (modErr || !moduleRow) return res.status(404).json({ error: 'Module not found' });

  const { data: block, error: blockErr } = await supabase
    .from('think_blocks')
    .select('id, curriculum_module_id')
    .eq('id', blockId)
    .maybeSingle();

  if (blockErr || !block || block.curriculum_module_id !== moduleRow.curriculum_module_id) {
    return res.status(404).json({ error: 'This think block does not apply to that module' });
  }

  // Only students actually enrolled in this module's subject.
  const { data: enrolledStudents } = await supabase
    .from('enrollments')
    .select('student_id')
    .eq('subject_id', moduleRow.subject_id)
    .eq('status', 'active');

  const studentIds = (enrolledStudents ?? []).map((e: any) => e.student_id);
  if (studentIds.length === 0) return res.json({ prompts: [], answers: [] });

  const { data: prompts, error: promptsErr } = await supabase
    .from('think_block_prompts')
    .select('id, prompt_md, prompt_type, prompt_order')
    .eq('block_id', blockId)
    .order('prompt_order', { ascending: true });

  if (promptsErr) return res.status(500).json({ error: promptsErr.message });

  const promptIds = (prompts ?? []).map((p: any) => p.id);
  if (promptIds.length === 0) return res.json({ prompts: [], answers: [] });

  const { data: answers, error } = await supabase
    .from('student_think_block_answers')
    .select('*, users:student_id(id, full_name, email)')
    .in('prompt_id', promptIds)
    .in('student_id', studentIds)
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ prompts, answers });
});

export default router;