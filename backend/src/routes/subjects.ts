import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// ============================================
// ADMIN - SUBJECTS
// ============================================

// Create subject
router.post('/', async (req, res) => {
    try {
        const {
            name,
            short_name,
            description,
            start_date,
            end_date,
            visibility,
            max_students,
            grade_id,
            schedule_days,
            schedule_start_time,
            schedule_end_time
        } = req.body;

        if (!name || !grade_id) {
            return res.status(400).json({ error: 'Name and grade ID are required' });
        }

        const { data, error } = await supabase
            .from('subjects')
            .insert({
                name,
                short_name,
                description,
                start_date: start_date || null,
                end_date: end_date || null,
                visibility,
                max_students,
                grade_id,
                schedule_days: schedule_days || null,
                schedule_start_time: schedule_start_time || null,
                schedule_end_time: schedule_end_time || null
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error creating subject:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update subject
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, short_name, description, start_date, end_date, visibility, max_students, is_active, schedule_days, schedule_start_time, schedule_end_time } = req.body;

        const { data, error } = await supabase
            .from('subjects')
            .update({
                name,
                short_name,
                description,
                start_date: start_date || null,
                end_date: end_date || null,
                visibility,
                max_students,
                is_active,
                schedule_days: schedule_days !== undefined ? schedule_days : undefined,
                schedule_start_time: schedule_start_time !== undefined ? schedule_start_time : undefined,
                schedule_end_time: schedule_end_time !== undefined ? schedule_end_time : undefined
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        console.error('Error updating subject:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete subject
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('subjects')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Subject deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting subject:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get subjects by grade
router.get('/by-grade/:gradeId', async (req, res) => {
    try {
        const { gradeId } = req.params;

        const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .eq('grade_id', gradeId)
            .order('name');

        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({
            error: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
    }
});

// Get single subject by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Subject not found' });

        res.json(data);
    } catch (error: any) {
        console.error('Error fetching subject:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// SUBJECT ↔ PROFESSOR ASSIGNMENTS
// ============================================

// Get professors for a subject
router.get('/:subjectId/professors', async (req, res) => {
    try {
        const { subjectId } = req.params;

        console.log(`Fetching professors for subject: ${subjectId}`);

        // Get user_ids from junction table
        const { data: relations, error: relationError } = await supabase
            .from('professor_subjects')
            .select('professor_id')
            .eq('subject_id', subjectId);

        if (relationError) throw relationError;

        const userIds = relations?.map(r => r.professor_id) || [];

        if (userIds.length === 0) {
            return res.json([]);
        }

        // Get user details
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email, full_name, firstname, lastname, avatar_url')
            .in('id', userIds);

        if (usersError) throw usersError;

        res.json(users || []);
    } catch (error: any) {
        console.error('Error fetching subject professors:', error);
        // Fallback for missing table
        if (error.code === '42P01') {
            return res.json([]);
        }
        res.status(500).json({ error: error.message });
    }
});

// Assign professor to subject
router.post('/:subjectId/professors', async (req, res) => {
    try {
        const { subjectId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const { data, error } = await supabase
            .from('professor_subjects')
            .insert({ subject_id: subjectId, professor_id: userId })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Professor already assigned to this subject' });
            }
            throw error;
        }

        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error assigning professor to subject:', error);
        res.status(500).json({ error: error.message });
    }
});

// Unassign professor from subject
router.delete('/:subjectId/professors/:userId', async (req, res) => {
    try {
        const { subjectId, userId } = req.params;

        const { error } = await supabase
            .from('professor_subjects')
            .delete()
            .match({ subject_id: subjectId, professor_id: userId });

        if (error) throw error;

        res.json({ message: 'Professor unassigned from subject successfully' });
    } catch (error: any) {
        console.error('Error unassigning professor from subject:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get students enrolled in a subject (with time spent)
router.get('/:subjectId/students', async (req, res) => {
    try {
        const { subjectId } = req.params;

        // 1. Get enrollments for this subject to find student IDs
        const { data: subjectEnrollments, error: subjErr } = await supabase
            .from('enrollments')
            .select('student_id')
            .eq('subject_id', subjectId);

        if (subjErr) throw subjErr;

        if (!subjectEnrollments || subjectEnrollments.length === 0) return res.json([]);

        const studentIds = [...new Set(subjectEnrollments.map((e: any) => e.student_id))];

        // 2. Fetch user details for these students
        const { data: students, error: studentsError } = await supabase
            .from('users')
            .select('id, full_name, email, firstname, lastname, avatar_url, created_at')
            .in('id', studentIds)
            .order('full_name', { ascending: true });

        if (studentsError) throw studentsError;

        // 3. Fetch all enrollments for these students to get their centers
        const { data: allEnrollments, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select('student_id, center_id')
            .in('student_id', studentIds);

        if (enrollmentsError) throw enrollmentsError;

        // 4. Get distinct center IDs
        const centerIds = [...new Set((allEnrollments || []).map((e: any) => e.center_id).filter(Boolean))];
        let centersMap: Record<string, string> = {};

        if (centerIds.length > 0) {
            const { data: centers, error: centersError } = await supabase
                .from('educational_centers')
                .select('id, name')
                .in('id', centerIds);

            if (centersError) throw centersError;
            (centers || []).forEach((c: any) => { centersMap[c.id] = c.name; });
        }

        // 5. Build student-to-centers map
        const studentCentersMap: Record<string, { id: string; name: string }[]> = {};
        (allEnrollments || []).forEach((e: any) => {
            if (!e.center_id) return;
            if (!studentCentersMap[e.student_id]) studentCentersMap[e.student_id] = [];
            const centerName = centersMap[e.center_id];
            if (centerName && !studentCentersMap[e.student_id].find(c => c.id === e.center_id)) {
                studentCentersMap[e.student_id].push({ id: e.center_id, name: centerName });
            }
        });

        // 5.5 Fetch time spent
        const { data: timeData, error: timeError } = await supabase
            .from('student_time_view')
            .select('user_id, total_time_seconds')
            .in('user_id', studentIds);

        if (timeError && timeError.code !== '42P01') {
            console.warn('Error fetching time data:', timeError);
        }

        const timeMap: Record<string, number> = {};
        (timeData || []).forEach((t: any) => {
            timeMap[t.user_id] = t.total_time_seconds;
        });

        // 6. Combine
        const result = (students || []).map((s: any) => ({
            id: s.id,
            name: s.full_name || `${s.firstname || ''} ${s.lastname || ''}`.trim(),
            email: s.email,
            avatar_url: s.avatar_url,
            created_at: s.created_at,
            centers: studentCentersMap[s.id] || [],
            total_time_seconds: timeMap[s.id] || 0
        }));

        res.json(result);
    } catch (error: any) {
        console.error('Error fetching subject students:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
