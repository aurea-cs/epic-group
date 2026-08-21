import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// ============================================
// ADMIN - MODULE ITEMS
// ============================================

// Toggle item visibility for students
router.patch('/module-items/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { show_student } = req.body;

        if (typeof show_student !== 'boolean') {
            return res.status(400).json({ error: 'show_student must be a boolean' });
        }

        const { data, error } = await supabase
            .from('module_items')
            .update({ show_student })
            .eq('id', itemId)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        console.error('Error toggling item visibility:', error);
        res.status(500).json({ error: error.message });
    }
});

// Toggle item visibility for professors
router.patch('/module-items-p/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { show_teacher } = req.body;

        if (typeof show_teacher !== 'boolean') {
            return res.status(400).json({ error: 'show_teacher must be a boolean' });
        }

        const { data, error } = await supabase
            .from('module_items')
            .update({ show_teacher })
            .eq('id', itemId)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        console.error('Error toggling item visibility for professors:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
