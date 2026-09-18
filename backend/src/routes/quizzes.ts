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

/**
 * Grades a single answer against a question's config.
 * Only `multiple_choice` and `true_false` are auto-gradable; anything else
 * (e.g. `open`) comes back ungraded (null/null) for manual review later.
 */
function gradeAnswer(question: any, answerValue: any): { is_correct: boolean | null; points_awarded: number | null } {
  const config = question.config || {};
  const points = typeof config.points === 'number' ? config.points : 1;

  switch (question.type) {
    case 'multiple_choice': {
      const correct = config.correct_option_id;
      if (correct === undefined || correct === null) return { is_correct: null, points_awarded: null };
      const isCorrect = String(answerValue) === String(correct);
      return { is_correct: isCorrect, points_awarded: isCorrect ? points : 0 };
    }
    case 'true_false': {
      const correct = config.correct_answer;
      if (correct === undefined || correct === null) return { is_correct: null, points_awarded: null };
      const isCorrect = String(answerValue) === String(correct);
      return { is_correct: isCorrect, points_awarded: isCorrect ? points : 0 };
    }
    case 'checklist': {
      const correctIds: string[] = Array.isArray(config.correct_ids) ? config.correct_ids.map(String) : [];
      if (!correctIds.length) return { is_correct: null, points_awarded: null };
      let userSelected: string[] = [];
      try {
        if (Array.isArray(answerValue)) {
          userSelected = answerValue.map(String);
        } else if (typeof answerValue === 'string') {
          if (answerValue.startsWith('[')) {
            userSelected = JSON.parse(answerValue).map(String);
          } else if (answerValue.trim()) {
            userSelected = answerValue.split(',').map((s) => s.trim());
          }
        }
      } catch (e) {
        userSelected = [];
      }
      const sortedCorrect = [...correctIds].sort();
      const sortedUser = [...userSelected].sort();
      const isCorrect =
        sortedCorrect.length === sortedUser.length &&
        sortedCorrect.every((val, idx) => val === sortedUser[idx]);
      return { is_correct: isCorrect, points_awarded: isCorrect ? points : 0 };
    }
    case 'complete_sentence': {
      const correct = config.correct_option;
      if (!correct) return { is_correct: null, points_awarded: null };
      const isCorrect = String(answerValue).trim().toLowerCase() === String(correct).trim().toLowerCase();
      return { is_correct: isCorrect, points_awarded: isCorrect ? points : 0 };
    }
    case 'open':
    default:
      return { is_correct: null, points_awarded: null };
  }
}

// =============================================================================
// ADMIN — Template CRUD (quizzes + quiz_questions)
// =============================================================================

/**
 * GET /quizzes
 * List all quiz templates with question count. Admin management view.
 * Optional ?curriculum_module_id= to filter to quizzes tied to one canonical module.
 */
router.get('/', async (req: Request, res: Response) => {
  const { curriculum_module_id } = req.query;

  let query = supabase
    .from('quizzes')
    .select('*, quiz_questions(count)')
    .order('created_at', { ascending: false });

  if (curriculum_module_id) {
    query = query.eq('curriculum_module_id', curriculum_module_id as string);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * GET /quizzes/:id
 * Full template detail: metadata + ordered questions.
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: quiz, error: quizErr } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .single();

  if (quizErr || !quiz) return res.status(404).json({ error: 'Quiz not found' });

  const { data: questions, error: qErr } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', id)
    .order('question_order', { ascending: true });

  if (qErr) return res.status(500).json({ error: qErr.message });

  res.json({ ...quiz, questions });
});

/**
 * POST /quizzes
 * Create a new quiz template, optionally with its questions in the same call.
 * Body: { title, description?, is_active?, curriculum_module_id?, questions?: [...] }
 */
router.post('/', async (req: Request, res: Response) => {
  const { title, description, is_active, curriculum_module_id, questions } = req.body;
  const user = (req as any).user;

  if (!title) return res.status(400).json({ error: 'title is required' });

  const { data, error: quizErr } = await supabase
    .from('quizzes')
    .insert({
      title,
      description: description ?? null,
      is_active: is_active ?? true,
      curriculum_module_id: curriculum_module_id ?? null,
      created_by: user?.id ?? null,
    })
    .select();

  if (quizErr || !data || data.length === 0) {
    return res.status(500).json({ error: quizErr?.message || 'Error creating quiz' });
  }

  const quiz = data[0];

  if (Array.isArray(questions) && questions.length > 0) {
    const rows = questions.map((q: any, idx: number) => ({
      quiz_id: quiz.id,
      question_order: q.question_order ?? idx,
      type: q.type,
      title: q.title,
      config: q.config ?? {},
      required: q.required ?? true,
    }));

    const { error: qErr } = await supabase.from('quiz_questions').insert(rows);
    if (qErr) return res.status(500).json({ error: qErr.message });
  }

  res.status(201).json(quiz);
});

/**
 * PUT /quizzes/:id
 * Update quiz metadata only. Question management is handled by the
 * dedicated /:id/questions routes below.
 */
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, is_active, curriculum_module_id } = req.body;

  const updateData: any = { updated_at: new Date().toISOString() };
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (curriculum_module_id !== undefined) updateData.curriculum_module_id = curriculum_module_id;

  const { data, error } = await supabase
    .from('quizzes')
    .update(updateData)
    .eq('id', id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data && data.length > 0 ? data[0] : { id });
});

/**
 * DELETE /quizzes/:id
 * Deletes a template and everything hanging off it: answers, responses,
 * questions, and module attachments. Sequential deletes — if you have FK
 * cascades set up in Postgres already, most of this can be trimmed down to
 * just the final delete.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: responses } = await supabase
    .from('student_quiz_responses')
    .select('id, module_quiz_id')
    .in(
      'module_quiz_id',
      (
        await supabase.from('module_quizzes').select('id').eq('quiz_id', id)
      ).data?.map((mq: any) => mq.id) ?? []
    );

  const responseIds = (responses ?? []).map((r) => r.id);

  if (responseIds.length > 0) {
    await supabase.from('student_quiz_answers').delete().in('response_id', responseIds);
    await supabase.from('student_quiz_responses').delete().in('id', responseIds);
  }

  await supabase.from('quiz_questions').delete().eq('quiz_id', id);
  await supabase.from('module_quizzes').delete().eq('quiz_id', id);

  const { error } = await supabase.from('quizzes').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  res.status(204).send();
});

// =============================================================================
// ADMIN — Question CRUD
// =============================================================================

/**
 * POST /quizzes/:id/questions
 * Add a single question to an existing template.
 */
router.post('/:id/questions', async (req: Request, res: Response) => {
  const { id } = req.params; // quiz_id
  const { question_order, type, title, config, required } = req.body;

  if (!type || !title) return res.status(400).json({ error: 'type and title are required' });

  const { data, error } = await supabase
    .from('quiz_questions')
    .insert({
      quiz_id: id,
      question_order: question_order ?? 0,
      type,
      title,
      config: config ?? {},
      required: required ?? true,
    })
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data && data.length > 0 ? data[0] : data);
});

/**
 * PUT /quizzes/questions/:questionId
 * Update a single question (label, config, order, required, etc.)
 */
router.put('/questions/:questionId', async (req: Request, res: Response) => {
  const { questionId } = req.params;
  const { question_order, type, title, config, required } = req.body;

  const updateData: any = {};
  if (question_order !== undefined) updateData.question_order = question_order;
  if (type !== undefined) updateData.type = type;
  if (title !== undefined) updateData.title = title;
  if (config !== undefined) updateData.config = config;
  if (required !== undefined) updateData.required = required;

  const { data, error } = await supabase
    .from('quiz_questions')
    .update(updateData)
    .eq('id', questionId)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data && data.length > 0 ? data[0] : { id: questionId });
});

/**
 * DELETE /quizzes/questions/:questionId
 */
router.delete('/questions/:questionId', async (req: Request, res: Response) => {
  const { questionId } = req.params;

  // Clean up any answers already given to this question first.
  await supabase.from('student_quiz_answers').delete().eq('question_id', questionId);

  const { error } = await supabase.from('quiz_questions').delete().eq('id', questionId);
  if (error) return res.status(500).json({ error: error.message });

  res.status(204).send();
});

/**
 * PUT /quizzes/:id/questions/bulk
 * Atomically replace ALL questions for a template.
 * Deletes every existing question first (cascading any answers), then
 * inserts the supplied array in order. Avoids unique-constraint collisions
 * on (quiz_id, question_order) that arise from sequential per-row updates.
 *
 * Body: { questions: Array<{ type, title, config?, required? }> }
 */
router.put('/:id/questions/bulk', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { questions } = req.body as {
    questions: Array<{
      type: string;
      title: string;
      config?: Record<string, any>;
      required?: boolean;
    }>;
  };

  if (!Array.isArray(questions)) {
    return res.status(400).json({ error: '`questions` must be an array' });
  }

  const { data: existingQuestions } = await supabase
    .from('quiz_questions')
    .select('id')
    .eq('quiz_id', id);

  const existingIds = (existingQuestions ?? []).map((q: any) => q.id);

  if (existingIds.length > 0) {
    await supabase.from('student_quiz_answers').delete().in('question_id', existingIds);
  }

  const { error: deleteErr } = await supabase.from('quiz_questions').delete().eq('quiz_id', id);
  if (deleteErr) return res.status(500).json({ error: deleteErr.message });

  if (questions.length === 0) {
    return res.json([]);
  }

  const rows = questions.map((q, idx) => ({
    quiz_id: id,
    question_order: idx,
    type: q.type,
    title: q.title,
    config: q.config ?? {},
    required: q.required ?? true,
  }));

  const { data: inserted, error: insertErr } = await supabase
    .from('quiz_questions')
    .insert(rows)
    .select();

  if (insertErr) return res.status(500).json({ error: insertErr.message });

  res.json(inserted ?? []);
});

// =============================================================================
// ADMIN — Attach / Detach quizzes to a module
// =============================================================================

/**
 * GET /quizzes/modules/:moduleId
 * List quizzes currently attached to a module.
 * - admin/teacher: all attached quizzes regardless of is_active
 * - student: only active quizzes, plus whether they've already responded
 */
router.get('/modules/:moduleId', async (req: Request, res: Response) => {
  const { moduleId } = req.params;
  const user = (req as any).user;

  const { data: attachments, error } = await supabase
    .from('module_quizzes')
    .select('id, quiz_id, due_at, available_from, is_active, quizzes(*, quiz_questions(count))')
    .eq('module_id', moduleId);

  if (error) return res.status(500).json({ error: error.message });

  let rows = (attachments ?? []).filter((a: any) => a.quizzes);

  if (user?.role === 'student') {
    const enrolled = await studentEnrolledInModule(user.id, moduleId);
    if (!enrolled) return res.status(403).json({ error: 'Not enrolled in this module' });

    const now = new Date();
    rows = rows.filter((a: any) => {
      if (!a.is_active || !a.quizzes.is_active) return false;
      if (a.available_from && new Date(a.available_from) > now) return false;
      return true;
    });

    const moduleQuizIds = rows.map((a: any) => a.id);
    if (moduleQuizIds.length > 0) {
      const { data: responses } = await supabase
        .from('student_quiz_responses')
        .select('module_quiz_id, status, submitted_at, score, max_score')
        .eq('student_id', user.id)
        .in('module_quiz_id', moduleQuizIds);

      const byModuleQuiz = new Map((responses ?? []).map((r) => [r.module_quiz_id, r]));
      rows = rows.map((a: any) => ({ ...a, my_response: byModuleQuiz.get(a.id) ?? null }));
    }
  }

  res.json(rows);
});

/**
 * POST /quizzes/modules/:moduleId
 * Attach one or more quizzes to a module.
 * Body: { quiz_ids: string[], due_at?, available_from? }
 */
router.post('/modules/:moduleId', async (req: Request, res: Response) => {
  const { moduleId } = req.params;
  const { quiz_ids, due_at, available_from } = req.body;

  if (!Array.isArray(quiz_ids) || quiz_ids.length === 0) {
    return res.status(400).json({ error: 'quiz_ids must be a non-empty array' });
  }

  const { data: existing } = await supabase
    .from('module_quizzes')
    .select('quiz_id')
    .eq('module_id', moduleId);

  const existingQuizIds = new Set((existing ?? []).map((e: any) => e.quiz_id));
  const newRows = quiz_ids
    .filter((qid: string) => !existingQuizIds.has(qid))
    .map((quizId: string) => ({
      module_id: moduleId,
      quiz_id: quizId,
      due_at: due_at ?? null,
      available_from: available_from ?? null,
    }));

  if (newRows.length === 0) {
    return res.status(200).json([]);
  }

  const { data, error } = await supabase.from('module_quizzes').insert(newRows).select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

/**
 * POST /quizzes/:id/auto-map
 * Attaches a quiz to every module across every center that shares the same
 * curriculum_module_id as the quiz (falls back to the quiz's own
 * curriculum_module_id, or accepts an override in the body).
 * Body: { curriculum_module_id? }
 */
router.post('/:id/auto-map', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { curriculum_module_id } = req.body;

  const { data: quiz, error: quizErr } = await supabase
    .from('quizzes')
    .select('curriculum_module_id')
    .eq('id', id)
    .single();

  if (quizErr || !quiz) return res.status(404).json({ error: 'Quiz not found' });

  const targetCurriculumModuleId = curriculum_module_id ?? quiz.curriculum_module_id;
  if (!targetCurriculumModuleId) {
    return res.status(400).json({ error: 'Quiz has no curriculum_module_id to map from' });
  }

  const { data: targetModules, error: modErr } = await supabase
    .from('modules')
    .select('id')
    .eq('curriculum_module_id', targetCurriculumModuleId);

  if (modErr) return res.status(500).json({ error: modErr.message });
  if (!targetModules || targetModules.length === 0) return res.json([]);

  const { data: existing } = await supabase
    .from('module_quizzes')
    .select('module_id')
    .eq('quiz_id', id)
    .in('module_id', targetModules.map((m: any) => m.id));

  const existingModuleIds = new Set((existing ?? []).map((e: any) => e.module_id));
  const newRows = targetModules
    .filter((m: any) => !existingModuleIds.has(m.id))
    .map((m: any) => ({ module_id: m.id, quiz_id: id }));

  if (newRows.length === 0) return res.json([]);

  const { data, error } = await supabase.from('module_quizzes').insert(newRows).select();
  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json(data);
});

/**
 * DELETE /quizzes/modules/:moduleId/:quizId
 * Detach a quiz from a module. Does NOT delete the quiz or any responses
 * already collected — it only removes the module link.
 */
router.delete('/modules/:moduleId/:quizId', async (req: Request, res: Response) => {
  const { moduleId, quizId } = req.params;

  const { error } = await supabase
    .from('module_quizzes')
    .delete()
    .eq('module_id', moduleId)
    .eq('quiz_id', quizId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// =============================================================================
// STUDENT — Fill, submit, and review responses
// =============================================================================

/**
 * GET /quizzes/module-quizzes/:moduleQuizId/my-response
 * Returns the student's existing (auto-graded) response for this specific
 * module attachment, if any — including per-answer correctness.
 */
router.get('/module-quizzes/:moduleQuizId/my-response', async (req: Request, res: Response) => {
  const { moduleQuizId } = req.params;
  const { student_id } = req.query;
  const userId = (student_id as string) || (req as any).user?.id || (req.headers['x-user-id'] as string);

  if (!userId) return res.json(null);

  const { data: response, error } = await supabase
    .from('student_quiz_responses')
    .select('*, student_quiz_answers(*, quiz_questions(title, type, config, question_order))')
    .eq('module_quiz_id', moduleQuizId)
    .eq('student_id', userId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  res.json(response ?? null);
});

/**
 * POST /quizzes/module-quizzes/:moduleQuizId/responses
 * Submits a student's attempt and auto-grades it in the same call.
 * Body: { student_id, answers: [{ question_id, answer }] }
 */
router.post('/module-quizzes/:moduleQuizId/responses', async (req: Request, res: Response) => {
  const { moduleQuizId } = req.params;
  const { answers, student_id } = req.body;
  const userId = student_id || (req as any).user?.id || (req.headers['x-user-id'] as string);

  if (!userId) return res.status(400).json({ error: 'student_id is required' });
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'answers must be a non-empty array' });
  }

  // 1. Confirm the module_quiz exists and load its quiz + questions for grading.
  const { data: moduleQuiz, error: mqErr } = await supabase
    .from('module_quizzes')
    .select('id, quiz_id, module_id')
    .eq('id', moduleQuizId)
    .single();

  if (mqErr || !moduleQuiz) {
    return res.status(400).json({ error: 'This quiz is not attached to that module' });
  }

  // 2. Prevent duplicate submissions.
  const { data: existing } = await supabase
    .from('student_quiz_responses')
    .select('id')
    .eq('module_quiz_id', moduleQuizId)
    .eq('student_id', userId)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: 'Ya has enviado una respuesta para este quiz en este módulo' });
  }

  const { data: questions, error: qErr } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', moduleQuiz.quiz_id);

  if (qErr) return res.status(500).json({ error: qErr.message });

  const questionById = new Map((questions ?? []).map((q: any) => [q.id, q]));
  const now = new Date().toISOString();

  // 3. Create the response as in_progress first.
  const { data: response, error: respErr } = await supabase
    .from('student_quiz_responses')
    .insert({
      module_quiz_id: moduleQuizId,
      student_id: userId,
      status: 'in_progress',
      started_at: now,
    })
    .select()
    .single();

  if (respErr) return res.status(500).json({ error: respErr.message });

  // 4. Grade + insert answers.
  let totalScore = 0;
  let totalMax = 0;
  let anyGraded = false;

  const answerRows = answers.map((a: any) => {
    const question = questionById.get(a.question_id);
    const { is_correct, points_awarded } = question ? gradeAnswer(question, a.answer) : { is_correct: null, points_awarded: null };

    if (points_awarded !== null) {
      anyGraded = true;
      totalScore += points_awarded;
      totalMax += (question?.config?.points ?? 1);
    }

    return {
      response_id: response.id,
      question_id: a.question_id,
      answer: typeof a.answer === 'object' ? JSON.stringify(a.answer) : String(a.answer),
      is_correct,
      points_awarded,
    };
  });

  const { error: ansErr } = await supabase.from('student_quiz_answers').insert(answerRows);

  if (ansErr) {
    await supabase.from('student_quiz_responses').delete().eq('id', response.id);
    return res.status(500).json({ error: ansErr.message });
  }

  // 5. Flip to submitted, with score if anything was auto-gradable.
  const { data: submitted, error: submitErr } = await supabase
    .from('student_quiz_responses')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      score: anyGraded ? totalScore : null,
      max_score: anyGraded ? totalMax : null,
    })
    .eq('id', response.id)
    .select()
    .single();

  if (submitErr) return res.status(500).json({ error: submitErr.message });

  res.status(201).json({ ...submitted, answers: answerRows });
});

/**
 * GET /quizzes/my-responses?student_id=...
 * All of a student's past quiz responses across every module, for a
 * "your quiz history" view.
 */
router.get('/my-responses', async (req: Request, res: Response) => {
  const { student_id } = req.query;
  const userId = (student_id as string) || (req as any).user?.id || (req.headers['x-user-id'] as string);

  if (!userId) return res.status(400).json({ error: 'student_id is required' });

  const { data, error } = await supabase
    .from('student_quiz_responses')
    .select('*, module_quizzes(module_id, quizzes(title))')
    .eq('student_id', userId)
    .order('submitted_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =============================================================================
// TEACHER — View responses from their subjects' modules
// =============================================================================

/**
 * GET /quizzes/modules/:moduleId/:quizId/responses
 * All student responses to one quiz, scoped to a specific module,
 * restricted to teachers assigned to that module's subject.
 */
router.get('/modules/:moduleId/:quizId/responses', async (req: Request, res: Response) => {
  const { moduleId, quizId } = req.params;
  const user = (req as any).user;

  if (user?.role === 'teacher') {
    const owns = await professorOwnsModule(user.id, moduleId);
    if (!owns) return res.status(403).json({ error: 'Not assigned to this module' });
  }

  const { data: moduleQuiz } = await supabase
    .from('module_quizzes')
    .select('id')
    .eq('module_id', moduleId)
    .eq('quiz_id', quizId)
    .maybeSingle();

  if (!moduleQuiz) return res.status(404).json({ error: 'This quiz is not attached to that module' });

  const { data, error } = await supabase
    .from('student_quiz_responses')
    .select(
      '*, users:student_id(id, full_name, email), student_quiz_answers(*, quiz_questions(title, type, question_order))'
    )
    .eq('module_quiz_id', moduleQuiz.id)
    .order('submitted_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * GET /quizzes/responses/:responseId
 * Single response detail (e.g. clicking into one student's submission),
 * including per-question correctness. Access control walks
 * response -> module_quiz -> module -> subject.
 */
router.get('/responses/:responseId', async (req: Request, res: Response) => {
  const { responseId } = req.params;
  const user = (req as any).user;

  const { data: response, error } = await supabase
    .from('student_quiz_responses')
    .select(
      '*, users:student_id(id, full_name, email), module_quizzes(module_id, quizzes(title)), student_quiz_answers(*, quiz_questions(title, type, config, question_order))'
    )
    .eq('id', responseId)
    .single();

  if (error || !response) return res.status(404).json({ error: 'Response not found' });

  if (user?.role === 'teacher') {
    const moduleId = (response as any).module_quizzes?.module_id;
    const owns = moduleId ? await professorOwnsModule(user.id, moduleId) : false;
    if (!owns) return res.status(403).json({ error: 'Not authorized to view this response' });
  }

  res.json(response);
});

export default router;