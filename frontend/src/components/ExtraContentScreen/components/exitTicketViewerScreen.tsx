import React, { useEffect, useState } from 'react'
import { getExitTicket, type ExitTicketTemplate } from '../../../lib/adminApi'
import '../ExtraContentScreen.css'

interface ExitTicketViewerScreenProps {
    templateId: string
    onClose: () => void
}

/**
 * Pure read-only preview of an exit ticket template: title, description,
 * and every question rendered with its real config (options / stars / text
 * area) but fully disabled — nothing here is clickable or editable. Meant
 * to be dropped inside an existing modal (e.g. ModuleCard's viewer modal),
 * so it has no header chrome, back button, or split-panel layout of its own.
 */
const ExitTicketViewerScreen: React.FC<ExitTicketViewerScreenProps> = ({ templateId, onClose }) => {
    const [template, setTemplate] = useState<ExitTicketTemplate | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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

    const questions = (template?.questions || []).slice().sort((a, b) => a.question_order - b.question_order)

    return (
        <div className="exit-ticket-readonly">
            <div className="exit-ticket-readonly-header">
                <div>
                    <h2>{loading ? 'Cargando...' : template?.title || 'Ticket de Salida'}</h2>
                    {!loading && template?.description && <p>{template.description}</p>}
                </div>
                <button className="btn-back-link" onClick={onClose}>
                    ✕ Cerrar
                </button>
            </div>

            {loading && <div className="notice-box">Cargando cuestionario...</div>}

            {!loading && error && <div className="error-banner">⚠️ {error}</div>}

            {!loading && !error && template && questions.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                    Este cuestionario no tiene preguntas configuradas.
                </p>
            )}

            {!loading && !error && questions.length > 0 && (
                <div className="exit-ticket-readonly-questions">
                    {questions.map((q, idx) => (
                        <div key={q.id} className="preview-question-card">
                            <div className="preview-question-title">
                                {idx + 1}. {q.title} {q.required && <span style={{ color: '#f87171' }}>*</span>}
                            </div>
                            {q.type === 'text' && (
                                <div className="readonly-text-placeholder">Espacio de respuesta abierta</div>
                            )}

                            {q.type === 'rating' && (
                                <div className="preview-rating-stars readonly">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <span key={star} className="preview-star" style={{ opacity: 0.35 }}>
                                            ⭐
                                        </span>
                                    ))}
                                </div>
                            )}

                            {q.type === 'multiple_choice' && (
                                <div>
                                    {(q.config?.options || []).map((opt: any, oIdx: number) => (
                                        <div key={oIdx} className="preview-choice-option readonly">
                                            <input type="radio" disabled />
                                            <span>{opt.label}</span>
                                        </div>
                                    ))}
                                    {q.config?.allow_other && (
                                        <div className="preview-choice-option readonly">
                                            <input type="radio" disabled />
                                            <span>Otra: _______________</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default ExitTicketViewerScreen