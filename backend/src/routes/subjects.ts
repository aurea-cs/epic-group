import { Router } from 'express';
import { supabase } from '../config/supabase';
import { upload } from '../middleware/upload';

const router = Router();

// Create subject
router.post('/api/subjects', async (req, res) => {
    try {
        const {
            name,
            short_name,
            description,
            start_date,
            end_date,
            visibility,
            max_students,
            grade_id,
            schedule_days,
            schedule_start_time,
            schedule_end_time
        } = req.body;

        if (!name || !grade_id) {
            return res.status(400).json({ error: 'Name and grade ID are required' });
        }

        const { data, error } = await supabase
            .from('subjects')
            .insert({
                name,
                short_name,
                description,
                start_date: start_date || null,
                end_date: end_date || null,
                visibility,
                max_students,
                grade_id,
                schedule_days: schedule_days || null,
                schedule_start_time: schedule_start_time || null,
                schedule_end_time: schedule_end_time || null
            })
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
router.put('/api/subjects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, short_name, description, start_date, end_date, visibility, max_students, is_active, schedule_days, schedule_start_time, schedule_end_time } = req.body;

        const { data, error } = await supabase
            .from('subjects')
            .update({ 
                name, 
                short_name, 
                description, 
                start_date: start_date || null, 
                end_date: end_date || null, 
                visibility, 
                max_students, 
                is_active,
                schedule_days: schedule_days !== undefined ? schedule_days : undefined,
                schedule_start_time: schedule_start_time !== undefined ? schedule_start_time : undefined,
                schedule_end_time: schedule_end_time !== undefined ? schedule_end_time : undefined
            })
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
router.delete('/api/subjects/:id', async (req, res) => {
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

// Get single subject by ID
router.get('/api/subjects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Subject not found' });

        res.json(data);
    } catch (error: any) {
        console.error('Error fetching subject:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET submissions for a subject (joins through assignments, includes all files)
router.get('/api/subjects/:subjectId/submissions', async (req, res) => {
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

// Get professors for a subject
router.get('/api/subjects/:subjectId/professors', async (req, res) => {
    try {
        const { subjectId } = req.params;

        console.log(`Fetching professors for subject: ${subjectId}`);

        // Get user_ids from junction table
        const { data: relations, error: relationError } = await supabase
            .from('professor_subjects')
            .select('professor_id')
            .eq('subject_id', subjectId);

        if (relationError) throw relationError;

        const userIds = relations?.map(r => r.professor_id) || [];

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
        console.error('Error fetching subject professors:', error);
        // Fallback for missing table
        if (error.code === '42P01') {
            return res.json([]);
        }
        res.status(500).json({ error: error.message });
    }
});

// Assign professor(s) to subject
router.post('/api/subjects/:subjectId/professors', async (req, res) => {
    try {
        const { subjectId } = req.params;
        let ids: string[] = [];

        if (Array.isArray(req.body.userIds)) {
            ids = req.body.userIds;
        } else if (Array.isArray(req.body.userId)) {
            ids = req.body.userId;
        } else if (req.body.userId) {
            ids = [req.body.userId];
        } else if (req.body.userIds) {
            ids = [req.body.userIds];
        }

        if (ids.length === 0) {
            return res.status(400).json({ error: 'User ID or User IDs are required' });
        }

        const records = ids.map(id => ({ subject_id: subjectId, professor_id: id }));

        const { data, error } = await supabase
            .from('professor_subjects')
            .upsert(records, { ignoreDuplicates: true })
            .select();

        if (error) {
            if (error.code === '23505') {
                return res.status(200).json({ message: 'One or more professors are already assigned to this subject', alreadyAssigned: true });
            }
            throw error;
        }

        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error assigning professor(s) to subject:', error);
        res.status(500).json({ error: error.message });
    }
});

// Unassign professor from subject
router.delete('/api/subjects/:subjectId/professors/:userId', async (req, res) => {
    try {
        const { subjectId, userId } = req.params;

        const { error } = await supabase
            .from('professor_subjects')
            .delete()
            .match({ subject_id: subjectId, professor_id: userId });

        if (error) throw error;

        res.json({ message: 'Professor unassigned from subject successfully' });
    } catch (error: any) {
        console.error('Error unassigning professor from subject:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/api/subjects/:subjectId/students', async (req, res) => {
    try {
        const { subjectId } = req.params;

        // 1. Get enrollments for this subject to find student IDs
        const { data: subjectEnrollments, error: subjErr } = await supabase
            .from('enrollments')
            .select('student_id')
            .eq('subject_id', subjectId);

        if (subjErr) throw subjErr;
        
        if (!subjectEnrollments || subjectEnrollments.length === 0) return res.json([]);

        const studentIds = [...new Set(subjectEnrollments.map((e: any) => e.student_id))];

        // 2. Fetch user details for these students
        const { data: students, error: studentsError } = await supabase
            .from('users')
            .select('id, full_name, email, firstname, lastname, avatar_url, created_at')
            .in('id', studentIds)
            .order('full_name', { ascending: true });

        if (studentsError) throw studentsError;

        // 3. Fetch all enrollments for these students to get their centers
        const { data: allEnrollments, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select('student_id, center_id')
            .in('student_id', studentIds);

        if (enrollmentsError) throw enrollmentsError;

        // 4. Get distinct center IDs
        const centerIds = [...new Set((allEnrollments || []).map((e: any) => e.center_id).filter(Boolean))];
        let centersMap: Record<string, string> = {};

        if (centerIds.length > 0) {
            const { data: centers, error: centersError } = await supabase
                .from('educational_centers')
                .select('id, name')
                .in('id', centerIds);

            if (centersError) throw centersError;
            (centers || []).forEach((c: any) => { centersMap[c.id] = c.name; });
        }

        // 5. Build student-to-centers map
        const studentCentersMap: Record<string, { id: string; name: string }[]> = {};
        (allEnrollments || []).forEach((e: any) => {
            if (!e.center_id) return;
            if (!studentCentersMap[e.student_id]) studentCentersMap[e.student_id] = [];
            const centerName = centersMap[e.center_id];
            if (centerName && !studentCentersMap[e.student_id].find(c => c.id === e.center_id)) {
                studentCentersMap[e.student_id].push({ id: e.center_id, name: centerName });
            }
        });

        // 5.5 Fetch time spent
        const { data: timeData, error: timeError } = await supabase
            .from('student_time_view')
            .select('user_id, total_time_seconds')
            .in('user_id', studentIds);
            
        if (timeError && timeError.code !== '42P01') {
            console.warn('Error fetching time data:', timeError);
        }
        
        const timeMap: Record<string, number> = {};
        (timeData || []).forEach((t: any) => {
            timeMap[t.user_id] = t.total_time_seconds;
        });

        // 6. Combine
        const result = (students || []).map((s: any) => ({
            id: s.id,
            name: s.full_name || `${s.firstname || ''} ${s.lastname || ''}`.trim(),
            email: s.email,
            avatar_url: s.avatar_url,
            created_at: s.created_at,
            centers: studentCentersMap[s.id] || [],
            total_time_seconds: timeMap[s.id] || 0
        }));

        res.json(result);
    } catch (error: any) {
        console.error('Error fetching subject students:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get modules for a subject
router.get('/api/subjects/:subjectId/modules', async (req, res) => {
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
                    try {
                        const storagePath = extractStoragePath(item.content_url, 'grade-content')
                        const { data: urlData, error: signError } = await supabase.storage
                            .from('grade-content')
                            .createSignedUrl(storagePath, 3600)

                        if (signError) {
                            console.error(`Failed to sign URL for item ${item.id}:`, signError, '| path used:', storagePath)
                            return item // still falls back, but now you'll see it in logs
                        }

                        return { ...item, content_url: urlData.signedUrl }
                    } catch (e) {
                        console.error(`Exception signing URL for item ${item.id}:`, e)
                        return item
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
router.post('/api/subjects/:subjectId/modules', async (req, res) => {
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

// GET all assignments for a subject
router.get('/api/subjects/:subjectId/assignments', async (req, res) => {
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
router.post('/api/subjects/:subjectId/assignments', async (req, res) => {
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
            module_item_id,
            assigned_pages,
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
                module_item_id: module_item_id || null,
                assigned_pages: assigned_pages || null,
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

// GET all calendar events for a subject
router.get('/api/subjects/:subjectId/calendar-events', async (req, res) => {
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

// Helper: extract the bare storage path from a Supabase Storage URL
function extractStoragePath(contentUrl: string, bucket: string): string {
    if (!contentUrl) return contentUrl

    // Already a bare path (no protocol) — use as-is
    if (!contentUrl.startsWith('http')) return contentUrl

    // Signed URL: .../object/sign/bucket-name/the/actual/path?token=...
    const signPattern = `/object/sign/${bucket}/`
    if (contentUrl.includes(signPattern)) {
        return contentUrl.split(signPattern)[1].split('?')[0]
    }

    // Public URL: .../object/public/bucket-name/the/actual/path
    const publicPattern = `/object/public/${bucket}/`
    if (contentUrl.includes(publicPattern)) {
        return contentUrl.split(publicPattern)[1].split('?')[0]
    }

    // Authenticated URL: .../object/authenticated/bucket-name/the/actual/path
    const authPattern = `/object/authenticated/${bucket}/`
    if (contentUrl.includes(authPattern)) {
        return contentUrl.split(authPattern)[1].split('?')[0]
    }

    // Fallback — return as-is and let Supabase reject it visibly
    return contentUrl
}

export default router;
