import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// ============================================
// ADMIN - USER MANAGEMENT
// ============================================

// Get all students with their enrolled centers
router.get('/students', async (req, res) => {
    try {
        // 1. Fetch all users with role=student
        const { data: students, error: studentsError } = await supabase
            .from('users')
            .select('id, full_name, email, firstname, lastname, avatar_url, created_at')
            .eq('role', 'student')
            .order('full_name', { ascending: true });

        if (studentsError) throw studentsError;

        if (!students || students.length === 0) return res.json([]);

        const studentIds = students.map(s => s.id);

        // 2. Fetch enrollments with center info for these students
        const { data: enrollments, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select('student_id, center_id')
            .in('student_id', studentIds);

        if (enrollmentsError) throw enrollmentsError;

        // 3. Get distinct center IDs
        const centerIds = [...new Set((enrollments || []).map(e => e.center_id).filter(Boolean))];
        let centersMap: Record<string, string> = {};

        if (centerIds.length > 0) {
            const { data: centers, error: centersError } = await supabase
                .from('educational_centers')
                .select('id, name')
                .in('id', centerIds);

            if (centersError) throw centersError;
            (centers || []).forEach(c => { centersMap[c.id] = c.name; });
        }

        // 4. Build student-to-centers map
        const studentCentersMap: Record<string, { id: string; name: string }[]> = {};
        (enrollments || []).forEach(e => {
            if (!e.center_id) return;
            if (!studentCentersMap[e.student_id]) studentCentersMap[e.student_id] = [];
            const centerName = centersMap[e.center_id];
            if (centerName && !studentCentersMap[e.student_id].find(c => c.id === e.center_id)) {
                studentCentersMap[e.student_id].push({ id: e.center_id, name: centerName });
            }
        });

        // 5. Format response
        const formatted = students.map(s => ({
            id: s.id,
            name: s.full_name || `${s.firstname || ''} ${s.lastname || ''}`.trim() || s.email,
            email: s.email,
            avatar_url: s.avatar_url,
            created_at: s.created_at,
            centers: studentCentersMap[s.id] || []
        }));

        res.json(formatted);
    } catch (error: any) {
        console.error('Error fetching all students with centers:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get student tutors
router.get('/students/:studentId/tutors', async (req, res) => {
    try {
        const { studentId } = req.params;

        const { data: relations, error: relationError } = await supabase
            .from('student_tutors')
            .select('tutor_id')
            .eq('student_id', studentId);

        if (relationError) throw relationError;

        const tutorIds = relations?.map(r => r.tutor_id) || [];

        if (tutorIds.length === 0) {
            return res.json([]);
        }

        const { data: tutors, error: tutorsError } = await supabase
            .from('users')
            .select('id, full_name, email, firstname, lastname')
            .in('id', tutorIds);

        if (tutorsError) throw tutorsError;

        res.json(tutors || []);
    } catch (error: any) {
        console.error('Error fetching student tutors:', error);
        // Fallback for missing table
        if (error.code === '42P01') {
            return res.json([]);
        }
        res.status(500).json({ error: error.message });
    }
});

// Create a tutor account and link it to a student
router.post('/students/:studentId/tutor', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { email, password, fullName } = req.body;

        if (!email || !password || !fullName) {
            return res.status(400).json({ error: 'Email, password, and full name are required' });
        }

        // 1. Create the tutor user in Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });

        if (authError) throw authError;
        if (!authUser.user) throw new Error('Failed to create tutor user');

        const tutorId = authUser.user.id;

        // 2. Insert into public.users with role='tutor'
        const { error: profileError } = await supabase
            .from('users')
            .upsert({
                id: tutorId,
                email,
                full_name: fullName,
                role: 'tutor',
                firstname: fullName.split(' ')[0],
                lastname: fullName.split(' ').slice(1).join(' ')
            });

        if (profileError) throw profileError;

        // 3. Link tutor to student in student_tutors table
        const { error: linkError } = await supabase
            .from('student_tutors')
            .insert({ student_id: studentId, tutor_id: tutorId });

        if (linkError) {
            // If the table doesn't exist yet, still return success with a warning
            console.warn('Could not link tutor to student (student_tutors table may not exist):', linkError.message);
            return res.status(201).json({
                message: 'Tutor created but could not be linked (student_tutors table missing)',
                tutor: { id: tutorId, email, fullName, role: 'tutor' },
                warning: linkError.message
            });
        }

        res.status(201).json({
            message: 'Tutor created and linked to student successfully',
            tutor: { id: tutorId, email, fullName, role: 'tutor' }
        });

    } catch (error: any) {
        console.error('Error creating tutor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all professors with their assigned centers
router.get('/professors', async (req, res) => {
    try {
        // 1. Fetch all users with role=professor
        const { data: professors, error: professorsError } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'professor')
            .order('full_name', { ascending: true });

        if (professorsError) throw professorsError;

        if (!professors || professors.length === 0) return res.json([]);

        const professorIds = professors.map(p => p.id);

        // 2. Fetch center_professors links for these professors
        const { data: links, error: linksError } = await supabase
            .from('center_professors')
            .select('user_id, center_id')
            .in('user_id', professorIds);

        if (linksError) throw linksError;

        // 3. Get distinct center IDs and fetch center names
        const centerIds = [...new Set((links || []).map(l => l.center_id).filter(Boolean))];
        let centersMap: Record<string, string> = {};

        if (centerIds.length > 0) {
            const { data: centers, error: centersError } = await supabase
                .from('educational_centers')
                .select('id, name')
                .in('id', centerIds);

            if (centersError) throw centersError;
            (centers || []).forEach(c => { centersMap[c.id] = c.name; });
        }

        // 4. Build professor-to-centers map
        const professorCentersMap: Record<string, { id: string; name: string }[]> = {};
        (links || []).forEach(l => {
            if (!l.center_id) return;
            if (!professorCentersMap[l.user_id]) professorCentersMap[l.user_id] = [];
            const centerName = centersMap[l.center_id];
            if (centerName && !professorCentersMap[l.user_id].find(c => c.id === l.center_id)) {
                professorCentersMap[l.user_id].push({ id: l.center_id, name: centerName });
            }
        });

        // 4.5 Fetch time from view
        const { data: timeData } = await supabase
            .from('student_time_view')
            .select('user_id, total_time_seconds')
            .in('user_id', professorIds);

        const timeMap: Record<string, number> = {};
        (timeData || []).forEach(t => {
            timeMap[t.user_id] = t.total_time_seconds;
        });

        // 5. Format response
        const formatted = professors.map(p => ({
            id: p.id,
            name: p.full_name || p.email,
            email: p.email,
            avatar_url: p.avatar_url,
            created_at: p.created_at,
            centers: professorCentersMap[p.id] || [],
            total_time_seconds: timeMap[p.id] || 0
        }));

        res.json(formatted);
    } catch (error: any) {
        console.error('Error fetching all professors with centers:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new user (Admin, Teacher, Student)
router.post('/users', async (req, res) => {
    try {
        const { email, password, fullName, role } = req.body;

        if (!email || !password || !fullName || !role) {
            return res.status(400).json({ error: 'Email, password, full name, and role are required' });
        }

        // 1. Create user in Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });

        if (authError) throw authError;

        if (!authUser.user) {
            throw new Error('Failed to create user object');
        }

        // 2. Create profile in 'users' table with role
        const { error: profileError } = await supabase
            .from('users')
            .upsert({
                id: authUser.user.id,
                email: email,
                full_name: fullName,
                role: role,
                firstname: fullName.split(' ')[0],
                lastname: fullName.split(' ').slice(1).join(' ')
            });

        if (profileError) {
            console.error('Error creating profile:', profileError);
            throw profileError;
        }

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: authUser.user.id,
                email,
                fullName,
                role
            }
        });

    } catch (error: any) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update user profile info and center associations (works for both students and professors)
router.put('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, email, centerIds } = req.body;

        if (!fullName || !email) {
            return res.status(400).json({ error: 'Full name and email are required' });
        }

        // 1. Update auth email if changed
        const { error: authError } = await supabase.auth.admin.updateUserById(id, {
            email,
            user_metadata: { full_name: fullName }
        });
        if (authError) throw authError;

        // 2. Update users table and get the user's role
        const { data: updatedUser, error: profileError } = await supabase
            .from('users')
            .update({
                full_name: fullName,
                email,
                firstname: fullName.split(' ')[0],
                lastname: fullName.split(' ').slice(1).join(' ')
            })
            .eq('id', id)
            .select('role')
            .single();

        if (profileError) throw profileError;

        const userRole = updatedUser?.role;

        // 3. Reconcile center associations based on role
        if (Array.isArray(centerIds)) {
            if (userRole === 'professor') {
                // ── PROFESSOR: reconcile center_professors table ──────────────────
                const { data: currentLinks, error: currentLinksError } = await supabase
                    .from('center_professors')
                    .select('center_id')
                    .eq('user_id', id);

                if (currentLinksError) throw currentLinksError;

                const currentCenterIds = (currentLinks || []).map((l: any) => l.center_id) as string[];

                // Centers to REMOVE
                const centersToRemove = currentCenterIds.filter(cId => !centerIds.includes(cId));
                if (centersToRemove.length > 0) {
                    const { error: deleteError } = await supabase
                        .from('center_professors')
                        .delete()
                        .eq('user_id', id)
                        .in('center_id', centersToRemove);
                    if (deleteError) throw deleteError;
                }

                // Centers to ADD
                const centersToAdd = (centerIds as string[]).filter(cId => !currentCenterIds.includes(cId));
                if (centersToAdd.length > 0) {
                    const rows = centersToAdd.map(cId => ({ center_id: cId, user_id: id }));
                    const { error: insertError } = await supabase
                        .from('center_professors')
                        .insert(rows);
                    if (insertError) throw insertError;
                    // Update users.center_id to the last added center
                    await supabase.from('users').update({ center_id: centersToAdd[centersToAdd.length - 1] }).eq('id', id);
                } else if (centersToRemove.length > 0) {
                    // Centers were only removed — revert to most recent remaining
                    const { data: remaining } = await supabase
                        .from('center_professors')
                        .select('center_id, created_at')
                        .eq('user_id', id)
                        .order('created_at', { ascending: false })
                        .limit(1);
                    const latestCenterId = remaining && remaining.length > 0 ? remaining[0].center_id : null;
                    await supabase.from('users').update({ center_id: latestCenterId }).eq('id', id);
                }
            } else {
                // ── STUDENT (default): reconcile enrollments table ───────────────
                const { data: currentEnrollments, error: currentEnrollmentsError } = await supabase
                    .from('enrollments')
                    .select('center_id')
                    .eq('student_id', id);

                if (currentEnrollmentsError) throw currentEnrollmentsError;

                const currentCenterIds = [...new Set((currentEnrollments || []).map((e: any) => e.center_id).filter(Boolean))] as string[];

                // Centers to REMOVE
                const centersToRemove = currentCenterIds.filter(cId => !centerIds.includes(cId));
                if (centersToRemove.length > 0) {
                    const { error: deleteError } = await supabase
                        .from('enrollments')
                        .delete()
                        .eq('student_id', id)
                        .in('center_id', centersToRemove);
                    if (deleteError) throw deleteError;
                }

                // Centers to ADD
                const centersToAdd = (centerIds as string[]).filter(cId => !currentCenterIds.includes(cId));
                if (centersToAdd.length > 0) {
                    const { data: grades, error: gradesError } = await supabase
                        .from('grades_levels')
                        .select('id, center_id')
                        .in('center_id', centersToAdd);

                    if (gradesError) throw gradesError;

                    if (grades && grades.length > 0) {
                        const gradeIds = grades.map((g: any) => g.id);

                        const { data: subjects, error: subjectsError } = await supabase
                            .from('subjects')
                            .select('id, grade_id')
                            .in('grade_id', gradeIds);

                        if (subjectsError) throw subjectsError;

                        if (subjects && subjects.length > 0) {
                            const { data: existingEnrollments } = await supabase
                                .from('enrollments')
                                .select('subject_id')
                                .eq('student_id', id);

                            const enrolledSubjectIds = new Set(
                                (existingEnrollments || []).map((e: any) => e.subject_id)
                            );

                            const now = new Date().toISOString();
                            const rows = subjects
                                .filter((s: any) => !enrolledSubjectIds.has(s.id))
                                .map((s: any) => {
                                    const grade = grades.find((g: any) => g.id === s.grade_id)!;
                                    return {
                                        student_id: id,
                                        subject_id: s.id,
                                        grade_id: s.grade_id,
                                        center_id: grade.center_id,
                                        status: 'active',
                                        created_at: now,
                                    };
                                });

                            if (rows.length > 0) {
                                const { error: insertError } = await supabase
                                    .from('enrollments')
                                    .insert(rows);
                                if (insertError) throw insertError;
                                // Update users.center_id to the last added center
                                await supabase.from('users').update({ center_id: centersToAdd[centersToAdd.length - 1] }).eq('id', id);
                            }
                        }
                    }
                } else if (centersToRemove.length > 0) {
                    // Centers were only removed — revert to most recent remaining
                    const { data: remaining } = await supabase
                        .from('enrollments')
                        .select('center_id, created_at')
                        .eq('student_id', id)
                        .order('created_at', { ascending: false })
                        .limit(1);
                    const latestCenterId = remaining && remaining.length > 0 ? remaining[0].center_id : null;
                    await supabase.from('users').update({ center_id: latestCenterId }).eq('id', id);
                }
            }
        }

        res.json({ message: 'User updated successfully' });
    } catch (error: any) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete a user (removes from auth and all DB tables — handles both students and professors)
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Student-specific cleanup
        await supabase.from('enrollments').delete().eq('student_id', id);
        await supabase.from('student_tutors').delete().eq('student_id', id);
        await supabase.from('student_comments').delete().eq('student_id', id);

        // Professor-specific cleanup
        await supabase.from('center_professors').delete().eq('user_id', id);
        await supabase.from('student_comments').delete().eq('professor_id', id);

        // Delete user profile
        await supabase.from('users').delete().eq('id', id);

        // Delete from auth
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id);
        if (authDeleteError) throw authDeleteError;

        res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
