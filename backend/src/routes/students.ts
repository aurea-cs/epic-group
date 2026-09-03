import { Router } from 'express';
import { supabase } from '../config/supabase';
import { upload } from '../middleware/upload';

const router = Router();

// Get students. Add ?expand=centers for enrollment/center data.
router.get('/api/students', async (req, res) => {
    try {
        const expandCenters = req.query.expand === 'centers';

        const { data: students, error: studentsError } = await supabase
            .from('users')
            .select('id, full_name, email, firstname, lastname, avatar_url, created_at')
            .eq('role', 'student')
            .order('full_name', { ascending: true });

        if (studentsError) throw studentsError;

        if (!students || students.length === 0) return res.json([]);

        // Minimal shape — no centers needed, return early.
        if (!expandCenters) {
            const formatted = students.map(s => ({
                id: s.id,
                name: s.full_name || `${s.firstname || ''} ${s.lastname || ''}`.trim() || s.email,
                email: s.email,
            }));
            return res.json(formatted);
        }

        // Expanded shape — fetch enrollments + centers and attach them.
        const studentIds = students.map(s => s.id);

        const { data: enrollments, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select('student_id, center_id')
            .in('student_id', studentIds);

        if (enrollmentsError) throw enrollmentsError;

        const centerIds = [...new Set((enrollments || []).map(e => e.center_id).filter(Boolean))];
        let centersMap: Record<string, string> = {};

        if (centerIds.length > 0) {
            const { data: centers, error: centersError } = await supabase
                .from('educational_centers')
                .select('id, name')
                .in('id', centerIds);

            if (centersError) throw centersError;
            (centers || []).forEach(c => { centersMap[c.id] = c.name; });
        }

        const studentCentersMap: Record<string, { id: string; name: string }[]> = {};
        (enrollments || []).forEach(e => {
            if (!e.center_id) return;
            if (!studentCentersMap[e.student_id]) studentCentersMap[e.student_id] = [];
            const centerName = centersMap[e.center_id];
            if (centerName && !studentCentersMap[e.student_id].find(c => c.id === e.center_id)) {
                studentCentersMap[e.student_id].push({ id: e.center_id, name: centerName });
            }
        });

        const formatted = students.map(s => ({
            id: s.id,
            name: s.full_name || `${s.firstname || ''} ${s.lastname || ''}`.trim() || s.email,
            email: s.email,
            avatar_url: s.avatar_url,
            created_at: s.created_at,
            centers: studentCentersMap[s.id] || []
        }));

        res.json(formatted);
    } catch (error: any) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/api/students/:studentId/courses', async (req, res) => {
    try {
        const { studentId } = req.params;

        // 1. Get enrollments for the student
        const { data: enrollments, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select(`
                subject_id,
                grade_id,
                center_id
            `)
            .eq('student_id', studentId);

        console.log('Enrollments:', enrollments);
        if (enrollmentsError) throw enrollmentsError;
        if (!enrollments || enrollments.length === 0) {
            return res.json([]);
        }

        const subjectIds = enrollments.map(e => e.subject_id);

        // 2. Get subjects details
        const { data: subjects, error: subjectsError } = await supabase
            .from('subjects')
            .select(`
                id,
                name,
                grade_id
            `)
            .in('id', subjectIds);

        if (subjectsError) throw subjectsError;

        // 3. Get grades and centers details to format exactly like ProfessorDashboard expects
        const { data: grades, error: gradesError } = await supabase
            .from('grades_levels')
            .select('id, name, center_id')
            .in('id', enrollments.map(e => e.grade_id));
            
        if (gradesError) throw gradesError;

        const { data: centers, error: centersError } = await supabase
            .from('educational_centers')
            .select('id, name')
            .in('id', grades?.map(g => g.center_id) || []);

        if (centersError) throw centersError;

        // Format the response, including progress if requested
        const includeProgress = req.query.include === 'progress';
        let progressMap: Record<string, { stars: number; completed: boolean; totalItems: number; completedItems: number }> = {};

        if (includeProgress && subjectIds.length > 0) {
            const [modulesRes, progressRes] = await Promise.all([
                supabase
                    .from('modules')
                    .select('id, subject_id, items:module_items(id, type, is_completed)')
                    .in('subject_id', subjectIds),
                supabase
                    .from('student_item_progress')
                    .select('item_id')
                    .eq('student_id', studentId)
            ]);

            const modules = modulesRes.data || [];
            const completedItemIds = new Set((progressRes.data || []).map(p => p.item_id));

            subjectIds.forEach(subId => {
                const subModules = modules.filter(m => m.subject_id === subId);
                let total = 0;
                let done = 0;

                subModules.forEach(mod => {
                    const items = (mod.items || []).filter((it: any) => it.type === 'pdf');
                    total += items.length;
                    items.forEach((it: any) => {
                        if (it.is_completed || completedItemIds.has(it.id)) {
                            done++;
                        }
                    });
                });

                let stars = 0;
                let completed = false;
                if (total > 0) {
                    const ratio = done / total;
                    if (ratio === 1) stars = 3;
                    else if (ratio >= 0.5) stars = 2;
                    else if (ratio > 0) stars = 1;
                    completed = stars === 3;
                }

                progressMap[subId] = { stars, completed, totalItems: total, completedItems: done };
            });
        }

        const formattedCourses = subjects?.map(subject => {
            const grade = grades?.find(g => g.id === subject.grade_id);
            const center = centers?.find(c => c.id === grade?.center_id);
            const prog = progressMap[subject.id];

            return {
                id: subject.id,
                name: subject.name,
                title: subject.name,
                grade_id: grade?.id,
                grade_name: grade?.name,
                center_id: center?.id,
                center_name: center?.name,
                ...(prog ? { stars: prog.stars, completed: prog.completed, totalItems: prog.totalItems, completedItems: prog.completedItems } : {})
            };
        });

        res.json(formattedCourses || []);
    } catch (error: any) {
        console.error('Error fetching student courses:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get student progress by student ID
router.get('/api/students/:studentId/progress', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { professorId } = req.query;

        // 1. Get user details
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, full_name, email, avatar_url')
            .eq('id', studentId)
            .single();

        if (userError) throw userError;

        // 2. Get enrollments and subjects
        const { data: enrollments } = await supabase
            .from('enrollments')
            .select('subject_id')
            .eq('student_id', studentId);
            
        let courses: any[] = [];
        if (enrollments && enrollments.length > 0) {
            const subjectIds = enrollments.map(e => e.subject_id);
            const { data: subjects } = await supabase
                .from('subjects')
                .select('id, name')
                .in('id', subjectIds);
                
            if (subjects) {
                // Fetch progress for these subjects
                const { data: modules } = await supabase
                    .from('modules')
                    .select('id, subject_id, items:module_items(id, type)')
                    .in('subject_id', subjectIds);
                    
                const { data: progressData } = await supabase
                    .from('student_item_progress')
                    .select('item_id')
                    .eq('student_id', studentId);
                    
                const completedItemIds = new Set((progressData || []).map(p => p.item_id));

                courses = subjects.map((sub, idx) => {
                    const subjectModules = (modules || []).filter(m => m.subject_id === sub.id);
                    let totalPdfs = 0;
                    let completedPdfs = 0;
                    
                    subjectModules.forEach(mod => {
                        const pdfItems = (mod.items || []).filter((it: any) => it.type === 'pdf');
                        totalPdfs += pdfItems.length;
                        pdfItems.forEach((it: any) => {
                            if (completedItemIds.has(it.id)) {
                                completedPdfs++;
                            }
                        });
                    });
                    
                    const progressPercent = totalPdfs > 0 ? Math.floor((completedPdfs / totalPdfs) * 100) : 0;

                    return {
                        id: sub.id,
                        name: sub.name,
                        progress: progressPercent,
                        color: ['#2563eb', '#16a34a', '#d97706', '#9333ea'][idx % 4]
                    };
                });
            }
        }

        // 3. Get comments
        let commentsQuery = supabase
            .from('student_comments')
            .select('id, text, author_name, created_at')
            .eq('student_id', studentId);
            
        if (professorId) {
            commentsQuery = commentsQuery.eq('professor_id', professorId);
        }
        
        const { data: commentsData } = await commentsQuery.order('created_at', { ascending: false });
        
        const comments = (commentsData || []).map(c => ({
            id: c.id,
            text: c.text,
            author: c.author_name,
            date: new Date(c.created_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        }));

        // 3.5 Fetch time
        let totalTime = 0;
        const { data: timeData, error: timeError } = await supabase
            .from('student_time_view')
            .select('total_time_seconds')
            .eq('user_id', studentId)
            .single();
            
        if (!timeError && timeData) {
            totalTime = timeData.total_time_seconds;
        }

        // 4. Return the combined payload
        res.json({
            id: user.id,
            name: user.full_name || user.email,
            email: user.email,
            avatar: user.avatar_url,
            courses,
            grades: [],
            comments,
            total_time_seconds: totalTime
        });
    } catch (error: any) {
        console.error('Error fetching student progress:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mark an item as read
router.post('/api/students/:studentId/read-item/:itemId', async (req, res) => {
    try {
        const { studentId, itemId } = req.params;
        const { error } = await supabase
            .from('student_item_progress')
            .insert({
                student_id: studentId,
                item_id: itemId
            });
            
        // Ignore unique constraint errors if already read
        if (error && error.code !== '23505') { 
            throw error;
        }
        
        res.json({ success: true });
    } catch (error: any) {
        console.error('Error marking item as read:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all read items for a student
router.get('/api/students/:studentId/read-items', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { data, error } = await supabase
            .from('student_item_progress')
            .select('item_id')
            .eq('student_id', studentId);
            
        if (error) throw error;
        
        res.json((data || []).map(d => d.item_id));
    } catch (error: any) {
        console.error('Error fetching read items:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add comment to student
router.post('/api/students/:studentId/comments', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { text, professorId, authorName } = req.body;

        if (!text || !professorId || !authorName) {
            return res.status(400).json({ error: 'Text, professorId, and authorName are required' });
        }

        const { data, error } = await supabase
            .from('student_comments')
            .insert({
                student_id: studentId,
                professor_id: professorId,
                text,
                author_name: authorName
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            id: data.id,
            text: data.text,
            author: data.author_name,
            date: new Date(data.created_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        });
    } catch (error: any) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get tutors linked to a student
router.get('/api/students/:studentId/tutors', async (req, res) => {
    try {
        const { studentId } = req.params;

        const { data: relations, error: relationError } = await supabase
            .from('student_tutors')
            .select('tutor_id')
            .eq('student_id', studentId);

        if (relationError) throw relationError;

        const tutorIds = relations?.map(r => r.tutor_id) || [];

        if (tutorIds.length === 0) {
            return res.json([]);
        }

        const { data: tutors, error: tutorsError } = await supabase
            .from('users')
            .select('id, full_name, email, firstname, lastname')
            .in('id', tutorIds);

        if (tutorsError) throw tutorsError;

        res.json(tutors || []);
    } catch (error: any) {
        console.error('Error fetching student tutors:', error);
        // Fallback for missing table
        if (error.code === '42P01') {
            return res.json([]);
        }
        res.status(500).json({ error: error.message });
    }
});

// Create a tutor account and link it to a student
router.post('/api/students/:studentId/tutor', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { email, password, fullName } = req.body;

        if (!email || !password || !fullName) {
            return res.status(400).json({ error: 'Email, password, and full name are required' });
        }

        // 1. Create the tutor user in Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });

        if (authError) throw authError;
        if (!authUser.user) throw new Error('Failed to create tutor user');

        const tutorId = authUser.user.id;

        // 2. Insert into public.users with role='tutor'
        const { error: profileError } = await supabase
            .from('users')
            .upsert({
                id: tutorId,
                email,
                full_name: fullName,
                role: 'tutor',
                firstname: fullName.split(' ')[0],
                lastname: fullName.split(' ').slice(1).join(' ')
            });

        if (profileError) throw profileError;

        // 3. Link tutor to student in student_tutors table
        const { error: linkError } = await supabase
            .from('student_tutors')
            .insert({ student_id: studentId, tutor_id: tutorId });

        if (linkError) {
            // If the table doesn't exist yet, still return success with a warning
            console.warn('Could not link tutor to student (student_tutors table may not exist):', linkError.message);
            return res.status(201).json({
                message: 'Tutor created but could not be linked (student_tutors table missing)',
                tutor: { id: tutorId, email, fullName, role: 'tutor' },
                warning: linkError.message
            });
        }

        res.status(201).json({
            message: 'Tutor created and linked to student successfully',
            tutor: { id: tutorId, email, fullName, role: 'tutor' }
        });

    } catch (error: any) {
        console.error('Error creating tutor:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
