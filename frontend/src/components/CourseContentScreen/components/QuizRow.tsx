import React from 'react'
import { type ModuleQuizAttachment, type Quiz } from '../../../lib/adminApi'

interface QuizRowProps {
    attachment: ModuleQuizAttachment
    onDetach?: (attachment: ModuleQuizAttachment) => void
    onView?: (quiz: Quiz) => void
}

const QuizRow: React.FC<QuizRowProps> = ({ attachment, onDetach, onView }) => {
    const quiz = attachment.quizzes
    if (!quiz) return null

    const questionCount =
        quiz.questions?.length ??
        quiz.quiz_questions?.[0]?.count ??
        0

    const isActive = attachment.is_active && quiz.is_active

    return (
        <div
            className="module-item-row quiz-row"
            onClick={() => onView?.(quiz)}
            style={{ cursor: onView ? 'pointer' : 'default' }}
            title="Haz clic para ver el cuestionario"
        >
            <div style={{ fontSize: '1.5rem' }}>🧠</div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{quiz.title}</span>
                    <span
                        style={{
                            fontSize: '0.68rem',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                        }}
                    >
                        Cuestionario
                    </span>
                </div>

                {quiz.description && (
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.1rem' }}>
                        {quiz.description}
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                    <span style={{
                        fontSize: '0.72rem',
                        color: isActive ? '#6ee7a8' : 'rgba(255,255,255,0.35)',
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                    }}>
                        <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: isActive ? '#6ee7a8' : 'rgba(255,255,255,0.3)',
                            display: 'inline-block',
                        }} />
                        {isActive ? 'Activo' : 'Inactivo'}
                    </span>

                    {questionCount > 0 && (
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                            {questionCount} {questionCount === 1 ? 'pregunta' : 'preguntas'}
                        </span>
                    )}

                    {attachment.due_at && (
                        <span style={{ fontSize: '0.72rem', color: '#fca5a5' }}>
                            📅 Vence: {new Date(attachment.due_at).toLocaleDateString()}
                        </span>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {onView && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onView(quiz)
                        }}
                        title="Ver cuestionario"
                        style={{
                            width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                            background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8',
                            cursor: 'pointer', fontSize: '0.85rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        👁️
                    </button>
                )}
                {onDetach && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onDetach(attachment)
                        }}
                        title="Desconectar cuestionario"
                        style={{
                            width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                            background: 'rgba(220,38,38,0.15)', color: '#f87171',
                            cursor: 'pointer', fontSize: '0.85rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        🗑️
                    </button>
                )}
            </div>
        </div>
    )
}

export default QuizRow
