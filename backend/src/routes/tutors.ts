import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// Get tutor's students' courses
router.get('/api/tutors/:tutorId/courses', async (req, res) => {
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

export default router;
