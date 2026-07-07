// Backend Index
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''; // Use Service Key for Backend
export const supabase = createClient(supabaseUrl, supabaseKey);

// Multer configuration for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // Maximum 10 files per upload
    },
    fileFilter: (req, file, cb) => {
        // Only accept PDF files
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// ============================================
// STUDENT PROGRESS ENDPOINTS
// ============================================

// Get student courses (sections enrolled)
app.get('/api/students/:studentId/courses', async (req, res) => {
    try {
        const { studentId } = req.params;

        // 1. Get enrollments for the student
        const { data: enrollments, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select(`
                section_id,
                grade_id,
                center_id
            `)
            .eq('student_id', studentId);

        if (enrollmentsError) throw enrollmentsError;
        if (!enrollments || enrollments.length === 0) {
            return res.json([]);
        }

        const sectionIds = enrollments.map(e => e.section_id);

        // 2. Get sections details
        const { data: sections, error: sectionsError } = await supabase
            .from('sections')
            .select(`
                id,
                name,
                short_name,
                grade_id
            `)
            .in('id', sectionIds);

        if (sectionsError) throw sectionsError;

        // 3. Get grades and centers details to format exactly like ProfessorDashboard expects
        const { data: grades, error: gradesError } = await supabase
            .from('grades')
            .select('id, name, center_id')
            .in('id', enrollments.map(e => e.grade_id));
            
        if (gradesError) throw gradesError;

        const { data: centers, error: centersError } = await supabase
            .from('centers')
            .select('id, name')
            .in('id', grades?.map(g => g.center_id) || []);

        if (centersError) throw centersError;

        // Format the response
        const formattedCourses = sections?.map(section => {
            const grade = grades?.find(g => g.id === section.grade_id);
            const center = centers?.find(c => c.id === grade?.center_id);
            
            return {
                id: section.id,
                name: section.name,
                short_name: section.short_name,
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
app.get('/api/students/:studentId/progress', async (req, res) => {
    try {
        const { studentId } = req.params;

        // Get student basic info
        const { data: student, error: studentError } = await supabase
            .from('users')
            .select('id, email, full_name, firstname, lastname, avatar_url')
            .eq('id', studentId)
            .single();

        if (studentError) throw studentError;

        // Get enrollments to find sections
        const { data: enrollments, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select('section_id')
            .eq('student_id', studentId);

        if (enrollmentsError) throw enrollmentsError;
        
        const sectionIds = enrollments?.map(e => e.section_id) || [];
        
        // Get subjects for those sections
        const { data: subjects, error: subjectsError } = await supabase
            .from('subjects')
            .select('id, name')
            .in('section_id', sectionIds);

        // Get student progress for courses
        const { data: progressData } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', studentId);

        // Get completed tasks with grades
        const { data: completions, error: completionsError } = await supabase
            .from('user_task_completions')
            .select(`
                id,
                score,
                teacher_feedback,
                graded_at,
                course_tasks!inner(title, course_id)
            `)
            .eq('user_id', studentId)
            .order('graded_at', { ascending: false });

        if (completionsError) throw completionsError;

        // Get comments
        const { data: comments, error: commentsError } = await supabase
            .from('student_comments')
            .select('id, text, author_name, created_at, updated_at')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

        if (commentsError) throw commentsError;

        // Format response
        const studentData = {
            id: student.id,
            name: student.full_name || `${student.firstname || ''} ${student.lastname || ''}`.trim() || 'Alumno',
            email: student.email,
            avatar: student.avatar_url,
            courses: subjects?.map(sub => {
                const p = progressData?.find(p => p.course_id === sub.id);
                return {
                    id: sub.id,
                    name: sub.name,
                    progress: p?.progress_percentage || 0,
                    color: 'purple'
                };
            }) || [],
            grades: completions?.filter(c => c.score !== null).map((c: any) => ({
                id: c.id,
                courseName: subjects?.find(s => s.id === c.course_tasks.course_id)?.name || 'Materia',
                grade: c.score,
                maxGrade: 100,
                assignmentName: c.course_tasks.title,
                gradedAt: c.graded_at
            })) || [],
            comments: comments?.map(c => ({
                id: c.id,
                text: c.text,
                author: c.author_name,
                date: new Date(c.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
            })) || []
        };

        res.json(studentData);
    } catch (error: any) {
        console.error('Error fetching student progress:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all students for a professor
app.get('/api/students', async (req, res) => {
    try {
        const { professorId } = req.query;

        if (!professorId) {
            return res.status(400).json({ error: 'Professor ID is required' });
        }

        // 1. Get subjects taught by professor to find their sections
        const { data: profSubjects, error: profSubjError } = await supabase
            .from('professor_subjects')
            .select('subjects!inner(section_id)')
            .eq('professor_id', professorId);

        if (profSubjError) throw profSubjError;

        const sectionIds = [...new Set(profSubjects?.map(ps => (ps.subjects as any).section_id))];

        if (sectionIds.length === 0) return res.json([]);

        // 2. Get enrollments for those sections
        const { data: enrollments, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select('student_id')
            .in('section_id', sectionIds);

        if (enrollmentsError) throw enrollmentsError;

        // Get unique student IDs
        const studentIds = [...new Set(enrollments?.map(e => e.student_id) || [])];

        if (studentIds.length === 0) {
            return res.json([]);
        }

        // Get student details
        const { data: students, error: studentsError } = await supabase
            .from('users')
            .select('id, email, full_name, firstname, lastname, avatar_url')
            .in('id', studentIds);

        if (studentsError) throw studentsError;

        const formattedStudents = students?.map((student, index) => ({
            id: index + 1,
            userId: student.id,
            name: student.full_name || `${student.firstname || ''} ${student.lastname || ''}`.trim() || 'Alumno',
            email: student.email,
            description: student.email,
            color: ['orange', 'salmon'][index % 2] // Alternate colors
        })) || [];

        res.json(formattedStudents);
    } catch (error: any) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add comment to student
app.post('/api/students/:studentId/comments', async (req, res) => {
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

// Update comment
app.put('/api/comments/:commentId', async (req, res) => {
    try {
        const { commentId } = req.params;
        const { text, professorId } = req.body;

        if (!text || !professorId) {
            return res.status(400).json({ error: 'Text and professorId are required' });
        }

        // Verify professor owns the comment
        const { data: comment, error: checkError } = await supabase
            .from('student_comments')
            .select('professor_id')
            .eq('id', commentId)
            .single();

        if (checkError) throw checkError;

        if (comment.professor_id !== professorId) {
            return res.status(403).json({ error: 'Unauthorized to edit this comment' });
        }

        const { data, error } = await supabase
            .from('student_comments')
            .update({ text })
            .eq('id', commentId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            id: data.id,
            text: data.text,
            author: data.author_name,
            date: new Date(data.updated_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        });
    } catch (error: any) {
        console.error('Error updating comment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete comment
app.delete('/api/comments/:commentId', async (req, res) => {
    try {
        const { commentId } = req.params;
        const { professorId } = req.query;

        if (!professorId) {
            return res.status(400).json({ error: 'Professor ID is required' });
        }

        // Verify professor owns the comment
        const { data: comment, error: checkError } = await supabase
            .from('student_comments')
            .select('professor_id')
            .eq('id', commentId)
            .single();

        if (checkError) throw checkError;

        if (comment.professor_id !== professorId) {
            return res.status(403).json({ error: 'Unauthorized to delete this comment' });
        }

        const { error } = await supabase
            .from('student_comments')
            .delete()
            .eq('id', commentId);

        if (error) throw error;

        res.json({ message: 'Comment deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get professor's courses
app.get('/api/professors/:professorId/courses', async (req, res) => {
    try {
        const { professorId } = req.params;

        const { data: profSubjects, error } = await supabase
            .from('professor_subjects')
            .select('subjects(id, name, description, created_at)')
            .eq('professor_id', professorId);

        if (error) throw error;
        
        const courses = profSubjects?.map(ps => {
            const subject = ps.subjects as any;
            return {
                ...subject,
                color: 'purple',
                total_steps: 0
            };
        }) || [];

        res.json(courses);
    } catch (error: any) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get grade summary for all students of a professor
app.get('/api/professors/:professorId/grades-summary', async (req, res) => {
    try {
        const { professorId } = req.params;

        // 1. Get subjects taught by professor to find their sections
        const { data: profSubjects, error: profSubjError } = await supabase
            .from('professor_subjects')
            .select('subjects!inner(section_id)')
            .eq('professor_id', professorId);

        if (profSubjError) throw profSubjError;

        const sectionIds = [...new Set(profSubjects?.map(ps => (ps.subjects as any).section_id))];

        if (sectionIds.length === 0) return res.json([]);

        // 2. Get enrollments for those sections
        const { data: enrollments, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select('student_id')
            .in('section_id', sectionIds);

        if (enrollmentsError) throw enrollmentsError;

        const studentIds = [...new Set(enrollments?.map(e => e.student_id))];

        if (studentIds.length === 0) return res.json([]);

        // 3. Get Student Info
        const { data: students, error: studentsError } = await supabase
            .from('users')
            .select('id, full_name, email, firstname, lastname, avatar_url')
            .in('id', studentIds);

        if (studentsError) throw studentsError;

        // 4. Get Task Completions for these students
        const { data: completions, error: completionsError } = await supabase
            .from('user_task_completions')
            .select('user_id, score')
            .in('user_id', studentIds)
            .not('score', 'is', null);

        if (completionsError) throw completionsError;

        // 5. Calculate Averages
        const summary = students!.map((student, index) => {
            const studentCompletions = completions?.filter(c => c.user_id === student.id) || [];

            let average = 0;
            if (studentCompletions.length > 0) {
                const sum = studentCompletions.reduce((acc, c) => acc + (c.score || 0), 0);
                average = sum / studentCompletions.length;
            }

            return {
                id: index + 1,
                userId: student.id,
                name: student.full_name || `${student.firstname || ''} ${student.lastname || ''}`.trim() || 'Alumno',
                email: student.email,
                avatar: student.avatar_url,
                average: Math.round(average),
                color: ['purple', 'orange', 'salmon', 'blue'][index % 4]
            };
        });

        res.json(summary);

    } catch (error: any) {
        console.error('Error fetching grades summary:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update grade
app.put('/api/grades/:gradeId', async (req, res) => {
    try {
        const { gradeId } = req.params;
        const { grade } = req.body;

        if (grade === undefined) {
            return res.status(400).json({ error: 'Grade is required' });
        }

        const { data, error } = await supabase
            .from('user_task_completions')
            .update({ score: grade, graded_at: new Date().toISOString() })
            .eq('id', gradeId)
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error: any) {
        console.error('Error updating grade:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get unique assignments (derived from course_tasks and completions)
app.get('/api/professors/:professorId/assignments', async (req, res) => {
    try {
        const { professorId } = req.params;

        // Get subjects for professor
        const { data: profSubjects, error: profSubjError } = await supabase
            .from('professor_subjects')
            .select('subject_id, subjects(name)')
            .eq('professor_id', professorId);

        if (profSubjError) throw profSubjError;

        if (!profSubjects || profSubjects.length === 0) return res.json([]);

        const subjectIds = profSubjects.map(ps => ps.subject_id);

        // Get tasks for those subjects
        const { data: tasks, error: tasksError } = await supabase
            .from('course_tasks')
            .select('id, course_id, title')
            .in('course_id', subjectIds);

        if (tasksError) throw tasksError;

        if (!tasks || tasks.length === 0) return res.json([]);

        const taskIds = tasks.map(t => t.id);

        // Get completions
        const { data: completions, error: completionsError } = await supabase
            .from('user_task_completions')
            .select('task_id, score')
            .in('task_id', taskIds);

        if (completionsError) throw completionsError;

        // Aggregate
        const assignmentsMap = new Map();

        tasks.forEach(task => {
            const subjectName = (profSubjects.find(ps => ps.subject_id === task.course_id)?.subjects as any)?.name || 'Materia';
            const key = `${task.course_id}-${task.id}`;
            
            assignmentsMap.set(key, {
                id: key,
                title: task.title,
                courseName: subjectName,
                total: 0,
                graded: 0
            });
        });
        
        completions?.forEach(c => {
            const task = tasks.find(t => t.id === c.task_id);
            if (!task) return;
            const key = `${task.course_id}-${task.id}`;
            const assignment = assignmentsMap.get(key);
            if (assignment) {
                assignment.total++;
                if (c.score !== null) {
                    assignment.graded++;
                }
            }
        });

        res.json(Array.from(assignmentsMap.values()));

    } catch (error: any) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get submissions for an assignment
app.get('/api/assignments/submissions', async (req, res) => {
    try {
        const { assignment, course } = req.query;

        if (!assignment || !course) {
            return res.status(400).json({ error: 'Assignment and Course are required' });
        }
        
        // Find subject by name
        const { data: subjects, error: subjError } = await supabase
            .from('subjects')
            .select('id')
            .eq('name', course)
            .limit(1);
            
        if (subjError || !subjects || subjects.length === 0) throw new Error('Subject not found');
        const subjectId = subjects[0].id;
        
        // Find task by title and subject
        const { data: tasks, error: taskError } = await supabase
            .from('course_tasks')
            .select('id')
            .eq('title', assignment)
            .eq('course_id', subjectId)
            .limit(1);
            
        if (taskError || !tasks || tasks.length === 0) throw new Error('Task not found');
        const taskId = tasks[0].id;

        const { data: completions, error } = await supabase
            .from('user_task_completions')
            .select(`
                id,
                score,
                graded_at,
                user_id,
                users!inner(full_name)
             `)
            .eq('task_id', taskId);

        if (error) throw error;

        const result = completions?.map(c => {
            return {
                gradeId: c.id,
                studentId: c.user_id,
                studentName: (c.users as any)?.full_name || 'Estudiante',
                grade: c.score,
                maxGrade: 100,
                status: (c.score !== null) ? 'Calificado' : 'Pendiente'
            };
        });

        res.json(result || []);

    } catch (error: any) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ADMIN ENDPOINTS - HIERARCHICAL STRUCTURE
// ============================================

// ========== USER MANAGEMENT ==========

// Create new user (Admin, Teacher, Student)
app.post('/api/admin/users', async (req, res) => {
    try {
        const { email, password, fullName, role } = req.body;

        if (!email || !password || !fullName || !role) {
            return res.status(400).json({ error: 'Email, password, full name, and role are required' });
        }

        // 1. Create user in Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });

        if (authError) throw authError;

        if (!authUser.user) {
            throw new Error('Failed to create user object');
        }

        // 2. Create profile in 'users' table with role
        // Note: The 'users' table in public schema is usually synchronized with auth.users via triggers.
        // If we need to set specific fields like 'role' which might not be in the trigger, we should update it.
        // First, let's try to upsert to ensure it exists and has the role.

        const { error: profileError } = await supabase
            .from('users')
            .upsert({
                id: authUser.user.id,
                email: email,
                full_name: fullName,
                role: role, // Assuming 'role' column exists in public.users
                // Default fields if needed
                firstname: fullName.split(' ')[0],
                lastname: fullName.split(' ').slice(1).join(' ')
            });

        if (profileError) {
            // If profile creation fails, we might want to delete the auth user to keep consistency,
            // but for now let's just throw error.
            console.error('Error creating profile:', profileError);
            throw profileError;
        }

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: authUser.user.id,
                email,
                fullName,
                role
            }
        });

    } catch (error: any) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== EDUCATIONAL CENTERS ==========

// Get all educational centers
app.get('/api/admin/centers', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('educational_centers')
            .select('*')
            .order('name');

        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        console.error('Error fetching centers:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get specific educational center
app.get('/api/admin/centers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('educational_centers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Center not found' });

        res.json(data);
    } catch (error: any) {
        console.error('Error fetching center:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create educational center
app.post('/api/admin/centers', async (req, res) => {
    try {
        const { name, address, phone, email } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const { data, error } = await supabase
            .from('educational_centers')
            .insert({ name, address, phone, email })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error creating center:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update educational center
app.put('/api/admin/centers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, phone, email, is_active } = req.body;

        const { data, error } = await supabase
            .from('educational_centers')
            .update({ name, address, phone, email, is_active })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        console.error('Error updating center:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete educational center
app.delete('/api/admin/centers/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('educational_centers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Center deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting center:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== CENTER PROFESSORS ==========

// Get professors for a center
app.get('/api/admin/centers/:centerId/professors', async (req, res) => {
    return res.json([{ debug: 'SERVER_IS_UPDATED_AND_RUNNING_MY_CODE' }]);
    /*
    try {
        const { centerId } = req.params;
    
        console.log(`Fetching professors for center: ${centerId}`);
    
        // Get user_ids from junction table
        const { data: relations, error: relationError } = await supabase
            .from('center_professors')
            .select('user_id')
            .eq('center_id', centerId);
    
        if (relationError) throw relationError;
    
        const userIds = relations?.map(r => r.user_id) || [];
    
        if (userIds.length === 0) {
            return res.json([]);
        }
    
        // Get user details
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email, full_name, firstname, lastname') // Removed avatar_url
            .in('id', userIds);
    
        if (usersError) {
            console.error('Error fetching users in getCenterProfessors:', usersError);
            throw usersError;
        }
    
        console.log(`Found ${users?.length} users for center ${centerId}`);
        res.json(users || []);
    } catch (error: any) {
        console.error('Error fetching center professors FULL:', JSON.stringify(error, null, 2));
        res.status(500).json({ error: error.message, details: error });
    }
        */
});

// Assign professor to center
app.post('/api/admin/centers/:centerId/professors', async (req, res) => {
    try {
        const { centerId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const { data, error } = await supabase
            .from('center_professors')
            .insert({ center_id: centerId, user_id: userId })
            .select()
            .single();

        if (error) {
            // Check for duplicate key error (already assigned)
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Professor already assigned to this center' });
            }
            throw error;
        }

        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error assigning professor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get centers for a professor
app.get('/api/professors/:professorId/centers', async (req, res) => {
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

// Unassign professor from center
app.delete('/api/admin/centers/:centerId/professors/:userId', async (req, res) => {
    try {
        const { centerId, userId } = req.params;

        const { error } = await supabase
            .from('center_professors')
            .delete()
            .match({ center_id: centerId, user_id: userId });

        if (error) throw error;

        res.json({ message: 'Professor unassigned successfully' });
    } catch (error: any) {
        console.error('Error unassigning professor:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== GRADES ==========

// Get grades by center
app.get('/api/admin/centers/:centerId/grades', async (req, res) => {
    try {
        const { centerId } = req.params;

        const { data, error } = await supabase
            .from('grades_levels')
            .select('*')
            .eq('center_id', centerId)
            .order('level');

        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        console.error('Error fetching grades:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create grade
app.post('/api/admin/grades', async (req, res) => {
    try {
        const { center_id, name, level } = req.body;

        if (!center_id || !name) {
            return res.status(400).json({ error: 'Center ID and name are required' });
        }

        const { data, error } = await supabase
            .from('grades_levels')
            .insert({ center_id, name, level })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error creating grade:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get grade by ID
app.get('/api/admin/grades/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('grades_levels')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Grade not found' });

        res.json(data);
    } catch (error: any) {
        console.error('Error fetching grade:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update grade
app.put('/api/admin/grades/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, level, is_active } = req.body;

        const { data, error } = await supabase
            .from('grades_levels')
            .update({ name, level, is_active })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        console.error('Error updating grade:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete grade
app.delete('/api/admin/grades/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('grades_levels')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Grade deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting grade:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== SECTIONS ==========

// Get sections by grade
app.get('/api/admin/grades/:gradeId/sections', async (req, res) => {
    try {
        const { gradeId } = req.params;

        const { data, error } = await supabase
            .from('sections')
            .select('*')
            .eq('grade_id', gradeId)
            .order('name');

        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        console.error('Error fetching sections:', error);
        res.status(500).json({
            error: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
    }
});

// Create section
app.post('/api/admin/sections', async (req, res) => {
    try {
        const { grade_id, name, max_students } = req.body;

        if (!grade_id || !name) {
            return res.status(400).json({ error: 'Grade ID and name are required' });
        }

        const { data, error } = await supabase
            .from('sections')
            .insert({ grade_id, name, max_students })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error creating section:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update section
app.put('/api/admin/sections/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, max_students, is_active } = req.body;

        const { data, error } = await supabase
            .from('sections')
            .update({ name, max_students, is_active })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        console.error('Error updating section:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single section by ID
app.get('/api/admin/sections/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('sections')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Section not found' });

        res.json(data);
    } catch (error: any) {
        console.error('Error fetching section:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete section
// ========== SECTION PROFESSORS ==========

// Get professors for a section
app.get('/api/admin/sections/:sectionId/professors', async (req, res) => {
    try {
        const { sectionId } = req.params;

        console.log(`Fetching professors for section: ${sectionId}`);

        // Get user_ids from junction table
        const { data: relations, error: relationError } = await supabase
            .from('section_professors')
            .select('user_id')
            .eq('section_id', sectionId);

        if (relationError) throw relationError;

        const userIds = relations?.map(r => r.user_id) || [];

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
        console.error('Error fetching section professors:', error);
        // Fallback for missing table
        if (error.code === '42P01') {
            return res.json([]);
        }
        res.status(500).json({ error: error.message });
    }
});

// Assign professor to section
app.post('/api/admin/sections/:sectionId/professors', async (req, res) => {
    try {
        const { sectionId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const { data, error } = await supabase
            .from('section_professors')
            .insert({ section_id: sectionId, user_id: userId })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Professor already assigned to this section' });
            }
            throw error;
        }

        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error assigning professor to section:', error);
        res.status(500).json({ error: error.message });
    }
});

// Unassign professor from section
app.delete('/api/admin/sections/:sectionId/professors/:userId', async (req, res) => {
    try {
        const { sectionId, userId } = req.params;

        const { error } = await supabase
            .from('section_professors')
            .delete()
            .match({ section_id: sectionId, user_id: userId });

        if (error) throw error;

        res.json({ message: 'Professor unassigned from section successfully' });
    } catch (error: any) {
        console.error('Error unassigning professor from section:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== COURSE CONTENT (MODULES & ITEMS) ==========

// Get modules for a subject
app.get('/api/admin/subjects/:subjectId/modules', async (req, res) => {
    try {
        const { subjectId } = req.params;

        const { data, error } = await supabase
            .from('modules')
            .select(`
                *,
                items:module_items(*)
            `)
            .eq('subject_id', subjectId)
            .order('order_index');

        if (error) throw error;

        // Process items to sign URLs if they are PDFs
        const modules = await Promise.all(data?.map(async (module) => {
            const items = await Promise.all((module.items || []).map(async (item: any) => {
                if (item.type === 'pdf' && item.content_url) {
                    // Generate signed URL for PDF content
                    try {
                        const { data: urlData } = await supabase.storage
                            .from('grade-content')
                            .createSignedUrl(item.content_url, 3600);
                        return { ...item, content_url: urlData?.signedUrl || item.content_url };
                    } catch (e) {
                        return item;
                    }
                }
                return item;
            }));

            return {
                ...module,
                items: items.sort((a: any, b: any) => a.order_index - b.order_index)
            };
        }) || []);

        res.json(modules);
    } catch (error: any) {
        console.error('Error fetching modules:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create module
app.post('/api/admin/subjects/:subjectId/modules', async (req, res) => {
    try {
        const { subjectId } = req.params;
        const { title, order_index } = req.body;

        const { data, error } = await supabase
            .from('modules')
            .insert({ subject_id: subjectId, title, order_index })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error creating module:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update module
app.put('/api/admin/modules/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, order_index, is_active } = req.body;

        const { data, error } = await supabase
            .from('modules')
            .update({ title, order_index, is_active })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        console.error('Error updating module:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete module
app.delete('/api/admin/modules/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('modules')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Module deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting module:', error);
        res.status(500).json({ error: error.message });
    }
});

// ITEMS

// Create item (Standard JSON)
app.post('/api/admin/modules/:moduleId/items', async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { type, title, description, content_url, order_index } = req.body;

        const { data, error } = await supabase
            .from('module_items')
            .insert({
                module_id: moduleId,
                type,
                title,
                description,
                content_url,
                order_index,
                is_visible: true
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error creating item:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload item (Multipart)
app.post('/api/admin/modules/:moduleId/items/upload', upload.single('file'), async (req, res) => {
    try {
        const { moduleId } = req.params;
        const file = req.file;
        const { title, description, order_index } = req.body;

        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        // Generate file path
        const timestamp = Date.now();
        const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `modules/${moduleId}/${timestamp}_${sanitizedFileName}`;

        // Upload to Storage
        const { error: uploadError } = await supabase.storage
            .from('grade-content')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (uploadError) throw uploadError;

        // Create DB record
        const { data, error } = await supabase
            .from('module_items')
            .insert({
                module_id: moduleId,
                type: 'pdf',
                title: title || file.originalname,
                description,
                content_url: filePath,
                order_index: order_index || 999,
                is_visible: true
            })
            .select()
            .single();

        if (error) {
            // Cleanup file if DB insert fails
            await supabase.storage.from('grade-content').remove([filePath]);
            throw error;
        }

        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error uploading module item:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete module
app.delete('/api/admin/modules/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('course_modules')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Module deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting module:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create item
app.post('/api/admin/modules/:moduleId/items', async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { type, title, description, content_url, order_index } = req.body;

        const { data, error } = await supabase
            .from('module_items')
            .insert({ module_id: moduleId, type, title, description, content_url, order_index })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error creating item:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update item
app.put('/api/admin/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, content_url, order_index, is_visible } = req.body;

        const { data, error } = await supabase
            .from('module_items')
            .update({ title, description, content_url, order_index, is_visible })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        console.error('Error updating item:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete item
app.delete('/api/admin/items/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('module_items')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Item deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/sections/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('sections')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Section deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting section:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== SUBJECTS ==========

// Get subjects by section
app.get('/api/admin/sections/:sectionId/subjects', async (req, res) => {
    try {
        const { sectionId } = req.params;

        const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .eq('section_id', sectionId)
            .order('name');

        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create subject
app.post('/api/admin/subjects', async (req, res) => {
    try {
        const { section_id, name, description, hours_per_week } = req.body;

        if (!section_id || !name) {
            return res.status(400).json({ error: 'Section ID and name are required' });
        }

        const { data, error } = await supabase
            .from('subjects')
            .insert({ section_id, name, description, hours_per_week })
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
app.put('/api/admin/subjects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, hours_per_week, is_active } = req.body;

        const { data, error } = await supabase
            .from('subjects')
            .update({ name, description, hours_per_week, is_active })
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
app.delete('/api/admin/subjects/:id', async (req, res) => {
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

// ========== HIERARCHY VIEW ==========

// Get complete hierarchy for a center
app.get('/api/admin/centers/:centerId/hierarchy', async (req, res) => {
    try {
        const { centerId } = req.params;

        // Get center info
        const { data: center, error: centerError } = await supabase
            .from('educational_centers')
            .select('*')
            .eq('id', centerId)
            .single();

        if (centerError) throw centerError;

        // Get grades with sections and subjects
        const { data: grades, error: gradesError } = await supabase
            .from('grades_levels')
            .select(`
            *,
            sections (
                *,
                subjects (*)
            )
        `)
            .eq('center_id', centerId)
            .order('level');

        if (gradesError) throw gradesError;

        res.json({
            center,
            grades: grades || []
        });
    } catch (error: any) {
        console.error('Error fetching hierarchy:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== GRADE CONTENT MANAGEMENT ==========

// Get all content for a grade (Admin/Professor/Student with access)
app.get('/api/grades/:gradeId/content', async (req, res) => {
    try {
        const { gradeId } = req.params;
        const { userId, role } = req.query;

        if (!userId || !role) {
            return res.status(400).json({ error: 'User ID and Role are required' });
        }

        let hasAccess = false;

        if (role === 'admin') {
            hasAccess = true;
        } else if (role === 'professor') {
            // Check if professor is assigned to the center of this grade
            const { data: grade } = await supabase
                .from('grades_levels')
                .select('center_id')
                .eq('id', gradeId)
                .single();

            if (grade) {
                const { data: relation } = await supabase
                    .from('center_professors')
                    .select('id')
                    .eq('center_id', grade.center_id)
                    .eq('user_id', userId)
                    .single();

                if (relation) hasAccess = true;
            }
        } else if (role === 'student') {
            // Check if student is enrolled in a course belonging to a section of this grade
            const { data: sections } = await supabase
                .from('sections')
                .select('course_id')
                .eq('grade_id', gradeId);

            const { data: enrollments } = await supabase
                .from('enrollments')
                .select('course_id')
                .eq('student_id', userId);

            const sectionCourseIds = sections?.map(s => s.course_id).filter(id => id) || [];
            const studentCourseIds = enrollments?.map(e => e.course_id) || [];

            if (sectionCourseIds.some(id => studentCourseIds.includes(id))) {
                hasAccess = true;
            }
        }

        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this grade content' });
        }

        // Fetch content
        const { data, error } = await supabase
            .from('grade_content')
            .select('*')
            .eq('grade_id', gradeId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Generate signed URLs
        const contentWithUrls = await Promise.all(
            (data || []).map(async (content) => {
                try {
                    const { data: urlData } = await supabase.storage
                        .from('grade-content')
                        .createSignedUrl(content.file_path, 3600);

                    return {
                        ...content,
                        download_url: urlData?.signedUrl || null
                    };
                } catch (err) {
                    console.error('Error generating signed URL:', err);
                    return {
                        ...content,
                        download_url: null
                    };
                }
            })
        );

        res.json(contentWithUrls);
    } catch (error: any) {
        console.error('Error fetching grade content:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin only endpoint (kept for compatibility or specific admin dashboard usage)
app.get('/api/admin/grades/:gradeId/content', async (req, res) => {
    try {
        const { gradeId } = req.params;
        // Admin assumed access
        const { data, error } = await supabase
            .from('grade_content')
            .select('*')
            .eq('grade_id', gradeId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        // ... (rest of implementation similar to above) ...
        if (error) throw error;

        const contentWithUrls = await Promise.all(
            (data || []).map(async (content) => {
                try {
                    const { data: urlData } = await supabase.storage
                        .from('grade-content')
                        .createSignedUrl(content.file_path, 3600);
                    return { ...content, download_url: urlData?.signedUrl || null };
                } catch (err) {
                    return { ...content, download_url: null };
                }
            })
        );
        res.json(contentWithUrls);
    } catch (error: any) {
        console.error('Error fetching grade content (admin):', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload content to a grade (multiple files)
app.post('/api/admin/grades/:gradeId/content', upload.array('files', 10), async (req, res) => {
    try {
        const { gradeId } = req.params;
        const files = req.files as Express.Multer.File[];
        const { titles } = req.body; // Optional array of titles

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files provided' });
        }

        // Verify grade exists
        const { data: grade, error: gradeError } = await supabase
            .from('grades_levels')
            .select('id, center_id')
            .eq('id', gradeId)
            .single();

        if (gradeError || !grade) {
            return res.status(404).json({ error: 'Grade not found' });
        }

        const uploadedContent = [];
        const errors = [];

        // Parse titles if provided
        let parsedTitles: string[] = [];
        if (titles) {
            try {
                parsedTitles = typeof titles === 'string' ? JSON.parse(titles) : titles;
            } catch (e) {
                parsedTitles = [];
            }
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const title = parsedTitles[i] || file.originalname.replace('.pdf', '');

            try {
                // Generate unique file path
                const timestamp = Date.now();
                const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
                const filePath = `${grade.center_id}/${gradeId}/${timestamp}_${sanitizedFileName}`;

                // Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('grade-content')
                    .upload(filePath, file.buffer, {
                        contentType: file.mimetype,
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                // Create database record
                const { data: contentData, error: contentError } = await supabase
                    .from('grade_content')
                    .insert({
                        grade_id: gradeId,
                        title: title,
                        file_name: file.originalname,
                        file_path: filePath,
                        file_size: file.size
                    })
                    .select()
                    .single();

                if (contentError) {
                    // If DB insert fails, delete the uploaded file
                    await supabase.storage.from('grade-content').remove([filePath]);
                    throw contentError;
                }

                uploadedContent.push(contentData);
            } catch (error: any) {
                console.error(`Error uploading file ${file.originalname}:`, error);
                errors.push({
                    fileName: file.originalname,
                    error: error.message
                });
            }
        }

        if (uploadedContent.length === 0) {
            return res.status(500).json({
                error: 'Failed to upload any files',
                details: errors
            });
        }

        res.status(201).json({
            message: `Successfully uploaded ${uploadedContent.length} of ${files.length} files`,
            content: uploadedContent,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error: any) {
        console.error('Error uploading content:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete content
app.delete('/api/admin/content/:contentId', async (req, res) => {
    try {
        const { contentId } = req.params;

        // Get content info first
        const { data: content, error: fetchError } = await supabase
            .from('grade_content')
            .select('file_path')
            .eq('id', contentId)
            .single();

        if (fetchError || !content) {
            return res.status(404).json({ error: 'Content not found' });
        }

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('grade-content')
            .remove([content.file_path]);

        if (storageError) {
            console.error('Error deleting from storage:', storageError);
            // Continue with DB deletion even if storage deletion fails
        }

        // Delete from database
        const { error: deleteError } = await supabase
            .from('grade_content')
            .delete()
            .eq('id', contentId);

        if (deleteError) throw deleteError;

        res.json({ message: 'Content deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting content:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get download URL for specific content
app.get('/api/admin/content/:contentId/download-url', async (req, res) => {
    try {
        const { contentId } = req.params;

        const { data: content, error: fetchError } = await supabase
            .from('grade_content')
            .select('file_path, file_name')
            .eq('id', contentId)
            .single();

        if (fetchError || !content) {
            return res.status(404).json({ error: 'Content not found' });
        }

        const { data: urlData, error: urlError } = await supabase.storage
            .from('grade-content')
            .createSignedUrl(content.file_path, 3600); // 1 hour expiry

        if (urlError) throw urlError;

        res.json({
            download_url: urlData.signedUrl,
            file_name: content.file_name
        });
    } catch (error: any) {
        console.error('Error generating download URL:', error);
        res.status(500).json({ error: error.message });
    }
});

// Basic Route
app.get('/', (req, res) => {
    res.send('Backend API Running 🚀');
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global Error Handler:', err);
    res.status(500).json({
        error: err.message || 'Internal Server Error',
        stack: err.stack,
        details: JSON.stringify(err)
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
})