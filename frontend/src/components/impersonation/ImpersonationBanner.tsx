import React from 'react';
import { useTranslation } from 'react-i18next';
import { useImpersonation } from '../../context/ImpersonationContext';
import './ImpersonationBanner.css';

export const ImpersonationBanner: React.FC = () => {
    const { t } = useTranslation();
    const { isImpersonating, impersonatedUser, exitImpersonation, isLoading } = useImpersonation();

    if (!isImpersonating || !impersonatedUser) {
        return null;
    }

    const getRoleLabel = (role?: string) => {
        const lower = role?.toLowerCase();
        if (lower === 'professor' || lower === 'profesor') return t('impersonation.roleProfessor');
        if (lower === 'student' || lower === 'alumno') return t('impersonation.roleStudent');
        return role || t('impersonation.roleUser');
    };

    return (
        <div className="impersonation-banner" role="alert" aria-live="assertive">
            <div className="impersonation-banner__container">
                <div className="impersonation-banner__left">

                    <div className="impersonation-banner__info">
                        <span className="impersonation-banner__info-label">{t('impersonation.bannerViewingAs')}</span>
                        <span className="impersonation-banner__user-name">
                            {impersonatedUser.full_name || t('impersonation.noName')}
                        </span>
                        <span className="impersonation-banner__role-pill">
                            {getRoleLabel(impersonatedUser.role)}
                        </span>
                        <span className="impersonation-banner__email">
                            ({impersonatedUser.email})
                        </span>
                    </div>
                </div>

                <div className="impersonation-banner__right">
                    <button
                        type="button"
                        className="impersonation-banner__exit-btn"
                        onClick={exitImpersonation}
                        disabled={isLoading}
                        title={t('impersonation.bannerExitTitle')}
                    >
                        {isLoading ? (
                            <>
                                <span className="impersonation-banner__spinner" />
                                <span>{t('impersonation.bannerRestoring')}</span>
                            </>
                        ) : (
                            <>
                                <span>↩</span>
                                <span>{t('impersonation.bannerExit')}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImpersonationBanner;
