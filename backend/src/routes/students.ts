import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// ============================================
// STUDENT PROGRESS ENDPOINTS
// ============================================

// Get student's enrolled courses
router.get('/:studentId/courses', async (req, res) => {
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

        // 3. Get grades and centers details
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

        // Format the response
        const formattedCourses = subjects?.map(subject => {
            const grade = grades?.find(g => g.id === subject.grade_id);
            const center = centers?.find(c => c.id === grade?.center_id);

            return {
                id: subject.id,
                name: subject.name,
                grade_id: grade?.id,
                grade_name: grade?.name,
                center_id: center?.id,
                center_name: center?.name
            };
        });

        res.json(formattedCourses || []);
    } catch (error: any) {
        console.error('Error fetching student courses:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get student progress by student ID
router.get('/:studentId/progress', async (req, res) => {
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

// ============================================
// STUDENT ITEM PROGRESS ENDPOINTS
// ============================================

// Mark an item as read
router.post('/:studentId/read-item/:itemId', async (req, res) => {
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
router.get('/:studentId/read-items', async (req, res) => {
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
router.post('/:studentId/comments', async (req, res) => {
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

// Get students (optionally filtered by professor)
router.get('/', async (req, res) => {
    try {
        const professorId = req.query.professorId as string;

        let studentIds: string[] = [];

        if (professorId) {
            // 1. Get subjects for professor
            const { data: profSubjects, error: profSubjError } = await supabase
                .from('professor_subjects')
                .select('subject_id')
                .eq('professor_id', professorId);

            if (profSubjError) throw profSubjError;

            const subjectIds = [...new Set(profSubjects?.map(ps => ps.subject_id))];

            if (subjectIds.length === 0) return res.json([]);

            // 2. Get enrollments for those subjects
            const { data: enrollments, error: enrollmentsError } = await supabase
                .from('enrollments')
                .select('student_id')
                .in('subject_id', subjectIds);

            if (enrollmentsError) throw enrollmentsError;

            studentIds = [...new Set(enrollments?.map(e => e.student_id))];

            if (studentIds.length === 0) return res.json([]);
        }

        // 3. Get Student Info
        let query = supabase
            .from('users')
            .select('id, full_name, email, firstname, lastname, avatar_url')
            .eq('role', 'student');

        if (studentIds.length > 0) {
            query = query.in('id', studentIds);
        } else if (professorId) {
            return res.json([]);
        }

        const { data: students, error: studentsError } = await query;

        if (studentsError) throw studentsError;

        // Map to format expected by frontend
        const formattedStudents = students?.map((student, index) => ({
            id: index + 1,
            userId: student.id,
            name: student.full_name || `${student.firstname || ''} ${student.lastname || ''}`.trim() || 'Alumno',
            email: student.email,
            description: 'Estudiante',
            color: ['purple', 'orange', 'salmon', 'blue'][index % 4]
        })) || [];

        res.json(formattedStudents);

    } catch (error: any) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
