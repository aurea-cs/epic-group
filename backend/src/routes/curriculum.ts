import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

/**
 * GET /api/curriculum/grades
 * Fetch all canonical curriculum grades.
 */
router.get('/grades', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('curriculum_grades')
      .select('*')
      .order('level', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching curriculum grades:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/curriculum/grades/:gradeId/subjects
 * Fetch all canonical curriculum subjects for a given curriculum grade.
 */
router.get('/grades/:gradeId/subjects', async (req: Request, res: Response) => {
  try {
    const { gradeId } = req.params;
    const { data, error } = await supabase
      .from('curriculum_subjects')
      .select('*')
      .eq('curriculum_grade_id', gradeId)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching curriculum subjects:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/curriculum/subjects
 * Create a new canonical curriculum subject.
 * Body: { curriculum_grade_id, name, short_name? }
 */
router.post('/subjects', async (req: Request, res: Response) => {
  try {
    const { curriculum_grade_id, name, short_name } = req.body;
    if (!curriculum_grade_id) {
      return res.status(400).json({ error: 'curriculum_grade_id is required' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const { data, error } = await supabase
      .from('curriculum_subjects')
      .insert({
        curriculum_grade_id,
        name: name.trim(),
        short_name: short_name?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Error creating curriculum subject:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/curriculum/subjects/:subjectId
 * Update name / short_name of a canonical curriculum subject.
 * Body: { name?, short_name? }
 */
router.put('/subjects/:subjectId', async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;
    const { name, short_name } = req.body;

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name.trim();
    if (short_name !== undefined) updates.short_name = short_name?.trim() || null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('curriculum_subjects')
      .update(updates)
      .eq('id', subjectId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error updating curriculum subject:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/curriculum/subjects/:subjectId
 * Delete a canonical curriculum subject (cascades to modules, linked subjects, etc).
 */
router.delete('/subjects/:subjectId', async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;

    const { error } = await supabase
      .from('curriculum_subjects')
      .delete()
      .eq('id', subjectId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting curriculum subject:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/curriculum/subjects/:subjectId/modules
 * Fetch all canonical curriculum modules for a given curriculum subject.
 */
router.get('/subjects/:subjectId/modules', async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;
    const { data, error } = await supabase
      .from('curriculum_modules')
      .select('*')
      .eq('curriculum_subject_id', subjectId)
      .order('order_index', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching curriculum modules:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/curriculum/tree
 * Fetch complete hierarchy of canonical grades, subjects, and modules.
 */
router.get('/tree', async (_req: Request, res: Response) => {
  try {
    const [gradesRes, subjectsRes, modulesRes] = await Promise.all([
      supabase.from('curriculum_grades').select('*').order('level', { ascending: true }),
      supabase.from('curriculum_subjects').select('*').order('name', { ascending: true }),
      supabase.from('curriculum_modules').select('*').order('order_index', { ascending: true }),
    ]);

    if (gradesRes.error) throw gradesRes.error;
    if (subjectsRes.error) throw subjectsRes.error;
    if (modulesRes.error) throw modulesRes.error;

    const grades = gradesRes.data || [];
    const subjects = subjectsRes.data || [];
    const modules = modulesRes.data || [];

    const tree = grades.map((grade) => {
      const gradeSubjects = subjects
        .filter((s) => s.curriculum_grade_id === grade.id)
        .map((subj) => {
          const subjModules = modules.filter((m) => m.curriculum_subject_id === subj.id);
          return {
            ...subj,
            modules: subjModules,
          };
        });

      return {
        ...grade,
        subjects: gradeSubjects,
      };
    });

    res.json(tree);
  } catch (error: any) {
    console.error('Error fetching curriculum tree:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
