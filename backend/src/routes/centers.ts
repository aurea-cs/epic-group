import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// Get all educational centers
router.get('/api/centers', async (req, res) => {
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
router.get('/api/centers/:id', async (req, res) => {
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
router.post('/api/centers', async (req, res) => {
    try {
        const { name, address, phone, email, vr_code } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const { data, error } = await supabase
            .from('educational_centers')
            .insert({ name, address, phone, email, vr_code })
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
router.put('/api/centers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, phone, email, vr_code, is_active } = req.body;

        const { data, error } = await supabase
            .from('educational_centers')
            .update({ name, address, phone, email, vr_code, is_active })
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
router.delete('/api/centers/:id', async (req, res) => {
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

// Get grades by center
router.get('/api/centers/:centerId/grades', async (req, res) => {
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

// Get complete hierarchy for a center
router.get('/api/centers/:centerId/hierarchy', async (req, res) => {
    try {
        const { centerId } = req.params;

        // Get center info
        const { data: center, error: centerError } = await supabase
            .from('educational_centers')
            .select('*')
            .eq('id', centerId)
            .single();

        if (centerError) throw centerError;

        // Get grades with subjects
        const { data: grades, error: gradesError } = await supabase
            .from('grades_levels')
            .select(`
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

// Get professors for a center
router.get('/api/centers/:centerId/professors', async (req, res) => {
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
            .select('id, email, full_name, firstname, lastname')
            .in('id', userIds);

        if (usersError) {
            console.error('Error fetching users in getCenterProfessors:', usersError);
            throw usersError;
        }

        // Fetch time from view
        const { data: timeData } = await supabase
            .from('student_time_view')
            .select('user_id, total_time_seconds')
            .in('user_id', userIds);
            
        const timeMap = new Map();
        (timeData || []).forEach(t => timeMap.set(t.user_id, t.total_time_seconds));

        const usersWithTime = (users || []).map(u => ({
            ...u,
            total_time_seconds: timeMap.get(u.id) || 0
        }));

        console.log(`Found ${usersWithTime.length} users for center ${centerId}`);
        res.json(usersWithTime);
    } catch (error: any) {
        console.error('Error fetching center professors FULL:', JSON.stringify(error, null, 2));
        res.status(500).json({ error: error.message, details: error });
    }
});

// Assign professor to center
router.post('/api/centers/:centerId/professors', async (req, res) => {
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

        // Update users.center_id to the most recently assigned center
        await supabase
            .from('users')
            .update({ center_id: centerId })
            .eq('id', userId);

        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error assigning professor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Unassign professor from center
router.delete('/api/centers/:centerId/professors/:userId', async (req, res) => {
    try {
        const { centerId, userId } = req.params;

        const { error } = await supabase
            .from('center_professors')
            .delete()
            .match({ center_id: centerId, user_id: userId });

        if (error) throw error;

        // Update users.center_id to the professor's most recent remaining center (or null)
        const { data: remaining } = await supabase
            .from('center_professors')
            .select('center_id, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

        const latestCenterId = remaining && remaining.length > 0 ? remaining[0].center_id : null;
        await supabase.from('users').update({ center_id: latestCenterId }).eq('id', userId);

        res.json({ message: 'Professor unassigned successfully' });
    } catch (error: any) {
        console.error('Error unassigning professor:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
