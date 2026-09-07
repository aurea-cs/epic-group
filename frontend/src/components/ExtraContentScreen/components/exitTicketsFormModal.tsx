import React, { useEffect, useState } from 'react'
import {
    getExitTicket,
    createExitTicket,
    updateExitTicket,
    addExitTicketQuestion,
    deleteExitTicketQuestion
} from '../../../lib/adminApi'
import type { ExitTicketQuestionFormState } from '../hooks/extraContentTypes'

interface ExitTicketFormModalProps {
    /** null = creating a brand new template. A string = editing that template's id. */
    templateId: string | null
    onClose: () => void
    onSaved: () => void
}

const DEFAULT_NEW_TEMPLATE_QUESTIONS: ExitTicketQuestionFormState[] = [
    { title: '¿Qué concepto principal aprendiste hoy en clase?', type: 'text', required: true },
    { title: '¿Qué tan clara fue la lección de hoy?', type: 'rating', required: true },
]

/**
 * Create/edit modal for an exit ticket template.
 *
 * When editing, this fetches the FULL template via GET /exit-tickets/:id
 * instead of trusting whatever object the list screen had in memory — the
 * list endpoint only returns a question count, not the actual questions.
 */
const ExitTicketFormModal: React.FC<ExitTicketFormModalProps> = ({ templateId, onClose, onSaved }) => {
    const isEditing = !!templateId

    const [loadingDetail, setLoadingDetail] = useState(isEditing)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [templateForm, setTemplateForm] = useState({
        title: '',
        description: '',
        is_active: true,
    })
    const [tempQuestions, setTempQuestions] = useState<ExitTicketQuestionFormState[]>(
        isEditing ? [] : DEFAULT_NEW_TEMPLATE_QUESTIONS
    )
    const [newQuestionForm, setNewQuestionForm] = useState<{
        title: string
        type: 'multiple_choice' | 'text' | 'rating'
        required: boolean
    }>({ title: '', type: 'multiple_choice', required: true })

    const [savingTemplate, setSavingTemplate] = useState(false)

    useEffect(() => {
        if (!templateId) return
        let cancelled = false

        const loadDetail = async () => {
            try {
                setLoadingDetail(true)
                setLoadError(null)
                const data = await getExitTicket(templateId)
                if (cancelled) return

                setTemplateForm({
                    title: data.title,
                    description: data.description || '',
                    is_active: data.is_active,
                })
                setTempQuestions(
                    (data.questions || [])
                        .slice()
                        .sort((a, b) => a.question_order - b.question_order)
                        .map((q) => ({
                            id: q.id,
                            title: q.title,
                            type: q.type as ExitTicketQuestionFormState['type'],
                            required: q.required,
                            question_order: q.question_order,
                        }))
                )
            } catch (err: any) {
                console.error('Error loading exit ticket for editing:', err)
                if (!cancelled) setLoadError(err.message || 'Error al cargar el cuestionario')
            } finally {
                if (!cancelled) setLoadingDetail(false)
            }
        }

        loadDetail()
        return () => {
            cancelled = true
        }
    }, [templateId])

    const handleAddTempQuestion = () => {
        if (!newQuestionForm.title.trim()) return
        setTempQuestions((prev) => [
            ...prev,
            {
                title: newQuestionForm.title.trim(),
                type: newQuestionForm.type,
                required: newQuestionForm.required,
                question_order: prev.length,
            },
        ])
        setNewQuestionForm({ title: '', type: 'multiple_choice', required: true })
    }

    const handleRemoveTempQuestion = async (index: number, questionId?: string) => {
        if (isEditing && questionId) {
            try {
                await deleteExitTicketQuestion(questionId)
            } catch (err) {
                console.error('Error removing question:', err)
            }
        }
        setTempQuestions((prev) => prev.filter((_, i) => i !== index))
    }

    const handleSaveTemplate = async () => {
        if (!templateForm.title.trim()) return
        try {
            setSavingTemplate(true)
            if (isEditing && templateId) {
                await updateExitTicket(templateId, {
                    title: templateForm.title.trim(),
                    description: templateForm.description.trim() || undefined,
                    is_active: templateForm.is_active,
                })

                // Only newly-added questions lack an id — persist those.
                // (Editing an existing question's text/type isn't supported by
                // this UI yet; only add/remove are wired up, matching the
                // original behavior.)
                for (const q of tempQuestions) {
                    if (!q.id) {
                        await addExitTicketQuestion(templateId, {
                            title: q.title,
                            type: q.type,
                            required: q.required,
                            question_order: q.question_order ?? 0,
                        })
                    }
                }
            } else {
                await createExitTicket({
                    title: templateForm.title.trim(),
                    description: templateForm.description.trim() || undefined,
                    is_active: templateForm.is_active,
                    questions: tempQuestions.map((q, idx) => ({
                        title: q.title,
                        type: q.type,
                        required: q.required,
                        question_order: q.question_order ?? idx,
                    })),
                })
            }
            onSaved()
        } catch (err: any) {
            alert(err.message || 'Error al guardar plantilla de Ticket de Salida')
        } finally {
            setSavingTemplate(false)
        }
    }

    return (
        <div
            className="modal-overlay"
            onClick={() => {
                if (!savingTemplate) onClose()
            }}
        >
            <div className="school-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                <div className="modal-header">
                    <div className="modal-icon">🎟️</div>
                    <h2>{isEditing ? 'Editar Ticket de Salida' : 'Nuevo Ticket de Salida'}</h2>
                    <p>Configura las preguntas globales del cuestionario.</p>
                </div>

                {loadingDetail ? (
                    <div className="notice-box">Cargando cuestionario...</div>
                ) : loadError ? (
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
                        ⚠️ {loadError}
                    </div>
                ) : (
                    <div style={{ padding: '0.5rem 0' }}>
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label>Título del Cuestionario *</label>
                            <input
                                type="text"
                                className="modern-input"
                                value={templateForm.title}
                                onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                                placeholder="Ej: Ticket de Salida - Conceptos Generales"
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label>Descripción / Instrucciones</label>
                            <textarea
                                className="modern-input"
                                value={templateForm.description}
                                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                                placeholder="Escribe las instrucciones para los estudiantes al responder este ticket..."
                                style={{ minHeight: '70px' }}
                            />
                        </div>

                        <div
                            style={{
                                fontSize: '1rem',
                                fontWeight: '700',
                                color: '#c084fc',
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <span>📋 Preguntas del Cuestionario ({tempQuestions.length})</span>
                        </div>

                        <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                            {tempQuestions.length === 0 ? (
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', padding: '0.5rem' }}>
                                    No has agregado preguntas a este cuestionario todavía.
                                </p>
                            ) : (
                                tempQuestions.map((q, idx) => (
                                    <div key={q.id ?? idx} className="question-item-card">
                                        <div>
                                            <div className="question-item-title">
                                                {idx + 1}. {q.title}
                                            </div>
                                            <div className="question-item-meta">
                                                Tipo:{' '}
                                                {q.type === 'rating'
                                                    ? '⭐ Calificación 1-5'
                                                    : q.type === 'text'
                                                        ? '✍️ Respuesta abierta'
                                                        : '🔘 Opción múltiple'}{' '}
                                                | {q.required ? 'Obligatoria' : 'Opcional'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveTempQuestion(idx, q.id)}
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.2)',
                                                border: 'none',
                                                color: '#f87171',
                                                borderRadius: '6px',
                                                padding: '0.35rem 0.6rem',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                            }}
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div
                            style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px dashed rgba(108, 92, 231, 0.5)',
                                borderRadius: '12px',
                                padding: '1rem',
                            }}
                        >
                            <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff', marginBottom: '0.75rem' }}>
                                + Agregar nueva pregunta
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <input
                                    type="text"
                                    className="modern-input"
                                    style={{ flex: 2, minWidth: '200px' }}
                                    value={newQuestionForm.title}
                                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, title: e.target.value })}
                                    placeholder="Título de la pregunta..."
                                />
                                <select
                                    className="modern-input"
                                    style={{ flex: 1, minWidth: '140px' }}
                                    value={newQuestionForm.type}
                                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, type: e.target.value as any })}
                                >
                                    <option value="multiple_choice">Opción Múltiple</option>
                                    <option value="text">Respuesta Abierta</option>
                                    <option value="rating">Calificación 1-5 ⭐</option>
                                </select>
                                <button
                                    type="button"
                                    className="btn-save-modern"
                                    onClick={handleAddTempQuestion}
                                    disabled={!newQuestionForm.title.trim()}
                                    style={{ width: 'auto', padding: '0.65rem 1rem' }}
                                >
                                    Agregar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                    <button className="btn-cancel-modern" onClick={onClose} disabled={savingTemplate}>
                        Cancelar
                    </button>
                    <button
                        className="btn-save-modern"
                        onClick={handleSaveTemplate}
                        disabled={loadingDetail || !!loadError || !templateForm.title.trim() || savingTemplate}
                    >
                        {savingTemplate ? 'Guardando...' : 'Guardar Cuestionario'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ExitTicketFormModal