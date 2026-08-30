import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// Update comment
router.put('/api/comments/:commentId', async (req, res) => {
    try {
        const { commentId } = req.params;
        const { text, professorId } = req.body;

        if (!text || !professorId) {
            return res.status(400).json({ error: 'Text and professorId are required' });
        }

        // Verify professor owns the comment
        const { data: comment, error: checkError } = await supabase
            .from('student_comments')
            .select('professor_id')
            .eq('id', commentId)
            .single();

        if (checkError) throw checkError;

        if (comment.professor_id !== professorId) {
            return res.status(403).json({ error: 'Unauthorized to edit this comment' });
        }

        const { data, error } = await supabase
            .from('student_comments')
            .update({ text })
            .eq('id', commentId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            id: data.id,
            text: data.text,
            author: data.author_name,
            date: new Date(data.updated_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        });
    } catch (error: any) {
        console.error('Error updating comment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete comment
router.delete('/api/comments/:commentId', async (req, res) => {
    try {
        const { commentId } = req.params;
        const { professorId } = req.query;

        if (!professorId) {
            return res.status(400).json({ error: 'Professor ID is required' });
        }

        // Verify professor owns the comment
        const { data: comment, error: checkError } = await supabase
            .from('student_comments')
            .select('professor_id')
            .eq('id', commentId)
            .single();

        if (checkError) throw checkError;

        if (comment.professor_id !== professorId) {
            return res.status(403).json({ error: 'Unauthorized to delete this comment' });
        }

        const { error } = await supabase
            .from('student_comments')
            .delete()
            .eq('id', commentId);

        if (error) throw error;

        res.json({ message: 'Comment deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
