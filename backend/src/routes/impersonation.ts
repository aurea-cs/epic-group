import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

/**
 * Reads the caller's JWT from the Authorization header and
 * verifies they are a real admin user (role === 'admin').
 * Returns the admin user object or null (response already sent).
 */
async function verifyAdmin(req: Request, res: Response): Promise<any | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authorization header required' });
        return null;
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return null;
    }

    const role =
        (user.user_metadata?.role || user.app_metadata?.role || '').toLowerCase();

    // Matches the hardcoded fallback in frontend getUserRole.ts
    let isAdmin = role === 'admin' || user.email === 'admin@test.com';

    if (!isAdmin) {
        const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (dbUser?.role?.toLowerCase() === 'admin') {
            isAdmin = true;
        }
    }

    if (!isAdmin) {
        res.status(403).json({ error: 'Admin access required' });
        return null;
    }

    return user;
}

/**
 * POST /api/admin/impersonate
 * Body: { user_id: string }
 *
 * Generates a short-lived (5 min) OTP token for the target user so the
 * browser can exchange it for a real Supabase session via verifyOtp().
 * The service-role key never leaves the server.
 *
 * Audit log placeholder is commented in below — wire up the
 * impersonation_log table whenever you're ready.
 */
router.post('/api/admin/impersonate', async (req: Request, res: Response) => {
    try {
        const adminUser = await verifyAdmin(req, res);
        if (!adminUser) return;

        const { user_id } = req.body;
        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }

        // Fetch target user profile
        const { data: targetProfile, error: profileErr } = await supabase
            .from('users')
            .select('id, email, full_name, firstname, lastname, role')
            .eq('id', user_id)
            .single();

        if (profileErr || !targetProfile) {
            return res.status(404).json({ error: 'Target user not found' });
        }

        // Block impersonating other admins
        const targetRole = (targetProfile.role || '').toLowerCase();
        if (targetRole === 'admin') {
            return res.status(403).json({ error: 'Cannot impersonate admin users' });
        }

        // Block self-impersonation
        if (targetProfile.id === adminUser.id) {
            return res.status(400).json({ error: 'Cannot impersonate yourself' });
        }

        // Generate a magic-link OTP. No email is actually sent —
        // we only use the hashed_token to exchange client-side.
        const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: targetProfile.email,
        });

        if (linkErr || !linkData?.properties?.hashed_token) {
            console.error('Error generating impersonation link:', linkErr);
            return res.status(500).json({ error: 'Failed to generate impersonation token' });
        }

        // ── AUDIT LOG — uncomment + create table when ready ─────────────────────
        // await supabase.from('impersonation_log').insert({
        //     admin_id:   adminUser.id,
        //     target_id:  targetProfile.id,
        //     ip:         req.ip,
        //     created_at: new Date().toISOString(),
        // });
        // ────────────────────────────────────────────────────────────────────────

        const targetFullName = (targetProfile.full_name || '').trim() ||
            `${targetProfile.firstname || ''} ${targetProfile.lastname || ''}`.trim() ||
            targetProfile.email;

        console.log(`[IMPERSONATION] Admin ${adminUser.email} → ${targetProfile.email} (${targetFullName})`);

        return res.json({
            token_hash: linkData.properties.hashed_token,
            target: {
                id: targetProfile.id,
                email: targetProfile.email,
                full_name: targetFullName,
                firstname: targetProfile.firstname || '',
                lastname: targetProfile.lastname || '',
                role: targetProfile.role,
            },
        });
    } catch (err: any) {
        console.error('Impersonation error:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

/**
 * GET /api/admin/users-list
 * Returns a paginated list of all non-admin users for the
 * "Login as…" search modal on the frontend.
 * Supports optional ?search= or ?q= query parameter.
 * Supports pagination: ?page=1&limit=50 (defaults: page=1, limit=50)
 */
router.get('/api/admin/users-list', async (req: Request, res: Response) => {
    try {
        const adminUser = await verifyAdmin(req, res);
        if (!adminUser) return;

        const { search, q, role } = req.query;
        const queryTerm = (typeof search === 'string' ? search : typeof q === 'string' ? q : '').trim();
        const roleTerm = (typeof role === 'string' ? role : '').trim().toLowerCase();

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from('users')
            .select('id, email, full_name, firstname, lastname, role, center_id', { count: 'exact' })
            .neq('role', 'admin');

        if (roleTerm === 'student') {
            query = query.in('role', ['student', 'alumno']);
        } else if (roleTerm === 'professor') {
            query = query.in('role', ['professor', 'profesor']);
        }

        if (queryTerm) {
            query = query.or(`full_name.ilike.%${queryTerm}%,firstname.ilike.%${queryTerm}%,lastname.ilike.%${queryTerm}%,email.ilike.%${queryTerm}%`);
        }

        const { data, error, count } = await query
            .order('full_name', { ascending: true })
            .range(from, to);

        if (error) throw error;

        const formatted = (data || []).map((u: any) => {
            const computedName = (u.full_name || '').trim() ||
                `${u.firstname || ''} ${u.lastname || ''}`.trim() ||
                u.email?.split('@')[0] ||
                '';
            return {
                id: u.id,
                email: u.email,
                full_name: computedName,
                firstname: u.firstname || '',
                lastname: u.lastname || '',
                role: u.role,
                center_id: u.center_id,
            };
        });

        return res.json({
            users: formatted,
            total: count ?? formatted.length,
            page,
            limit,
        });
    } catch (err: any) {
        console.error('Error fetching users list for impersonation:', err);
        return res.status(500).json({ error: err.message });
    }
});

export default router;
