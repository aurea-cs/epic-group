import React, { useEffect, useState } from 'react'
import {
    getExitTicket,
    createExitTicket,
    updateExitTicket,
    bulkReplaceExitTicketQuestions,
    deleteExitTicketQuestion
} from '../../../lib/adminApi'

export interface ExitTicketQuestionFormState {
    id?: string
    title: string
    type: 'multiple_choice' | 'text' | 'rating'
    required: boolean
    question_order?: number
    config?: {
        options?: { label: string }[]
    }
}

interface ExitTicketEditorScreenProps {
    templateId: string | null
    onBack: () => void
    onSaved: () => void
}

const DEFAULT_NEW_QUESTIONS: ExitTicketQuestionFormState[] = [
    { title: '¿Qué concepto principal aprendiste hoy en clase?', type: 'text', required: true, question_order: 0 },
    { title: '¿Qué tan clara fue la lección de hoy?', type: 'rating', required: true, question_order: 1 },
]

const ExitTicketEditorScreen: React.FC<ExitTicketEditorScreenProps> = ({ templateId, onBack, onSaved }) => {
    const isEditing = !!templateId

    const [loadingDetail, setLoadingDetail] = useState(isEditing)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    // Main form fields
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [isActive, setIsActive] = useState(true)
    const [questions, setQuestions] = useState<ExitTicketQuestionFormState[]>(
        isEditing ? [] : DEFAULT_NEW_QUESTIONS
    )

    // Question form fields (for add / edit modal)
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
    const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null)
    const [newTitle, setNewTitle] = useState('')
    const [newType, setNewType] = useState<'multiple_choice' | 'text' | 'rating'>('multiple_choice')
    const [newRequired, setNewRequired] = useState(true)
    const [newOptions, setNewOptions] = useState<string[]>(['Opción 1', 'Opción 2'])
    const [newOptionInput, setNewOptionInput] = useState('')

    // Live preview state (for testing interactive elements)
    const [previewAnswers, setPreviewAnswers] = useState<Record<number, any>>({})

    useEffect(() => {
        if (!templateId) return
        let cancelled = false

        const loadDetail = async () => {
            try {
                setLoadingDetail(true)
                setLoadError(null)
                const data = await getExitTicket(templateId)
                if (cancelled) return

                setTitle(data.title || '')
                setDescription(data.description || '')
                setIsActive(data.is_active ?? true)
                setQuestions(
                    (data.questions || [])
                        .slice()
                        .sort((a, b) => a.question_order - b.question_order)
                        .map((q) => ({
                            id: q.id,
                            title: q.title,
                            type: q.type as any,
                            required: q.required,
                            question_order: q.question_order,
                            config: q.config,
                        }))
                )
            } catch (err: any) {
                console.error('Error loading exit ticket:', err)
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

    const handleOpenAddQuestionModal = () => {
        setEditingQuestionIndex(null)
        setNewTitle('')
        setNewType('multiple_choice')
        setNewRequired(true)
        setNewOptions(['Opción 1', 'Opción 2'])
        setNewOptionInput('')
        setIsQuestionModalOpen(true)
    }

    const handleAddOption = () => {
        if (!newOptionInput.trim()) return
        setNewOptions((prev) => [...prev, newOptionInput.trim()])
        setNewOptionInput('')
    }

    const handleRemoveOption = (index: number) => {
        setNewOptions((prev) => prev.filter((_, i) => i !== index))
    }

    const handleEditQuestion = (index: number, q: ExitTicketQuestionFormState) => {
        setEditingQuestionIndex(index)
        setNewTitle(q.title)
        setNewType(q.type)
        setNewRequired(q.required)
        if (q.type === 'multiple_choice' && q.config?.options && q.config.options.length > 0) {
            setNewOptions(q.config.options.map((o) => o.label))
        } else {
            setNewOptions(['Opción 1', 'Opción 2'])
        }
        setNewOptionInput('')
        setIsQuestionModalOpen(true)
    }

    const handleCancelQuestionEdit = () => {
        setEditingQuestionIndex(null)
        setNewTitle('')
        setNewType('multiple_choice')
        setNewRequired(true)
        setNewOptions(['Opción 1', 'Opción 2'])
        setNewOptionInput('')
        setIsQuestionModalOpen(false)
    }

    const handleSaveQuestionModal = () => {
        if (!newTitle.trim()) return

        const formattedOptions =
            newType === 'multiple_choice' && newOptions.length > 0
                ? newOptions.map((opt) => ({ label: opt }))
                : undefined

        if (editingQuestionIndex !== null) {
            // Update existing question item in state
            setQuestions((prev) =>
                prev.map((q, idx) => {
                    if (idx === editingQuestionIndex) {
                        return {
                            ...q,
                            title: newTitle.trim(),
                            type: newType,
                            required: newRequired,
                            config: formattedOptions ? { options: formattedOptions } : undefined,
                        }
                    }
                    return q
                })
            )
        } else {
            // Add new question item
            const qItem: ExitTicketQuestionFormState = {
                title: newTitle.trim(),
                type: newType,
                required: newRequired,
                question_order: questions.length,
                config: formattedOptions ? { options: formattedOptions } : undefined,
            }
            setQuestions((prev) => [...prev, qItem])
        }

        handleCancelQuestionEdit()
    }

    const handleRemoveQuestion = async (index: number, qId?: string) => {
        if (editingQuestionIndex === index) {
            handleCancelQuestionEdit()
        }
        if (isEditing && qId) {
            try {
                await deleteExitTicketQuestion(qId)
            } catch (err) {
                console.error('Error deleting question:', err)
            }
        }
        setQuestions((prev) => prev.filter((_, i) => i !== index))
    }

    const handleSave = async () => {
        if (!title.trim()) {
            alert('Por favor, ingresa un título para el cuestionario.')
            return
        }

        try {
            setSaving(true)
            if (isEditing && templateId) {
                await updateExitTicket(templateId, {
                    title: title.trim(),
                    description: description.trim() || undefined,
                    is_active: isActive,
                })

                await bulkReplaceExitTicketQuestions(
                    templateId,
                    questions.map((q) => ({
                        type: q.type,
                        title: q.title,
                        required: q.required,
                        config: q.config,
                    }))
                )
            } else {
                await createExitTicket({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    is_active: isActive,
                    questions: questions.map((q, idx) => ({
                        title: q.title,
                        type: q.type,
                        required: q.required,
                        question_order: idx,
                        config: q.config,
                    })),
                })
            }
            onSaved()
        } catch (err: any) {
            alert(err.message || 'Error al guardar el Ticket de Salida')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="exit-ticket-workspace">
            {/* Header / Actions Bar */}
            <div className="workspace-header">
                <div className="workspace-header-info">
                    <button className="btn-back-link" onClick={onBack}>
                        ← Volver
                    </button>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#fff' }}>
                            {isEditing ? `${title}` : 'Nuevo ticket de salida'}
                        </h2>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button className="btn-preview-category" onClick={onBack} disabled={saving}>
                        Cancelar
                    </button>
                    <button className="btn-save-modern" onClick={handleSave} disabled={saving || loadingDetail}>
                        {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>

            {loadingDetail ? (
                <div className="notice-box">Cargando cuestionario...</div>
            ) : loadError ? (
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
                    ⚠️ {loadError}
                </div>
            ) : (
                <div className="editor-split-container">
                    {/* Left Column: Form & Questions List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Panel 1: General Info */}
                        <div className="glass-panel">
                            <h3 className="glass-panel-title">Información</h3>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>
                                    Título *
                                </label>
                                <input
                                    type="text"
                                    className="modern-input"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ej: Ticket de Salida - Reflexión Diaria"
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>
                                    Descripción
                                </label>
                                <textarea
                                    className="modern-input"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Instrucciones breves para el alumno..."
                                    rows={3}
                                />
                            </div>
                        </div>

                        {/* Panel 2: Questions List */}
                        <div className="glass-panel">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 className="glass-panel-title" style={{ margin: 0 }}>
                                    Preguntas ({questions.length})
                                </h3>
                                <button
                                    type="button"
                                    className="btn-save-modern"
                                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', maxWidth: '200px'}}
                                    onClick={handleOpenAddQuestionModal}
                                >
                                    Nueva pregunta
                                </button>
                            </div>

                            {questions.length === 0 ? (
                                <div className="notice-box" style={{ padding: '1.5rem', textAlign: 'center' }}>
                                    <p style={{ margin: '0 0 1rem 0' }}>Aún no has agregado preguntas a este cuestionario.</p>
                                    <button
                                        type="button"
                                        className="btn-save-modern"
                                        style={{ padding: '0.5rem 1.25rem', fontSize: '0.88rem' }}
                                        onClick={handleOpenAddQuestionModal}
                                    >
                                        + Agregar Pregunta
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                                        {questions.map((q, idx) => (
                                            <div
                                                key={q.id ?? idx}
                                                className="question-item-card"
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <div className="question-item-title">
                                                        {idx + 1}. {q.title}
                                                    </div>
                                                    <div className="question-item-meta">
                                                        Tipo:{' '}
                                                        {q.type === 'rating'
                                                            ? '⭐ Calificación 1-5'
                                                            : q.type === 'text'
                                                                ? '✍️ Respuesta Abierta'
                                                                : '🔘 Opción Múltiple'}{' '}
                                                        {q.config?.options && (
                                                            <span style={{ display: 'block', color: 'rgba(255,255,255,0.6)', marginTop: '0.2rem' }}>
                                                                Opciones: {q.config.options.map((o) => o.label).join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="question-actions-group">
                                                    <button
                                                        className="btn-icon-action"
                                                        title="Editar pregunta"
                                                        onClick={() => handleEditQuestion(idx, q)}
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        className="btn-icon-action btn-icon-danger"
                                                        title="Eliminar pregunta"
                                                        onClick={() => handleRemoveQuestion(idx, q.id)}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Live Interactive Student Preview */}
                    <div className="preview-sticky-wrapper">
                        <div className="preview-container">
                            <div className="preview-header-badge">
                                Vista Previa (Estudiante)
                            </div>
                            <h3 style={{ margin: '0 0 0.4rem 0', color: '#fff', fontSize: '1.2rem' }}>
                                {title.trim() || 'Título del Cuestionario'}
                            </h3>
                            <p style={{ margin: '0 0 1.25rem 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem' }}>
                                {description.trim() || 'Sin instrucciones adicionales.'}
                            </p>

                            {questions.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic'}}>
                                    Agrega preguntas para visualizar la vista interactiva.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {questions.map((q, idx) => {
                                        const currentVal = previewAnswers[idx]
                                        return (
                                            <div key={idx} className="preview-question-card">
                                                <div className="preview-question-title">
                                                    {idx + 1}. {q.title} {q.required && <span style={{ color: '#f87171' }}>*</span>}
                                                </div>

                                                {q.type === 'text' && (
                                                    <textarea
                                                        className="modern-input"
                                                        rows={2}
                                                        placeholder="El alumno escribirá su respuesta aquí..."
                                                        value={currentVal || ''}
                                                        onChange={(e) =>
                                                            setPreviewAnswers((prev) => ({ ...prev, [idx]: e.target.value }))
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
                                                                    setPreviewAnswers((prev) => ({ ...prev, [idx]: star }))
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
                                                            (opt, oIdx) => {
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
                                                                            setPreviewAnswers((prev) => ({ ...prev, [idx]: opt.label }))
                                                                        }
                                                                    >
                                                                        <input
                                                                            type="radio"
                                                                            name={`preview-q-${idx}`}
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

            {/* Modal for Add / Edit Question */}
            {isQuestionModalOpen && (
                <div className="modal-overlay" onClick={handleCancelQuestionEdit}>
                    <div className="school-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>

                        <div style={{ padding: '0.5rem 0' }}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem', fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>
                                    Enunciado o Pregunta *
                                </label>
                                <input
                                    type="text"
                                    className="modern-input"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="Ej: ¿Cuál fue la idea principal del tema?"
                                    autoFocus
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem', fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>
                                        Tipo de Respuesta
                                    </label>
                                    <select
                                        className="modern-input"
                                        value={newType}
                                        onChange={(e) => setNewType(e.target.value as any)}
                                    >
                                        <option value="multiple_choice">Opción Múltiple</option>
                                        <option value="text">Respuesta Abierta (Texto)</option>
                                        <option value="rating">Calificación 1-5 ⭐</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.4rem' }}>
                                    <input
                                        type="checkbox"
                                        id="modalNewReqCheck"
                                        checked={newRequired}
                                        onChange={(e) => setNewRequired(e.target.checked)}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer', marginRight: '0.5rem' }}
                                    />
                                    <label htmlFor="modalNewReqCheck" style={{ cursor: 'pointer', fontSize: '0.88rem', color: '#fff' }}>
                                        Pregunta Obligatoria
                                    </label>
                                </div>
                            </div>

                            {/* Multiple Choice Options Builder */}
                            {newType === 'multiple_choice' && (
                                <div style={{ marginBottom: '1.25rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                                    <label style={{ color: '#c084fc', fontSize: '0.88rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
                                        Opciones de Respuesta:
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        {newOptions.map((opt, i) => (
                                            <div key={i} className="option-item-row">
                                                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', width: '20px' }}>
                                                    {i + 1}.
                                                </span>
                                                <input
                                                    type="text"
                                                    className="modern-input"
                                                    value={opt}
                                                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.88rem' }}
                                                    onChange={(e) => {
                                                        const val = e.target.value
                                                        setNewOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)))
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    className="btn-icon-action btn-icon-danger"
                                                    onClick={() => handleRemoveOption(i)}
                                                    disabled={newOptions.length <= 1}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            className="modern-input"
                                            style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.88rem' }}
                                            placeholder="Nueva opción..."
                                            value={newOptionInput}
                                            onChange={(e) => setNewOptionInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    handleAddOption()
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="btn-preview-category"
                                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                                            onClick={handleAddOption}
                                            disabled={!newOptionInput.trim()}
                                        >
                                            + Agregar Opción
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                            <button type="button" className="btn-cancel-modern" onClick={handleCancelQuestionEdit}>
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="btn-save-modern"
                                onClick={handleSaveQuestionModal}
                                disabled={!newTitle.trim()}
                            >
                                {editingQuestionIndex !== null ? 'Actualizar Pregunta' : 'Guardar Pregunta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ExitTicketEditorScreen
