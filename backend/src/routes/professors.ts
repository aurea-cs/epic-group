import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// Get professor's courses
router.get('/api/professors/:professorId/courses', async (req, res) => {
    try {
        const { professorId } = req.params;

        const { data: profSubjects, error } = await supabase
            .from('professor_subjects')
            .select(`
                subjects (
                    id, 
                    name, 
                    description, 
                    created_at,
                    campo_formativo,
                    grades_levels (
                        id,
                        name,
                        educational_centers (
                            id,
                            name
                        )
                    )
                )
            `)
            .eq('professor_id', professorId);

        const rawCourses = profSubjects?.map(ps => {
            const subject = ps.subjects as any;
            const grade = subject?.grades_levels || {};
            const center = grade?.educational_centers || {};

            return {
                id: subject.id,
                title: subject.name,
                description: `${grade.name || 'Sin grado'}`,
                campoFormativo: subject.campo_formativo || null,
                completedSteps: Math.floor(Math.random() * 100), // Mock progress
                totalSteps: 100,
                gradeId: grade.id,
                centerId: center.id,
                centerName: center.name || 'Centro Educativo'
            };
        }) || [];

        const includeProgress = req.query.include === 'progress';
        let progressMap: Record<string, { stars: number; completed: boolean; totalItems: number; completedItems: number }> = {};

        if (includeProgress && rawCourses.length > 0) {
            const subjectIds = rawCourses.map(c => c.id);
            const { data: modules } = await supabase
                .from('modules')
                .select('id, subject_id, items:module_items(id, type, is_completed)')
                .in('subject_id', subjectIds);

            (modules || []).forEach(mod => {
                const subId = mod.subject_id;
                if (!progressMap[subId]) {
                    progressMap[subId] = { stars: 0, completed: false, totalItems: 0, completedItems: 0 };
                }
                const items = (mod.items || []).filter((it: any) => it.type === 'pdf');
                progressMap[subId].totalItems += items.length;
                items.forEach((it: any) => {
                    if (it.is_completed) {
                        progressMap[subId].completedItems++;
                    }
                });
            });

            Object.keys(progressMap).forEach(subId => {
                const p = progressMap[subId];
                if (p.totalItems > 0) {
                    const ratio = p.completedItems / p.totalItems;
                    if (ratio === 1) p.stars = 3;
                    else if (ratio >= 0.5) p.stars = 2;
                    else if (ratio > 0) p.stars = 1;
                    p.completed = p.stars === 3;
                }
            });
        }

        const formattedCourses = rawCourses.map(c => ({
            ...c,
            ...(includeProgress ? {
                stars: progressMap[c.id]?.stars || 0,
                completed: progressMap[c.id]?.completed || false,
                totalItems: progressMap[c.id]?.totalItems || 0,
                completedItems: progressMap[c.id]?.completedItems || 0
            } : {})
        }));

        res.json(formattedCourses);
    } catch (error: any) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get centers for a professor
router.get('/api/professors/:professorId/centers', async (req, res) => {
    try {
        const { professorId } = req.params;

        const { data: relations, error: relationError } = await supabase
            .from('center_professors')
            .select('center_id')
            .eq('user_id', professorId);

        if (relationError) throw relationError;

        const centerIds = relations?.map(r => r.center_id) || [];

        if (centerIds.length === 0) {
            return res.json([]);
        }

        const { data: centers, error: centersError } = await supabase
            .from('educational_centers')
            .select('*')
            .in('id', centerIds);

        if (centersError) throw centersError;

        res.json(centers || []);
    } catch (error: any) {
        console.error('Error fetching professor centers:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get grade summary for all students of a professor
router.get('/api/professors/:professorId/grades-summary', async (req, res) => {
    try {
        const { professorId } = req.params;

        // 1. Get subjects taught by professor to find their subj
        const { data: profSubjects, error: profSubjError } = await supabase
            .from('professor_subjects')
            .select('subjects!inner(subject_id)')
            .eq('professor_id', professorId);

        if (profSubjError) throw profSubjError;

        const subjectIds = [...new Set(profSubjects?.map(ps => (ps.subjects as any).subject_id))];

        if (subjectIds.length === 0) return res.json([]);

        // 2. Get enrollments for those subjects
        const { data: enrollments, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select('student_id')
            .in('subject_id', subjectIds);

        if (enrollmentsError) throw enrollmentsError;

        const studentIds = [...new Set(enrollments?.map(e => e.student_id))];

        if (studentIds.length === 0) return res.json([]);

        // 3. Get Student Info
        const { data: students, error: studentsError } = await supabase
            .from('users')
            .select('id, full_name, email, firstname, lastname, avatar_url')
            .in('id', studentIds);

        if (studentsError) throw studentsError;

       // implementation
        res.json(students);

    } catch (error: any) {
        console.error('Error fetching grades summary:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all professors with their assigned centers
router.get('/api/professors', async (req, res) => {
    try {
        // 1. Fetch all users with role=professor
        const { data: professors, error: professorsError } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'professor')
            .order('full_name', { ascending: true });

        if (professorsError) throw professorsError;

        if (!professors || professors.length === 0) return res.json([]);

        const professorIds = professors.map(p => p.id);

        // 2. Fetch center_professors links for these professors
        const { data: links, error: linksError } = await supabase
            .from('center_professors')
            .select('user_id, center_id')
            .in('user_id', professorIds);

        if (linksError) throw linksError;

        // 3. Get distinct center IDs and fetch center names
        const centerIds = [...new Set((links || []).map(l => l.center_id).filter(Boolean))];
        let centersMap: Record<string, string> = {};

        if (centerIds.length > 0) {
            const { data: centers, error: centersError } = await supabase
                .from('educational_centers')
                .select('id, name')
                .in('id', centerIds);

            if (centersError) throw centersError;
            (centers || []).forEach(c => { centersMap[c.id] = c.name; });
        }

        // 4. Build professor-to-centers map
        const professorCentersMap: Record<string, { id: string; name: string }[]> = {};
        (links || []).forEach(l => {
            if (!l.center_id) return;
            if (!professorCentersMap[l.user_id]) professorCentersMap[l.user_id] = [];
            const centerName = centersMap[l.center_id];
            if (centerName && !professorCentersMap[l.user_id].find(c => c.id === l.center_id)) {
                professorCentersMap[l.user_id].push({ id: l.center_id, name: centerName });
            }
        });

        // 4.5 Fetch time from view
        const { data: timeData } = await supabase
            .from('student_time_view')
            .select('user_id, total_time_seconds')
            .in('user_id', professorIds);
            
        const timeMap: Record<string, number> = {};
        (timeData || []).forEach(t => {
            timeMap[t.user_id] = t.total_time_seconds;
        });

        // 5. Format response
        const formatted = professors.map(p => ({
            id: p.id,
            name: p.full_name || p.email,
            email: p.email,
            avatar_url: p.avatar_url,
            created_at: p.created_at,
            centers: professorCentersMap[p.id] || [],
            total_time_seconds: timeMap[p.id] || 0
        }));

        res.json(formatted);
    } catch (error: any) {
        console.error('Error fetching all professors with centers:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
