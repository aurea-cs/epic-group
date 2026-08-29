import { Router } from 'express';
import { supabase } from '../config/supabase';
import { upload } from '../middleware/upload';

const router = Router();

// Get ALL VR codes for a module (N:N — a module can have multiple VR rooms)
router.get('/api/modules/:moduleId/vr-code', async (req, res) => {
    try {
        const { moduleId } = req.params;

        const { data, error } = await supabase
            .from('module_vr_code')
            .select('*')
            .eq('module_id', moduleId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        res.json(data || []);
    } catch (error: any) {
        console.error('Error fetching VR codes:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add a new VR code entry for a module (supports multiple rooms per module)
router.post('/api/modules/:moduleId/vr-code', async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { code, image_url, description, title } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        const payload: Record<string, any> = { module_id: moduleId, code: String(code), description: String(description), title: String(title) };
        if (image_url !== undefined) payload.image_url = image_url || null;
        if (description !== undefined) payload.description = description || null;
        if (title !== undefined) payload.title = title || null;

        const { data, error } = await supabase
            .from('module_vr_code')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error creating VR code:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update an existing VR code entry by its own ID
router.put('/api/modules/vr-code/:entryId', async (req, res) => {
    try {
        const { entryId } = req.params;
        const { code, image_url, description, title } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        const payload: Record<string, any> = { code: String(code) };
        if (image_url !== undefined) payload.image_url = image_url || null;
        if (description !== undefined) payload.description = description || null;
        if (title !== undefined) payload.title = title || null;

        const { data, error } = await supabase
            .from('module_vr_code')
            .update(payload)
            .eq('id', entryId)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        console.error('Error updating VR code:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete a specific VR code entry by its own ID
router.delete('/api/modules/vr-code/:entryId', async (req, res) => {
    try {
        const { entryId } = req.params;

        const { error } = await supabase
            .from('module_vr_code')
            .delete()
            .eq('id', entryId);

        if (error) throw error;
        res.json({ message: 'VR code deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting VR code:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update module
router.put('/api/modules/:id', async (req, res) => {
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

// Delete module (from modules table)
router.delete('/api/modules/:id', async (req, res) => {
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

// Create item (Standard JSON)
router.post('/api/modules/:moduleId/items', async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { type, title, description, content_url, order_index, image_url } = req.body;

        const { data, error } = await supabase
            .from('module_items')
            .insert({
                module_id: moduleId,
                type,
                title,
                description,
                content_url,
                order_index,
                image_url,
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
router.post('/api/modules/:moduleId/items/upload', upload.single('file'), async (req, res) => {
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

export default router;
