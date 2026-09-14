import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import ExitTicketEditorScreen from './exitTicketEditorScreen'
import ConfirmModal from '../../general/ConfirmModal'
import type { ExitTicketTemplate } from '../../../lib/adminApi'
import { useDynamicTranslation } from '../../../hooks/useDynamicTranslation'

interface ExitTicketCardProps {
    template: ExitTicketTemplate
    onView: (id: string) => void
    onEdit: (id: string) => void
    onDelete: (template: ExitTicketTemplate) => void
}

const ExitTicketCard: React.FC<ExitTicketCardProps> = ({ template, onView, onEdit, onDelete }) => {
    const { t } = useTranslation()
    const { text: title, isTranslating: loadingTitle } = useDynamicTranslation(template.title)
    const { text: description, isTranslating: loadingDesc } = useDynamicTranslation(template.description)

    const qCount = template.exit_ticket_questions?.[0]?.count ?? template.questions?.length ?? 0
    return (
        <div className="category-card">
            <div className="category-card-header">
                <div className="category-icon-wrapper">🎟️</div>
                <div className="category-info">
                    <h3>{loadingTitle ? <span style={{ opacity: 0.5 }}>{template.title} ✨</span> : title}</h3>
                    <span className={`level-badge ${template.is_active ? 'primaria' : 'secundaria'}`}>
                        {template.is_active ? t('extraContent.statusActive') : t('extraContent.statusInactive')}
                    </span>
                </div>
            </div>

            <div className="category-card-body">
                <p style={{ margin: '0 0 0.75rem 0' }}>
                    {loadingDesc ? <span style={{ opacity: 0.5 }}>{template.description || t('extraContent.noDescription')} ✨</span> : (description || t('extraContent.noDescription'))}
                </p>
                <div style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: '600' }}>
                    📋 {qCount} {qCount === 1 ? t('extraContent.questionSingle') : t('extraContent.questionPlural')} {t('extraContent.inThisQuiz')}
                </div>
            </div>

            <div className="category-card-actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                <button className="btn-preview-category" onClick={() => onView(template.id)}>
                    {t('extraContent.btnView')}
                </button>
                <button className="btn-manage-category" onClick={() => onEdit(template.id)}>
                    {t('extraContent.btnEdit')}
                </button>
                <button
                    className="btn-preview-category"
                    onClick={() => onDelete(template)}
                    style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                >
                    🗑️
                </button>
            </div>
        </div>
    )
}

interface ExitTicketsTabProps {
    exitTickets: ExitTicketTemplate[]
    loading: boolean
    error: string | null
    reload: () => Promise<void>
    remove: (id: string) => Promise<void>
}

const ExitTicketsTab: React.FC<ExitTicketsTabProps> = ({ exitTickets, loading, error, reload, remove }) => {
    const { t } = useTranslation()
    const [viewMode, setViewMode] = useState<'list' | 'editor' | 'viewer'>('list')
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
    const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<ExitTicketTemplate | null>(null)

    const handleDelete = async (templateId: string) => {
        try {
            await remove(templateId)
            setConfirmDeleteTemplate(null)
        } catch (err: any) {
            alert(err.message || t('extraContent.errorDeleteTemplate'))
        }
    }

    if (viewMode === 'editor') {
        return (
            <ExitTicketEditorScreen
                templateId={selectedTemplateId}
                onBack={() => setViewMode('list')}
                onSaved={async () => {
                    await reload()
                    setViewMode('list')
                }}
            />
        )
    }

    return (
        <div>
            {error && <div className="error-banner">⚠️ {error}</div>}

            {loading ? (
                <div className="notice-box">{t('extraContent.loadingExitTickets')}</div>
            ) : (
                <div className="categories-grid">
                    {/* Add New Exit Ticket Card Button */}
                    <div
                        className="category-card add-ticket-card"
                        onClick={() => {
                            setSelectedTemplateId(null)
                            setViewMode('editor')
                        }}
                    >
                        <div className="add-ticket-icon">➕</div>
                        <h3 className="add-ticket-title">{t('extraContent.btnNewExitTicket')}</h3>
                    </div>

                    {/* Existing Exit Ticket Cards */}
                    {exitTickets.map((template) => {
                        const qCount = template.exit_ticket_questions?.[0]?.count ?? template.questions?.length ?? 0
                        return (
                            <div key={template.id} className="category-card" onClick={() => {
                                setSelectedTemplateId(template.id)
                                setViewMode('editor')
                            }}>
                                <div className="category-card-top">
                                    <div className="category-card-header">
                                        <div className="category-info">
                                            <h3>{template.title}</h3>
                                            <span>
                                                {qCount} {qCount === 1 ? t('extraContent.questionSingle') : t('extraContent.questionPlural')}{' '}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="category-card-icon-actions">
                                        <button
                                            className="btn-icon-action btn-icon-danger"
                                            onClick={() => setConfirmDeleteTemplate(template)}
                                            aria-label={t('extraContent.btnConfirmDelete')}
                                            title={t('extraContent.btnConfirmDelete')}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                <div className="category-card-body">
                                    <p className="template-description">{template.description || t('extraContent.noDescription')}</p>
                                </div>
                            </div>
                        )
                    })}
                    {exitTickets.map((template) => (
                        <ExitTicketCard
                            key={template.id}
                            template={template}
                            onView={setViewModalId}
                            onEdit={setFormModalId}
                            onDelete={setConfirmDeleteTemplate}
                        />
                    ))}
                </div>
            )}

            {confirmDeleteTemplate && (
                <ConfirmModal
                    title={t('extraContent.deleteTitle')}
                    message={`${t('extraContent.deleteMessage')} "${confirmDeleteTemplate.title}"?`}
                    onConfirm={() => handleDelete(confirmDeleteTemplate.id)}
                    onCancel={() => setConfirmDeleteTemplate(null)}
                    confirmLabel={t('extraContent.btnConfirmDelete')}
                    danger
                />
            )}
        </div>
    )
}

export default ExitTicketsTab