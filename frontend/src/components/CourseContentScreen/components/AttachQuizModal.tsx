import React, { useEffect, useState } from 'react'
import { getQuizzes, type Quiz } from '../../../lib/adminApi'

interface AttachQuizModalProps {
    isOpen: boolean
    curriculumModuleId?: string
    attachedQuizIds: string[]
    onClose: () => void
    onAttach: (selectedQuizIds: string[]) => Promise<void>
}

const AttachQuizModal: React.FC<AttachQuizModalProps> = ({
    isOpen,
    curriculumModuleId,
    attachedQuizIds,
    onClose,
    onAttach,
}) => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) return
        let isMounted = true
        setLoading(true)
        setError(null)

        getQuizzes(curriculumModuleId)
            .then(data => {
                if (isMounted) setQuizzes(data)
            })
            .catch(() => {
                // If filtering by curriculumModuleId returned error or empty, fetch all
                getQuizzes()
                    .then(data => { if (isMounted) setQuizzes(data) })
                    .catch(e => { if (isMounted) setError(e.message || 'Error al cargar cuestionarios') })
            })
            .finally(() => {
                if (isMounted) setLoading(false)
            })
    }, [isOpen, curriculumModuleId])

    if (!isOpen) return null

    const toggleSelect = (id: string) => {
        if (attachedQuizIds.includes(id)) return // Already attached
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const handleConfirm = async () => {
        if (selectedIds.length === 0) return
        try {
            setSubmitting(true)
            await onAttach(selectedIds)
            setSelectedIds([])
            onClose()
        } catch (err: any) {
            setError(err.message || 'Error al adjuntar cuestionario(s)')
        } finally {
            setSubmitting(false)
        }
    }

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
                    maxWidth: '600px',
                    maxHeight: '85vh',
                    overflowY: 'auto',
                    background: '#0d1527',
                    borderRadius: '16px',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '1.5rem',
                    color: '#ffffff',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🧠</span> Adjuntar cuestionario al módulo
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>

                {loading && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                        Cargando cuestionarios disponibles…
                    </div>
                )}

                {error && (
                    <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#f87171', marginBottom: '1rem' }}>
                        {error}
                    </div>
                )}

                {!loading && (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto', marginBottom: '1.25rem' }}>
                            {quizzes.length === 0 ? (
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                                    No hay cuestionarios disponibles en la biblioteca.
                                </p>
                            ) : (
                                quizzes.map(q => {
                                    const isAttached = attachedQuizIds.includes(q.id)
                                    const isSelected = selectedIds.includes(q.id)
                                    const qCount = q.questions?.length ?? q.quiz_questions?.[0]?.count ?? 0

                                    return (
                                        <div
                                            key={q.id}
                                            onClick={() => toggleSelect(q.id)}
                                            style={{
                                                padding: '0.75rem 1rem',
                                                borderRadius: '8px',
                                                background: isAttached
                                                    ? 'rgba(255,255,255,0.03)'
                                                    : isSelected
                                                        ? 'rgba(56, 189, 248, 0.15)'
                                                        : 'rgba(255,255,255,0.06)',
                                                border: isSelected
                                                    ? '1px solid #38bdf8'
                                                    : '1px solid rgba(255,255,255,0.1)',
                                                cursor: isAttached ? 'default' : 'pointer',
                                                opacity: isAttached ? 0.5 : 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{q.title}</div>
                                                {q.description && (
                                                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                                                        {q.description}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.2rem' }}>
                                                    {qCount} {qCount === 1 ? 'pregunta' : 'preguntas'}
                                                </div>
                                            </div>

                                            <div>
                                                {isAttached ? (
                                                    <span style={{ fontSize: '0.75rem', color: '#6ee7a8', background: 'rgba(110, 231, 168, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                                        Ya adjuntado
                                                    </span>
                                                ) : (
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {}}
                                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                                onClick={onClose}
                                disabled={submitting}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: 'transparent',
                                    color: '#fff',
                                    cursor: 'pointer',
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={submitting || selectedIds.length === 0}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: selectedIds.length > 0 ? '#38bdf8' : 'rgba(56, 189, 248, 0.3)',
                                    color: '#0d1527',
                                    fontWeight: 'bold',
                                    cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
                                }}
                            >
                                {submitting ? 'Adjuntando…' : `Adjuntar (${selectedIds.length})`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default AttachQuizModal
