import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// ============================================
// USER CENTER ENDPOINT
// ============================================

// Get the educational center (and its vr_code) for a given user
router.get('/:userId/center', async (req, res) => {
    try {
        const { userId } = req.params;

        // 1. Get the user's center_id from the users table
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('center_id')
            .eq('id', userId)
            .single();

        if (userError) throw userError;
        if (!userData?.center_id) {
            return res.json({ vr_code: null });
        }

        // 2. Fetch the center to get its vr_code
        const { data: center, error: centerError } = await supabase
            .from('educational_centers')
            .select('id, name, vr_code')
            .eq('id', userData.center_id)
            .single();

        if (centerError) throw centerError;

        res.json(center || { vr_code: null });
    } catch (error: any) {
        console.error('Error fetching user center:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get activity for a user (last 7 days)
router.get('/:userId/activity', async (req, res) => {
    try {
        const { userId } = req.params;

        // Fetch activity for the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data, error } = await supabase
            .from('activity_logs')
            .select('duration_seconds, created_at, path')
            .eq('user_id', userId)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Group by day
        const dailyActivity: Record<string, number> = {};
        const pathActivity: Record<string, number> = {};

        (data || []).forEach(log => {
            const dateStr = new Date(log.created_at).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' });
            if (!dailyActivity[dateStr]) dailyActivity[dateStr] = 0;
            dailyActivity[dateStr] += log.duration_seconds;

            const p = log.path || '/unknown';
            if (!pathActivity[p]) pathActivity[p] = 0;
            pathActivity[p] += log.duration_seconds;
        });

        const dailyArray = Object.keys(dailyActivity).map(k => ({ date: k, seconds: dailyActivity[k] }));
        const pathArray = Object.keys(pathActivity)
            .map(k => ({ path: k, seconds: pathActivity[k] }))
            .sort((a, b) => b.seconds - a.seconds)
            .slice(0, 10);

        res.json({
            daily: dailyArray,
            sections: pathArray
        });
    } catch (error: any) {
        console.error('Error fetching student activity:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get aggregated profile details (centers, grades, subjects)
router.get('/:userId/profile-details', async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.query;

        if (role === 'admin') {
            return res.json({ centers: 'N/A', grades: 'N/A', subjects: 'N/A' });
        }

        let centerNames: string[] = [];
        let gradeNames: string[] = [];
        let subjectNames: string[] = [];

        if (role === 'professor') {
            const { data: profSubjects, error } = await supabase
                .from('professor_subjects')
                .select(`
                    subjects (
                        name,
                        grades_levels (
                            name,
                            educational_centers (name)
                        )
                    )
                `)
                .eq('professor_id', userId);

            if (error) throw error;

            profSubjects?.forEach(ps => {
                const sub: any = ps.subjects;
                if (sub) {
                    subjectNames.push(sub.name);
                    if (sub.grades_levels) {
                        gradeNames.push(sub.grades_levels.name);
                        if (sub.grades_levels.educational_centers) {
                            centerNames.push(sub.grades_levels.educational_centers.name);
                        }
                    }
                }
            });
        } else if (role === 'tutor' || role === 'student') {
            let targetStudentIds = [userId];

            if (role === 'tutor') {
                const { data: studentTutors, error: tutorError } = await supabase
                    .from('student_tutors')
                    .select('student_id')
                    .eq('tutor_id', userId);
                if (tutorError) throw tutorError;
                targetStudentIds = studentTutors?.map(st => st.student_id) || [];
            }

            if (targetStudentIds.length > 0) {
                const { data: enrollments, error: enrollError } = await supabase
                    .from('enrollments')
                    .select(`
                        subjects (name),
                        grades_levels (name, educational_centers (name))
                    `)
                    .in('student_id', targetStudentIds);

                if (enrollError) throw enrollError;

                enrollments?.forEach(en => {
                    const sub: any = en.subjects;
                    const grade: any = en.grades_levels;
                    if (sub) subjectNames.push(sub.name);
                    if (grade) {
                        gradeNames.push(grade.name);
                        if (grade.educational_centers) {
                            centerNames.push(grade.educational_centers.name);
                        }
                    }
                });
            }
        }

        // Deduplicate
        const uniqueCenters = [...new Set(centerNames)].filter(Boolean);
        const uniqueGrades = [...new Set(gradeNames)].filter(Boolean);
        const uniqueSubjects = [...new Set(subjectNames)].filter(Boolean);

        res.json({
            centers: uniqueCenters.length > 0 ? uniqueCenters.join(', ') : 'N/A',
            grades: uniqueGrades.length > 0 ? uniqueGrades.join(', ') : 'N/A',
            subjects: uniqueSubjects.length > 0 ? uniqueSubjects.join(', ') : 'N/A'
        });

    } catch (error: any) {
        console.error('Error fetching profile details:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get ALL registered users with role=student (for search-and-enroll)
router.get('/students', async (req, res) => {
    try {
        const { data: students, error } = await supabase
            .from('users')
            .select('id, full_name, email, firstname, lastname, avatar_url')
            .eq('role', 'student')
            .order('full_name', { ascending: true });

        if (error) throw error;

        const formatted = (students || []).map((s) => ({
            id: s.id,
            name: s.full_name || `${s.firstname || ''} ${s.lastname || ''}`.trim() || s.email,
            email: s.email,
        }));

        res.json(formatted);
    } catch (error: any) {
        console.error('Error fetching all students:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
