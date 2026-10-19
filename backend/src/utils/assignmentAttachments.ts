import { supabase } from '../config/supabase';

export interface AssignmentAttachmentRow {
    id: string;
    assignment_id: string;
    file_name: string;
    mime_type: string | null;
    file_size_bytes: number | null;
    storage_path: string;
    created_at: string;
    file_url?: string | null;
    url?: string | null;
}

/**
 * Fetch attachments for a single assignment with signed URLs.
 */
export async function getAssignmentAttachments(assignmentId: string): Promise<AssignmentAttachmentRow[]> {
    try {
        const { data: rows, error } = await supabase
            .from('assignment_attachments')
            .select('*')
            .eq('assignment_id', assignmentId)
            .order('created_at', { ascending: true });

        if (error) {
            if ((error as any).code === '42P01') {
                return [];
            }
            console.error('Error fetching assignment_attachments:', error);
            return [];
        }

        if (!rows || rows.length === 0) return [];

        return await Promise.all(rows.map(async (row) => {
            let file_url: string | null = null;
            if (row.storage_path) {
                const { data: signed, error: signError } = await supabase.storage
                    .from('grade-content')
                    .createSignedUrl(row.storage_path, 3600 * 24 * 7);

                if (!signError && signed?.signedUrl) {
                    file_url = signed.signedUrl;
                } else {
                    const { data: pub } = supabase.storage.from('grade-content').getPublicUrl(row.storage_path);
                    file_url = pub.publicUrl;
                }
            }
            return {
                ...row,
                file_url,
                url: file_url
            };
        }));
    } catch (err) {
        console.error('getAssignmentAttachments failed:', err);
        return [];
    }
}

/**
 * Batch fetch attachments for a list of assignment IDs.
 * Returns a Record<assignment_id, AssignmentAttachmentRow[]>.
 */
export async function getAssignmentsAttachmentsMap(assignmentIds: string[]): Promise<Record<string, AssignmentAttachmentRow[]>> {
    const map: Record<string, AssignmentAttachmentRow[]> = {};
    if (!assignmentIds || assignmentIds.length === 0) return map;

    try {
        const { data: rows, error } = await supabase
            .from('assignment_attachments')
            .select('*')
            .in('assignment_id', assignmentIds)
            .order('created_at', { ascending: true });

        if (error) {
            if ((error as any).code === '42P01') {
                return map;
            }
            console.error('Error batch fetching assignment_attachments:', error);
            return map;
        }

        if (!rows || rows.length === 0) return map;

        const withUrls = await Promise.all(rows.map(async (row) => {
            let file_url: string | null = null;
            if (row.storage_path) {
                const { data: signed, error: signError } = await supabase.storage
                    .from('grade-content')
                    .createSignedUrl(row.storage_path, 3600 * 24 * 7);

                if (!signError && signed?.signedUrl) {
                    file_url = signed.signedUrl;
                } else {
                    const { data: pub } = supabase.storage.from('grade-content').getPublicUrl(row.storage_path);
                    file_url = pub.publicUrl;
                }
            }
            return {
                ...row,
                file_url,
                url: file_url
            };
        }));

        for (const item of withUrls) {
            if (!map[item.assignment_id]) {
                map[item.assignment_id] = [];
            }
            map[item.assignment_id].push(item);
        }
        return map;
    } catch (err) {
        console.error('getAssignmentsAttachmentsMap failed:', err);
        return map;
    }
}

/**
 * Upload multiple files to storage and insert into assignment_attachments.
 */
export async function saveAssignmentAttachments(assignmentId: string, files: Express.Multer.File[]): Promise<AssignmentAttachmentRow[]> {
    if (!files || files.length === 0) return [];
    const inserted: AssignmentAttachmentRow[] = [];

    for (const file of files) {
        const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeOriginalName}`;
        const filePath = `assignments/${assignmentId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('grade-content')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (uploadError) {
            console.error('Error uploading assignment attachment:', uploadError);
            throw new Error(`Error subiendo archivo "${file.originalname}": ${uploadError.message}`);
        }

        let row: any = null;
        const initialInsert = await supabase
            .from('assignment_attachments')
            .insert({
                assignment_id: assignmentId,
                file_name: file.originalname,
                mime_type: file.mimetype || 'application/octet-stream',
                file_size_bytes: file.size,
                storage_path: filePath
            })
            .select()
            .single();

        if (initialInsert.error) {
            // If the column file_size_bytes does not exist yet in schema cache (PGRST204)
            if (initialInsert.error.code === 'PGRST204' || initialInsert.error.message?.includes('file_size_bytes')) {
                const fallbackInsert = await supabase
                    .from('assignment_attachments')
                    .insert({
                        assignment_id: assignmentId,
                        file_name: file.originalname,
                        mime_type: file.mimetype || 'application/octet-stream',
                        storage_path: filePath
                    })
                    .select()
                    .single();

                if (fallbackInsert.error) {
                    console.error('Error creating assignment_attachments record on fallback:', fallbackInsert.error);
                    throw new Error(`Error registrando adjunto en base de datos: ${fallbackInsert.error.message}`);
                }
                row = { ...fallbackInsert.data, file_size_bytes: file.size };
            } else {
                console.error('Error creating assignment_attachments record:', initialInsert.error);
                throw new Error(`Error registrando adjunto en base de datos: ${initialInsert.error.message}`);
            }
        } else {
            row = initialInsert.data;
        }

        const { data: signed } = await supabase.storage
            .from('grade-content')
            .createSignedUrl(filePath, 3600 * 24 * 7);
        const file_url = signed?.signedUrl || supabase.storage.from('grade-content').getPublicUrl(filePath).data.publicUrl;

        inserted.push({ ...row, file_url, url: file_url });
    }

    return inserted;
}

/**
 * Delete attachments by their primary key IDs.
 */
export async function deleteAssignmentAttachments(attachmentIds: string[]): Promise<void> {
    if (!attachmentIds || attachmentIds.length === 0) return;

    try {
        const { data: rows } = await supabase
            .from('assignment_attachments')
            .select('id, storage_path')
            .in('id', attachmentIds);

        if (rows && rows.length > 0) {
            const paths = rows.map(r => r.storage_path).filter(Boolean);
            if (paths.length > 0) {
                const { error: removeErr } = await supabase.storage.from('grade-content').remove(paths);
                if (removeErr) console.warn('Error removing files from storage:', removeErr);
            }

            await supabase
                .from('assignment_attachments')
                .delete()
                .in('id', attachmentIds);
        }
    } catch (err) {
        console.error('deleteAssignmentAttachments error:', err);
    }
}

/**
 * Delete all attachments belonging to an assignment.
 */
export async function deleteAssignmentAttachmentsByAssignment(assignmentId: string): Promise<void> {
    try {
        const { data: rows } = await supabase
            .from('assignment_attachments')
            .select('id, storage_path')
            .eq('assignment_id', assignmentId);

        if (rows && rows.length > 0) {
            const paths = rows.map(r => r.storage_path).filter(Boolean);
            if (paths.length > 0) {
                await supabase.storage.from('grade-content').remove(paths);
            }
            await supabase
                .from('assignment_attachments')
                .delete()
                .eq('assignment_id', assignmentId);
        }
    } catch (err) {
        console.error('deleteAssignmentAttachmentsByAssignment error:', err);
    }
}
