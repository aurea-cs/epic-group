import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getExitTicket, type ExitTicketTemplate } from '../../../lib/adminApi'
import { useDynamicTranslation } from '../../../hooks/useDynamicTranslation'

interface ExitTicketViewModalProps {
    templateId: string
    onClose: () => void
    onEdit: () => void
}

const typeLabel = (type: string, t: any) => {
    switch (type) {
        case 'rating':
            return `⭐ ${t('extraContent.rating', 'Calificación 1-5')}`
        case 'text':
            return `✍️ ${t('extraContent.openResponse', 'Respuesta abierta')}`
        case 'multiple_choice':
            return `🔘 ${t('extraContent.multipleChoice', 'Opción múltiple')}`
        default:
            return type
    }
}

const QuestionItemCard = ({ q, idx, t }: { q: any; idx: number; t: any }) => {
    const { text: translatedTitle, isTranslating: loadingTitle } = useDynamicTranslation(q.title)
    
    return (
        <div className="question-item-card">
            <div>
                <div className="question-item-title">
                    {idx + 1}. {loadingTitle ? <span style={{opacity: 0.5}}>{q.title} ✨</span> : translatedTitle}
                </div>
                <div className="question-item-meta">
                    {t('extraContent.type', 'Tipo')}: {typeLabel(q.type, t)} | {q.required ? t('extraContent.required', 'Obligatoria') : t('extraContent.optional', 'Opcional')}
                </div>
                {q.type === 'multiple_choice' && q.config?.options && (
                    <div
                        style={{
                            fontSize: '0.78rem',
                            color: 'rgba(255,255,255,0.5)',
                            marginTop: '0.35rem',
                        }}
                    >
                        {t('extraContent.options', 'Opciones')}: {q.config.options.map((o: any) => o.label).join(', ')}
                    </div>
                )}
            </div>
        </div>
    )
}

/**
 * Read-only viewer for an exit ticket template.
 *
 * The templates list (GET /exit-tickets) only returns a question COUNT, not
 * the actual questions — so this modal fetches the full record itself via
 * GET /exit-tickets/:id, which is the only endpoint that returns the real
 * question list.
 */
const ExitTicketViewModal: React.FC<ExitTicketViewModalProps> = ({ templateId, onClose, onEdit }) => {
    const { t } = useTranslation()
    const [template, setTemplate] = useState<ExitTicketTemplate | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const { text: translatedTitle, isTranslating: loadingTitle } = useDynamicTranslation(template?.title)
    const { text: translatedDesc, isTranslating: loadingDesc } = useDynamicTranslation(template?.description)

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            try {
                setLoading(true)
                setError(null)
                const data = await getExitTicket(templateId)
                if (!cancelled) setTemplate(data)
            } catch (err: any) {
                console.error('Error loading exit ticket detail:', err)
                if (!cancelled) setError(err.message || 'Error al cargar el cuestionario')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [templateId])

    const questions = template?.questions || []

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="school-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                <div className="modal-header">
                    <div className="modal-icon">🎟️</div>
                    <h2>{loading ? t('extraContent.loading', 'Cargando...') : (loadingTitle ? <span style={{opacity: 0.5}}>{template?.title} ✨</span> : (translatedTitle || t('extraContent.catTicket')))}</h2>
                    {template?.description && <p>{loadingDesc ? <span style={{opacity: 0.5}}>{template.description} ✨</span> : translatedDesc}</p>}
                </div>

                <div style={{ padding: '0.5rem 0' }}>
                    {loading && <div className="notice-box">Cargando cuestionario...</div>}

                    {!loading && error && (
                        <div
                            style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#f87171',
                                padding: '1rem 1.5rem',
                                borderRadius: '12px',
                                textAlign: 'center',
                            }}
                        >
                            ⚠️ {error}
                        </div>
                    )}

                    {!loading && !error && template && (
                        <>
                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                                <span className={`level-badge ${template.is_active ? 'primaria' : 'secundaria'}`}>
                                    {template.is_active ? t('extraContent.statusActive', 'Activo') : t('extraContent.statusInactive', 'Inactivo')}
                                </span>
                                {template.available_from && (
                                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                                        {t('extraContent.availableFrom', 'Disponible desde')}: {new Date(template.available_from).toLocaleDateString()}
                                    </span>
                                )}
                                {template.due_at && (
                                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                                        {t('extraContent.dueAt', 'Vence')}: {new Date(template.due_at).toLocaleDateString()}
                                    </span>
                                )}
                            </div>

                            <div
                                style={{
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    color: '#c084fc',
                                    marginBottom: '1rem',
                                }}
                            >
                                📋 {t('extraContent.questionPlural', 'Preguntas')} ({questions.length})
                            </div>

                            {questions.length === 0 ? (
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                                    {t('extraContent.noQuestions', 'Este cuestionario no tiene preguntas configuradas.')}
                                </p>
                            ) : (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.6rem',
                                        maxHeight: '320px',
                                        overflowY: 'auto',
                                    }}
                                >
                                    {questions
                                        .slice()
                                        .sort((a, b) => a.question_order - b.question_order)
                                        .map((q, idx) => (
                                            <QuestionItemCard key={q.id} q={q} idx={idx} t={t} />
                                        ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="modal-actions">
                    <button className="btn-cancel-modern" onClick={onClose}>
                        {t('adminProfessors.cancelBtn', 'Cerrar')}
                    </button>
                    <button className="btn-save-modern" onClick={onEdit} disabled={loading || !!error}>
                        ✏️ {t('extraContent.btnEdit', 'Editar Cuestionario')}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ExitTicketViewModal