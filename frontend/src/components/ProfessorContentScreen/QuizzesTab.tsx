import React, { useState, useMemo } from 'react'
import { tdStyle, thStyle, inputStyleAlt } from '../general/SharedUI'
import CustomSelect from '../general/CustomSelect'
import { StudentQuizSubjectResponse, StudentQuizSubjectResponseAnswer, SubjectQuiz } from './types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface QuizzesTabProps {
    loading: boolean
    quizzes?: SubjectQuiz[]
    quizResponses: StudentQuizSubjectResponse[]
}

const renderAnswerDetail = (ans: StudentQuizSubjectResponseAnswer) => {
    const snap = ans.question_snapshot
    const question_type = snap?.type ?? ans.question_type
    const config = snap?.config ?? ans.config
    const answer = ans.answer

    if (answer === undefined || answer === null || answer === '') {
        return <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.4)' }}>Sin respuesta</span>
    }

    if (question_type === 'matching') {
        let pairs: Record<string, string> = {}
        if (typeof answer === 'string') {
            const trimmed = answer.trim()
            if (trimmed.startsWith('{')) {
                try { pairs = JSON.parse(trimmed) } catch { }
            } else if (trimmed.includes('➔') || trimmed.includes('->') || trimmed.includes(':')) {
                const parts = trimmed.split(/[\n|]/)
                parts.forEach(part => {
                    const separator = part.includes('➔') ? '➔' : part.includes('->') ? '->' : ':'
                    const [k, v] = part.split(separator).map(s => s.trim())
                    if (k && v) pairs[k] = v
                })
            }
        } else if (typeof answer === 'object' && answer !== null && !Array.isArray(answer)) {
            pairs = answer
        }

        const itemsLeft: any[] = config?.matchingPairs || config?.pairs || []
        const pairEntries = Object.entries(pairs)

        if (pairEntries.length === 0) {
            if (typeof answer === 'string' && answer.trim()) {
                return <span style={{ color: '#ffffff', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{answer}</span>
            }
            return <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.4)' }}>Sin relacionar</span>
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                {pairEntries.map(([leftId, rightVal], i) => {
                    const matchObj = itemsLeft.find((p: any) => String(p.id) === String(leftId) || String(p.left) === String(leftId))
                    const leftLabel = matchObj ? (matchObj.left || matchObj.title || leftId) : leftId

                    const rightMatch = itemsLeft.find((p: any) => String(p.id) === String(rightVal) || String(p.right) === String(rightVal))
                    const rightLabel = rightMatch ? (rightMatch.right || rightVal) : rightVal

                    return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
                            <span style={{ fontWeight: 500, color: '#e2e8f0' }}>{leftLabel}</span>
                            <span style={{ color: '#c084fc' }}>➔</span>
                            <span style={{ color: '#93c5fd' }}>{String(rightLabel)}</span>
                        </div>
                    )
                })}
            </div>
        )
    }

    if (question_type === 'ordering') {
        let items: string[] = []
        if (Array.isArray(answer)) {
            items = answer.map(String)
        } else if (typeof answer === 'string') {
            const trimmed = answer.trim()
            if (trimmed.startsWith('[')) {
                try { items = JSON.parse(trimmed).map(String) } catch { }
            } else if (trimmed.includes('→')) {
                items = trimmed.split('→').map(s => s.trim())
            } else if (trimmed.includes('➔')) {
                items = trimmed.split('➔').map(s => s.trim())
            } else if (trimmed.includes(',')) {
                items = trimmed.split(',').map(s => s.trim())
            } else if (trimmed.includes('\n')) {
                items = trimmed.split('\n').map(s => s.trim())
            } else if (trimmed) {
                items = [trimmed]
            }
        }

        const configItems: any[] = config?.items || config?.orderingItems || []

        if (items.length === 0) {
            return <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.4)' }}>Sin ordenar</span>
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                {items.map((itemVal, i) => {
                    const matchedConfigItem = configItems.find((it: any) => String(it.id) === String(itemVal) || String(it.text) === String(itemVal))
                    const displayLabel = matchedConfigItem ? (matchedConfigItem.text || matchedConfigItem.label || itemVal) : itemVal

                    return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
                            <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(192,132,252,0.2)', color: '#c084fc', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                                {i + 1}
                            </span>
                            <span style={{ color: '#e2e8f0' }}>{String(displayLabel)}</span>
                        </div>
                    )
                })}
            </div>
        )
    }

    if (typeof answer === 'object') {
        return <pre style={{ margin: 0, fontSize: '0.82rem', whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>{JSON.stringify(answer, null, 2)}</pre>
    }

    return <span style={{ color: '#ffffff', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{String(answer)}</span>
}

const QuizzesTab: React.FC<QuizzesTabProps> = ({ loading, quizzes = [], quizResponses: initialResponses }) => {
    const [responsesList, setResponsesList] = useState<StudentQuizSubjectResponse[]>(initialResponses)
    const [searchQuery, setSearchQuery] = useState('')
    const [moduleFilter, setModuleFilter] = useState<string>('default')
    const [quizFilter, setQuizFilter] = useState<string>('default')
    const [selectedResponse, setSelectedResponse] = useState<StudentQuizSubjectResponse | null>(null)
    const [viewingQuizQuestions, setViewingQuizQuestions] = useState<SubjectQuiz | null>(null)
    const [gradingQuestionId, setGradingQuestionId] = useState<string | null>(null)

    // Keep responsesList in sync if initialResponses prop changes
    React.useEffect(() => {
        setResponsesList(initialResponses)
    }, [initialResponses])

    const moduleOptions = useMemo(() => {
        const fromQuizzes = quizzes.map(q => q.module_title)
        const fromResponses = responsesList.map(r => r.module_title)
        const modules = Array.from(new Set([...fromQuizzes, ...fromResponses].filter(Boolean))).sort()
        return [
            { value: 'default', label: 'Todos los módulos' },
            ...modules.map(m => ({ value: m!, label: m! })),
        ]
    }, [quizzes, responsesList])

    const quizOptions = useMemo(() => {
        const quizItems = quizzes.map(q => ({ id: q.id, title: q.title }))
        const uniqueQuizzes = Array.from(new Map(quizItems.map(q => [q.id, q])).values())
        return [
            { value: 'default', label: 'Todos los cuestionarios' },
            ...uniqueQuizzes.map(q => ({ value: q.id, label: q.title })),
        ]
    }, [quizzes])

    const filteredResponses = useMemo(() => {
        return responsesList.filter(r => {
            const studentName = r.student_name || r.student_id
            const quizTitle = r.quiz_title || ''
            const matchesSearch =
                !searchQuery ||
                studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (r.student_email && r.student_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                quizTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.student_id.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesModule =
                !moduleFilter ||
                moduleFilter === 'default' ||
                r.module_title === moduleFilter

            const matchesQuiz =
                !quizFilter ||
                quizFilter === 'default' ||
                r.quiz_id === quizFilter ||
                r.quiz_title === quizzes.find(q => q.id === quizFilter)?.title

            return matchesSearch && matchesModule && matchesQuiz
        })
    }, [responsesList, searchQuery, moduleFilter, quizFilter, quizzes])

    const handleGradeQuestion = async (
        answerId: string,
        _questionId: string,
        isCorrect: boolean
    ) => {
        if (!selectedResponse) return
        setGradingQuestionId(answerId)

        try {
            const res = await fetch(`${API_URL}/api/quizzes/responses/${selectedResponse.id}/questions/${answerId}/grade`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_correct: isCorrect }),
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.error || `HTTP ${res.status}`)
            }

            const data = await res.json()
            const newTotalScore = data.new_total_score ?? selectedResponse.score
            const newMaxScore = data.new_max_score ?? selectedResponse.max_score

            // Update selectedResponse locally — match strictly by answer PK (id), not question_id
            // to avoid all answers matching when question_id is null/shared.
            const updatedAnswers = (selectedResponse.answers || []).map(ans => {
                const ansId = ans.id || ans.question_id
                const isMatch = answerId && ansId && ansId === answerId
                if (!isMatch) return ans
                const defaultPts = ans.question_snapshot?.config?.points ?? ans.config?.points ?? 1
                const points = isCorrect ? defaultPts : 0
                return { ...ans, is_correct: isCorrect, points_awarded: points }
            })

            const updatedResponse: StudentQuizSubjectResponse = {
                ...selectedResponse,
                score: newTotalScore,
                max_score: newMaxScore,
                answers: updatedAnswers,
            }

            setSelectedResponse(updatedResponse)

            // Update responsesList
            setResponsesList(prev =>
                prev.map(r => (r.id === selectedResponse.id ? updatedResponse : r))
            )
        } catch (err: any) {
            console.error('Error grading question:', err)
            alert(err.message || 'Error al calificar la pregunta')
        } finally {
            setGradingQuestionId(null)
        }
    }

    if (loading) {
        return (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
                <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Cargando cuestionarios de la materia...</p>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Quizzes Grid Section */}
            {quizzes.length > 0 && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#f3e8ff' }}>
                            📋 Cuestionarios de la materia ({quizzes.length})
                        </h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {quizzes.map((quiz) => {
                            const responsesCount = responsesList.filter(r => r.module_quiz_id === quiz.module_quiz_id || r.quiz_id === quiz.id).length
                            const isSelectedFilter = quizFilter === quiz.id

                            return (
                                <div
                                    key={quiz.module_quiz_id || quiz.id}
                                    style={{
                                        background: isSelectedFilter ? 'rgba(192,132,252,0.12)' : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${isSelectedFilter ? 'rgba(192,132,252,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                        borderRadius: '16px',
                                        padding: '1.25rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1rem',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#ffffff' }}>
                                                {quiz.title}
                                            </h3>
                                            <span style={{
                                                fontSize: '0.72rem',
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                background: quiz.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)',
                                                color: quiz.is_active ? '#86efac' : 'rgba(255,255,255,0.4)',
                                                border: `1px solid ${quiz.is_active ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {quiz.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </div>

                                        {quiz.description && (
                                            <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {quiz.description}
                                            </p>
                                        )}

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <span style={{ fontSize: '0.78rem', background: 'rgba(108, 92, 231, 0.15)', color: '#c084fc', padding: '0.2rem 0.55rem', borderRadius: '8px', border: '1px solid rgba(192,132,252,0.2)' }}>
                                                📌 {quiz.module_title}
                                            </span>
                                            <span style={{ fontSize: '0.78rem', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', padding: '0.2rem 0.55rem', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                                                ❓ {quiz.questions_count} pregunta{quiz.questions_count !== 1 ? 's' : ''}
                                            </span>
                                            <span style={{ fontSize: '0.78rem', background: 'rgba(251, 146, 60, 0.12)', color: '#fb923c', padding: '0.2rem 0.55rem', borderRadius: '8px', border: '1px solid rgba(251, 146, 60, 0.2)' }}>
                                                📥 {responsesCount} entrega{responsesCount !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
                                        <button
                                            onClick={() => setQuizFilter(isSelectedFilter ? 'default' : quiz.id)}
                                            style={{
                                                flex: 1,
                                                padding: '0.45rem 0.75rem',
                                                borderRadius: '8px',
                                                border: isSelectedFilter ? '1px solid #c084fc' : '1px solid rgba(255,255,255,0.15)',
                                                background: isSelectedFilter ? 'rgba(192,132,252,0.25)' : 'rgba(255,255,255,0.06)',
                                                color: '#ffffff',
                                                fontSize: '0.82rem',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            {isSelectedFilter ? '✓ Filtrando' : '👁️ Ver entregas'}
                                        </button>
                                        {quiz.questions && quiz.questions.length > 0 && (
                                            <button
                                                onClick={() => setViewingQuizQuestions(quiz)}
                                                style={{
                                                    padding: '0.45rem 0.75rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                                    background: 'rgba(56, 189, 248, 0.12)',
                                                    color: '#38bdf8',
                                                    fontSize: '0.82rem',
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s',
                                                }}
                                                title="Ver preguntas del cuestionario"
                                            >
                                                📋 Preguntas
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Submissions Section */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#f3e8ff' }}>
                        📥 Entregas de alumnos ({filteredResponses.length})
                    </h2>
                </div>

                {/* Filters */}
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1 1 240px' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar por alumno o cuestionario..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ ...inputStyleAlt, paddingLeft: '36px', width: '100%', background: 'rgba(255,255,255,0.06)' }}
                        />
                    </div>
                    {quizOptions.length > 1 && (
                        <div style={{ flex: '1 1 200px' }}>
                            <CustomSelect
                                value={quizFilter}
                                onChange={setQuizFilter}
                                options={quizOptions}
                            />
                        </div>
                    )}
                    <div style={{ flex: '1 1 200px' }}>
                        <CustomSelect
                            value={moduleFilter}
                            onChange={setModuleFilter}
                            options={moduleOptions}
                        />
                    </div>
                    {(searchQuery || (moduleFilter && moduleFilter !== 'default') || (quizFilter && quizFilter !== 'default')) && (
                        <button
                            onClick={() => { setSearchQuery(''); setModuleFilter('default'); setQuizFilter('default') }}
                            style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                        >
                            ✕ Limpiar
                        </button>
                    )}
                    <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {filteredResponses.length} resultado{filteredResponses.length !== 1 ? 's' : ''}
                    </span>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', overflow: 'hidden' }}>
                    {filteredResponses.length === 0 ? (
                        <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{searchQuery || moduleFilter !== 'default' || quizFilter !== 'default' ? '🔍' : '📋'}</div>
                            <h3 style={{ margin: '0 0 0.5rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                                {searchQuery || moduleFilter !== 'default' || quizFilter !== 'default' ? 'Sin resultados' : 'No hay quizes entregados'}
                            </h3>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.88rem' }}>
                                {searchQuery || moduleFilter !== 'default' || quizFilter !== 'default' ? 'Prueba con otros filtros.' : 'Aún ningún alumno ha respondido cuestionarios en esta materia.'}
                            </p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(192,132,252,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                        <th style={thStyle}>Alumno</th>
                                        <th style={thStyle}>Cuestionario</th>
                                        <th style={thStyle}>Módulo</th>
                                        <th style={thStyle}>Calificación</th>
                                        <th style={thStyle}>Fecha de entrega</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredResponses.map((resp, idx) => {
                                        const scoreText = resp.score !== null && resp.score !== undefined
                                            ? `${resp.score} / ${resp.max_score ?? 100}`
                                            : '—'
                                        const percent = (resp.score !== null && resp.score !== undefined && resp.max_score)
                                            ? Math.round((resp.score / resp.max_score) * 100)
                                            : null

                                        return (
                                            <tr
                                                key={resp.id}
                                                style={{ borderBottom: idx < filteredResponses.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'background 0.15s' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(192,132,252,0.05)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <td style={{ ...tdStyle, fontWeight: 600 }}>
                                                    <div>{resp.student_name || resp.student_id}</div>
                                                    {resp.student_email && (
                                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
                                                            {resp.student_email}
                                                        </div>
                                                    )}
                                                </td>

                                                <td style={{ ...tdStyle, fontWeight: 500, color: '#f3e8ff' }}>
                                                    {resp.quiz_title || 'Cuestionario'}
                                                </td>

                                                <td style={tdStyle}>
                                                    {resp.module_title ? (
                                                        <span style={{ fontSize: '0.78rem', background: 'rgba(108, 92, 231, 0.15)', color: '#c084fc', padding: '0.2rem 0.55rem', borderRadius: '8px', border: '1px solid rgba(192,132,252,0.2)' }}>
                                                            {resp.module_title}
                                                        </span>
                                                    ) : '—'}
                                                </td>

                                                <td style={tdStyle}>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: percent !== null && percent >= 70 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', padding: '2px 8px', borderRadius: '12px', border: `1px solid ${percent !== null && percent >= 70 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: percent !== null && percent >= 70 ? '#86efac' : '#fca5a5', fontSize: '0.82rem', fontWeight: 600 }}>
                                                        <span>{scoreText}</span>
                                                        {percent !== null && <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({percent}%)</span>}
                                                    </div>
                                                </td>

                                                <td style={tdStyle}>
                                                    {resp.submitted_at
                                                        ? new Date(resp.submitted_at).toLocaleString('es-MX', {
                                                            day: '2-digit', month: 'short', year: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })
                                                        : '—'}
                                                </td>

                                                <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => setSelectedResponse(resp)}
                                                        style={{
                                                            padding: '0.35rem 0.75rem',
                                                            borderRadius: '8px',
                                                            border: '1px solid rgba(192,132,252,0.3)',
                                                            background: 'rgba(108,92,231,0.2)',
                                                            color: '#e2e8f0',
                                                            fontSize: '0.82rem',
                                                            fontWeight: 500,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s',
                                                        }}
                                                    >
                                                        👁️ Ver detalle ({resp.answers?.length ?? 0})
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Detail Response */}
            {selectedResponse && (
                <div
                    onClick={() => setSelectedResponse(null)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2000, padding: '1.5rem',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#1a1625', border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '20px', padding: '1.75rem', maxWidth: '720px', width: '100%',
                            maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff' }}>
                                    📋 {selectedResponse.quiz_title}
                                </h3>
                                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.88rem', color: '#c084fc' }}>
                                    Alumno: <strong>{selectedResponse.student_name}</strong> {selectedResponse.student_email && `(${selectedResponse.student_email})`}
                                </p>
                                {selectedResponse.module_title && (
                                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                                        Módulo: {selectedResponse.module_title}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedResponse(null)}
                                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '1.2rem', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1rem' }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'block' }}>Calificación Final</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: selectedResponse.score !== null && selectedResponse.score !== undefined && selectedResponse.score >= (selectedResponse.max_score ? selectedResponse.max_score * 0.7 : 70) ? '#86efac' : '#fca5a5' }}>
                                    {selectedResponse.score !== null && selectedResponse.score !== undefined ? `${selectedResponse.score} / ${selectedResponse.max_score ?? 100}` : 'Sin calificar'}
                                </span>
                            </div>
                            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'block' }}>Fecha de envío</span>
                                <span style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
                                    {selectedResponse.submitted_at ? new Date(selectedResponse.submitted_at).toLocaleString('es-MX') : '—'}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {!selectedResponse.answers || selectedResponse.answers.length === 0 ? (
                                <p style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.5)' }}>
                                    No se encontraron respuestas registradas para este cuestionario.
                                </p>
                            ) : (
                                selectedResponse.answers.map((ans, idx) => {
                                    const ansId = ans.id || ans.question_id
                                    const isGrading = gradingQuestionId === ansId

                                    return (
                                        <div
                                            key={ans.question_id || idx}
                                            style={{
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '12px',
                                                padding: '1rem',
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem', gap: '0.5rem' }}>
                                                <div style={{ fontWeight: 600, color: '#f3e8ff', fontSize: '0.92rem' }}>
                                                    {idx + 1}. {ans.question_snapshot?.title ?? ans.question_title ?? `Pregunta ${idx + 1}`}
                                                </div>
                                                <span style={{
                                                    fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap',
                                                    background: ans.is_correct === true ? 'rgba(34,197,94,0.15)' : ans.is_correct === false ? 'rgba(239,68,68,0.15)' : 'rgba(251,146,60,0.15)',
                                                    color: ans.is_correct === true ? '#86efac' : ans.is_correct === false ? '#fca5a5' : '#fb923c',
                                                    border: `1px solid ${ans.is_correct === true ? 'rgba(34,197,94,0.3)' : ans.is_correct === false ? 'rgba(239,68,68,0.3)' : 'rgba(251,146,60,0.3)'}`
                                                }}>
                                                    {ans.is_correct === true ? '✓ Correcta' : ans.is_correct === false ? '✗ Incorrecta' : '⏳ Sin calificar'} {ans.points_awarded !== null && ans.points_awarded !== undefined ? `(${ans.points_awarded} pts)` : ''}
                                                </span>
                                            </div>

                                            <div style={{
                                                background: 'rgba(108, 92, 231, 0.15)',
                                                border: '1px solid rgba(192, 132, 252, 0.2)',
                                                borderRadius: '8px',
                                                padding: '0.65rem 0.85rem',
                                                marginTop: '0.4rem',
                                                marginBottom: '0.75rem',
                                            }}>
                                                {renderAnswerDetail(ans)}
                                            </div>

                                            {/* Teacher Grading Controls */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                flexWrap: 'wrap',
                                                padding: '0.5rem 0.75rem',
                                                background: 'rgba(255,255,255,0.03)',
                                                borderRadius: '8px',
                                                border: '1px dashed rgba(255,255,255,0.12)',
                                            }}>
                                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                                                    Calificar pregunta:
                                                </span>

                                                <button
                                                    disabled={isGrading}
                                                    onClick={() => handleGradeQuestion(ansId, ans.question_id, true)}
                                                    style={{
                                                        padding: '0.3rem 0.75rem',
                                                        borderRadius: '6px',
                                                        border: ans.is_correct === true ? '1px solid rgba(34,197,94,0.8)' : '1px solid rgba(34,197,94,0.3)',
                                                        background: ans.is_correct === true ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.1)',
                                                        color: ans.is_correct === true ? '#ffffff' : '#86efac',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        cursor: isGrading ? 'not-allowed' : 'pointer',
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                >
                                                    ✓ Correcta
                                                </button>

                                                <button
                                                    disabled={isGrading}
                                                    onClick={() => handleGradeQuestion(ansId, ans.question_id, false)}
                                                    style={{
                                                        padding: '0.3rem 0.75rem',
                                                        borderRadius: '6px',
                                                        border: ans.is_correct === false ? '1px solid rgba(239,68,68,0.8)' : '1px solid rgba(239,68,68,0.3)',
                                                        background: ans.is_correct === false ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.1)',
                                                        color: ans.is_correct === false ? '#ffffff' : '#fca5a5',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        cursor: isGrading ? 'not-allowed' : 'pointer',
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                >
                                                    ✗ Incorrecta
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button
                                onClick={() => setSelectedResponse(null)}
                                style={{
                                    padding: '0.5rem 1.25rem',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'rgba(255,255,255,0.08)',
                                    color: '#ffffff',
                                    cursor: 'pointer',
                                }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Questions Details */}
            {viewingQuizQuestions && (
                <div
                    onClick={() => setViewingQuizQuestions(null)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2000, padding: '1.5rem',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#1a1625', border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '20px', padding: '1.75rem', maxWidth: '680px', width: '100%',
                            maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff' }}>
                                    📋 {viewingQuizQuestions.title}
                                </h3>
                                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#c084fc' }}>
                                    Módulo: {viewingQuizQuestions.module_title}
                                </p>
                            </div>
                            <button
                                onClick={() => setViewingQuizQuestions(null)}
                                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '1.2rem', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {(!viewingQuizQuestions.questions || viewingQuizQuestions.questions.length === 0) ? (
                                <p style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.5)' }}>
                                    No hay preguntas registradas en este cuestionario.
                                </p>
                            ) : (
                                viewingQuizQuestions.questions.map((q: any, idx: number) => (
                                    <div
                                        key={q.id || idx}
                                        style={{
                                            background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '12px',
                                            padding: '1rem',
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, color: '#f3e8ff', marginBottom: '0.4rem', fontSize: '0.92rem' }}>
                                            {idx + 1}. {q.title || `Pregunta ${idx + 1}`}
                                        </div>
                                        <span style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                                            Tipo: {q.type || 'multiple_choice'}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button
                                onClick={() => setViewingQuizQuestions(null)}
                                style={{
                                    padding: '0.5rem 1.25rem',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'rgba(255,255,255,0.08)',
                                    color: '#ffffff',
                                    cursor: 'pointer',
                                }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default QuizzesTab
