import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { User } from '@supabase/supabase-js'
import { getExitTicket, getMyExitTicketResponse, submitExitTicketResponse, ExitTicketTemplate, StudentExitTicketResponse } from '../lib/adminApi'
import { ArrowLeft, CheckCircle2, AlertCircle, Send, ChevronDown } from 'lucide-react'
import bannerImg from '../assets/banner.png'

interface ExitTicketTakeScreenProps {
  ticketId: string
  moduleId: string
  user: User
  onClose: () => void
  moduleTitle?: string
}

const RATING_LABELS: Record<number, string> = {
  1: 'Totalmente en desacuerdo / Muy Malo',
  2: 'En desacuerdo / Regular',
  3: 'Neutral / Aceptable',
  4: 'De acuerdo / Bueno',
  5: 'Totalmente de acuerdo / Excelente'
}

const ExitTicketTakeScreen: React.FC<ExitTicketTakeScreenProps> = ({
  ticketId,
  moduleId,
  user,
  onClose,
  moduleTitle
}) => {
  const [template, setTemplate] = useState<ExitTicketTemplate | null>(null)
  const [existingResponse, setExistingResponse] = useState<StudentExitTicketResponse | null>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [otherAnswers, setOtherAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submittedSuccess, setSubmittedSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [missingIds, setMissingIds] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    loadTicketAndResponse()
  }, [ticketId, moduleId, user.id])

  const loadTicketAndResponse = async () => {
    try {
      setLoading(true)
      setError(null)
      const [data, responseData] = await Promise.all([
        getExitTicket(ticketId),
        getMyExitTicketResponse(ticketId, moduleId, user.id)
      ])

      setTemplate(data)
      setExistingResponse(responseData)

      // If existing response, prepopulate answers map
      if (responseData && responseData.student_exit_ticket_answers) {
        const initialAnswers: Record<string, any> = {}
        responseData.student_exit_ticket_answers.forEach((ans) => {
          let parsed = ans.answer
          try {
            parsed = JSON.parse(ans.answer)
          } catch {
            parsed = ans.answer
          }
          initialAnswers[ans.question_id] = parsed
        })
        setAnswers(initialAnswers)
      }
    } catch (err: any) {
      console.error('Error loading exit ticket:', err)
      setError(err.message || 'Error al cargar el ticket de salida')
    } finally {
      setLoading(false)
    }
  }

  const clearMissing = (questionId: string) => {
    setMissingIds((prev) => (prev.includes(questionId) ? prev.filter((id) => id !== questionId) : prev))
  }

  const handleOptionSelect = (questionId: string, optionLabel: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionLabel
    }))
    setValidationError(null)
    clearMissing(questionId)
  }

  const handleRatingSelect = (questionId: string, ratingValue: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: ratingValue
    }))
    setValidationError(null)
    clearMissing(questionId)
  }

  const handleTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: text
    }))
    setValidationError(null)
    clearMissing(questionId)
  }

  const questions = (template?.questions || []).slice().sort((a, b) => a.question_order - b.question_order)

  // slide 0 = intro, slides 1..questions.length = questions, last slide = review/submit
  const totalSlides = questions.length + 2
  const finalSlideIndex = totalSlides - 1

  const answeredCount = questions.filter((q) => {
    const val = answers[q.id]
    if (val === undefined || val === null || val === '') return false
    return true
  }).length

  const scrollToIndex = useCallback((idx: number) => {
    const el = sectionRefs.current[idx]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Track which slide is currently in view to drive the progress rail
  useEffect(() => {
    if (loading || !containerRef.current) return
    const root = containerRef.current

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const idx = Number((entry.target as HTMLElement).dataset.index)
            if (!Number.isNaN(idx)) setActiveIndex(idx)
          }
        })
      },
      { root, threshold: [0.5, 0.75] }
    )

    sectionRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [loading, questions.length, submittedSuccess])

  // Optional keyboard support for the snap scroll (arrow / page keys)
  useEffect(() => {
    if (loading) return
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') return
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        scrollToIndex(Math.min(activeIndex + 1, finalSlideIndex))
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        scrollToIndex(Math.max(activeIndex - 1, 0))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loading, activeIndex, finalSlideIndex, scrollToIndex])

  const handleSubmit = async () => {
    if (submitting || existingResponse) return

    const missing = questions.filter((q) => q.required && (answers[q.id] === undefined || answers[q.id] === null || answers[q.id] === ''))

    if (missing.length > 0) {
      setMissingIds(missing.map((q) => q.id))
      setValidationError(`Por favor responde todas las preguntas obligatorias (*). Faltan ${missing.length} pregunta(s).`)
      const firstMissingIndex = questions.findIndex((q) => q.id === missing[0].id)
      if (firstMissingIndex !== -1) scrollToIndex(firstMissingIndex + 1)
      return
    }

    try {
      setSubmitting(true)
      setValidationError(null)
      setError(null)

      const formattedAnswers = questions.map((q) => {
        let val = answers[q.id]
        if (val === 'Otra' && otherAnswers[q.id]) {
          val = `Otra: ${otherAnswers[q.id]}`
        }
        return {
          question_id: q.id,
          answer: val
        }
      })

      await submitExitTicketResponse(ticketId, moduleId, user.id, formattedAnswers)
      setSubmittedSuccess(true)
    } catch (err: any) {
      console.error('Error submitting exit ticket:', err)
      setError(err.message || 'Error al guardar tus respuestas. Inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const revealProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 32 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: false, amount: 0.6 },
        transition: { duration: 0.5, ease: 'easeOut' as const }
      }

  if (loading) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#0d0b14',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'system-ui, sans-serif'
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: '4px solid rgba(168, 85, 247, 0.2)',
            borderTopColor: '#a855f7',
            animation: 'spin 1s linear infinite',
            marginBottom: '1.5rem'
          }}
        />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
          Cargando Ticket de Salida...
        </p>
      </div>
    )
  }

  const currentQuestionNumber = activeIndex >= 1 && activeIndex <= questions.length ? activeIndex : null

  return (
    <div
      ref={containerRef}
      className="ets-scroll"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0e0c18',
        color: 'white',
        overflowY: 'auto',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <style>{`
        .ets-scroll {
          scroll-snap-type: y mandatory;
          scrollbar-width: none;
        }
        .ets-scroll::-webkit-scrollbar { display: none; }
        .ets-slide {
          min-height: 100vh;
          width: 100%;
          scroll-snap-align: start;
          scroll-snap-stop: always;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6rem 6.5rem 6rem 2rem;
          box-sizing: border-box;
          position: relative;
        }
        @media (max-width: 720px) {
          .ets-slide { padding: 5rem 1.25rem 6rem 1.25rem; }
          .ets-progress { right: 50% !important; top: auto !important; bottom: 14px !important; transform: translateX(50%) !important; flex-direction: row !important; }
        }
        .ets-option:hover { background: rgba(255,255,255,0.08); }
        .ets-textarea:focus, .ets-other-input:focus { border-color: #a855f7 !important; }
      `}</style>

      {/* Floating back button (replaces the top bar) */}
      <button
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 100,
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: 'white',
          borderRadius: '10px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 600,
          fontSize: '0.9rem',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          transition: 'background 0.2s ease'
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
        onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
      >
        <ArrowLeft size={18} /> Volver
      </button>

      {/* Vertical progress rail */}
      {questions.length > 0 && (
        <div
          className="ets-progress"
          style={{
            position: 'fixed',
            right: '28px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          {currentQuestionNumber && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.5)',
                marginBottom: '4px',
                letterSpacing: '0.03em'
              }}
            >
              {currentQuestionNumber}/{questions.length}
            </span>
          )}
          {questions.map((q, idx) => {
            const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== ''
            const isActive = activeIndex === idx + 1
            const isMissing = missingIds.includes(q.id)
            return (
              <button
                key={q.id}
                onClick={() => scrollToIndex(idx + 1)}
                title={`Pregunta ${idx + 1}`}
                aria-label={`Ir a la pregunta ${idx + 1}`}
                style={{
                  width: isActive ? '32px' : '22px',
                  height: '4px',
                  borderRadius: '2px',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  background: isMissing
                    ? '#ef4444'
                    : isAnswered
                    ? 'linear-gradient(90deg, #a855f7, #6366f1)'
                    : 'rgba(255,255,255,0.18)',
                  boxShadow: isActive ? '0 0 10px rgba(168, 85, 247, 0.6)' : 'none',
                  transition: 'all 0.25s ease'
                }}
              />
            )
          })}
        </div>
      )}

      {/* Intro slide */}
      <section
        ref={(el) => (sectionRefs.current[0] = el)}
        data-index={0}
        className="ets-slide"
      >
        <motion.div {...revealProps} style={{ maxWidth: '640px', width: '100%' }}>
          <div
            style={{
              background: `linear-gradient(135deg, rgba(37, 22, 78, 0.85) 0%, rgba(19, 17, 28, 0.95) 100%), url(${bannerImg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '24px',
              padding: '2.75rem',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 20px 45px rgba(0,0,0,0.4)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #a855f7, #6c5ce7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  flexShrink: 0,
                  boxShadow: '0 8px 16px rgba(168, 85, 247, 0.3)'
                }}
              >
                🎟️
              </div>
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.6)'
                  }}
                >
                  Ticket de Salida{moduleTitle ? ` · ${moduleTitle}` : ''}
                </span>
              </div>
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', margin: '0 0 12px 0', lineHeight: 1.2 }}>
              {template?.title || 'Cuestionario de Salida'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.05rem', lineHeight: '1.6', margin: 0 }}>
              {template?.description ||
                'Completa este cuestionario rápido para repasar lo aprendido y compartir tus comentarios al finalizar este módulo.'}
            </p>

            {existingResponse && (
              <div
                style={{
                  marginTop: '1.5rem',
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#4ade80',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              >
                <CheckCircle2 size={18} />
                <span>Ya completaste este ticket de salida. Desliza para revisar tus respuestas.</span>
              </div>
            )}

            {questions.length === 0 ? (
              <p style={{ marginTop: '1.5rem', color: 'rgba(255,255,255,0.5)' }}>
                Este cuestionario no contiene preguntas disponibles en este momento.
              </p>
            ) : (
              <button
                onClick={() => scrollToIndex(1)}
                style={{
                  marginTop: '2rem',
                  background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                  color: 'white',
                  border: 'none',
                  padding: '14px 32px',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(168, 85, 247, 0.3)'
                }}
              >
                {existingResponse ? 'Ver mis respuestas' : 'Comenzar'}
              </button>
            )}
          </div>

          {!shouldReduceMotion && (
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', color: 'rgba(255,255,255,0.4)' }}
            >
              <ChevronDown size={26} />
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* One slide per question */}
      {questions.map((q, idx) => {
        const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== ''
        const currentAnswer = answers[q.id]
        const isMissing = missingIds.includes(q.id)

        return (
          <section
            key={q.id}
            ref={(el) => (sectionRefs.current[idx + 1] = el)}
            data-index={idx + 1}
            id={`question-${q.id}`}
            className="ets-slide"
          >
            <motion.div {...revealProps} style={{ maxWidth: '640px', width: '100%' }}>
              <div
                style={{
                  background: '#191528',
                  borderRadius: '20px',
                  padding: '2.5rem',
                  border: isMissing
                    ? '1px solid rgba(239, 68, 68, 0.6)'
                    : isAnswered
                    ? '1px solid rgba(168, 85, 247, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                  transition: 'border-color 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span
                        style={{
                          background: isAnswered ? '#a855f7' : 'rgba(255,255,255,0.1)',
                          color: 'white',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '20px'
                        }}
                      >
                        Pregunta {idx + 1} de {questions.length}
                      </span>
                      {q.required && (
                        <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                          * Obligatoria
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', margin: 0, lineHeight: '1.4' }}>
                      {q.title}
                    </h3>
                  </div>

                  {isAnswered && <CheckCircle2 size={26} color="#a855f7" style={{ flexShrink: 0 }} />}
                </div>

                {q.description && (
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                    {q.description}
                  </p>
                )}

                {isMissing && (
                  <p style={{ color: '#fca5a5', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>
                    Esta pregunta es obligatoria.
                  </p>
                )}

                {/* 1. TEXT / OPEN ANSWER */}
                {q.type === 'text' && (
                  <textarea
                    className="ets-textarea"
                    disabled={!!existingResponse}
                    value={currentAnswer || ''}
                    onChange={(e) => handleTextChange(q.id, e.target.value)}
                    placeholder="Escribe tu respuesta aquí con el mayor detalle posible..."
                    rows={5}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      padding: '1rem',
                      color: 'white',
                      fontSize: '1rem',
                      lineHeight: '1.5',
                      resize: 'vertical',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                  />
                )}

                {/* 2. RATING (1 to 5) */}
                {q.type === 'rating' && (
                  <div>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4, 5].map((starNum) => {
                        const selected = currentAnswer === starNum
                        return (
                          <button
                            key={starNum}
                            type="button"
                            disabled={!!existingResponse}
                            onClick={() => handleRatingSelect(q.id, starNum)}
                            style={{
                              flex: 1,
                              minWidth: '64px',
                              height: '64px',
                              borderRadius: '14px',
                              background: selected
                                ? 'linear-gradient(135deg, #a855f7, #6c5ce7)'
                                : 'rgba(255, 255, 255, 0.05)',
                              border: selected ? '2px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.1)',
                              color: 'white',
                              fontSize: '1.1rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: existingResponse ? 'default' : 'pointer',
                              boxShadow: selected ? '0 4px 15px rgba(168, 85, 247, 0.4)' : 'none',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            ⭐ {starNum}
                          </button>
                        )
                      })}
                    </div>
                    {currentAnswer && RATING_LABELS[currentAnswer] && (
                      <p style={{ fontSize: '0.85rem', color: '#c084fc', margin: '6px 0 0 0', fontWeight: 600 }}>
                        Seleccionado: {RATING_LABELS[currentAnswer]}
                      </p>
                    )}
                  </div>
                )}

                {/* 3. MULTIPLE CHOICE */}
                {q.type === 'multiple_choice' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(q.config?.options || []).map((option: any, oIdx: number) => {
                      const optionLabel = typeof option === 'string' ? option : option.label
                      const isSelected = currentAnswer === optionLabel

                      return (
                        <div
                          key={oIdx}
                          className="ets-option"
                          onClick={() => !existingResponse && handleOptionSelect(q.id, optionLabel)}
                          style={{
                            background: isSelected ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                            border: isSelected ? '2px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '14px',
                            padding: '1rem 1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: existingResponse ? 'default' : 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              border: isSelected ? '6px solid #a855f7' : '2px solid rgba(255, 255, 255, 0.4)',
                              background: isSelected ? 'white' : 'transparent',
                              flexShrink: 0
                            }}
                          />
                          <span style={{ fontSize: '0.95rem', color: isSelected ? 'white' : 'rgba(255,255,255,0.85)', fontWeight: isSelected ? 600 : 400 }}>
                            {optionLabel}
                          </span>
                        </div>
                      )
                    })}

                    {q.config?.allow_other && (
                      <div
                        onClick={() => !existingResponse && handleOptionSelect(q.id, 'Otra')}
                        style={{
                          background:
                            currentAnswer === 'Otra' || (typeof currentAnswer === 'string' && currentAnswer.startsWith('Otra:'))
                              ? 'rgba(168, 85, 247, 0.15)'
                              : 'rgba(255, 255, 255, 0.04)',
                          border:
                            currentAnswer === 'Otra' || (typeof currentAnswer === 'string' && currentAnswer.startsWith('Otra:'))
                              ? '2px solid #a855f7'
                              : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '14px',
                          padding: '1rem 1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          cursor: existingResponse ? 'default' : 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              border:
                                currentAnswer === 'Otra' || (typeof currentAnswer === 'string' && currentAnswer.startsWith('Otra:'))
                                  ? '6px solid #a855f7'
                                  : '2px solid rgba(255, 255, 255, 0.4)',
                              background: 'transparent',
                              flexShrink: 0
                            }}
                          />
                          <span>Otra opción (especificar)</span>
                        </div>

                        {(currentAnswer === 'Otra' || (typeof currentAnswer === 'string' && currentAnswer.startsWith('Otra:'))) && (
                          <input
                            type="text"
                            className="ets-other-input"
                            disabled={!!existingResponse}
                            placeholder="Escribe tu otra opción..."
                            value={otherAnswers[q.id] || (typeof currentAnswer === 'string' && currentAnswer.startsWith('Otra: ') ? currentAnswer.replace('Otra: ', '') : '')}
                            onChange={(e) => setOtherAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            style={{
                              width: '100%',
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              color: 'white',
                              fontSize: '0.9rem',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => scrollToIndex(idx + 2)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  margin: '1.5rem auto 0 auto',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.45)',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {idx === questions.length - 1 ? 'Continuar' : 'Siguiente pregunta'} <ChevronDown size={16} />
              </button>
            </motion.div>
          </section>
        )
      })}

      {/* Final slide: review / submit / success */}
      <section
        ref={(el) => (sectionRefs.current[finalSlideIndex] = el)}
        data-index={finalSlideIndex}
        className="ets-slide"
      >
        <motion.div {...revealProps} style={{ maxWidth: '640px', width: '100%' }}>
          {submittedSuccess ? (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(37, 22, 78, 0.8), rgba(20, 16, 38, 0.95))',
                borderRadius: '24px',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                padding: '3.5rem 2rem',
                textAlign: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.5rem'
              }}
            >
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)'
                }}
              >
                <CheckCircle2 size={54} color="white" />
              </div>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'white' }}>
                  ¡Ticket de Salida Enviado!
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
                  Muchas gracias por completar tus respuestas. Tu feedback ha sido registrado exitosamente para este módulo.
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  marginTop: '1rem',
                  background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                  color: 'white',
                  border: 'none',
                  padding: '14px 32px',
                  borderRadius: '12px',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(168, 85, 247, 0.3)'
                }}
              >
                Regresar al Módulo
              </button>
            </div>
          ) : existingResponse ? (
            <div
              style={{
                background: '#191528',
                borderRadius: '20px',
                padding: '3rem 2.5rem',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                textAlign: 'center'
              }}
            >
              <CheckCircle2 size={44} color="#4ade80" style={{ marginBottom: '1rem' }} />
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>
                Ya completaste este ticket
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1.75rem' }}>
                Tus respuestas ya fueron registradas para este módulo. Gracias por tu feedback.
              </p>
              <button
                onClick={onClose}
                style={{
                  background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                  color: 'white',
                  border: 'none',
                  padding: '14px 32px',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(168, 85, 247, 0.3)'
                }}
              >
                Regresar al Módulo
              </button>
            </div>
          ) : questions.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              No hay preguntas para enviar.
            </div>
          ) : (
            <div
              style={{
                background: '#191528',
                borderRadius: '20px',
                padding: '3rem 2.5rem',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>
                ¿Listo para enviar?
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1.75rem' }}>
                Respondiste {answeredCount} de {questions.length} preguntas. Revisa tus respuestas desplazándote hacia arriba si necesitas cambiar algo.
              </p>

              {validationError && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    padding: '1rem 1.25rem',
                    borderRadius: '14px',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontWeight: 600
                  }}
                >
                  <AlertCircle size={22} style={{ flexShrink: 0 }} />
                  <span>{validationError}</span>
                </div>
              )}

              {error && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    padding: '1rem 1.25rem',
                    borderRadius: '14px',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <AlertCircle size={22} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    padding: '14px 28px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    background: submitting ? 'rgba(168, 85, 247, 0.5)' : 'linear-gradient(135deg, #a855f7, #6366f1)',
                    color: 'white',
                    border: 'none',
                    padding: '14px 36px',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 20px rgba(168, 85, 247, 0.3)'
                  }}
                >
                  {submitting ? 'Enviando respuestas...' : (
                    <>
                      Enviar Ticket de Salida <Send size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </section>
    </div>
  )
}

export default ExitTicketTakeScreen