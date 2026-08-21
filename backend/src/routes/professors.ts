import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// ============================================
// PROFESSOR ENDPOINTS
// ============================================

// Get tutor's students' courses
router.get('/tutors/:tutorId/courses', async (req, res) => {
    try {
        const { tutorId } = req.params;

        // 1. Get students for this tutor
        const { data: studentTutors, error: tutorError } = await supabase
            .from('student_tutors')
            .select('student_id')
            .eq('tutor_id', tutorId);

        if (tutorError) throw tutorError;
        if (!studentTutors || studentTutors.length === 0) return res.json([]);

        const studentIds = studentTutors.map(st => st.student_id);

        // 2. Get enrollments for these students
        const { data: enrollments, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select('subject_id, grade_id, center_id')
            .in('student_id', studentIds);

        if (enrollmentsError) throw enrollmentsError;
        if (!enrollments || enrollments.length === 0) return res.json([]);

        const subjectIds = [...new Set(enrollments.map(e => e.subject_id))];

        // 3. Get subjects details
        const { data: subjects, error: subjectsError } = await supabase
            .from('subjects')
            .select('id, name, grade_id')
            .in('id', subjectIds);

        if (subjectsError) throw subjectsError;

        // 4. Get grades and centers
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

        // 5. Format response
        const formattedCourses = subjects?.map(subject => {
            const grade = grades?.find(g => g.id === subject.grade_id);
            const center = centers?.find(c => c.id === grade?.center_id);

            return {
                id: subject.id,
                name: subject.name,
                grade_name: grade?.name || 'Sin grado',
                grade_id: subject.grade_id,
                center_id: grade?.center_id,
                center_name: center?.name || 'Sin centro'
            };
        });

        res.json(formattedCourses || []);
    } catch (error: any) {
        console.error('Error fetching tutor courses:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get professor's courses
router.get('/:professorId/courses', async (req, res) => {
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

        if (error) throw error;

        const courses = profSubjects?.map(ps => {
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

        res.json(courses);
    } catch (error: any) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get grade summary for all students of a professor
router.get('/:professorId/grades-summary', async (req, res) => {
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

// Get centers for a professor
router.get('/:professorId/centers', async (req, res) => {
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

export default router;
