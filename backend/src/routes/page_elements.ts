import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { gradeResponse } from '../services/grading';

const router = Router();

const VALID_TYPES = ['true_false', 'multiple_choice', 'open_ended', 'connect', 'rank', 'checkbox', 'dropdown'];

// ============================================
// ADMIN — bulk-author all elements for a book from a JSON payload.
// Body: { elements: [{ page_number, type, x, y, width, height, config, order_index? }, ...] }
// Wholesale replace: deletes everything currently on this item's pages and
// inserts the given set. Simplest mental model for "re-upload the JSON" —
// if you need partial/incremental edits later, this is the place to swap
// for an upsert-by-id strategy instead.
//
// NOTE: this route is mounted at both /api/admin and /api in index.ts,
// mirroring your existing pattern — make sure whatever admin-auth
// middleware you use elsewhere is applied here too, since editing correct
// answers shouldn't be reachable by students.
// ============================================
router.put('/modules/items/:itemId/elements', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { elements } = req.body as { elements: any[] };

        if (!Array.isArray(elements)) {
            return res.status(400).json({ error: '"elements" must be an array' });
        }

        const { data: item } = await supabase
            .from('module_items')
            .select('content_asset_id')
            .eq('id', itemId)
            .maybeSingle();

        const assetId = item?.content_asset_id || itemId;

        const { data: bookPages, error: pagesError } = await supabase
            .from('book_pages')
            .select('id, page_number')
            .eq('content_asset_id', assetId);

        if (pagesError) throw pagesError;
        if (!bookPages || bookPages.length === 0) {
            return res.status(400).json({ error: 'This item has no rendered pages yet — process the PDF first.' });
        }

        const pageIdByNumber = new Map(bookPages.map(p => [p.page_number, p.id]));
        const bookPageIds = bookPages.map(p => p.id);

        const rows = [];
        for (const el of elements) {
            const bookPageId = pageIdByNumber.get(el.page_number);
            if (!bookPageId) {
                return res.status(400).json({ error: `page_number ${el.page_number} does not exist for this item` });
            }
            if (!VALID_TYPES.includes(el.type)) {
                return res.status(400).json({ error: `Unknown element type "${el.type}"` });
            }
            if ([el.x, el.y, el.width, el.height].some(v => typeof v !== 'number')) {
                return res.status(400).json({ error: `Element on page ${el.page_number} is missing x/y/width/height numbers` });
            }

            rows.push({
                book_page_id: bookPageId,
                type: el.type,
                x: el.x,
                y: el.y,
                width: el.width,
                height: el.height,
                config: el.config || {},
                order_index: el.order_index ?? 0
            });
        }

        const { error: deleteError } = await supabase
            .from('page_elements')
            .delete()
            .in('book_page_id', bookPageIds);

        if (deleteError) throw deleteError;

        const { data: inserted, error: insertError } = await supabase
            .from('page_elements')
            .insert(rows)
            .select();

        if (insertError) throw insertError;

        res.json({ message: 'Elements saved', count: inserted?.length || 0 });
    } catch (error: any) {
        console.error('Error saving page elements:', error);
        res.status(500).json({ error: error.message });
    }
});

function sanitizeConfigForStudent(type: string, config: any): any {
    if (!config || typeof config !== 'object') return {};
    const sanitized = { ...config };
    delete sanitized.correct;
    delete sanitized.correct_index;
    delete sanitized.correct_pairs;
    delete sanitized.correct_order;
    delete sanitized.correct_value;

    if (type === 'checkbox' && Array.isArray(sanitized.options)) {
        sanitized.options = sanitized.options.map((opt: any) => {
            if (typeof opt === 'object' && opt !== null) {
                const copy = { ...opt };
                delete copy.correct;
                return copy;
            }
            return opt;
        });
    }

    return sanitized;
}

// ============================================
// Fetch all elements for an item, with page_number attached and (if
// student_id is given) that student's own saved responses merged in so
// the viewer can restore their previous answers.
// ============================================
router.get('/modules/items/:itemId/elements', async (req, res) => {
    try {
        const { itemId } = req.params;
        const studentId = req.query.student_id as string | undefined;

        const { data: item } = await supabase
            .from('module_items')
            .select('content_asset_id')
            .eq('id', itemId)
            .maybeSingle();

        const assetId = item?.content_asset_id || itemId;

        const { data: bookPages, error: bpError } = await supabase
            .from('book_pages')
            .select('id')
            .eq('content_asset_id', assetId);

        if (bpError) throw bpError;
        const bookPageIds = (bookPages || []).map(p => p.id);

        if (bookPageIds.length === 0) {
            return res.json([]);
        }

        const { data: elements, error } = await supabase
            .from('page_elements')
            .select(`*, book_page:book_pages(page_number)`)
            .in('book_page_id', bookPageIds)
            .order('order_index');

        if (error) throw error;

        let responsesByElement: Record<string, any> = {};
        if (studentId && elements && elements.length > 0) {
            const { data: responses, error: respError } = await supabase
                .from('element_responses')
                .select('*')
                .eq('student_id', studentId)
                .in('element_id', elements.map((e: any) => e.id));

            if (respError) throw respError;
            responsesByElement = Object.fromEntries((responses || []).map(r => [r.element_id, r]));
        }

        const enriched = (elements || []).map((e: any) => ({
            id: e.id,
            type: e.type,
            x: e.x,
            y: e.y,
            width: e.width,
            height: e.height,
            config: sanitizeConfigForStudent(e.type, e.config),
            order_index: e.order_index,
            page_number: e.book_page?.page_number,
            saved_response: responsesByElement[e.id] || null
        }));

        res.json(enriched);
    } catch (error: any) {
        console.error('Error fetching page elements:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// Student submits/updates an answer for one element.
// ============================================
router.post('/elements/:elementId/response', async (req, res) => {
    try {
        const { elementId } = req.params;
        const { student_id, response } = req.body;

        if (!student_id) {
            return res.status(400).json({ error: 'student_id is required' });
        }

        const { data: element, error: elError } = await supabase
            .from('page_elements')
            .select('type, config')
            .eq('id', elementId)
            .single();

        if (elError) throw elError;

        const isCorrect = gradeResponse(element.type, element.config, response);

        const { data, error } = await supabase
            .from('element_responses')
            .upsert(
                {
                    element_id: elementId,
                    student_id,
                    response,
                    is_correct: isCorrect,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'element_id,student_id' }
            )
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        console.error('Error saving element response:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// Bulk Submit / Grade Page Elements
// ============================================
router.post('/modules/items/:itemId/pages/:pageNumber/submit', async (req, res) => {
    try {
        const { itemId, pageNumber } = req.params;
        const { student_id, responses } = req.body;

        if (!student_id) {
            return res.status(400).json({ error: 'student_id is required' });
        }

        const { data: item } = await supabase
            .from('module_items')
            .select('content_asset_id')
            .eq('id', itemId)
            .maybeSingle();

        const assetId = item?.content_asset_id || itemId;

        const { data: bookPage, error: bpError } = await supabase
            .from('book_pages')
            .select('id')
            .eq('content_asset_id', assetId)
            .eq('page_number', parseInt(pageNumber, 10))
            .maybeSingle();

        if (bpError || !bookPage) {
            return res.status(404).json({ error: 'Page not found' });
        }

        const { data: elements, error: elError } = await supabase
            .from('page_elements')
            .select('id, type, config')
            .eq('book_page_id', bookPage.id);

        if (elError) throw elError;

        const results = [];
        const upsertRows = [];

        for (const el of (elements || [])) {
            const userResponse = responses?.[el.id];
            if (userResponse !== undefined) {
                const isCorrect = gradeResponse(el.type, el.config, userResponse);
                upsertRows.push({
                    element_id: el.id,
                    student_id,
                    response: userResponse,
                    is_correct: isCorrect,
                    updated_at: new Date().toISOString()
                });
                results.push({
                    element_id: el.id,
                    is_correct: isCorrect,
                    response: userResponse
                });
            }
        }

        if (upsertRows.length > 0) {
            const { error: upsertError } = await supabase
                .from('element_responses')
                .upsert(upsertRows, { onConflict: 'element_id,student_id' });

            if (upsertError) throw upsertError;
        }

        res.json({ results });
    } catch (error: any) {
        console.error('Error submitting page responses:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;