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

export default router;
