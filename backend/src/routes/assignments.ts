import { Router } from 'express';
import { supabase } from '../config/supabase';
import { upload, assignmentUpload } from '../middleware/upload';

const router = Router();

// GET a single assignment, with the current student's own submission (if any)
router.get('/api/assignments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { student_id } = req.query;

        const { data: assignment, error } = await supabase
            .from('assignments')
            .select(`
                id, title, instructions_md, due_at, available_from, max_score,
                allowed_file_types, max_file_size_mb, allow_resubmission, status,
                subjects(id, name, short_name)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        let submission = null;
        if (student_id) {
            const { data: subData, error: subError } = await supabase
                .from('submissions')
                .select(`
                    id, submitted_at, graded_at, graded_by, feedback_md, grade, status,
                    attempt_number, body_md,
                    submission_files(id, file_name, storage_path, external_url, mime_type, file_size_bytes, uploaded_at)
                `)
                .eq('assignment_id', id)
                .eq('student_id', student_id)
                .order('submitted_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (subError) throw subError;
            if (subData) {
                const { submission_files, ...s } = subData;
                submission = { ...s, files: submission_files || [] };
            }
        }

        res.json({ ...assignment, submission });
    } catch (error: any) {
        console.error('Error fetching assignment:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH update assignment
router.patch('/api/assignments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            module_id,
            title,
            instructions_md,
            due_at,
            available_from,
            max_score,
            allowed_file_types,
            max_file_size_mb,
            allow_resubmission,
            status,
        } = req.body;

        const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
        if (title !== undefined) updatePayload.title = title;
        if (instructions_md !== undefined) updatePayload.instructions_md = instructions_md;
        if (module_id !== undefined) updatePayload.module_id = module_id || null;
        if (due_at !== undefined) updatePayload.due_at = due_at || null;
        if (available_from !== undefined) updatePayload.available_from = available_from || null;
        if (max_score !== undefined) updatePayload.max_score = max_score != null ? Number(max_score) : null;
        if (allowed_file_types !== undefined) updatePayload.allowed_file_types = allowed_file_types;
        if (max_file_size_mb !== undefined) updatePayload.max_file_size_mb = max_file_size_mb != null ? Number(max_file_size_mb) : null;
        if (allow_resubmission !== undefined) updatePayload.allow_resubmission = allow_resubmission;
        if (status !== undefined) updatePayload.status = status;

        const { data, error } = await supabase
            .from('assignments')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        console.error('Error updating assignment:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE assignment
router.delete('/api/assignments/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('assignments')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Assignment deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Submit an assignment
router.post('/api/assignments/:id/submit', upload.array('files'), async (req, res) => {
    try {
        const { id } = req.params;
        const { student_id, body_md } = req.body;
        const files: any[] = Array.isArray(req.files)
            ? req.files
            : (req.files ? Object.values(req.files).flat() : []);

        if (!student_id) {
            return res.status(400).json({ error: 'student_id is required' });
        }

        // Enforce the due date server-side
        const { data: assignment, error: assignmentError } = await supabase
            .from('assignments')
            .select('due_at')
            .eq('id', id)
            .single();

        if (assignmentError) throw assignmentError;

        if (assignment.due_at && new Date(assignment.due_at).getTime() < Date.now()) {
            return res.status(400).json({ error: 'La fecha límite de entrega ya pasó.' });
        }

        // Find and wipe ALL existing submissions for this student+assignment
        // (not .maybeSingle() — legacy data may have multiple rows per student+assignment)
        const { data: existingSubs, error: existingError } = await supabase
            .from('submissions')
            .select('id, submission_files(id, storage_path)')
            .eq('assignment_id', id)
            .eq('student_id', student_id);

        if (existingError) throw existingError;

        if (existingSubs && existingSubs.length > 0) {
            const allPaths = existingSubs
                .flatMap(sub => sub.submission_files || [])
                .map(f => f.storage_path)
                .filter(Boolean);

            if (allPaths.length > 0) {
                const { error: removeError } = await supabase.storage
                    .from('submissions')
                    .remove(allPaths);
                if (removeError) console.error('Error removing old files from storage:', removeError);
            }

            const existingIds = existingSubs.map(s => s.id);

            const { error: deleteFilesError } = await supabase
                .from('submission_files')
                .delete()
                .in('submission_id', existingIds);
            if (deleteFilesError) throw deleteFilesError;

            const { error: deleteSubError } = await supabase
                .from('submissions')
                .delete()
                .in('id', existingIds);
            if (deleteSubError) throw deleteSubError;
        }

        // Create the new (only) submission
        const { data: submission, error: subError } = await supabase
            .from('submissions')
            .insert({
                assignment_id: id,
                student_id,
                body_md: body_md || null,
                status: 'submitted',
                attempt_number: 1,
                submitted_at: new Date().toISOString()
            })
            .select()
            .single();

        if (subError) throw subError;

        const uploadedFiles = [];
        for (const file of files) {
            const path = `submissions/${submission.id}/${Date.now()}-${file.originalname}`;

            const { error: uploadError } = await supabase.storage
                .from('submissions')
                .upload(path, file.buffer, { contentType: file.mimetype });

            if (uploadError) throw uploadError;

            const { data: fileRow, error: fileError } = await supabase
                .from('submission_files')
                .insert({
                    id: crypto.randomUUID(),
                    submission_id: submission.id,
                    storage_path: path,
                    file_name: file.originalname,
                    mime_type: file.mimetype,
                    file_size_bytes: file.size,
                    uploaded_at: new Date().toISOString()
                })
                .select()
                .single();

            if (fileError) throw fileError;
            uploadedFiles.push(fileRow);
        }

        res.status(201).json({ ...submission, files: uploadedFiles });
    } catch (error: any) {
        console.error('Error submitting assignment:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST create assignment from professor/course context (with optional file attachment)
router.post('/api/professors/:professorId/courses/:courseId/assignments', assignmentUpload.single('attachment'), async (req, res) => {
    try {
        const { professorId, courseId } = req.params;
        const {
            title,
            instructions_md,
            max_score,
            due_at,
            available_from,
            allow_resubmission,
            module_id
        } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        // Insert assignment
        const { data: assignment, error: assignmentError } = await supabase
            .from('assignments')
            .insert({
                title,
                instructions_md,
                max_score: max_score ? parseFloat(max_score) : null,
                due_at: due_at || null,
                available_from: available_from || null,
                allow_resubmission: allow_resubmission === 'true',
                subject_id: courseId,
                professor_id: professorId,
                module_id: module_id || null,
                status: 'published'
            })
            .select()
            .single();

        if (assignmentError) throw assignmentError;

        // Handle attachment if any
        if (req.file) {
            const file = req.file;
            const fileExt = file.originalname.split('.').pop();
            const fileName = `${assignment.id}_${Date.now()}.${fileExt}`;
            const filePath = `assignments/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('grade-content') // Reusing existing bucket, or could create 'assignments' bucket
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Insert attachment record
            const { error: attachmentError } = await supabase
                .from('assignment_attachments')
                .insert({
                    assignment_id: assignment.id,
                    file_name: file.originalname,
                    mime_type: file.mimetype,
                    storage_path: filePath
                });

            if (attachmentError) throw attachmentError;
        }

        res.status(201).json(assignment);
    } catch (error: any) {
        console.error('Error creating assignment:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
