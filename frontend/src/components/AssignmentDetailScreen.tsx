import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import './AssignmentDetailScreen.css'
import type { AssignmentDetail, SubmissionFile, Submission } from './ProfessorContentScreen/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AssignmentDetailScreenProps {
  user: User
}

const AssignmentDetailScreen: React.FC<AssignmentDetailScreenProps> = ({ user }) => {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const navigate = useNavigate()

  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Local, client-only checklist state — not persisted anywhere
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())
  const checkboxCounter = useMemo(() => ({ current: 0 }), [assignment?.instructions_md])

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  const fetchAssignment = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/api/assignments/${assignmentId}?student_id=${user.id}`)
      if (!res.ok) throw new Error('Error al cargar la tarea')
      const data = await res.json()
      setAssignment(data)
    } catch (err) {
      console.error(err)
      setError('No se pudo cargar la tarea.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (assignmentId) fetchAssignment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId])

  const toggleCheckbox = (index: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    setSelectedFiles(Array.from(e.target.files))
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!assignment) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const formData = new FormData()
      formData.append('student_id', user.id)
      formData.append('body_md', comment)
      selectedFiles.forEach(file => formData.append('files', file))

      const res = await fetch(`${apiUrl}/api/assignments/${assignment.id}/submit`, {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al entregar la tarea')
      }

      setSelectedFiles([])
      setComment('')
      await fetchAssignment()
    } catch (err: any) {
      console.error(err)
      setSubmitError(err.message || 'No se pudo entregar la tarea.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="assignment-detail-container"><p className="assignment-loading">Cargando tarea...</p></div>
  }

  if (error || !assignment) {
    return (
      <div className="assignment-detail-container">
        <p className="assignment-error">{error || 'Tarea no encontrada.'}</p>
        <button className="assignment-back-btn" onClick={() => navigate(-1)}>Volver</button>
      </div>
    )
  }

  const dueDate = assignment.due_at ? new Date(assignment.due_at) : null
  const isPastDue = dueDate ? dueDate.getTime() < Date.now() : false
  const hasSubmission = !!assignment.submission
  const canSubmit = !isPastDue

  // Reset the counter each render pass through the markdown tree
  checkboxCounter.current = 0

  return (
    <div className="assignment-detail-container">
      <button className="assignment-back-btn" onClick={() => navigate(-1)}>‹ Volver al calendario</button>

      <div className="assignment-header-card">
        <div className="assignment-header-top">
          {assignment.subjects && (
            <span className="assignment-subject-badge">
              {assignment.subjects.short_name || assignment.subjects.name}
            </span>
          )}
          {isPastDue && <span className="assignment-overdue-badge">Vencida</span>}
        </div>
        <h1>{assignment.title}</h1>
        <div className="assignment-meta-row">
          {dueDate && (
            <span>
              Entrega: {dueDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
              {' · '}
              {dueDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {assignment.max_score != null && <span>Puntaje máximo: {assignment.max_score}</span>}
        </div>
      </div>

      <div className="assignment-body-grid">
        <section className="assignment-instructions-card">
          <h3>Instrucciones</h3>
          {assignment.instructions_md ? (
            <div className="assignment-instructions-text">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  input: ({ checked, ...props }) => {
                    // Only intercept task-list checkboxes; leave any other input types alone
                    if (props.type !== 'checkbox') {
                      return <input {...props} />
                    }
                    const index = checkboxCounter.current++
                    const isChecked = checkedItems.has(index)
                    return (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCheckbox(index)}
                        className="instructions-checkbox"
                      />
                    )
                  },
                  li: ({ children, className, ...props }) => {
                    // GFM adds "task-list-item" class to checklist <li>s — style those distinctly
                    const isTask = className?.includes('task-list-item')
                    return (
                      <li className={className} {...props}>
                        {children}
                      </li>
                    )
                  }
                }}
              >
                {assignment.instructions_md}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="assignment-no-instructions">El profesor no agregó instrucciones adicionales.</p>
          )}

          {(assignment.allowed_file_types?.length || assignment.max_file_size_mb) && (
            <div className="assignment-constraints">
              {assignment.allowed_file_types?.length && (
                <span>Formatos permitidos: {assignment.allowed_file_types.join(', ')}</span>
              )}
              {assignment.max_file_size_mb && (
                <span>Tamaño máximo por archivo: {assignment.max_file_size_mb} MB</span>
              )}
            </div>
          )}
        </section>

        
        <section className="assignment-submission-card">
          <h3>Tu entrega</h3>

          {hasSubmission && assignment.submission && (
            <div className="existing-submission">
              <div className="existing-submission-header">
                <span>Nuevo intento</span>
                <span>{new Date(assignment.submission.submitted_at).toLocaleDateString('es-ES')}</span>
              </div>

              {assignment.submission.files.length > 0 && (
                <ul className="existing-file-list">
                  {assignment.submission.files.map(f => (
                    <li key={f.id}>
                      <a href={f.external_url || f.storage_path || '#'} target="_blank" rel="noopener noreferrer">
                        {f.file_name || 'Archivo'}
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              <div className="existing-submission-status">
                {assignment.submission.graded_at ? (
                  <>
                    <span className="grade-pill">
                      {assignment.submission.grade != null ? `${assignment.submission.grade} pts` : 'Calificada'}
                    </span>
                    {assignment.submission.feedback_md && (
                      <p className="feedback-text">{assignment.submission.feedback_md}</p>
                    )}
                  </>
                ) : (
                  <span className="pending-pill">Pendiente de revisión</span>
                )}
              </div>
            </div>
          )}

          {canSubmit ? (
            <div className="submission-form">
                {hasSubmission && (
                    <p className="resubmit-note">
                        Ya entregaste esta tarea. Si vuelves a entregar, tu entrega anterior será reemplazada.
                    </p>
                )}

                <label className="file-drop-zone">
                    <input type="file" multiple onChange={handleFileChange} hidden />
                    <span>Arrastra archivos aquí o haz clic para seleccionarlos</span>
                </label>

                {selectedFiles.length > 0 && (
                    <ul className="selected-file-list">
                    {selectedFiles.map((file, i) => (
                        <li key={i}>
                            <span>{file.name}</span>
                            <button onClick={() => removeSelectedFile(i)} aria-label="Quitar archivo">✕</button>
                        </li>
                    ))}
                    </ul>
                )}

                <textarea
                    className="submission-comment"
                    placeholder="Cuerpo de texto opcional para el profesor..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                />

                {submitError && <p className="submit-error">{submitError}</p>}

                <button
                    className="submit-btn"
                    onClick={handleSubmit}
                    disabled={submitting || selectedFiles.length === 0}
                >
                    {submitting ? 'Entregando...' : 'Entregar tarea'}
                </button>
            </div>
          ) : (
            <p className="no-resubmit-note">La fecha límite de entrega ya pasó.</p>
          )}
        </section>
      </div>
    </div>
  )
}

export default AssignmentDetailScreen