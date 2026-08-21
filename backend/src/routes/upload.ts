import { Router } from 'express';
import { supabase, upload } from '../lib/supabase';

const router = Router();

// Upload image to Supabase Storage
router.post('/image', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });

        const ext = req.file.originalname.split('.').pop();
        const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const storagePath = filename;

        const { error } = await supabase.storage
            .from('images')
            .upload(storagePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(storagePath);

        res.json({ url: publicUrl });
    } catch (err: any) {
        console.error('Image upload error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
