import { Router } from 'express';
import { supabase, upload, assignmentUpload } from '../lib/supabase';

const router = Router();

// ============================================
// ASSIGNMENTS
// ============================================

// Create assignment (professor scoped — legacy endpoint with file attachment support)
router.post('/professors/:professorId/courses/:courseId/assignments', assignmentUpload.single('attachment'), async (req, res) => {
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
                .from('grade-content')
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

// GET all assignments for a subject
router.get('/subjects/:subjectId/assignments', async (req, res) => {
    try {
        const { subjectId } = req.params;

        const { data, error } = await supabase
            .from('assignments')
            .select('*')
            .eq('subject_id', subjectId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST create assignment for a subject
router.post('/subjects/:subjectId/assignments', async (req, res) => {
    try {
        const { subjectId } = req.params;
        const {
            professor_id,
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

        if (!title || !professor_id) {
            return res.status(400).json({ error: 'title and professor_id are required' });
        }

        const { data, error } = await supabase
            .from('assignments')
            .insert({
                subject_id: subjectId,
                professor_id,
                module_id: module_id || null,
                title,
                instructions_md: instructions_md || null,
                due_at: due_at || null,
                available_from: available_from || null,
                max_score: max_score != null ? Number(max_score) : null,
                allowed_file_types: allowed_file_types || null,
                max_file_size_mb: max_file_size_mb != null ? Number(max_file_size_mb) : null,
                allow_resubmission: allow_resubmission ?? null,
                status: status || 'draft',
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error creating assignment:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH update assignment
router.patch('/assignments/:id', async (req, res) => {
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
router.delete('/assignments/:id', async (req, res) => {
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

// ============================================
// SUBMISSIONS
// ============================================

// GET submissions for a subject (joins through assignments, includes all files)
router.get('/subjects/:subjectId/submissions', async (req, res) => {
    try {
        const { subjectId } = req.params;

        const { data, error } = await supabase
            .from('submissions')
            .select(`
                id, submitted_at, graded_at, graded_by, feedback_md, grade, status, body_md,
                student_id, assignment_id,
                assignments!inner(subject_id),
                users!submissions_student_id_fkey(full_name, firstname, lastname, email),
                submission_files(id, file_name, storage_path, external_url, mime_type, file_size_bytes, uploaded_at)
            `)
            .eq('assignments.subject_id', subjectId)
            .order('submitted_at', { ascending: false });

        if (error) throw error;

        const submissions = await Promise.all(
            data.map(async ({ assignments, users, submission_files, ...s }) => {
                const files = await Promise.all(
                    (submission_files || []).map(async (f) => {
                        if (f.external_url) return { ...f, signed_url: f.external_url };
                        if (!f.storage_path) return { ...f, signed_url: null };
                        const { data: signed, error: signError } = await supabase.storage
                            .from('submissions')
                            .createSignedUrl(f.storage_path, 60 * 60);
                        if (signError) {
                            console.error('Error signing file:', f.storage_path, signError);
                            return { ...f, signed_url: null };
                        }
                        return { ...f, signed_url: signed.signedUrl };
                    })
                );

                const u: any = Array.isArray(users) ? users[0] : users;
                const studentName = u?.full_name
                    || [u?.firstname, u?.lastname].filter(Boolean).join(' ')
                    || u?.email
                    || 'Alumno desconocido';

                return { ...s, studentName, files };
            })
        );

        res.json(submissions);
    } catch (error: any) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH grade a submission
router.patch('/submissions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { grade, feedback_md, graded_by, status } = req.body;

        const updatePayload = {
            ...(grade !== undefined && { grade }),
            ...(feedback_md !== undefined && { feedback_md }),
            ...(graded_by !== undefined && { graded_by }),
            ...(status !== undefined && { status }),
            graded_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('submissions')
            .update(updatePayload)
            .eq('id', id)
            .select(`
                id, submitted_at, graded_at, graded_by, feedback_md, grade, status,
                student_id, assignment_id,
                submission_files(id, file_name, storage_path, external_url, mime_type, file_size_bytes, uploaded_at)
            `)
            .single();

        if (error) throw error;

        const { submission_files, ...s } = data;
        const files = await Promise.all(
            (submission_files || []).map(async (f) => {
                if (f.external_url) return { ...f, signed_url: f.external_url };
                if (!f.storage_path) return { ...f, signed_url: null };
                const { data: signed } = await supabase.storage
                    .from('submissions')
                    .createSignedUrl(f.storage_path, 60 * 60);
                return { ...f, signed_url: signed?.signedUrl || null };
            })
        );

        res.json({ ...s, files });
    } catch (error: any) {
        console.error('Error grading submission:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET a single assignment, with the current student's own submission (if any)
router.get('/assignments/:id', async (req, res) => {
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

// POST submit an assignment
router.post('/assignments/:id/submit', upload.array('files'), async (req, res) => {
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

// ============================================
// CALENDAR EVENTS
// ============================================

// GET all calendar events for a subject
router.get('/subjects/:subjectId/calendar-events', async (req, res) => {
    try {
        const { subjectId } = req.params;

        const { data, error } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('subject_id', subjectId)
            .order('event_date', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        console.error('Error fetching calendar events:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST create calendar event
router.post('/calendar-events', async (req, res) => {
    try {
        const {
            subject_id,
            professor_id,
            title,
            description_md,
            type,
            event_date,
        } = req.body;

        if (!title || !subject_id || !professor_id) {
            return res.status(400).json({ error: 'title, subject_id and professor_id are required' });
        }

        const { data, error } = await supabase
            .from('calendar_events')
            .insert({
                subject_id,
                professor_id,
                title,
                description_md: description_md || null,
                type: type || null,
                event_date: event_date || null,
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error creating calendar event:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH update calendar event
router.patch('/calendar-events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description_md, type, event_date } = req.body;

        const updatePayload: Record<string, any> = {};
        if (title !== undefined) updatePayload.title = title;
        if (description_md !== undefined) updatePayload.description_md = description_md;
        if (type !== undefined) updatePayload.type = type;
        if (event_date !== undefined) updatePayload.event_date = event_date;

        const { data, error } = await supabase
            .from('calendar_events')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        console.error('Error updating calendar event:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE calendar event
router.delete('/calendar-events/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('calendar_events')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Event deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting calendar event:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// CALENDAR & SCHEDULE VIEWS
// ============================================

// GET calendar items (assignments + events) for a user, from now through end of year
router.get('/calendar/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.query;

        // Resolve subject ids the user has access to
        let subjectIds: string[] = [];
        if (role === 'professor') {
            const { data, error } = await supabase
                .from('professor_subjects')
                .select('subject_id')
                .eq('professor_id', userId)
                .eq('is_active', true);
            if (error) throw error;
            subjectIds = data.map(r => r.subject_id);
        } else {
            const { data, error } = await supabase
                .from('enrollments')
                .select('subject_id')
                .eq('student_id', userId)
                .eq('status', 'active');
            if (error) throw error;
            subjectIds = data.map(r => r.subject_id);
        }

        if (subjectIds.length === 0) {
            return res.json([]);
        }

        const yearStart = `${new Date().getFullYear()}-01-01`;
        const yearEnd = `${new Date().getFullYear()}-12-31`;

        const [assignmentsRes, eventsRes] = await Promise.all([
            supabase
                .from('assignments')
                .select('id, title, due_at, subject_id, subjects(name, short_name)')
                .in('subject_id', subjectIds)
                .gte('due_at', yearStart)
                .lte('due_at', yearEnd),
            supabase
                .from('calendar_events')
                .select('id, title, description_md, event_date, type, subject_id, subjects(name, short_name)')
                .in('subject_id', subjectIds)
                .gte('event_date', yearStart)
                .lte('event_date', yearEnd)
        ]);

        if (assignmentsRes.error) throw assignmentsRes.error;
        if (eventsRes.error) throw eventsRes.error;

        const assignmentItems = (assignmentsRes.data || [])
            .filter(a => a.due_at)
            .map(a => {
                const subj: any = Array.isArray(a.subjects) ? a.subjects[0] : a.subjects;
                return {
                    id: a.id,
                    kind: 'assignment',
                    title: a.title,
                    date: a.due_at.split('T')[0],
                    time: a.due_at.split('T')[1]?.substring(0, 5) || null,
                    description: null,
                    subjectName: subj?.short_name || subj?.name || null
                };
            });

        const eventItems = (eventsRes.data || []).map(e => {
            const subj: any = Array.isArray(e.subjects) ? e.subjects[0] : e.subjects;
            return {
                id: e.id,
                kind: 'event',
                title: e.title,
                date: e.event_date,
                time: null,
                description: e.description_md,
                eventType: e.type,
                subjectName: subj?.short_name || subj?.name || null
            };
        });

        res.json([...assignmentItems, ...eventItems]);
    } catch (error: any) {
        console.error('Error fetching calendar:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET weekly schedule for a user (professor or student)
router.get('/schedule/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.query;

        let subjects: any[] = [];

        if (role === 'professor') {
            const { data, error } = await supabase
                .from('professor_subjects')
                .select(`
                    subjects(
                        id, name, short_name, schedule_days,
                        schedule_start_time, schedule_end_time,
                        is_active, grade_id
                    )
                `)
                .eq('professor_id', userId)
                .eq('is_active', true);

            if (error) throw error;
            subjects = data.map(row => row.subjects).flat().filter(Boolean);
        } else {
            const { data, error } = await supabase
                .from('enrollments')
                .select(`
                    subjects(
                        id, name, short_name, schedule_days,
                        schedule_start_time, schedule_end_time,
                        is_active, grade_id
                    )
                `)
                .eq('student_id', userId)
                .eq('status', 'active');

            if (error) throw error;
            subjects = data.map(row => row.subjects).flat().filter(Boolean);
        }

        subjects = subjects.filter((s: any) => s.is_active !== false);

        res.json(subjects);
    } catch (error: any) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
