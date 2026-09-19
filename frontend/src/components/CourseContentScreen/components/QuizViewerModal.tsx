import React, { useEffect, useState } from 'react'
import { getQuiz, type Quiz } from '../../../lib/adminApi'

interface QuizViewerModalProps {
    quizId: string
    onClose: () => void
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
    multiple_choice: 'Opción múltiple',
    true_false: 'Verdadero / Falso',
    checklist: 'Casillas (múltiples correctas)',
    open: 'Respuesta abierta',
    complete_sentence: 'Completa la oración',
    matching: 'Relacionar conceptos (líneas)',
    ordering: 'Ordenar en secuencia',
}

const QuizViewerModal: React.FC<QuizViewerModalProps> = ({ quizId, onClose }) => {
    const [quiz, setQuiz] = useState<Quiz | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true
        setLoading(true)
        setError(null)
        getQuiz(quizId)
            .then(data => {
                if (isMounted) setQuiz(data)
            })
            .catch(err => {
                if (isMounted) setError(err.message || 'Error al cargar el cuestionario')
            })
            .finally(() => {
                if (isMounted) setLoading(false)
            })
        return () => { isMounted = false }
    }, [quizId])

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.85)',
                zIndex: 2000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '750px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    background: '#0d1527',
                    borderRadius: '16px',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '1.75rem',
                    color: '#ffffff',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>🧠</span>
                            <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#38bdf8' }}>
                                {quiz?.title || 'Vista previa del cuestionario'}
                            </h2>
                        </div>
                        {quiz?.description && (
                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                                {quiz.description}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '8px',
                            padding: '0.4rem 0.75rem',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                        }}
                    >
                        ✕ Cerrar
                    </button>
                </div>

                {loading && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                        Cargando cuestionario…
                    </div>
                )}

                {error && (
                    <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#f87171' }}>
                        {error}
                    </div>
                )}

                {!loading && !error && quiz && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {(!quiz.questions || quiz.questions.length === 0) ? (
                            <p style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '1.5rem' }}>
                                Este cuestionario no contiene preguntas registradas aún.
                            </p>
                        ) : (
                            quiz.questions.map((q, idx) => (
                                <div
                                    key={q.id || idx}
                                    style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '10px',
                                        padding: '1rem',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                                            Pregunta {idx + 1}: {q.title}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: '0.7rem',
                                                padding: '0.15rem 0.4rem',
                                                borderRadius: '4px',
                                                background: 'rgba(56, 189, 248, 0.1)',
                                                color: '#7dd3fc',
                                            }}
                                        >
                                            {QUESTION_TYPE_LABELS[q.type] || q.type}
                                        </span>
                                    </div>

                                    {/* Options rendering */}
                                    {q.config?.options && Array.isArray(q.config.options) && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem', paddingLeft: '0.5rem' }}>
                                            {q.config.options.map((opt: any, optIdx: number) => {
                                                const label = typeof opt === 'string' ? opt : opt.label
                                                const id = typeof opt === 'string' ? opt : opt.id
                                                const isCorrect =
                                                    q.config!.correct_option_id === id ||
                                                    (Array.isArray(q.config!.correct_ids) && q.config!.correct_ids!.includes(id)) ||
                                                    q.config!.correct_option === label
                                                return (
                                                    <div
                                                        key={optIdx}
                                                        style={{
                                                            fontSize: '0.85rem',
                                                            color: isCorrect ? '#4ade80' : 'rgba(255,255,255,0.8)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.4rem',
                                                        }}
                                                    >
                                                        <span>{isCorrect ? '✅' : '⚪'}</span>
                                                        <span>{label}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {q.type === 'true_false' && (
                                        <div style={{ fontSize: '0.85rem', marginTop: '0.4rem', color: '#4ade80' }}>
                                            Respuesta correcta: {q.config?.correct_answer === 'true' ? 'Verdadero' : 'Falso'}
                                        </div>
                                    )}

                                    {q.type === 'matching' && q.config?.pairs && Array.isArray(q.config.pairs) && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem', paddingLeft: '0.5rem' }}>
                                            {q.config.pairs.map((p: any, pi: number) => (
                                                <div key={pi} style={{ fontSize: '0.85rem', color: '#4ade80', display: 'flex', gap: '0.4rem' }}>
                                                    <span>🔗</span>
                                                    <span>{p.left} ➔ {p.right}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {q.type === 'ordering' && q.config?.items && Array.isArray(q.config.items) && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem', paddingLeft: '0.5rem' }}>
                                            {q.config.items.map((it: any, ii: number) => (
                                                <div key={ii} style={{ fontSize: '0.85rem', color: '#4ade80', display: 'flex', gap: '0.4rem' }}>
                                                    <span>{ii + 1}.</span>
                                                    <span>{it.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default QuizViewerModal
