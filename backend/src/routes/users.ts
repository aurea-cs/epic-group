import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// Update user profile info and center associations (works for both students and professors)
router.put('/api/users/:id', async (req, res) => {
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
router.delete('/api/users/:id', async (req, res) => {
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

// Create new user (Admin, Teacher, Student)
router.post('/api/users', async (req, res) => {
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

        if (authError) {
            if (authError.message?.toLowerCase().includes('already') || (authError as any).code === 'email_exists') {
                let { data: existingUser } = await supabase
                    .from('users')
                    .select('id, email, full_name, role')
                    .eq('email', email)
                    .maybeSingle();

                if (!existingUser) {
                    const { data: listData } = await supabase.auth.admin.listUsers();
                    const foundAuth = listData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
                    if (foundAuth) {
                        await supabase.from('users').upsert({
                            id: foundAuth.id,
                            email: email,
                            full_name: fullName,
                            role: role,
                            firstname: fullName.split(' ')[0],
                            lastname: fullName.split(' ').slice(1).join(' ')
                        });
                        existingUser = { id: foundAuth.id, email, full_name: fullName, role };
                    }
                }

                if (existingUser) {
                    return res.status(200).json({
                        message: 'User already exists',
                        alreadyExists: true,
                        user: {
                            id: existingUser.id,
                            email: existingUser.email,
                            fullName: existingUser.full_name || fullName,
                            role: existingUser.role
                        }
                    });
                }
            }
            throw authError;
        }

        if (!authUser.user) {
            throw new Error('Failed to create user object');
        }

        // 2. Create profile in 'users' table with role
        // Note: The 'users' table in public schema is usually synchronized with auth.users via triggers.
        // If we need to set specific fields like 'role' which might not be in the trigger, we should update it.
        // First, let's try to upsert to ensure it exists and has the role.

        const { error: profileError } = await supabase
            .from('users')
            .upsert({
                id: authUser.user.id,
                email: email,
                full_name: fullName,
                role: role, // Assuming 'role' column exists in public.users
                // Default fields if needed
                firstname: fullName.split(' ')[0],
                lastname: fullName.split(' ').slice(1).join(' ')
            });

        if (profileError) {
            // If profile creation fails, we might want to delete the auth user to keep consistency,
            // but for now let's just throw error.
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

// Get the educational center (and its vr_code) for a given user
router.get('/api/users/:userId/center', async (req, res) => {
    try {
        const { userId } = req.params;

        // 1. Get the user's center_id from the users table
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('center_id')
            .eq('id', userId)
            .single();

        if (userError) throw userError;
        if (!userData?.center_id) {
            return res.json({ vr_code: null });
        }

        // 2. Fetch the center to get its vr_code
        const { data: center, error: centerError } = await supabase
            .from('educational_centers')
            .select('id, name, vr_code')
            .eq('id', userData.center_id)
            .single();

        if (centerError) throw centerError;

        res.json(center || { vr_code: null });
    } catch (error: any) {
        console.error('Error fetching user center:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/api/users/:userId/activity', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Fetch activity for the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data, error } = await supabase
            .from('activity_logs')
            .select('duration_seconds, created_at, path')
            .eq('user_id', userId)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        
        // Group by day
        const dailyActivity: Record<string, number> = {};
        const pathActivity: Record<string, number> = {};
        
        (data || []).forEach(log => {
            const dateStr = new Date(log.created_at).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' });
            if (!dailyActivity[dateStr]) dailyActivity[dateStr] = 0;
            dailyActivity[dateStr] += log.duration_seconds;
            
            const p = log.path || '/unknown';
            if (!pathActivity[p]) pathActivity[p] = 0;
            pathActivity[p] += log.duration_seconds;
        });
        
        const dailyArray = Object.keys(dailyActivity).map(k => ({ date: k, seconds: dailyActivity[k] }));
        const pathArray = Object.keys(pathActivity)
            .map(k => ({ path: k, seconds: pathActivity[k] }))
            .sort((a,b) => b.seconds - a.seconds)
            .slice(0, 10);
        
        res.json({
            daily: dailyArray,
            sections: pathArray
        });
    } catch (error: any) {
        console.error('Error fetching student activity:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get aggregated profile details (centers, grades, subjects)
router.get('/api/users/:userId/profile-details', async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.query;

        if (role === 'admin') {
            return res.json({ centers: 'N/A', grades: 'N/A', subjects: 'N/A' });
        }

        let centerNames: string[] = [];
        let gradeNames: string[] = [];
        let subjectNames: string[] = [];

        if (role === 'professor') {
            const { data: profSubjects, error } = await supabase
                .from('professor_subjects')
                .select(`
                    subjects (
                        name,
                        grades_levels (
                            name,
                            educational_centers (name)
                        )
                    )
                `)
                .eq('professor_id', userId);
            
            if (error) throw error;

            profSubjects?.forEach(ps => {
                const sub: any = ps.subjects;
                if (sub) {
                    subjectNames.push(sub.name);
                    if (sub.grades_levels) {
                        gradeNames.push(sub.grades_levels.name);
                        if (sub.grades_levels.educational_centers) {
                            centerNames.push(sub.grades_levels.educational_centers.name);
                        }
                    }
                }
            });
        } else if (role === 'tutor' || role === 'student') {
            let targetStudentIds = [userId];

            if (role === 'tutor') {
                const { data: studentTutors, error: tutorError } = await supabase
                    .from('student_tutors')
                    .select('student_id')
                    .eq('tutor_id', userId);
                if (tutorError) throw tutorError;
                targetStudentIds = studentTutors?.map(st => st.student_id) || [];
            }

            if (targetStudentIds.length > 0) {
                const { data: enrollments, error: enrollError } = await supabase
                    .from('enrollments')
                    .select(`
                        subjects (name),
                        grades_levels (name, educational_centers (name))
                    `)
                    .in('student_id', targetStudentIds);
                
                if (enrollError) throw enrollError;

                enrollments?.forEach(en => {
                    const sub: any = en.subjects;
                    const grade: any = en.grades_levels;
                    if (sub) subjectNames.push(sub.name);
                    if (grade) {
                        gradeNames.push(grade.name);
                        if (grade.educational_centers) {
                            centerNames.push(grade.educational_centers.name);
                        }
                    }
                });
            }
        }

        // Deduplicate
        const uniqueCenters = [...new Set(centerNames)].filter(Boolean);
        const uniqueGrades = [...new Set(gradeNames)].filter(Boolean);
        const uniqueSubjects = [...new Set(subjectNames)].filter(Boolean);

        res.json({
            centers: uniqueCenters.length > 0 ? uniqueCenters.join(', ') : 'N/A',
            grades: uniqueGrades.length > 0 ? uniqueGrades.join(', ') : 'N/A',
            subjects: uniqueSubjects.length > 0 ? uniqueSubjects.join(', ') : 'N/A'
        });

    } catch (error: any) {
        console.error('Error fetching profile details:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
