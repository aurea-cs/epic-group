import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// GET calendar items (assignments + events) for a user, from now through end of year
router.get('/api/calendar/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.query;

        // Resolve subject ids the user has access to
        let subjectIds = [];
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
router.get('/api/schedule/:userId', async (req, res) => {
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

// POST create calendar event
router.post('/api/calendar-events', async (req, res) => {
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
router.patch('/api/calendar-events/:id', async (req, res) => {
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
router.delete('/api/calendar-events/:id', async (req, res) => {
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

export default router;
