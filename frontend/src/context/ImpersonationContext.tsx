import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ImpersonationTarget {
    id: string;
    email: string;
    full_name: string;
    firstname?: string;
    lastname?: string;
    role: string;
    center_id?: string;
}

export interface ImpersonationCandidate {
    id: string;
    email: string;
    full_name: string;
    firstname?: string;
    lastname?: string;
    role: string;
    center_id?: string;
}

interface ImpersonationContextType {
    isImpersonating: boolean;
    impersonatedUser: ImpersonationTarget | null;
    isLoading: boolean;
    error: string | null;
    isModalOpen: boolean;
    openModal: () => void;
    closeModal: () => void;
    startImpersonation: (userId: string) => Promise<boolean>;
    exitImpersonation: () => Promise<void>;
    clearError: () => void;
}

const STORAGE_ADMIN_SESSION = 'epic_admin_session_stash';
const STORAGE_IMPERSONATION = 'epic_impersonation_target';
const STORAGE_STARTED_AT = 'epic_impersonation_started_at';
const AUTO_EXIT_MS = 45 * 60 * 1000; // 45 minutes

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export const ImpersonationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isImpersonating, setIsImpersonating] = useState<boolean>(false);
    const [impersonatedUser, setImpersonatedUser] = useState<ImpersonationTarget | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const autoExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearAutoExitTimer = useCallback(() => {
        if (autoExitTimerRef.current) {
            clearTimeout(autoExitTimerRef.current);
            autoExitTimerRef.current = null;
        }
    }, []);

    // ── Exit impersonation ──────────────────────────────────────────────────
    const exitImpersonation = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        clearAutoExitTimer();

        try {
            const stashed = sessionStorage.getItem(STORAGE_ADMIN_SESSION);
            if (!stashed) {
                throw new Error('No se encontró la sesión original del administrador');
            }

            const { access_token, refresh_token } = JSON.parse(stashed);

            // Cleanly sign out impersonated user session
            try {
                await supabase.auth.signOut({ scope: 'local' });
            } catch {
                // Ignore failure if already invalid
            }

            // Restore the admin session
            const { error: setSessionErr } = await supabase.auth.setSession({
                access_token,
                refresh_token,
            });

            if (setSessionErr) throw new Error(setSessionErr.message);

            sessionStorage.removeItem(STORAGE_ADMIN_SESSION);
            sessionStorage.removeItem(STORAGE_IMPERSONATION);
            sessionStorage.removeItem(STORAGE_STARTED_AT);
            setImpersonatedUser(null);
            setIsImpersonating(false);

            // Hard redirect to dashboard to completely reload with admin permissions
            window.location.href = '/dashboard';
        } catch (err: any) {
            console.error('[Impersonation] Error exiting impersonation:', err);
            setError(err.message || 'Error al salir del modo suplantación');
            sessionStorage.clear();
            window.location.href = '/login';
        } finally {
            setIsLoading(false);
        }
    }, [clearAutoExitTimer]);

    const startAutoExitTimer = useCallback((delayMs: number = AUTO_EXIT_MS) => {
        clearAutoExitTimer();
        autoExitTimerRef.current = setTimeout(() => {
            console.warn('[Impersonation] Auto-exit triggered after timeout');
            exitImpersonation();
        }, delayMs);
    }, [clearAutoExitTimer, exitImpersonation]);

    // ── Restore state on mount ──────────────────────────────────────────────
    useEffect(() => {
        const stashed = sessionStorage.getItem(STORAGE_IMPERSONATION);
        const adminSession = sessionStorage.getItem(STORAGE_ADMIN_SESSION);

        if (stashed && adminSession) {
            try {
                const target = JSON.parse(stashed);
                setImpersonatedUser(target);
                setIsImpersonating(true);

                const startedAt = parseInt(sessionStorage.getItem(STORAGE_STARTED_AT) || '0', 10);
                const elapsed = Date.now() - (startedAt || Date.now());
                const remaining = AUTO_EXIT_MS - elapsed;

                if (remaining <= 0) {
                    exitImpersonation();
                } else {
                    startAutoExitTimer(remaining);
                }
            } catch {
                sessionStorage.removeItem(STORAGE_IMPERSONATION);
                sessionStorage.removeItem(STORAGE_STARTED_AT);
            }
        }
    }, [exitImpersonation, startAutoExitTimer]);

    // ── Begin impersonation ─────────────────────────────────────────────────
    const startImpersonation = useCallback(async (userId: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Stash current admin session before swapping
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('No hay una sesión activa de administrador');
            }

            sessionStorage.setItem(STORAGE_ADMIN_SESSION, JSON.stringify({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
            }));

            // 2. Request OTP magiclink token from backend
            const response = await fetch(`${API_URL}/api/admin/impersonate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ user_id: userId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al iniciar la suplantación');
            }

            // 3. Exchange OTP token for a Supabase session as target user
            const { error: otpError } = await supabase.auth.verifyOtp({
                token_hash: data.token_hash,
                type: 'magiclink',
            });

            if (otpError) {
                // Restore admin session if OTP exchange fails
                const stashed = JSON.parse(sessionStorage.getItem(STORAGE_ADMIN_SESSION) || 'null');
                if (stashed) await supabase.auth.setSession(stashed);
                throw new Error(otpError.message);
            }

            // 4. Save metadata & state
            const target: ImpersonationTarget = data.target;
            sessionStorage.setItem(STORAGE_IMPERSONATION, JSON.stringify(target));
            sessionStorage.setItem(STORAGE_STARTED_AT, Date.now().toString());
            setImpersonatedUser(target);
            setIsImpersonating(true);
            setIsModalOpen(false);

            // 5. Reload to dashboard to let all components initialize as the target user
            window.location.href = '/dashboard';
            return true;
        } catch (err: any) {
            console.error('[Impersonation] Failed:', err);
            setError(err.message || 'Error desconocido');
            sessionStorage.removeItem(STORAGE_ADMIN_SESSION);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const openModal = useCallback(() => setIsModalOpen(true), []);
    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setError(null);
    }, []);
    const clearError = useCallback(() => setError(null), []);

    return (
        <ImpersonationContext.Provider
            value={{
                isImpersonating,
                impersonatedUser,
                isLoading,
                error,
                isModalOpen,
                openModal,
                closeModal,
                startImpersonation,
                exitImpersonation,
                clearError,
            }}
        >
            {children}
        </ImpersonationContext.Provider>
    );
};

export function useImpersonation() {
    const context = useContext(ImpersonationContext);
    if (!context) {
        throw new Error('useImpersonation must be used within an ImpersonationProvider');
    }
    return context;
}
