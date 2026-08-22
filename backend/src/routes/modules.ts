import { Router } from 'express';
import crypto from 'crypto';
import { supabase, upload } from '../lib/supabase';
import { processPdfIntoPages } from '../services/pdf_processing';

const router = Router();

// ============================================
// HELPER FUNCTION
// ============================================

function extractStoragePath(contentUrl: string, bucket: string): string {
    if (!contentUrl) return contentUrl;

    // Already a bare path (no protocol) — use as-is
    if (!contentUrl.startsWith('http')) return contentUrl;

    // Signed URL: .../object/sign/bucket-name/the/actual/path?token=...
    const signPattern = `/object/sign/${bucket}/`;
    if (contentUrl.includes(signPattern)) {
        return contentUrl.split(signPattern)[1].split('?')[0];
    }

    // Public URL: .../object/public/bucket-name/the/actual/path
    const publicPattern = `/object/public/${bucket}/`;
    if (contentUrl.includes(publicPattern)) {
        return contentUrl.split(publicPattern)[1].split('?')[0];
    }

    // Authenticated URL: .../object/authenticated/bucket-name/the/actual/path
    const authPattern = `/object/authenticated/${bucket}/`;
    if (contentUrl.includes(authPattern)) {
        return contentUrl.split(authPattern)[1].split('?')[0];
    }

    // Fallback — return as-is and let Supabase reject it visibly
    return contentUrl;
}

// ============================================
// MODULES
// ============================================

// Get modules for a subject
router.get('/subjects/:subjectId/modules', async (req, res) => {
    try {
        const { subjectId } = req.params;

        const { data, error } = await supabase
            .from('modules')
            .select(`
                *,
                items:module_items(*)
            `)
            .eq('subject_id', subjectId)
            .order('order_index');

        if (error) throw error;

        // Process items to sign URLs if they are PDFs
        const modules = await Promise.all(data?.map(async (module) => {
            const items = await Promise.all((module.items || []).map(async (item: any) => {
                if (item.type === 'pdf' && item.content_url) {
                    try {
                        const storagePath = extractStoragePath(item.content_url, 'grade-content');
                        const { data: urlData, error: signError } = await supabase.storage
                            .from('grade-content')
                            .createSignedUrl(storagePath, 3600);

                        if (signError) {
                            console.error(`Failed to sign URL for item ${item.id}:`, signError, '| path used:', storagePath);
                            return item; // still falls back, but now you'll see it in logs
                        }

                        return { ...item, content_url: urlData.signedUrl };
                    } catch (e) {
                        console.error(`Exception signing URL for item ${item.id}:`, e);
                        return item;
                    }
                }
                return item;
            }));

            return {
                ...module,
                items: items.sort((a: any, b: any) => a.order_index - b.order_index)
            };
        }) || []);

        res.json(modules);
    } catch (error: any) {
        console.error('Error fetching modules:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create module
router.post('/subjects/:subjectId/modules', async (req, res) => {
    try {
        const { subjectId } = req.params;
        const { title, order_index } = req.body;

        const { data, error } = await supabase
            .from('modules')
            .insert({ subject_id: subjectId, title, order_index })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error creating module:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update module
router.put('/modules/:id', async (req, res) => {
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

// Delete module
router.delete('/modules/:id', async (req, res) => {
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

// ============================================
// MODULE ITEMS
// ============================================

// Create item (Standard JSON)
router.post('/modules/:moduleId/items', async (req, res) => {
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
router.post('/modules/:moduleId/items/upload', upload.single('file'), async (req, res) => {
    try {
        const { moduleId } = req.params;
        const file = req.file;
        const { title, description, order_index } = req.body;

        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        // Compute SHA-256 hash of file buffer for deduplication
        const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

        // Check if an existing content_asset with this hash already exists
        const { data: existingAsset } = await supabase
            .from('content_assets')
            .select('id, file_path, processing_status, processing_error, total_pages')
            .eq('file_hash', fileHash)
            .maybeSingle();

        let assetId: string | null = null;
        let filePath: string;
        let isNewAsset = false;
        let assetStatus = 'pending';
        let assetError: string | null = null;
        let assetPages = 0;

        if (existingAsset) {
            assetId = existingAsset.id;
            filePath = existingAsset.file_path;
            assetStatus = existingAsset.processing_status || 'ready';
            assetError = existingAsset.processing_error || null;
            assetPages = existingAsset.total_pages || 0;
        } else {
            isNewAsset = true;
            const timestamp = Date.now();
            const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            filePath = `modules/${moduleId}/${timestamp}_${sanitizedFileName}`;

            // Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('grade-content')
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // Create content_assets record
            const { data: newAsset, error: assetInsertError } = await supabase
                .from('content_assets')
                .insert({
                    file_path: filePath,
                    file_hash: fileHash,
                    processing_status: 'pending'
                })
                .select()
                .maybeSingle();

            if (!assetInsertError && newAsset) {
                assetId = newAsset.id;
            }
        }

        // Create DB record for module_item
        const itemPayload: any = {
            module_id: moduleId,
            type: 'pdf',
            title: title || file.originalname,
            description,
            content_url: filePath,
            order_index: order_index || 999,
            is_visible: true,
            processing_status: assetStatus,
            processing_error: assetError,
            total_pages: assetPages
        };
        if (assetId) itemPayload.content_asset_id = assetId;

        const { data, error } = await supabase
            .from('module_items')
            .insert(itemPayload)
            .select()
            .single();

        if (error) {
            if (isNewAsset) {
                await supabase.storage.from('grade-content').remove([filePath]);
                if (assetId) await supabase.from('content_assets').delete().eq('id', assetId);
            }
            throw error;
        }

        res.status(201).json(data);

        // Process PDF asynchronously if this is a new asset
        if (isNewAsset) {
            const targetId = assetId || data.id;
            processPdfIntoPages(targetId, filePath).catch(err => {
                console.error(`Background PDF processing failed for asset ${targetId}:`, err);
            });
        }

    } catch (error: any) {
        console.error('Error uploading module item:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update item
router.put('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, content_url, order_index, is_visible, image_url } = req.body;

        const { data, error } = await supabase
            .from('module_items')
            .update({ title, description, content_url, order_index, is_visible, image_url })
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

// Delete item (with reference counting for shared content assets)
router.delete('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch item to check its content_asset_id and content_url
        const { data: item, error: fetchError } = await supabase
            .from('module_items')
            .select('id, content_asset_id, content_url')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!item) {
            return res.json({ message: 'Item already deleted' });
        }

        const contentUrl = item.content_url;
        let assetId = item.content_asset_id;

        // Fallback: If content_asset_id was null, match asset by file_path in content_assets
        if (!assetId && contentUrl) {
            const { data: matchedAsset } = await supabase
                .from('content_assets')
                .select('id')
                .eq('file_path', contentUrl)
                .maybeSingle();
            if (matchedAsset) {
                assetId = matchedAsset.id;
            }
        }

        // 2. Delete the module_item row
        const { error: deleteError } = await supabase
            .from('module_items')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        // 3. Reference-counted cleanup
        let remainingAssetCount = 0;
        if (assetId) {
            const { count } = await supabase
                .from('module_items')
                .select('id', { count: 'exact', head: true })
                .eq('content_asset_id', assetId);
            remainingAssetCount = count || 0;
        }

        let remainingUrlCount = 0;
        if (contentUrl) {
            const { count } = await supabase
                .from('module_items')
                .select('id', { count: 'exact', head: true })
                .eq('content_url', contentUrl);
            remainingUrlCount = count || 0;
        }

        // If no other module_item points to this asset or URL, purge storage & content_assets
        if (remainingAssetCount === 0 && remainingUrlCount === 0) {
            let filePath = contentUrl;
            if (assetId) {
                const { data: asset } = await supabase
                    .from('content_assets')
                    .select('file_path')
                    .eq('id', assetId)
                    .maybeSingle();
                if (asset?.file_path) filePath = asset.file_path;
            }

            // a) Remove original PDF file from Storage
            if (filePath) {
                console.log(`[DELETE] Purging PDF from storage: ${filePath}`);
                const { error: storageErr } = await supabase.storage
                    .from('grade-content')
                    .remove([filePath]);
                if (storageErr) console.error('[DELETE] Failed to remove PDF file from storage:', storageErr);
            }

            // b) Remove page webp images from Storage
            const purgeDir = assetId || id;
            const { data: pageFiles } = await supabase.storage
                .from('grade-content')
                .list(`modules/pages/${purgeDir}`);

            if (pageFiles && pageFiles.length > 0) {
                const pathsToRemove = pageFiles.map(f => `modules/pages/${purgeDir}/${f.name}`);
                console.log(`[DELETE] Purging ${pathsToRemove.length} page images from storage in modules/pages/${purgeDir}`);
                const { error: pagesStorageErr } = await supabase.storage
                    .from('grade-content')
                    .remove(pathsToRemove);
                if (pagesStorageErr) console.error('[DELETE] Failed to remove page images from storage:', pagesStorageErr);
            }

            // c) Delete book_pages database rows
            if (assetId) {
                await supabase.from('book_pages').delete().eq('content_asset_id', assetId);
            }
            await supabase.from('book_pages').delete().eq('content_asset_id', id);

            // d) Delete content_assets database row
            if (assetId) {
                console.log(`[DELETE] Deleting content_assets record: ${assetId}`);
                const { error: assetDelErr } = await supabase
                    .from('content_assets')
                    .delete()
                    .eq('id', assetId);
                if (assetDelErr) console.error('[DELETE] Failed to delete content_assets record:', assetDelErr);
            }
            if (contentUrl) {
                await supabase.from('content_assets').delete().eq('file_path', contentUrl);
            }
        } else {
            console.log(`[DELETE] Asset ${assetId} still referenced by ${remainingAssetCount} items — keeping storage files intact.`);
        }

        res.json({ message: 'Item deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// BOOK PAGES (interactive PDF rendering)
// ============================================

// Get rendered pages for an item, with signed URLs.
router.get('/modules/items/:itemId/pages', async (req, res) => {
    try {
        const { itemId } = req.params;

        const { data: item, error: itemError } = await supabase
            .from('module_items')
            .select('id, content_asset_id, processing_status, processing_error, total_pages')
            .eq('id', itemId)
            .single();

        if (itemError) throw itemError;

        if (item.processing_status !== 'ready') {
            return res.json({
                processing_status: item.processing_status,
                processing_error: item.processing_error,
                pages: []
            });
        }

        const targetAssetId = item.content_asset_id || itemId;

        const { data: pages, error: pagesError } = await supabase
            .from('book_pages')
            .select('*')
            .eq('content_asset_id', targetAssetId)
            .order('page_number');

        if (pagesError) throw pagesError;

        const signedPages = await Promise.all(
            (pages || []).map(async (page) => {
                const { data: urlData, error: signError } = await supabase.storage
                    .from('grade-content')
                    .createSignedUrl(page.image_path, 3600);

                if (signError) {
                    console.error(`Failed to sign URL for page ${page.id}:`, signError);
                    return { ...page, image_url: null };
                }

                return { ...page, image_url: urlData.signedUrl };
            })
        );

        res.json({
            processing_status: item.processing_status,
            total_pages: item.total_pages,
            pages: signedPages
        });
    } catch (error: any) {
        console.error('Error fetching book pages:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// VR CODES
// ============================================

// Get ALL VR codes for a module (N:N — a module can have multiple VR rooms)
router.get('/modules/:moduleId/vr-code', async (req, res) => {
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
router.post('/modules/:moduleId/vr-code', async (req, res) => {
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
router.put('/modules/vr-code/:entryId', async (req, res) => {
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
router.delete('/modules/vr-code/:entryId', async (req, res) => {
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

export default router;
