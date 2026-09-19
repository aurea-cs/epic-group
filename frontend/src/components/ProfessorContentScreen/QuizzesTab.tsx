import React, { useState, useMemo } from 'react'
import { tdStyle, thStyle, inputStyleAlt } from '../general/SharedUI'
import CustomSelect from '../general/CustomSelect'
import { StudentQuizSubjectResponse, StudentQuizSubjectResponseAnswer } from './types'

interface QuizzesTabProps {
    loading: boolean
    quizResponses: StudentQuizSubjectResponse[]
}

const renderAnswerDetail = (ans: StudentQuizSubjectResponseAnswer) => {
    // Prefer question_snapshot (written at submit time) over the live join fields,
    // which may be stale or missing if the question was later edited or deleted.
    const snap = ans.question_snapshot
    const question_type = snap?.type ?? ans.question_type
    const config = snap?.config ?? ans.config
    const answer = ans.answer

    if (answer === undefined || answer === null) {
        return <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.4)' }}>Sin respuesta</span>
    }

    if (question_type === 'matching') {
        const pairs: { [key: string]: string } = typeof answer === 'object' ? answer : {}
        const itemsLeft: any[] = config?.matchingPairs || config?.pairs || []

        const pairEntries = Object.entries(pairs)
        if (pairEntries.length === 0) {
            return <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.4)' }}>Sin relacionar</span>
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                {pairEntries.map(([leftId, rightVal], i) => {
                    const matchObj = itemsLeft.find((p: any) => p.id === leftId || p.left === leftId)
                    const leftLabel = matchObj ? (matchObj.left || matchObj.title || leftId) : leftId
                    return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
                            <span style={{ fontWeight: 500, color: '#e2e8f0' }}>{leftLabel}</span>
                            <span style={{ color: '#c084fc' }}>➔</span>
                            <span style={{ color: '#93c5fd' }}>{String(rightVal)}</span>
                        </div>
                    )
                })}
            </div>
        )
    }

    if (question_type === 'ordering') {
        const items: string[] = Array.isArray(answer) ? answer : []
        if (items.length === 0) {
            return <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.4)' }}>Sin ordenar</span>
        }
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                {items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(192,132,252,0.2)', color: '#c084fc', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                            {i + 1}
                        </span>
                        <span style={{ color: '#e2e8f0' }}>{item}</span>
                    </div>
                ))}
            </div>
        )
    }

    if (typeof answer === 'object') {
        return <pre style={{ margin: 0, fontSize: '0.82rem', whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>{JSON.stringify(answer, null, 2)}</pre>
    }

    return <span style={{ color: '#ffffff', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{String(answer)}</span>
}

const QuizzesTab: React.FC<QuizzesTabProps> = ({ loading, quizResponses }) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [moduleFilter, setModuleFilter] = useState<string>('default')
    const [selectedResponse, setSelectedResponse] = useState<StudentQuizSubjectResponse | null>(null)

    const moduleOptions = useMemo(() => {
        const modules = Array.from(new Set(quizResponses.map(r => r.module_title).filter(Boolean))).sort()
        return [
            { value: 'default', label: 'Todos los módulos' },
            ...modules.map(m => ({ value: m!, label: m! })),
        ]
    }, [quizResponses])

    const filtered = useMemo(() => {
        return quizResponses.filter(r => {
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

            return matchesSearch && matchesModule
        })
    }, [quizResponses, searchQuery, moduleFilter])

    return (
        <>
            {/* Filters */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 260px' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar por alumno o cuestionario..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ ...inputStyleAlt, paddingLeft: '36px', width: '100%', background: 'rgba(255,255,255,0.06)' }}
                    />
                </div>
                <div style={{ flex: '1 1 220px' }}>
                    <CustomSelect
                        value={moduleFilter}
                        onChange={setModuleFilter}
                        options={moduleOptions}
                    />
                </div>
                {(searchQuery || (moduleFilter && moduleFilter !== 'default')) && (
                    <button
                        onClick={() => { setSearchQuery(''); setModuleFilter('default') }}
                        style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                    >
                        ✕ Limpiar
                    </button>
                )}
                <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Cargando entregas de quizes...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{searchQuery || moduleFilter !== 'default' ? '🔍' : '📋'}</div>
                        <h3 style={{ margin: '0 0 0.5rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                            {searchQuery || moduleFilter !== 'default' ? 'Sin resultados' : 'No hay quizes entregados'}
                        </h3>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.88rem' }}>
                            {searchQuery || moduleFilter !== 'default' ? 'Prueba con otros filtros.' : 'Aún ningún alumno ha respondido cuestionarios en esta materia.'}
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
                                {filtered.map((resp, idx) => {
                                    const scoreText = resp.score !== null && resp.score !== undefined
                                        ? `${resp.score} / ${resp.max_score ?? 100}`
                                        : '—'
                                    const percent = (resp.score !== null && resp.score !== undefined && resp.max_score)
                                        ? Math.round((resp.score / resp.max_score) * 100)
                                        : null

                                    return (
                                        <tr
                                            key={resp.id}
                                            style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'background 0.15s' }}
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

            {/* Modal Detail */}
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
                            borderRadius: '20px', padding: '1.75rem', maxWidth: '680px', width: '100%',
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
                                selectedResponse.answers.map((ans, idx) => (
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
                                            {ans.is_correct !== undefined && ans.is_correct !== null && (
                                                <span style={{
                                                    fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap',
                                                    background: ans.is_correct ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                                    color: ans.is_correct ? '#86efac' : '#fca5a5',
                                                    border: `1px solid ${ans.is_correct ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`
                                                }}>
                                                    {ans.is_correct ? '✓ Correcta' : '✗ Incorrecta'} {ans.points_awarded !== null && ans.points_awarded !== undefined ? `(${ans.points_awarded} pts)` : ''}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{
                                            background: 'rgba(108, 92, 231, 0.15)',
                                            border: '1px solid rgba(192, 132, 252, 0.2)',
                                            borderRadius: '8px',
                                            padding: '0.65rem 0.85rem',
                                            marginTop: '0.4rem',
                                        }}>
                                            {renderAnswerDetail(ans)}
                                        </div>
                                    </div>
                                ))
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
        </>
    )
}

export default QuizzesTab
