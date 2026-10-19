import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useImpersonation, ImpersonationCandidate } from '../../context/ImpersonationContext';
import { supabase } from '../../lib/supabase';
import './ImpersonationModal.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const PAGE_SIZE = 50;

type RoleFilter = 'all' | 'student' | 'professor';

const getInitials = (name?: string, email?: string): string => {
    if (name) {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    }
    if (email) {
        return email.slice(0, 2).toUpperCase();
    }
    return 'US';
};

export const ImpersonationModal: React.FC = () => {
    const { t } = useTranslation();
    const { isModalOpen, closeModal, startImpersonation, isLoading, error, clearError } = useImpersonation();

    const [candidates, setCandidates] = useState<ImpersonationCandidate[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [fetchingUsers, setFetchingUsers] = useState<boolean>(false);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    const [selectedUser, setSelectedUser] = useState<ImpersonationCandidate | null>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const activeRequestIdRef = useRef<number>(0);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isModalOpen) {
            setSelectedUser(null);
            setSearchTerm('');
            setDebouncedSearch('');
            setRoleFilter('all');
            setCandidates([]);
            setTotal(0);
            setPage(1);
            setFetchError(null);
        }
    }, [isModalOpen]);

    // Fetch users helper
    const fetchUsers = useCallback(async (targetPage: number, append: boolean, searchVal: string, currentRole: RoleFilter) => {
        const requestId = ++activeRequestIdRef.current;
        if (append) {
            setLoadingMore(true);
        } else {
            setFetchingUsers(true);
        }
        setFetchError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error(t('impersonation.noActiveSession'));
            }

            const params = new URLSearchParams({
                page: targetPage.toString(),
                limit: PAGE_SIZE.toString(),
            });

            if (searchVal.trim()) {
                params.append('search', searchVal.trim());
            }

            if (currentRole !== 'all') {
                params.append('role', currentRole);
            }

            const res = await fetch(`${API_URL}/api/admin/users-list?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || t('impersonation.fetchError'));
            }

            const data = await res.json();

            // Ignore response if a newer search/filter request was made
            if (requestId !== activeRequestIdRef.current) return;

            const list: ImpersonationCandidate[] = Array.isArray(data) ? data : (data.users || []);
            const totalCount: number = Array.isArray(data) ? data.length : (typeof data.total === 'number' ? data.total : list.length);

            if (append) {
                setCandidates((prev) => [...prev, ...list]);
            } else {
                setCandidates(list);
            }
            setTotal(totalCount);
            setPage(targetPage);
        } catch (err: any) {
            if (requestId === activeRequestIdRef.current) {
                console.error('[ImpersonationModal] Error fetching users:', err);
                setFetchError(err.message || t('impersonation.fetchError'));
            }
        } finally {
            if (requestId === activeRequestIdRef.current) {
                setFetchingUsers(false);
                setLoadingMore(false);
            }
        }
    }, [t]);

    // Trigger initial search or search/role updates
    useEffect(() => {
        if (!isModalOpen) return;
        fetchUsers(1, false, debouncedSearch, roleFilter);
    }, [isModalOpen, debouncedSearch, roleFilter, fetchUsers]);

    // Focus search on open
    useEffect(() => {
        if (isModalOpen && !selectedUser) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        }
    }, [isModalOpen, selectedUser]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isModalOpen && !isLoading) {
                if (selectedUser) {
                    setSelectedUser(null);
                } else {
                    closeModal();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isModalOpen, selectedUser, isLoading, closeModal]);

    const handleLoadMore = () => {
        if (loadingMore || fetchingUsers) return;
        fetchUsers(page + 1, true, debouncedSearch, roleFilter);
    };

    const handleConfirmImpersonation = async () => {
        if (!selectedUser) return;
        await startImpersonation(selectedUser.id);
    };

    const getRoleBadge = (role?: string) => {
        const lower = role?.toLowerCase();
        const isProf = lower === 'professor' || lower === 'profesor';
        const isStudent = lower === 'student' || lower === 'alumno';
        const label = isProf
            ? t('impersonation.roleProfessor')
            : isStudent
            ? t('impersonation.roleStudent')
            : (role || t('impersonation.roleUser'));

        return (
            <span
                className={`impersonation-modal__role-badge ${
                    isProf
                        ? 'impersonation-modal__role-badge--professor'
                        : isStudent
                        ? 'impersonation-modal__role-badge--student'
                        : 'impersonation-modal__role-badge--default'
                }`}
            >
                {label}
            </span>
        );
    };

    if (!isModalOpen) return null;

    return (
        <div
            className="impersonation-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isLoading) {
                    closeModal();
                }
            }}
        >
            <div className="impersonation-modal" role="dialog" aria-modal="true" aria-labelledby="impersonation-title">
                {/* Header */}
                <div className="impersonation-modal__header">
                    <div className="impersonation-modal__title-group">
                        <div>
                            <h2 id="impersonation-title" className="impersonation-modal__title">
                                {t('impersonation.title')}
                            </h2>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="impersonation-modal__close-btn"
                        onClick={closeModal}
                        disabled={isLoading}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Error Banner */}
                {(error || fetchError) && (
                    <div style={{ padding: '12px 24px 0 24px' }}>
                        <div className="impersonation-modal__error-box">
                            <span>{error || fetchError}</span>
                            <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontWeight: 'bold' }}
                                onClick={() => {
                                    clearError();
                                    setFetchError(null);
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className="impersonation-modal__body">
                    {selectedUser ? (
                        /* Confirmation view */
                        <div className="impersonation-confirm">
                            <div className="impersonation-confirm__card">
                                <div className="impersonation-confirm__avatar">
                                    {getInitials(selectedUser.full_name, selectedUser.email)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>
                                            {selectedUser.full_name || t('impersonation.noName')}
                                        </h3>
                                        {getRoleBadge(selectedUser.role)}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                                        {selectedUser.email}
                                    </div>
                                </div>
                            </div>

                            <div className="impersonation-confirm__notice">
                                <strong>{t('impersonation.warningTitle')}</strong>
                                <p style={{ margin: '6px 0 0 0' }}>
                                    {t('impersonation.warningBody')}
                                </p>
                            </div>

                            <div className="impersonation-confirm__actions">
                                <button
                                    type="button"
                                    className="impersonation-confirm__cancel-btn"
                                    onClick={() => setSelectedUser(null)}
                                    disabled={isLoading}
                                >
                                    {t('impersonation.chooseAnother')}
                                </button>
                                <button
                                    type="button"
                                    className="impersonation-confirm__submit-btn"
                                    onClick={handleConfirmImpersonation}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="impersonation-modal__spinner" style={{ width: '16px', height: '16px' }} />
                                            <span>{t('impersonation.connecting')}</span>
                                        </>
                                    ) : (
                                        <span>
                                            {t('impersonation.enterAs', {
                                                name: selectedUser.full_name?.split(' ')[0] || t('impersonation.roleUser'),
                                            })}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Search & Select List view */
                        <>
                            {/* Search bar */}
                            <div className="impersonation-modal__search-box">
                                <span className="impersonation-modal__search-icon">🔍</span>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    className="impersonation-modal__search-input"
                                    placeholder={t('impersonation.searchPlaceholder')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Filter tabs */}
                            <div className="impersonation-modal__tabs">
                                <button
                                    type="button"
                                    className={`impersonation-modal__tab ${roleFilter === 'all' ? 'impersonation-modal__tab--active' : ''}`}
                                    onClick={() => setRoleFilter('all')}
                                >
                                    {t('impersonation.tabAll')}
                                </button>
                                <button
                                    type="button"
                                    className={`impersonation-modal__tab ${roleFilter === 'student' ? 'impersonation-modal__tab--active' : ''}`}
                                    onClick={() => setRoleFilter('student')}
                                >
                                    {t('impersonation.tabStudents')}
                                </button>
                                <button
                                    type="button"
                                    className={`impersonation-modal__tab ${roleFilter === 'professor' ? 'impersonation-modal__tab--active' : ''}`}
                                    onClick={() => setRoleFilter('professor')}
                                >
                                    {t('impersonation.tabProfessors')}
                                </button>
                            </div>

                            {/* Status Bar: showing X of Z */}
                            <div className="impersonation-modal__status-bar">
                                <span>
                                    {fetchingUsers
                                        ? t('impersonation.loading')
                                        : t('impersonation.showingOf', { shown: candidates.length, total })}
                                </span>
                            </div>

                            {/* List */}
                            <div className="impersonation-modal__list">
                                {fetchingUsers ? (
                                    <div className="impersonation-modal__spinner-container">
                                        <div className="impersonation-modal__spinner" />
                                        <span>{t('impersonation.loading')}</span>
                                    </div>
                                ) : candidates.length === 0 ? (
                                    <div className="impersonation-modal__empty">
                                        <p>{t('impersonation.noResults')}</p>
                                    </div>
                                ) : (
                                    <>
                                        {candidates.map((u) => (
                                            <div key={u.id} className="impersonation-modal__item">
                                                <div className="impersonation-modal__item-info">
                                                    <div className="impersonation-modal__item-avatar">
                                                        {getInitials(u.full_name, u.email)}
                                                    </div>
                                                    <div className="impersonation-modal__item-text">
                                                        <div className="impersonation-modal__item-name-row">
                                                            <span className="impersonation-modal__item-name">
                                                                {u.full_name || t('impersonation.noName')}
                                                            </span>
                                                            {getRoleBadge(u.role)}
                                                        </div>
                                                        <div className="impersonation-modal__item-email">
                                                            {u.email}
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="impersonation-modal__select-btn"
                                                    onClick={() => setSelectedUser(u)}
                                                >
                                                    {t('impersonation.impersonateBtn')}
                                                </button>
                                            </div>
                                        ))}

                                        {/* Pagination Load More Button */}
                                        {candidates.length < total && (
                                            <div className="impersonation-modal__pagination">
                                                <button
                                                    type="button"
                                                    className="impersonation-modal__load-more-btn"
                                                    onClick={handleLoadMore}
                                                    disabled={loadingMore}
                                                >
                                                    {loadingMore ? (
                                                        <>
                                                            <span className="impersonation-modal__spinner" style={{ width: '14px', height: '14px' }} />
                                                            <span>{t('impersonation.loading')}</span>
                                                        </>
                                                    ) : (
                                                        <span>{t('impersonation.loadMore')}</span>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImpersonationModal;
