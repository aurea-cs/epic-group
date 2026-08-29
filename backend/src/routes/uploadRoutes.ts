import { Router } from 'express';
import { supabase } from '../config/supabase';
import { upload } from '../middleware/upload';

const router = Router();

// Upload image
router.post('/api/upload/image', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' })

        const ext = req.file.originalname.split('.').pop()
        const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const storagePath = filename

        const { error } = await supabase.storage
            .from('images')
            .upload(storagePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            })

        if (error) throw error

        const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(storagePath)

        res.json({ url: publicUrl })
    } catch (err: any) {
        console.error('Image upload error:', err)
        res.status(500).json({ error: err.message })
    }
})

// Delete content
router.delete('/api/admin/content/:contentId', async (req, res) => {
    try {
        const { contentId } = req.params;

        // Get content info first
        const { data: content, error: fetchError } = await supabase
            .from('grade_content')
            .select('file_path')
            .eq('id', contentId)
            .single();

        if (fetchError || !content) {
            return res.status(404).json({ error: 'Content not found' });
        }

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('grade-content')
            .remove([content.file_path]);

        if (storageError) {
            console.error('Error deleting from storage:', storageError);
            // Continue with DB deletion even if storage deletion fails
        }

        // Delete from database
        const { error: deleteError } = await supabase
            .from('grade_content')
            .delete()
            .eq('id', contentId);

        if (deleteError) throw deleteError;

        res.json({ message: 'Content deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting content:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
