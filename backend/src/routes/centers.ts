import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// Get all educational centers
router.get('/api/centers', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('educational_centers')
            .select('*')
            .order('name');

        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        console.error('Error fetching centers:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get specific educational center
router.get('/api/centers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('educational_centers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Center not found' });

        res.json(data);
    } catch (error: any) {
        console.error('Error fetching center:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create educational center
router.post('/api/centers', async (req, res) => {
    try {
        const { name, address, phone, email, vr_code } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const { data, error } = await supabase
            .from('educational_centers')
            .insert({ name, address, phone, email, vr_code })
            .select()
            .single();

        if (error) {
            if (error.code === '23505' || error.message?.includes('educational_centers_name_key') || error.message?.includes('duplicate key')) {
                console.warn(`Attempted to create duplicate center name: "${name}"`);
                return res.status(400).json({ error: `Ya existe un centro educativo con el nombre "${name}". Por favor utiliza un nombre diferente.` });
            }
            throw error;
        }
        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error creating center:', error);
        if (error?.code === '23505' || error?.message?.includes('educational_centers_name_key') || error?.message?.includes('duplicate key')) {
            return res.status(400).json({ error: 'Ya existe un centro educativo con ese nombre. Por favor utiliza un nombre diferente.' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Clone educational center along with grades, subjects, modules, items, and VR codes
router.post('/api/centers/:centerId/clone', async (req, res) => {
    try {
        const { centerId } = req.params;
        const { name, address, phone, email, vr_code } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        // 1. Fetch source center
        const { data: sourceCenter, error: centerFetchErr } = await supabase
            .from('educational_centers')
            .select('*')
            .eq('id', centerId)
            .single();

        if (centerFetchErr || !sourceCenter) {
            return res.status(404).json({ error: 'Source center not found' });
        }

        // 2. Insert new center
        const { data: newCenter, error: centerInsertErr } = await supabase
            .from('educational_centers')
            .insert({
                name,
                address: address || sourceCenter.address,
                phone: phone || sourceCenter.phone,
                email: email || sourceCenter.email,
                vr_code: vr_code || sourceCenter.vr_code
            })
            .select()
            .single();

        if (centerInsertErr) {
            if (centerInsertErr.code === '23505' || centerInsertErr.message?.includes('educational_centers_name_key') || centerInsertErr.message?.includes('duplicate key')) {
                console.warn(`Attempted to clone center with duplicate name: "${name}"`);
                return res.status(400).json({ error: `Ya existe un centro educativo con el nombre "${name}". Por favor utiliza un nombre diferente.` });
            }
            throw centerInsertErr;
        }

        // 3. Fetch grades for source center
        const { data: sourceGrades, error: gradesFetchErr } = await supabase
            .from('grades_levels')
            .select('*')
            .eq('center_id', centerId);

        if (gradesFetchErr) throw gradesFetchErr;

        if (sourceGrades && sourceGrades.length > 0) {
            for (const sourceGrade of sourceGrades) {
                // 3a. Insert new grade level
                const { data: newGrade, error: gradeInsertErr } = await supabase
                    .from('grades_levels')
                    .insert({
                        center_id: newCenter.id,
                        name: sourceGrade.name,
                        level: sourceGrade.level,
                        is_active: true
                    })
                    .select()
                    .single();

                if (gradeInsertErr) throw gradeInsertErr;

                // 3b. Fetch subjects for source grade
                const { data: sourceSubjects, error: subjFetchErr } = await supabase
                    .from('subjects')
                    .select('*')
                    .eq('grade_id', sourceGrade.id);

                if (subjFetchErr) throw subjFetchErr;

                if (sourceSubjects && sourceSubjects.length > 0) {
                    for (const sourceSubj of sourceSubjects) {
                        // 3c. Insert new subject
                        const { data: newSubj, error: subjInsertErr } = await supabase
                            .from('subjects')
                            .insert({
                                grade_id: newGrade.id,
                                name: sourceSubj.name,
                                short_name: sourceSubj.short_name,
                                description: sourceSubj.description,
                                start_date: sourceSubj.start_date,
                                end_date: sourceSubj.end_date,
                                visibility: sourceSubj.visibility || 'active',
                                max_students: sourceSubj.max_students || 30,
                                schedule_days: sourceSubj.schedule_days,
                                schedule_start_time: sourceSubj.schedule_start_time,
                                schedule_end_time: sourceSubj.schedule_end_time,
                                campo_formativo: sourceSubj.campo_formativo
                            })
                            .select()
                            .single();

                        if (subjInsertErr) throw subjInsertErr;

                        // 3d. Fetch modules for source subject
                        const { data: sourceMods, error: modsFetchErr } = await supabase
                            .from('modules')
                            .select('*')
                            .eq('subject_id', sourceSubj.id)
                            .order('order_index', { ascending: true });

                        if (modsFetchErr) throw modsFetchErr;

                        if (sourceMods && sourceMods.length > 0) {
                            for (const sourceMod of sourceMods) {
                                // 3e. Insert new module
                                const { data: newMod, error: modInsertErr } = await supabase
                                    .from('modules')
                                    .insert({
                                        subject_id: newSubj.id,
                                        title: sourceMod.title,
                                        description: sourceMod.description,
                                        order_index: sourceMod.order_index
                                    })
                                    .select()
                                    .single();

                                if (modInsertErr) throw modInsertErr;

                                // 3f. Fetch & clone module items
                                const { data: sourceItems, error: itemsFetchErr } = await supabase
                                    .from('module_items')
                                    .select('*')
                                    .eq('module_id', sourceMod.id);

                                if (itemsFetchErr) throw itemsFetchErr;

                                if (sourceItems && sourceItems.length > 0) {
                                    const itemsToInsert = sourceItems.map(item => ({
                                        module_id: newMod.id,
                                        type: item.type,
                                        title: item.title,
                                        description: item.description,
                                        content_url: item.content_url,
                                        image_url: item.image_url,
                                        order_index: item.order_index,
                                        show_student: item.show_student ?? true,
                                        show_teacher: item.show_teacher ?? true,
                                        is_editable: item.is_editable ?? false
                                    }));

                                    const { error: itemsInsertErr } = await supabase
                                        .from('module_items')
                                        .insert(itemsToInsert);

                                    if (itemsInsertErr) throw itemsInsertErr;
                                }

                                // 3g. Fetch & clone VR rooms
                                const { data: sourceVrCodes, error: vrFetchErr } = await supabase
                                    .from('module_vr_code')
                                    .select('*')
                                    .eq('module_id', sourceMod.id);

                                if (vrFetchErr) throw vrFetchErr;

                                if (sourceVrCodes && sourceVrCodes.length > 0) {
                                    const vrToInsert = sourceVrCodes.map(vr => ({
                                        module_id: newMod.id,
                                        code: vr.code,
                                        title: vr.title,
                                        description: vr.description,
                                        image_url: vr.image_url
                                    }));

                                    const { error: vrInsertErr } = await supabase
                                        .from('module_vr_code')
                                        .insert(vrToInsert);

                                    if (vrInsertErr) throw vrInsertErr;
                                }
                            }
                        }
                    }
                }
            }
        }

        res.status(201).json(newCenter);
    } catch (error: any) {
        console.error('Error cloning center:', error);
        if (error?.code === '23505' || error?.message?.includes('educational_centers_name_key') || error?.message?.includes('duplicate key')) {
            return res.status(400).json({ error: 'Ya existe un centro educativo con ese nombre. Por favor utiliza un nombre diferente.' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Update educational center
router.put('/api/centers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, phone, email, vr_code, is_active } = req.body;

        const { data, error } = await supabase
            .from('educational_centers')
            .update({ name, address, phone, email, vr_code, is_active })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === '23505' || error.message?.includes('educational_centers_name_key') || error.message?.includes('duplicate key')) {
                console.warn(`Attempted to update center to duplicate name: "${name}"`);
                return res.status(400).json({ error: `Ya existe un centro educativo con el nombre "${name}". Por favor utiliza un nombre diferente.` });
            }
            throw error;
        }
        res.json(data);
    } catch (error: any) {
        console.error('Error updating center:', error);
        if (error?.code === '23505' || error?.message?.includes('educational_centers_name_key') || error?.message?.includes('duplicate key')) {
            return res.status(400).json({ error: 'Ya existe un centro educativo con ese nombre. Por favor utiliza un nombre diferente.' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Delete educational center
router.delete('/api/centers/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('educational_centers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Center deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting center:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get grades by center
router.get('/api/centers/:centerId/grades', async (req, res) => {
    try {
        const { centerId } = req.params;

        const { data, error } = await supabase
            .from('grades_levels')
            .select('*')
            .eq('center_id', centerId)
            .order('level');

        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        console.error('Error fetching grades:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get complete hierarchy for a center
router.get('/api/centers/:centerId/hierarchy', async (req, res) => {
    try {
        const { centerId } = req.params;

        // Get center info
        const { data: center, error: centerError } = await supabase
            .from('educational_centers')
            .select('*')
            .eq('id', centerId)
            .single();

        if (centerError) throw centerError;

        // Get grades with subjects
        const { data: grades, error: gradesError } = await supabase
            .from('grades_levels')
            .select(`
            *,
                subjects (*)
            )
        `)
            .eq('center_id', centerId)
            .order('level');

        if (gradesError) throw gradesError;

        res.json({
            center,
            grades: grades || []
        });
    } catch (error: any) {
        console.error('Error fetching hierarchy:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get professors for a center
router.get('/api/centers/:centerId/professors', async (req, res) => {
    try {
        const { centerId } = req.params;

        console.log(`Fetching professors for center: ${centerId}`);

        // Get user_ids from junction table
        const { data: relations, error: relationError } = await supabase
            .from('center_professors')
            .select('user_id')
            .eq('center_id', centerId);

        if (relationError) throw relationError;

        const userIds = relations?.map(r => r.user_id) || [];

        if (userIds.length === 0) {
            return res.json([]);
        }

        // Get user details
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email, full_name, firstname, lastname')
            .in('id', userIds);

        if (usersError) {
            console.error('Error fetching users in getCenterProfessors:', usersError);
            throw usersError;
        }

        // Fetch time from view
        const { data: timeData } = await supabase
            .from('student_time_view')
            .select('user_id, total_time_seconds')
            .in('user_id', userIds);
            
        const timeMap = new Map();
        (timeData || []).forEach(t => timeMap.set(t.user_id, t.total_time_seconds));

        const usersWithTime = (users || []).map(u => ({
            ...u,
            total_time_seconds: timeMap.get(u.id) || 0
        }));

        console.log(`Found ${usersWithTime.length} users for center ${centerId}`);
        res.json(usersWithTime);
    } catch (error: any) {
        console.error('Error fetching center professors FULL:', JSON.stringify(error, null, 2));
        res.status(500).json({ error: error.message, details: error });
    }
});

// Assign professor to center
router.post('/api/centers/:centerId/professors', async (req, res) => {
    try {
        const { centerId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const { data, error } = await supabase
            .from('center_professors')
            .upsert({ center_id: centerId, user_id: userId }, { ignoreDuplicates: true })
            .select();

        if (error) {
            if (error.code === '23505') {
                return res.status(200).json({ message: 'Professor already assigned to this center' });
            }
            throw error;
        }

        // Update users.center_id to the most recently assigned center
        await supabase
            .from('users')
            .update({ center_id: centerId })
            .eq('id', userId);

        res.status(201).json(data);
    } catch (error: any) {
        console.error('Error assigning professor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Unassign professor from center
router.delete('/api/centers/:centerId/professors/:userId', async (req, res) => {
    try {
        const { centerId, userId } = req.params;

        const { error } = await supabase
            .from('center_professors')
            .delete()
            .match({ center_id: centerId, user_id: userId });

        if (error) throw error;

        // Update users.center_id to the professor's most recent remaining center (or null)
        const { data: remaining } = await supabase
            .from('center_professors')
            .select('center_id, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

        const latestCenterId = remaining && remaining.length > 0 ? remaining[0].center_id : null;
        await supabase.from('users').update({ center_id: latestCenterId }).eq('id', userId);

        res.json({ message: 'Professor unassigned successfully' });
    } catch (error: any) {
        console.error('Error unassigning professor:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
