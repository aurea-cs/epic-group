import React, { useEffect, useState } from 'react'
import { getExitTicket, type ExitTicketTemplate } from '../../../lib/adminApi'

interface ExitTicketViewerScreenProps {
    templateId: string
    onBack: () => void
    onEdit: () => void
}

const typeLabel = (type: string) => {
    switch (type) {
        case 'rating':
            return '⭐ Calificación 1-5'
        case 'text':
            return '✍️ Respuesta abierta'
        case 'multiple_choice':
            return '🔘 Opción múltiple'
        default:
            return type
    }
}

const ExitTicketViewerScreen: React.FC<ExitTicketViewerScreenProps> = ({ templateId, onBack, onEdit }) => {
    const [template, setTemplate] = useState<ExitTicketTemplate | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({})

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
        <div className="exit-ticket-workspace">
            {/* Header Navigation */}
            <div className="workspace-header">
                <div className="workspace-header-info">
                    <button className="btn-back-link" onClick={onBack}>
                        ← Volver a Cuestionarios
                    </button>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#fff' }}>
                            {loading ? 'Cargando...' : template?.title || 'Ticket de Salida'}
                        </h2>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn-manage-category" onClick={onEdit} disabled={loading || !!error}>
                        ✏️ Editar Cuestionario
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="notice-box">Cargando detalles del cuestionario...</div>
            ) : error ? (
                <div
                    style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#f87171',
                        padding: '1.5rem',
                        borderRadius: '14px',
                        textAlign: 'center',
                    }}
                >
                    ⚠️ {error}
                </div>
            ) : !template ? (
                <div className="notice-box">No se encontró el cuestionario especificado.</div>
            ) : (
                <div className="editor-split-container">
                    {/* Left Column: Summary & Structured Questions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="glass-panel">
                            <h3 className="glass-panel-title">🎟️ Descripción del Ticket de Salida</h3>
                            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
                                {template.description || 'Este cuestionario no incluye descripción adicional.'}
                            </p>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                                {template.available_from && (
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 0.85rem', borderRadius: '10px', fontSize: '0.85rem' }}>
                                        📅 <strong style={{ color: '#c084fc' }}>Disponible desde:</strong> {new Date(template.available_from).toLocaleDateString()}
                                    </div>
                                )}
                                {template.due_at && (
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 0.85rem', borderRadius: '10px', fontSize: '0.85rem' }}>
                                        ⏰ <strong style={{ color: '#c084fc' }}>Vence el:</strong> {new Date(template.due_at).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="glass-panel">
                            <h3 className="glass-panel-title">
                                📋 Preguntas ({questions.length})
                            </h3>

                            {questions.length === 0 ? (
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', margin: 0 }}>
                                    Este cuestionario no tiene preguntas configuradas.
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                    {questions.map((q, idx) => (
                                        <div key={q.id} className="question-item-card" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <div style={{ width: '100%' }}>
                                                <div className="question-item-title">
                                                    {idx + 1}. {q.title}
                                                </div>
                                                <div className="question-item-meta" style={{ marginTop: '0.35rem' }}>
                                                    Tipo: {typeLabel(q.type)} | {q.required ? 'Obligatoria' : 'Opcional'}
                                                </div>
                                                {q.type === 'multiple_choice' && q.config?.options && (
                                                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                        {q.config.options.map((opt: any, oIdx: number) => (
                                                            <span
                                                                key={oIdx}
                                                                style={{
                                                                    background: 'rgba(108, 92, 231, 0.2)',
                                                                    border: '1px solid rgba(192, 132, 252, 0.3)',
                                                                    color: '#e2e8f0',
                                                                    fontSize: '0.8rem',
                                                                    padding: '0.2rem 0.6rem',
                                                                    borderRadius: '6px',
                                                                }}
                                                            >
                                                                {opt.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Live Student Interactive Experience */}
                    <div className="preview-sticky-wrapper">
                        <div className="preview-container">
                            <div className="preview-header-badge">
                                🎓 Previsualización Interactiva para el Alumno
                            </div>
                            <h3 style={{ margin: '0 0 0.4rem 0', color: '#fff', fontSize: '1.2rem' }}>
                                {template.title}
                            </h3>
                            <p style={{ margin: '0 0 1.25rem 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem' }}>
                                {template.description || 'Instrucciones del profesor.'}
                            </p>

                            {questions.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                                    No hay preguntas que previsualizar.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {questions.map((q, idx) => {
                                        const currentVal = previewAnswers[q.id]
                                        return (
                                            <div key={q.id} className="preview-question-card">
                                                <div className="preview-question-title">
                                                    {idx + 1}. {q.title} {q.required && <span style={{ color: '#f87171' }}>*</span>}
                                                </div>

                                                {q.type === 'text' && (
                                                    <textarea
                                                        className="modern-input"
                                                        rows={2}
                                                        placeholder="Escribe tu respuesta aquí..."
                                                        value={currentVal || ''}
                                                        onChange={(e) =>
                                                            setPreviewAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                                                        }
                                                    />
                                                )}

                                                {q.type === 'rating' && (
                                                    <div className="preview-rating-stars">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <span
                                                                key={star}
                                                                className="preview-star"
                                                                onClick={() =>
                                                                    setPreviewAnswers((prev) => ({ ...prev, [q.id]: star }))
                                                                }
                                                                style={{ opacity: currentVal >= star ? 1 : 0.3 }}
                                                            >
                                                                ⭐
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {q.type === 'multiple_choice' && (
                                                    <div>
                                                        {(q.config?.options || [{ label: 'Opción 1' }, { label: 'Opción 2' }]).map(
                                                            (opt: any, oIdx: number) => {
                                                                const isSelected = currentVal === opt.label
                                                                return (
                                                                    <div
                                                                        key={oIdx}
                                                                        className="preview-choice-option"
                                                                        style={{
                                                                            borderColor: isSelected ? '#c084fc' : undefined,
                                                                            background: isSelected ? 'rgba(108, 92, 231, 0.25)' : undefined,
                                                                        }}
                                                                        onClick={() =>
                                                                            setPreviewAnswers((prev) => ({ ...prev, [q.id]: opt.label }))
                                                                        }
                                                                    >
                                                                        <input
                                                                            type="radio"
                                                                            name={`preview-view-q-${q.id}`}
                                                                            checked={isSelected}
                                                                            onChange={() => {}}
                                                                            style={{ cursor: 'pointer' }}
                                                                        />
                                                                        <span>{opt.label}</span>
                                                                    </div>
                                                                )
                                                            }
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ExitTicketViewerScreen
