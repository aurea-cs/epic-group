import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatGradeDisplayName } from '../hooks/gradeFormat'
import {
    getQuizzes,
    getQuiz,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    bulkReplaceQuizQuestions,
    type Quiz,
    type QuizQuestionType,
    type BulkReplaceQuizQuestionsPayload,
    type CurriculumGrade,
    type CurriculumSubject,
    type CurriculumModule,
} from '../../../lib/adminApi'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionFormState {
    id?: string
    type: QuizQuestionType
    title: string
    required: boolean
    question_order?: number
    config: Record<string, any>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUESTION_TYPE_LABELS = (i18n: any): Record<QuizQuestionType, string> => ({
    multiple_choice: i18n.language.startsWith('en') ? 'Multiple choice' : 'Opción múltiple',
    true_false: i18n.language.startsWith('en') ? 'True / False' : 'Verdadero / Falso',
    checklist: i18n.language.startsWith('en') ? 'Checkboxes' : 'Casillas (múltiples correctas)',
    open: i18n.language.startsWith('en') ? 'Open answer' : 'Respuesta abierta',
    complete_sentence: i18n.language.startsWith('en') ? 'Complete the sentence' : 'Completa la oración',
})

const QUESTION_TYPE_ICONS: Record<QuizQuestionType, string> = {
    multiple_choice: '🔘',
    true_false: '☑️',
    checklist: '✅',
    open: '✏️',
    complete_sentence: '📝',
}

const EMPTY_QUESTION = (): QuestionFormState => ({
    type: 'multiple_choice',
    title: '',
    required: true,
    config: { options: [{ id: '1', label: 'Opción A' }, { id: '2', label: 'Opción B' }], correct_option_id: '1' },
})

// ─── Props ────────────────────────────────────────────────────────────────────

interface ModuleQuizManagerScreenProps {
    grade: CurriculumGrade
    subject: CurriculumSubject
    module: CurriculumModule | null
    onBack: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultConfigForType(type: QuizQuestionType): Record<string, any> {
    switch (type) {
        case 'multiple_choice':
            return {
                options: [{ id: '1', label: 'Opción A' }, { id: '2', label: 'Opción B' }],
                correct_option_id: '1',
            }
        case 'true_false':
            return { correct_answer: 'true' }
        case 'checklist':
            return {
                options: [
                    { id: '1', label: 'Opción A' },
                    { id: '2', label: 'Opción B' },
                    { id: '3', label: 'Opción C' },
                ],
                correct_ids: ['1'],
            }
        case 'open':
            return {}
        case 'complete_sentence':
            return {
                sentence_template: 'El ___ es importante.',
                options: ['concepto', 'color', 'número'],
                correct_option: 'concepto',
            }
        default:
            return {}
    }
}

function genId() {
    return String(Date.now() + Math.random())
}

// ─── Sub-component: Question Editor ───────────────────────────────────────────

interface QuestionEditorProps {
    question: QuestionFormState
    index: number
    total: number
    onChange: (q: QuestionFormState) => void
    onRemove: () => void
    onMoveUp: () => void
    onMoveDown: () => void
    i18n: any
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({ question, index, total, onChange, onRemove, onMoveUp, onMoveDown, i18n }) => {
    const handleTypeChange = (newType: QuizQuestionType) => {
        onChange({ ...question, type: newType, config: defaultConfigForType(newType) })
    }

    const addOption = () => {
        const opts = question.config.options || []
        const newId = genId()
        onChange({ ...question, config: { ...question.config, options: [...opts, { id: newId, label: `Opción ${opts.length + 1}` }] } })
    }

    const removeOption = (id: string) => {
        const opts = (question.config.options || []).filter((o: any) => o.id !== id)
        const upd: Record<string, any> = { ...question.config, options: opts }
        if (upd.correct_option_id === id) upd.correct_option_id = opts[0]?.id || ''
        if (upd.correct_ids) upd.correct_ids = (upd.correct_ids as string[]).filter((cid: string) => cid !== id)
        onChange({ ...question, config: upd })
    }

    const updateOptionLabel = (id: string, label: string) => {
        const opts = (question.config.options || []).map((o: any) => o.id === id ? { ...o, label } : o)
        onChange({ ...question, config: { ...question.config, options: opts } })
    }

    const toggleChecklistCorrect = (id: string) => {
        const current: string[] = question.config.correct_ids || []
        const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id]
        onChange({ ...question, config: { ...question.config, correct_ids: next } })
    }

    return (
        <div className="qm-question-card">
            {/* Header row */}
            <div className="qm-question-header">
                <span className="qm-question-number">#{index + 1}</span>
                <select
                    className="qm-type-select"
                    value={question.type}
                    onChange={(e) => handleTypeChange(e.target.value as QuizQuestionType)}
                >
                    {(Object.keys(QUESTION_TYPE_LABELS(i18n)) as QuizQuestionType[]).map((t) => (
                        <option key={t} value={t}>{QUESTION_TYPE_ICONS[t]} {QUESTION_TYPE_LABELS(i18n)[t]}</option>
                    ))}
                </select>
                <div style={{ display: 'flex', gap: '0.3rem', marginLeft: 'auto' }}>
                    <button className="btn-icon-action" disabled={index === 0} onClick={onMoveUp} title="Subir">↑</button>
                    <button className="btn-icon-action" disabled={index === total - 1} onClick={onMoveDown} title="Bajar">↓</button>
                    <button className="btn-icon-action btn-icon-danger" onClick={onRemove} title="Eliminar">🗑️</button>
                </div>
            </div>

            {/* Title */}
            <input
                className="qm-question-input"
                placeholder={i18n.language.startsWith('en') ? "Write the question here..." : "Escribe la pregunta aquí…"}
                value={question.title}
                onChange={(e) => onChange({ ...question, title: e.target.value })}
            />

            {/* Required toggle */}
            <label className="qm-required-label">
                <input
                    type="checkbox"
                    checked={question.required}
                    onChange={(e) => onChange({ ...question, required: e.target.checked })}
                />
                {i18n.language.startsWith('en') ? 'Required' : 'Obligatoria'}
            </label>

            {/* ─── Type-specific config ─── */}

            {(question.type === 'multiple_choice') && (
                <div className="qm-options-block">
                    <div className="qm-options-label">Opciones (selecciona la correcta):</div>
                    {(question.config.options || []).map((opt: any) => (
                        <div key={opt.id} className="qm-option-row">
                            <input
                                type="radio"
                                name={`mc-correct-${index}`}
                                checked={question.config.correct_option_id === opt.id}
                                onChange={() => onChange({ ...question, config: { ...question.config, correct_option_id: opt.id } })}
                            />
                            <input
                                className="qm-option-input"
                                value={opt.label}
                                onChange={(e) => updateOptionLabel(opt.id, e.target.value)}
                            />
                            <button
                                className="btn-icon-action btn-icon-danger"
                                onClick={() => removeOption(opt.id)}
                                disabled={(question.config.options || []).length <= 2}
                            >✕</button>
                        </div>
                    ))}
                    <button className="qm-add-option-btn" onClick={addOption}>+ Agregar opción</button>
                </div>
            )}

            {question.type === 'true_false' && (
                <div className="qm-options-block">
                    <div className="qm-options-label">Respuesta correcta:</div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {['true', 'false'].map((val) => (
                            <label key={val} className="qm-tf-label">
                                <input
                                    type="radio"
                                    name={`tf-${index}`}
                                    checked={question.config.correct_answer === val}
                                    onChange={() => onChange({ ...question, config: { ...question.config, correct_answer: val } })}
                                />
                                {val === 'true' ? (i18n.language.startsWith('en') ? '✅ True' : '✅ Verdadero') : (i18n.language.startsWith('en') ? '❌ False' : '❌ Falso')}
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {question.type === 'checklist' && (
                <div className="qm-options-block">
                    <div className="qm-options-label">Opciones (marca las correctas):</div>
                    {(question.config.options || []).map((opt: any) => (
                        <div key={opt.id} className="qm-option-row">
                            <input
                                type="checkbox"
                                checked={(question.config.correct_ids || []).includes(opt.id)}
                                onChange={() => toggleChecklistCorrect(opt.id)}
                            />
                            <input
                                className="qm-option-input"
                                value={opt.label}
                                onChange={(e) => updateOptionLabel(opt.id, e.target.value)}
                            />
                            <button
                                className="btn-icon-action btn-icon-danger"
                                onClick={() => removeOption(opt.id)}
                                disabled={(question.config.options || []).length <= 2}
                            >✕</button>
                        </div>
                    ))}
                    <button className="qm-add-option-btn" onClick={addOption}>+ Agregar opción</button>
                </div>
            )}

            {question.type === 'open' && (
                <div className="qm-options-block">
                    <div className="qm-options-label">Respuesta abierta — el alumno escribe libremente.</div>
                    <div className="qm-open-placeholder">[ Campo de texto del alumno ]</div>
                </div>
            )}

            {question.type === 'complete_sentence' && (
                <div className="qm-options-block">
                    <div className="qm-options-label">Plantilla de oración (usa ___ para el espacio en blanco):</div>
                    <input
                        className="qm-question-input"
                        placeholder="Ej: El ___ es la unidad básica de la vida."
                        value={question.config.sentence_template || ''}
                        onChange={(e) =>
                            onChange({ ...question, config: { ...question.config, sentence_template: e.target.value } })
                        }
                    />
                    <div className="qm-options-label" style={{ marginTop: '0.75rem' }}>Opciones de respuesta (la primera es la correcta si no marcas otra):</div>
                    {(question.config.options || []).map((opt: string, oi: number) => (
                        <div key={oi} className="qm-option-row">
                            <input
                                type="radio"
                                name={`cs-correct-${index}`}
                                checked={question.config.correct_option === opt}
                                onChange={() => onChange({ ...question, config: { ...question.config, correct_option: opt } })}
                            />
                            <input
                                className="qm-option-input"
                                value={opt}
                                onChange={(e) => {
                                    const newOpts = [...(question.config.options || [])]
                                    newOpts[oi] = e.target.value
                                    const newCorrect = question.config.correct_option === opt ? e.target.value : question.config.correct_option
                                    onChange({ ...question, config: { ...question.config, options: newOpts, correct_option: newCorrect } })
                                }}
                            />
                            <button
                                className="btn-icon-action btn-icon-danger"
                                disabled={(question.config.options || []).length <= 2}
                                onClick={() => {
                                    const newOpts = (question.config.options || []).filter((_: any, i: number) => i !== oi)
                                    const newCorrect = question.config.correct_option === opt ? newOpts[0] : question.config.correct_option
                                    onChange({ ...question, config: { ...question.config, options: newOpts, correct_option: newCorrect } })
                                }}
                            >✕</button>
                        </div>
                    ))}
                    <button
                        className="qm-add-option-btn"
                        onClick={() => {
                            const newOpts = [...(question.config.options || []), `Opción ${(question.config.options || []).length + 1}`]
                            onChange({ ...question, config: { ...question.config, options: newOpts } })
                        }}
                    >+ Agregar opción</button>
                </div>
            )}
        </div>
    )
}

// ─── Sub-component: Live Preview ──────────────────────────────────────────────

interface LivePreviewProps {
    title: string
    questions: QuestionFormState[]
    i18n: any
}

const LivePreview: React.FC<LivePreviewProps> = ({ title, questions, i18n }) => {
    const [answers, setAnswers] = useState<Record<number, any>>({})

    return (
        <div className="preview-container">
            <div className="preview-header-badge">👁️ Vista previa</div>
            {title ? (
                <h3 style={{ margin: '0 0 0.5rem', color: '#fff', fontSize: '1.1rem' }}>{title}</h3>
            ) : (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                    Sin título aún…
                </p>
            )}
            {questions.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', textAlign: 'center', marginTop: '1rem' }}>
                    Agrega preguntas para ver la vista previa.
                </p>
            )}
            {questions.map((q, i) => (
                <div key={i} className="preview-question-card">
                    <div className="preview-question-title">
                        <span style={{ opacity: 0.5, marginRight: '0.4rem', fontSize: '0.85rem' }}>{i + 1}.</span>
                        {q.title || <em style={{ opacity: 0.4 }}>Sin título</em>}
                        {q.required && <span style={{ color: '#f87171', marginLeft: '0.3rem' }}>*</span>}
                    </div>

                    {q.type === 'multiple_choice' && (
                        <div>
                            {(q.config.options || []).map((opt: any) => (
                                <div
                                    key={opt.id}
                                    className={`preview-choice-option ${answers[i] === opt.id ? 'selected' : ''}`}
                                    onClick={() => setAnswers((prev) => ({ ...prev, [i]: opt.id }))}
                                    style={answers[i] === opt.id ? { background: 'rgba(108,92,231,0.3)', borderColor: '#c084fc' } : {}}
                                >
                                    <span style={{ fontSize: '0.75rem', opacity: 0.6, minWidth: '16px' }}>○</span>
                                    {opt.label}
                                </div>
                            ))}
                        </div>
                    )}

                    {q.type === 'true_false' && (
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            {['true', 'false'].map((val) => (
                                <div
                                    key={val}
                                    className="preview-choice-option"
                                    onClick={() => setAnswers((prev) => ({ ...prev, [i]: val }))}
                                    style={answers[i] === val ? { background: 'rgba(108,92,231,0.3)', borderColor: '#c084fc', flex: 1 } : { flex: 1 }}
                                >
                                    {val === 'true' ? (i18n.language.startsWith('en') ? '✅ True' : '✅ Verdadero') : (i18n.language.startsWith('en') ? '❌ False' : '❌ Falso')}
                                </div>
                            ))}
                        </div>
                    )}

                    {q.type === 'checklist' && (
                        <div>
                            {(q.config.options || []).map((opt: any) => {
                                const checked = ((answers[i] as string[]) || []).includes(opt.id)
                                return (
                                    <div
                                        key={opt.id}
                                        className="preview-choice-option"
                                        onClick={() => {
                                            const curr: string[] = (answers[i] as string[]) || []
                                            setAnswers((prev) => ({
                                                ...prev,
                                                [i]: checked ? curr.filter((c) => c !== opt.id) : [...curr, opt.id],
                                            }))
                                        }}
                                        style={checked ? { background: 'rgba(108,92,231,0.3)', borderColor: '#c084fc' } : {}}
                                    >
                                        <span style={{ fontSize: '0.85rem' }}>{checked ? '☑' : '☐'}</span>
                                        {opt.label}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {q.type === 'open' && (
                        <textarea
                            className="qm-open-textarea"
                            placeholder="El alumno escribirá aquí su respuesta…"
                            value={answers[i] || ''}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                            rows={3}
                        />
                    )}

                    {q.type === 'complete_sentence' && (
                        <div>
                            <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                                {(q.config.sentence_template || '').replace('___', '________')}
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {(q.config.options || []).map((opt: string, oi: number) => (
                                    <div
                                        key={oi}
                                        className="preview-choice-option"
                                        onClick={() => setAnswers((prev) => ({ ...prev, [i]: opt }))}
                                        style={answers[i] === opt ? { background: 'rgba(108,92,231,0.3)', borderColor: '#c084fc' } : {}}
                                    >
                                        {opt}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

// ─── Sub-component: Quiz Editor Screen ────────────────────────────────────────

interface QuizEditorProps {
    quizId: string | null
    curriculumModuleId: string | null
    onBack: () => void
    onSaved: () => void
}

const QuizEditor: React.FC<QuizEditorProps> = ({ quizId, curriculumModuleId, onBack, onSaved }) => {
    const { t, i18n } = useTranslation()
    const isEditing = !!quizId

    const [loading, setLoading] = useState(isEditing)
    const [saving, setSaving] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [isActive, setIsActive] = useState(true)
    const [questions, setQuestions] = useState<QuestionFormState[]>([])

    // AI Generation states
    const [aiTextContext, setAiTextContext] = useState('')
    const [generatingQuiz, setGeneratingQuiz] = useState(false)
    const [showAiModal, setShowAiModal] = useState(false)

    const prevLenRef = useRef(0)
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!quizId) return
        let cancelled = false
        const load = async () => {
            try {
                setLoading(true)
                const data = await getQuiz(quizId)
                if (cancelled) return
                setTitle(data.title)
                setDescription(data.description || '')
                setIsActive(data.is_active)
                const qs = (data.questions || [])
                    .slice()
                    .sort((a, b) => a.question_order - b.question_order)
                    .map<QuestionFormState>((q) => ({
                        id: q.id,
                        type: q.type,
                        title: q.title,
                        required: q.required,
                        question_order: q.question_order,
                        config: q.config || {},
                    }))
                setQuestions(qs)
            } catch (e: any) {
                if (!cancelled) setLoadError(e.message || 'Error cargando cuestionario')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [quizId])

    useEffect(() => {
        if (questions.length > prevLenRef.current) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
        prevLenRef.current = questions.length
    }, [questions.length])

    const addQuestion = () => {
        const q = EMPTY_QUESTION()
        q.question_order = questions.length
        setQuestions((prev) => [...prev, q])
    }

    const updateQuestion = (index: number, q: QuestionFormState) => {
        setQuestions((prev) => prev.map((old, i) => (i === index ? q : old)))
    }

    const removeQuestion = (index: number) => {
        setQuestions((prev) => prev.filter((_, i) => i !== index))
    }

    const moveQuestion = (from: number, to: number) => {
        setQuestions((prev) => {
            const next = [...prev]
            const [item] = next.splice(from, 1)
            next.splice(to, 0, item)
            return next
        })
    }

    const handleSave = async () => {
        if (!title.trim()) {
            alert('Por favor ingresa un título para el cuestionario.')
            return
        }
        setSaving(true)
        try {
            let savedId = quizId
            if (isEditing) {
                await updateQuiz(quizId!, { title, description, is_active: isActive })
            } else {
                const created = await createQuiz({
                    title,
                    description,
                    is_active: isActive,
                    curriculum_module_id: curriculumModuleId || undefined,
                })
                savedId = created.id
            }

            // Build bulk-replace payload
            const payload: BulkReplaceQuizQuestionsPayload[] = questions.map((q) => ({
                type: q.type,
                title: q.title,
                config: q.config,
                required: q.required,
            }))
            await bulkReplaceQuizQuestions(savedId!, payload)
            onSaved()
        } catch (e: any) {
            alert(e.message || 'Error guardando el cuestionario.')
        } finally {
            setSaving(false)
        }
    }

    const handleGenerateAiQuiz = async () => {
        if (!aiTextContext.trim()) {
            alert('Por favor ingresa un texto de contexto.');
            return;
        }
        setGeneratingQuiz(true);
        try {
            const res = await fetch('http://localhost:3001/api/ai/generate_quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: aiTextContext })
            });
            const data = await res.json();
            if (data.questions && Array.isArray(data.questions)) {
                const mapped: QuestionFormState[] = data.questions.map((q: any, i: number) => ({
                    id: '',
                    type: 'multiple_choice',
                    title: q.question,
                    required: true,
                    question_order: questions.length + i,
                    config: {
                        options: q.options,
                        correctAnswer: q.correctAnswer
                    }
                }));
                setQuestions(prev => [...prev, ...mapped]);
                setShowAiModal(false);
                setAiTextContext('');
            } else {
                alert('La IA no devolvió preguntas en el formato esperado.');
            }
        } catch (e) {
            console.error(e);
            alert('Error al generar quiz con IA');
        } finally {
            setGeneratingQuiz(false);
        }
    }

    if (loading) {
        return <div className="notice-box">⏳ Cargando cuestionario…</div>
    }

    if (loadError) {
        return <div className="error-banner">⚠️ {loadError}</div>
    }

    return (
        <div className="exit-ticket-workspace">
            {/* Editor header */}
            <div className="workspace-header">
                <div className="workspace-header-info">
                    <button className="btn-back-link" onClick={onBack}>← {i18n.language.startsWith('en') ? 'Back to list' : 'Volver a lista'}</button>
                    <div>
                        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.25rem', fontWeight: 700 }}>
                            {isEditing ? (i18n.language.startsWith('en') ? '✏️ Edit questionnaire' : '✏️ Editar cuestionario') : (i18n.language.startsWith('en') ? '➕ New questionnaire' : '➕ Nuevo cuestionario')}
                        </h2>
                        <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)' }}>
                            {i18n.language.startsWith('en') ? 'Changes are saved by clicking Save' : 'Los cambios se guardan al hacer clic en Guardar'}
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <label className="qm-active-label">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                        />
                        {i18n.language.startsWith('en') ? 'Active' : 'Activo'}
                    </label>
                    <button className="btn-back-link" onClick={onBack} disabled={saving}>{i18n.language.startsWith('en') ? 'Cancel' : 'Cancelar'}</button>
                    <button className="btn-save-quiz" onClick={handleSave} disabled={saving}>
                        {saving ? (i18n.language.startsWith('en') ? '⏳ Saving...' : '⏳ Guardando…') : (i18n.language.startsWith('en') ? '💾 Save' : '💾 Guardar')}
                    </button>
                </div>
            </div>

            {/* Split: editor | preview */}
            <div className="editor-split-container">
                {/* Left: editor */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Meta panel */}
                    <div className="glass-panel">
                        <div className="glass-panel-title">📋 {i18n.language.startsWith('en') ? 'Questionnaire Information' : 'Información del cuestionario'}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <input
                                className="qm-meta-input"
                                placeholder={i18n.language.startsWith('en') ? "Questionnaire Title *" : "Título del cuestionario *"}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            <textarea
                                className="qm-meta-textarea"
                                placeholder={i18n.language.startsWith('en') ? "Description / instructions for students (optional)" : "Descripción / instrucciones para los alumnos (opcional)"}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* Questions panel */}
                    <div className="glass-panel">
                        <div className="glass-panel-title" style={{ justifyContent: 'space-between' }}>
                            <span>❓ {i18n.language.startsWith('en') ? 'Questions' : 'Preguntas'} ({questions.length})</span>
                        </div>

                        {questions.length === 0 && (
                            <div className="notice-box" style={{ marginBottom: '1rem' }}>
                                Aún no hay preguntas. Haz clic en <strong>+ Agregar pregunta</strong>.
                            </div>
                        )}

                        {questions.map((q, i) => (
                            <QuestionEditor
                                key={i}
                                question={q}
                                index={i}
                                total={questions.length}
                                onChange={(updated) => updateQuestion(i, updated)}
                                onRemove={() => removeQuestion(i)}
                                onMoveUp={() => moveQuestion(i, i - 1)}
                                onMoveDown={() => moveQuestion(i, i + 1)}
                                i18n={i18n}
                            />
                        ))}

                        <div ref={bottomRef} />

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="qm-add-question-btn" onClick={addQuestion} style={{ flex: 1 }}>
                                + {i18n.language.startsWith('en') ? 'Add question' : 'Agregar pregunta'}
                            </button>
                            <button 
                                className="qm-add-question-btn" 
                                onClick={() => setShowAiModal(true)}
                                style={{ flex: 1, background: 'linear-gradient(135deg, #a855f7, #6c5ce7)', border: 'none', color: 'white' }}
                            >
                                ✨ {i18n.language.startsWith('en') ? 'Generate with AI' : 'Generar con IA'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Generation Modal Overlay (inline) */}
                {showAiModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
                        display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                        <div style={{
                            background: '#1a1625', padding: '24px', borderRadius: '16px',
                            width: '90%', maxWidth: '500px', border: '1px solid rgba(168, 85, 247, 0.4)'
                        }}>
                            <h3 style={{ color: 'white', marginTop: 0 }}>Generar Preguntas con IA</h3>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                                Ingresa un texto, artículo o tema del cual quieres generar preguntas de opción múltiple.
                            </p>
                            <textarea
                                value={aiTextContext}
                                onChange={e => setAiTextContext(e.target.value)}
                                rows={6}
                                placeholder="Escribe o pega el texto aquí..."
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '8px',
                                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)',
                                    color: 'white', outline: 'none', resize: 'vertical', marginTop: '10px'
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button 
                                    onClick={() => setShowAiModal(false)}
                                    disabled={generatingQuiz}
                                    style={{ padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleGenerateAiQuiz}
                                    disabled={generatingQuiz || !aiTextContext.trim()}
                                    style={{
                                        padding: '8px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #a855f7, #6c5ce7)',
                                        border: 'none', color: 'white', cursor: generatingQuiz ? 'wait' : 'pointer', opacity: (generatingQuiz || !aiTextContext.trim()) ? 0.6 : 1
                                    }}
                                >
                                    {generatingQuiz ? 'Generando...' : 'Generar Preguntas'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Right: live preview */}
                <div className="preview-sticky-wrapper">
                    <div style={{ position: 'sticky', top: '1.5rem' }}>
                        <LivePreview title={title} questions={questions} i18n={i18n} />
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Main Component: Quiz Manager ─────────────────────────────────────────────

const ModuleQuizManagerScreen: React.FC<ModuleQuizManagerScreenProps> = ({
    grade,
    subject,
    module,
    onBack,
}) => {
    const { t, i18n } = useTranslation()

    const [view, setView] = useState<'list' | 'editor'>('list')
    const [editingQuizId, setEditingQuizId] = useState<string | null>(null)

    const [quizzes, setQuizzes] = useState<Quiz[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const loadQuizzes = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await getQuizzes(module?.id)
            setQuizzes(data)
        } catch (e: any) {
            setError(e.message || 'Error cargando cuestionarios')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadQuizzes() }, [module?.id])

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Eliminar este cuestionario? Esta acción no se puede deshacer.')) return
        setDeletingId(id)
        try {
            await deleteQuiz(id)
            setQuizzes((prev) => prev.filter((q) => q.id !== id))
        } catch (e: any) {
            alert(e.message || 'Error al eliminar')
        } finally {
            setDeletingId(null)
        }
    }

    const openEditor = (quizId: string | null) => {
        setEditingQuizId(quizId)
        setView('editor')
    }

    const handleSaved = async () => {
        await loadQuizzes()
        setView('list')
        setEditingQuizId(null)
    }

    if (view === 'editor') {
        return (
            <QuizEditor
                quizId={editingQuizId}
                curriculumModuleId={module?.id || null}
                onBack={() => { setView('list'); setEditingQuizId(null) }}
                onSaved={handleSaved}
            />
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* ─── Header ─── */}
            <div className="workspace-header">
                <div className="workspace-header-info">
                    <button className="btn-back-link" onClick={onBack}>
                        ← {i18n.language.startsWith('en') ? 'Back to Categories' : t('extraContent.btnBack', { defaultValue: 'Volver a Categorías' })}
                    </button>
                    <div>
                        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.35rem', fontWeight: 700 }}>
                            📝 {i18n.language.startsWith('en') ? 'Check what you learned' : 'Comprueba lo que aprendiste'}
                        </h2>
                        <span style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.55)' }}>
                            {i18n.language.startsWith('en') ? 'Module questionnaires management' : 'Gestión de cuestionarios del módulo'}
                        </span>
                    </div>
                </div>
                <button className="btn-save-quiz" onClick={() => openEditor(null)}>
                    + {i18n.language.startsWith('en') ? 'New questionnaire' : 'Nuevo cuestionario'}
                </button>
            </div>

            {/* ─── Context breadcrumb ─── */}
            <div className="qm-context-bar">
                <div className="qm-context-item">
                    <span className="qm-context-label">{i18n.language.startsWith('en') ? 'Grade' : 'Grado'}</span>
                    <span className="qm-context-value">{formatGradeDisplayName(t, grade.name, grade.level)}</span>
                </div>
                <span className="qm-context-sep">›</span>
                <div className="qm-context-item">
                    <span className="qm-context-label">{i18n.language.startsWith('en') ? 'Subject' : 'Materia'}</span>
                    <span className="qm-context-value" style={{ color: '#c084fc' }}>{i18n.language.startsWith('en') ? t(`dynamicSubjects.${subject.name}`, subject.name) : subject.name}</span>
                </div>
                <span className="qm-context-sep">›</span>
                <div className="qm-context-item">
                    <span className="qm-context-label">{i18n.language.startsWith('en') ? 'Module' : 'Módulo'}</span>
                    <span className="qm-context-value" style={{ color: '#4ade80' }}>
                        {module ? (i18n.language.startsWith('en') ? t(`dynamicSubjects.${module.title}`, module.title) : module.title) : (i18n.language.startsWith('en') ? 'No module selected' : 'Sin módulo seleccionado')}
                    </span>
                </div>
            </div>

            {/* ─── List body ─── */}
            {error && <div className="error-banner">⚠️ {error}</div>}

            {loading ? (
                <div className="notice-box">⏳ {i18n.language.startsWith('en') ? 'Loading questionnaires...' : 'Cargando cuestionarios…'}</div>
            ) : (
                <div className="qm-quiz-list">
                    {/* Add card */}
                    <div
                        className="category-card add-ticket-card"
                        onClick={() => openEditor(null)}
                        style={{ minHeight: '160px' }}
                    >
                        <div className="add-ticket-icon">➕</div>
                        <h3 className="add-ticket-title">{i18n.language.startsWith('en') ? 'New questionnaire' : 'Nuevo cuestionario'}</h3>
                        <p className="add-ticket-subtitle">{i18n.language.startsWith('en') ? 'Create a new questionnaire for this module' : 'Crea un nuevo cuestionario para este módulo'}</p>
                    </div>

                    {quizzes.map((quiz) => {
                        const qCount = quiz.quiz_questions?.[0]?.count ?? quiz.questions?.length ?? 0
                        return (
                            <div
                                key={quiz.id}
                                className="category-card"
                                style={{ cursor: 'pointer' }}
                                onClick={() => openEditor(quiz.id)}
                            >
                                <div className="category-card-top">
                                    <div className="category-card-header">
                                        <div className="category-icon-wrapper">📝</div>
                                        <div className="category-info">
                                            <h3>{quiz.title}</h3>
                                            <span className={`level-badge ${quiz.is_active ? 'primaria' : 'secundaria'}`}>
                                                {quiz.is_active ? (i18n.language.startsWith('en') ? 'Active' : 'Activo') : (i18n.language.startsWith('en') ? 'Inactive' : 'Inactivo')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="category-card-icon-actions">
                                        <button
                                            className="btn-icon-action btn-icon-danger"
                                            onClick={(e) => { e.stopPropagation(); handleDelete(quiz.id) }}
                                            disabled={deletingId === quiz.id}
                                            title="Eliminar"
                                        >
                                            {deletingId === quiz.id ? '⏳' : '🗑️'}
                                        </button>
                                    </div>
                                </div>
                                <div className="category-card-body">
                                    {quiz.description || <em style={{ opacity: 0.5 }}>{i18n.language.startsWith('en') ? 'No description' : 'Sin descripción'}</em>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                                        {qCount} {qCount === 1 ? (i18n.language.startsWith('en') ? 'question' : 'pregunta') : (i18n.language.startsWith('en') ? 'questions' : 'preguntas')}
                                    </span>
                                    <button
                                        className="btn-manage-category"
                                        style={{ maxWidth: '140px', padding: '0.5rem 0.9rem', fontSize: '0.83rem' }}
                                        onClick={(e) => { e.stopPropagation(); openEditor(quiz.id) }}
                                    >
                                        ✏️ {i18n.language.startsWith('en') ? 'Edit' : 'Editar'}
                                    </button>
                                </div>
                            </div>
                        )
                    })}

                    {quizzes.length === 0 && (
                        <div className="notice-box" style={{ gridColumn: '1 / -1' }}>
                            {i18n.language.startsWith('en') ? 'No questionnaires yet for this module. Create the first one!' : 'No hay cuestionarios aún para este módulo. ¡Crea el primero!'}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default ModuleQuizManagerScreen
