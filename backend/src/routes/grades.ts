import { Router } from 'express';
import { supabase } from '../config/supabase';
import { upload } from '../middleware/upload';

const router = Router();

// Enroll a new student in a grade (and all of its subjects)
router.post('/api/grades/:gradeId/students', async (req, res) => {
    try {
        const { gradeId } = req.params;
        const { student_id } = req.body;

        if (!student_id) {
            return res.status(400).json({ error: 'student_id is required' });
        }

        // 0. Look up the grade to get its authoritative center_id —
        //    never trust center_id from the client, it must match the grade.
        const { data: grade, error: gradeError } = await supabase
            .from('grades_levels')
            .select('id, center_id')
            .eq('id', gradeId)
            .single();

        if (gradeError) throw gradeError;
        if (!grade) return res.status(404).json({ error: 'Grade not found' });

        // 1. Get all subjects belonging to this grade
        const { data: subjects, error: subjectsError } = await supabase
            .from('subjects')
            .select('id')
            .eq('grade_id', gradeId);

        if (subjectsError) throw subjectsError;

        if (!subjects || subjects.length === 0) {
            return res.status(400).json({ error: 'This grade has no subjects to enroll into' });
        }

        // 2. Build one enrollment row per subject
        const now = new Date().toISOString();
        const rows = subjects.map(subject => ({
            subject_id: subject.id,
            grade_id: gradeId,
            center_id: grade.center_id,
            student_id,
            created_at: now,
            status: 'active'
        }));

        // 3. Insert all enrollments at once
        const { data, error } = await supabase
            .from('enrollments')
            .insert(rows)
            .select();

        if (error) throw error;

        // 4. Update users.center_id to the most recently assigned center
        await supabase
            .from('users')
            .update({ center_id: grade.center_id })
            .eq('id', student_id);

        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error enrolling student:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get students enrolled in a specific grade
router.get('/api/grades/:gradeId/students', async (req, res) => {
    try {
        const { gradeId } = req.params;

        // 1. Get distinct student_ids enrolled in this grade
        const { data: enrollments, error: enrollErr } = await supabase
            .from('enrollments')
            .select('student_id')
            .eq('grade_id', gradeId);

        if (enrollErr) throw enrollErr;

        if (!enrollments || enrollments.length === 0) {
            return res.json([]);
        }

        const studentIds = [...new Set(enrollments.map(e => e.student_id))];

        // 2. Fetch user details for those students
        const { data: students, error: studErr } = await supabase
            .from('users')
            .select('id, full_name, email, firstname, lastname, avatar_url')
            .in('id', studentIds)
            .order('full_name', { ascending: true });

        if (studErr) throw studErr;

        const formatted = (students || []).map(s => ({
            id: s.id,
            name: s.full_name || `${s.firstname || ''} ${s.lastname || ''}`.trim() || s.email,
            email: s.email,
            avatar_url: s.avatar_url,
        }));

        res.json(formatted);
    } catch (error: any) {
        console.error('Error fetching grade students:', error);
        res.status(500).json({ error: error.message });
    }
});

// Remove a student from a grade (delete their enrollments for that grade)
router.delete('/api/grades/:gradeId/students/:studentId', async (req, res) => {
    try {
        const { gradeId, studentId } = req.params;

        const { error } = await supabase
            .from('enrollments')
            .delete()
            .eq('grade_id', gradeId)
            .eq('student_id', studentId);

        if (error) throw error;

        // Update users.center_id to the student's most recent remaining center (or null)
        const { data: remaining } = await supabase
            .from('enrollments')
            .select('center_id, created_at')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false })
            .limit(1);

        const latestCenterId = remaining && remaining.length > 0 ? remaining[0].center_id : null;
        await supabase.from('users').update({ center_id: latestCenterId }).eq('id', studentId);

        res.json({ message: 'Student removed from grade successfully' });
    } catch (error: any) {
        console.error('Error removing student from grade:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create grade
router.post('/api/grades', async (req, res) => {
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
router.get('/api/grades/:id', async (req, res) => {
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
router.put('/api/grades/:id', async (req, res) => {
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
router.delete('/api/grades/:id', async (req, res) => {
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

// Get subjects by grade
router.get('/api/grades/:gradeId/subjects', async (req, res) => {
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

// Get all content for a grade (Admin/Professor/Student with access)
router.get('/api/grades/:gradeId/content', async (req, res) => { 
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
            // Check if student is enrolled in this grade
            const { data: enrollment } = await supabase
                .from('enrollments')
                .select('id')
                .eq('student_id', userId)
                .eq('grade_id', gradeId)
                .limit(1)
                .maybeSingle();

            if (enrollment) hasAccess = true;
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

// Upload content to a grade (multiple files)
router.post('/api/grades/:gradeId/content', upload.array('files', 10), async (req, res) => {
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

export default router;
