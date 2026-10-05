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
  * PUT / PATCH /api/curriculum/subjects/:subjectId
  * Update name / short_name of a canonical curriculum subject.
  * Body: { name?, short_name? }
  */
const updateSubjectHandler = async (req: Request, res: Response) => {
  try {
    const subjectId = req.params.subjectId || req.params.id;
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
};

router.put('/subjects/:subjectId', updateSubjectHandler);
router.patch('/subjects/:subjectId', updateSubjectHandler);
router.put('/subjects/:id', updateSubjectHandler);
router.patch('/subjects/:id', updateSubjectHandler);

/**
 * DELETE /api/curriculum/subjects/:subjectId
 * Delete a canonical curriculum subject (cascades to modules, linked subjects, etc).
 */
router.delete('/subjects/:subjectId', async (req: Request, res: Response) => {
  try {
    const subjectId = req.params.subjectId || req.params.id;

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
router.delete('/subjects/:id', async (req: Request, res: Response) => {
  try {
    const subjectId = req.params.subjectId || req.params.id;

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
    const subjectId = req.params.subjectId || req.params.id;
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
 * POST /api/curriculum/modules
 * Create a new canonical curriculum module.
 * Body: { curriculum_subject_id, title, order_index? }
 */
router.post('/modules', async (req: Request, res: Response) => {
  try {
    const { curriculum_subject_id, title, order_index } = req.body;
    if (!curriculum_subject_id) {
      return res.status(400).json({ error: 'curriculum_subject_id is required' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    // If no order_index provided, use count of existing modules
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const { count } = await supabase
        .from('curriculum_modules')
        .select('*', { count: 'exact', head: true })
        .eq('curriculum_subject_id', curriculum_subject_id);
      finalOrderIndex = count ?? 0;
    }

    const { data, error } = await supabase
      .from('curriculum_modules')
      .insert({
        curriculum_subject_id,
        title: title.trim(),
        order_index: finalOrderIndex,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Error creating curriculum module:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT / PATCH /api/curriculum/modules/:moduleId
 * Update title / order_index of a canonical curriculum module.
 * Body: { title?, order_index? }
 */
const updateModuleHandler = async (req: Request, res: Response) => {
  try {
    const moduleId = req.params.moduleId || req.params.id;
    const { title, order_index } = req.body;

    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title.trim();
    if (order_index !== undefined) updates.order_index = order_index;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('curriculum_modules')
      .update(updates)
      .eq('id', moduleId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error updating curriculum module:', error);
    res.status(500).json({ error: error.message });
  }
};

router.put('/modules/:moduleId', updateModuleHandler);
router.patch('/modules/:moduleId', updateModuleHandler);
router.put('/modules/:id', updateModuleHandler);
router.patch('/modules/:id', updateModuleHandler);


/**
 * DELETE /api/curriculum/modules/:moduleId
 * Delete a canonical curriculum module.
 */
router.delete('/modules/:moduleId', async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.params;

    const { error } = await supabase
      .from('curriculum_modules')
      .delete()
      .eq('id', moduleId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting curriculum module:', error);
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
