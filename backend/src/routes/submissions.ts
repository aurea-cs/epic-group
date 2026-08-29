import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// PATCH grade a submission
router.patch('/api/submissions/:id', async (req, res) => {
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

export default router;
