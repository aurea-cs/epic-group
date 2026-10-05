import { Router } from 'express';
import { supabase } from '../config/supabase';
import { upload } from '../middleware/upload';
import { translateToEnglish } from '../utils/translator';

const router = Router();

// Get ALL VR codes for a module (N:N — a module can have multiple VR rooms)
router.get('/api/modules/:moduleId/vr-code', async (req, res) => {
    try {
        const { moduleId } = req.params;

        const { data, error } = await supabase
            .from('module_vr_code')
            .select('*')
            .eq('module_id', moduleId)
            .order('order_index', { ascending: true, nullsFirst: false })
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

// Duplicate a module with all its items and VR codes
router.post('/api/modules/:moduleId/duplicate', async (req, res) => {
    try {
        const { moduleId } = req.params;

        // 1. Fetch the source module
        const { data: srcModule, error: modErr } = await supabase
            .from('modules')
            .select('*')
            .eq('id', moduleId)
            .single();

        if (modErr || !srcModule) {
            return res.status(404).json({ error: 'Module not found' });
        }

        // 2. Determine order_index for the duplicate (place right after source)
        const { data: siblings } = await supabase
            .from('modules')
            .select('order_index')
            .eq('subject_id', srcModule.subject_id)
            .order('order_index', { ascending: false })
            .limit(1);

        const maxIndex = siblings && siblings.length > 0 ? (siblings[0].order_index ?? 0) : srcModule.order_index;
        const newOrderIndex = maxIndex + 1;

        // 3. Insert the duplicate module
        const { data: newModule, error: newModErr } = await supabase
            .from('modules')
            .insert({
                subject_id: srcModule.subject_id,
                title: `${srcModule.title} (copia)`,
                title_en: srcModule.title_en ? `${srcModule.title_en} (copy)` : null,
                order_index: newOrderIndex,
                is_active: srcModule.is_active,
                curriculum_module_id: srcModule.curriculum_module_id ?? null,
            })
            .select()
            .single();

        if (newModErr || !newModule) throw newModErr ?? new Error('Failed to create duplicate module');

        // 4. Fetch source items
        const { data: srcItems, error: itemsErr } = await supabase
            .from('module_items')
            .select('*')
            .eq('module_id', moduleId)
            .order('order_index', { ascending: true });

        if (itemsErr) throw itemsErr;

        // 5. Insert duplicate items (referencing same storage files)
        if (srcItems && srcItems.length > 0) {
            const duplicateItems = srcItems.map((item: any) => ({
                module_id: newModule.id,
                type: item.type,
                title: item.title,
                title_en: item.title_en ?? null,
                description: item.description ?? null,
                description_en: item.description_en ?? null,
                content_url: item.content_url ?? null,
                image_url: item.image_url ?? null,
                order_index: item.order_index,
                is_visible: item.is_visible,
                show_student: item.show_student ?? null,
                show_teacher: item.show_teacher ?? null,
                is_editable: item.is_editable ?? false,
            }));

            const { error: insertItemsErr } = await supabase
                .from('module_items')
                .insert(duplicateItems);

            if (insertItemsErr) throw insertItemsErr;
        }

        // 6. Fetch source VR codes
        const { data: srcVrCodes, error: vrErr } = await supabase
            .from('module_vr_code')
            .select('*')
            .eq('module_id', moduleId)
            .order('order_index', { ascending: true });

        if (vrErr) throw vrErr;

        // 7. Insert duplicate VR codes
        if (srcVrCodes && srcVrCodes.length > 0) {
            const duplicateVrCodes = srcVrCodes.map((vr: any) => ({
                module_id: newModule.id,
                code: vr.code,
                title: vr.title ?? null,
                description: vr.description ?? null,
                image_url: vr.image_url ?? null,
                order_index: vr.order_index ?? null,
            }));

            const { error: insertVrErr } = await supabase
                .from('module_vr_code')
                .insert(duplicateVrCodes);

            if (insertVrErr) throw insertVrErr;
        }

        // 7b. Fetch & clone exit ticket attachments
        const { data: srcExitTickets, error: exitTicketErr } = await supabase
            .from('module_exit_ticket_attachments')
            .select('*')
            .eq('module_id', moduleId);

        if (exitTicketErr) throw exitTicketErr;

        if (srcExitTickets && srcExitTickets.length > 0) {
            const duplicateExitTickets = srcExitTickets.map((et: any) => ({
                module_id: newModule.id,
                exit_ticket_id: et.exit_ticket_id
            }));

            const { error: insertExitTicketErr } = await supabase
                .from('module_exit_ticket_attachments')
                .insert(duplicateExitTickets);

            if (insertExitTicketErr) throw insertExitTicketErr;
        }

        // 8. Return the new module (with items fetched)
        const { data: finalModule, error: finalErr } = await supabase
            .from('modules')
            .select('*, module_items(*)')
            .eq('id', newModule.id)
            .single();

        if (finalErr) throw finalErr;

        res.status(201).json(finalModule);
    } catch (error: any) {
        console.error('Error duplicating module:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update module
router.put('/api/modules/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, order_index, is_active, curriculum_module_id } = req.body;

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (order_index !== undefined) updateData.order_index = order_index;
        if (is_active !== undefined) updateData.is_active = is_active;
        if (curriculum_module_id !== undefined) updateData.curriculum_module_id = curriculum_module_id || null;

        const { data, error } = await supabase
            .from('modules')
            .update(updateData)
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
        const { type, title, description, content_url, order_index, image_url, is_editable } = req.body;

        const title_en = await translateToEnglish(title);
        const description_en = description ? await translateToEnglish(description) : null;

        const { data, error } = await supabase
            .from('module_items')
            .insert({
                module_id: moduleId,
                type,
                title,
                title_en,
                description,
                description_en,
                content_url,
                order_index,
                image_url,
                is_visible: true,
                is_editable: is_editable ?? false
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
        const { title, description, order_index, is_editable } = req.body;

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

        const finalTitle = title || file.originalname;
        const title_en = await translateToEnglish(finalTitle);
        const description_en = description ? await translateToEnglish(description) : null;

        // Create DB record
        const { data, error } = await supabase
            .from('module_items')
            .insert({
                module_id: moduleId,
                type: 'pdf',
                title: finalTitle,
                title_en,
                description,
                description_en,
                content_url: filePath,
                order_index: order_index || 999,
                is_visible: true,
                is_editable: is_editable === 'true' || is_editable === true
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

// Copy a module from any subject into a target subject (preserves items, VR codes, exit tickets, curriculum_module_id)
router.post('/api/modules/:moduleId/copy-to/:targetSubjectId', async (req, res) => {
    try {
        const { moduleId, targetSubjectId } = req.params;

        // 1. Fetch the source module
        const { data: srcModule, error: modErr } = await supabase
            .from('modules')
            .select('*')
            .eq('id', moduleId)
            .single();

        if (modErr || !srcModule) {
            return res.status(404).json({ error: 'Source module not found' });
        }

        // 2. Determine order_index for the new copy (append at end of target subject)
        const { data: siblings } = await supabase
            .from('modules')
            .select('order_index')
            .eq('subject_id', targetSubjectId)
            .order('order_index', { ascending: false })
            .limit(1);

        const maxIndex = siblings && siblings.length > 0 ? (siblings[0].order_index ?? 0) : -1;
        const newOrderIndex = maxIndex + 1;

        // 3. Insert the copied module into target subject
        const { data: newModule, error: newModErr } = await supabase
            .from('modules')
            .insert({
                subject_id: targetSubjectId,
                title: `${srcModule.title} (copia)`,
                title_en: srcModule.title_en ? `${srcModule.title_en} (copy)` : null,
                order_index: newOrderIndex,
                is_active: srcModule.is_active,
                curriculum_module_id: srcModule.curriculum_module_id ?? null,
            })
            .select()
            .single();

        if (newModErr || !newModule) throw newModErr ?? new Error('Failed to create copied module');

        // 4. Fetch & clone source items
        const { data: srcItems, error: itemsErr } = await supabase
            .from('module_items')
            .select('*')
            .eq('module_id', moduleId)
            .order('order_index', { ascending: true });

        if (itemsErr) throw itemsErr;

        if (srcItems && srcItems.length > 0) {
            const copiedItems = srcItems.map((item: any) => ({
                module_id: newModule.id,
                type: item.type,
                title: item.title,
                title_en: item.title_en ?? null,
                description: item.description ?? null,
                description_en: item.description_en ?? null,
                content_url: item.content_url ?? null,
                image_url: item.image_url ?? null,
                order_index: item.order_index,
                is_visible: item.is_visible,
                show_student: item.show_student ?? null,
                show_teacher: item.show_teacher ?? null,
                is_editable: item.is_editable ?? false,
            }));

            const { error: insertItemsErr } = await supabase.from('module_items').insert(copiedItems);
            if (insertItemsErr) throw insertItemsErr;
        }

        // 5. Fetch & clone source VR codes
        const { data: srcVrCodes, error: vrErr } = await supabase
            .from('module_vr_code')
            .select('*')
            .eq('module_id', moduleId)
            .order('order_index', { ascending: true });

        if (vrErr) throw vrErr;

        if (srcVrCodes && srcVrCodes.length > 0) {
            const copiedVrCodes = srcVrCodes.map((vr: any) => ({
                module_id: newModule.id,
                code: vr.code,
                title: vr.title ?? null,
                description: vr.description ?? null,
                image_url: vr.image_url ?? null,
                order_index: vr.order_index ?? null,
            }));

            const { error: insertVrErr } = await supabase.from('module_vr_code').insert(copiedVrCodes);
            if (insertVrErr) throw insertVrErr;
        }

        // 6. Fetch & clone exit ticket attachments
        const { data: srcExitTickets, error: exitTicketErr } = await supabase
            .from('module_exit_ticket_attachments')
            .select('*')
            .eq('module_id', moduleId);

        if (exitTicketErr) throw exitTicketErr;

        if (srcExitTickets && srcExitTickets.length > 0) {
            const copiedExitTickets = srcExitTickets.map((et: any) => ({
                module_id: newModule.id,
                exit_ticket_id: et.exit_ticket_id,
            }));

            const { error: insertExitErr } = await supabase
                .from('module_exit_ticket_attachments')
                .insert(copiedExitTickets);
            if (insertExitErr) throw insertExitErr;
        }

        // 7. Return the new module with items
        const { data: finalModule, error: finalErr } = await supabase
            .from('modules')
            .select('*, module_items(*)')
            .eq('id', newModule.id)
            .single();

        if (finalErr) throw finalErr;

        res.status(201).json(finalModule);
    } catch (error: any) {
        console.error('Error copying module:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;

// POST /api/admin/modules/:moduleId/items/reorder
// body: { order: [{ id, order_index }, ...] }
router.post('/api/modules/:moduleId/items/reorder', async (req, res) => {
  const { moduleId } = req.params
  const { order } = req.body

  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ error: 'Invalid order payload' })
  }

  const { error } = await supabase.rpc('reorder_module_items', {
    p_module_id: moduleId,
    p_order: order,
  })

  if (error) return res.status(500).json({ error: error.message })
  res.status(204).end()
})

router.post('/api/modules/:moduleId/vr-entries/reorder', async (req, res) => {
    const { moduleId } = req.params
    const { order } = req.body

    if (!Array.isArray(order) || order.length === 0) {
        return res.status(400).json({ error: 'Invalid order payload' })
    }

    const { error } = await supabase.rpc('reorder_module_vr_code', {
        p_module_id: moduleId,
        p_order: order,
    })

    if (error) return res.status(500).json({ error: error.message })
    res.status(204).end()
})