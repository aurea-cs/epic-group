import React, { useState } from 'react'
import type { Submission } from './types'

interface GradingModalProps {
  submission: Submission
  maxScore?: number | null
  onClose: () => void
  onSubmit: (payload: { grade: number | null; feedback_md: string | null; status: string }) => Promise<void>
}

const GradingModal: React.FC<GradingModalProps> = ({ submission, maxScore, onClose, onSubmit }) => {
  const [grade, setGrade] = useState<string>(submission.grade != null ? String(submission.grade) : '')
  const [feedback, setFeedback] = useState<string>(submission.feedback_md || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)

    const trimmed = grade.trim()
    const parsedGrade = trimmed === '' ? null : Number(trimmed)

    if (trimmed !== '' && (Number.isNaN(parsedGrade) || parsedGrade! < 0)) {
      setError('La calificación debe ser un número válido.')
      return
    }
    if (maxScore != null && parsedGrade != null && parsedGrade > maxScore) {
      setError(`La calificación no puede superar ${maxScore}.`)
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        grade: parsedGrade,
        feedback_md: feedback.trim() || null,
        status: 'graded'
      })
    } catch (err: any) {
      setError(err.message || 'Error al guardar la calificación.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1f1229', border: '1px solid rgba(192,132,252,0.3)',
          borderRadius: '20px', padding: '2rem', width: '90%', maxWidth: '480px',
          color: '#fff'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.3rem', fontWeight: 700 }}>Calificar entrega</h2>

        <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700 }}>{submission.studentName}</span>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
                {new Date(submission.submitted_at).toLocaleString('es-MX', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
                </span>
            </div>

            {submission.body_md && (
                <div style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.75rem 1rem',
                fontSize: '0.85rem', color: '#e5e7eb', lineHeight: 1.5, whiteSpace: 'pre-wrap'
                }}>
                {submission.body_md}
                </div>
            )}
            </div>

        {submission.files.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.4rem' }}>
              Archivos entregados
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {submission.files.map(file => (
                <a
                  key={file.id}
                  href={file.signed_url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#c084fc', fontSize: '0.85rem', textDecoration: 'none' }}
                >
                  📎 {file.file_name || 'Archivo sin nombre'}
                </a>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
            Calificación {maxScore != null && <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>(máx. {maxScore})</span>}
          </label>
          <input
            type="number"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="Ej: 85"
            min={0}
            max={maxScore ?? undefined}
            style={{
              width: '100%', padding: '0.7rem 1rem', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)',
              color: '#fff', fontSize: '1rem', boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
            Retroalimentación
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Comentarios para el alumno (opcional)..."
            rows={4}
            style={{
              width: '100%', padding: '0.7rem 1rem', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)',
              color: '#fff', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {error && (
          <p style={{ color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '0.6rem 1.4rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: '#e5e7eb', cursor: 'pointer', fontSize: '0.9rem'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: '0.6rem 1.4rem', borderRadius: '10px', border: 'none',
              background: saving ? 'rgba(192,132,252,0.4)' : 'linear-gradient(135deg, #c084fc, #a855f7)',
              color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 600
            }}
          >
            {saving ? 'Guardando...' : 'Guardar calificación'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default GradingModal