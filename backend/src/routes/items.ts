import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// Update item
router.put('/api/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, content_url, order_index, is_visible, image_url, is_editable, audience } = req.body;

        const updateData: any = { title, description, content_url, order_index, is_visible, image_url, is_editable };
        if (audience === 'student') {
            updateData.show_student = true;
            updateData.show_teacher = false;
        } else if (audience === 'teacher') {
            updateData.show_student = false;
            updateData.show_teacher = true;
        }

        const { data, error } = await supabase
            .from('module_items')
            .update(updateData)
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
router.delete('/api/items/:id', async (req, res) => {
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

// Set item audience: exclusively student or teacher.
// Sending { audience: 'student' } sets show_student=true, show_teacher=false and vice-versa.
router.patch('/api/module-items/:itemId/audience', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { audience } = req.body;

        if (audience !== 'student' && audience !== 'teacher') {
            return res.status(400).json({ error: "audience must be 'student' or 'teacher'" });
        }

        const update = audience === 'student'
            ? { show_student: true, show_teacher: false }
            : { show_student: false, show_teacher: true };

        const { data, error } = await supabase
            .from('module_items')
            .update(update)
            .eq('id', itemId)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        console.error('Error setting item audience:', error);
        res.status(500).json({ error: error.message });
    }
});

// Legacy: keep old routes for backward compatibility but delegate to the same logic
router.patch('/api/module-items-p/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { show_teacher } = req.body;
        if (typeof show_teacher !== 'boolean') {
            return res.status(400).json({ error: 'show_teacher must be a boolean' });
        }
        const update = show_teacher
            ? { show_student: false, show_teacher: true }
            : { show_teacher: false };
        const { data, error } = await supabase
            .from('module_items').update(update).eq('id', itemId).select().single();
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/api/module-items/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { show_student } = req.body;
        if (typeof show_student !== 'boolean') {
            return res.status(400).json({ error: 'show_student must be a boolean' });
        }
        const update = show_student
            ? { show_student: true, show_teacher: false }
            : { show_student: false };
        const { data, error } = await supabase
            .from('module_items').update(update).eq('id', itemId).select().single();
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

