import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { User } from '@supabase/supabase-js'
import {
  getQuiz,
  getModuleQuizResponse,
  submitModuleQuizResponse,
  type Quiz,
  type QuizQuestion,
  type StudentQuizResponse,
  type StudentQuizAnswer,
} from '../lib/adminApi'
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Send, ChevronDown } from 'lucide-react'
import bannerImg from '../assets/banner.png'

interface QuizTakeScreenProps {
  /** The module_quiz attachment id (NOT the quiz template id) */
  moduleQuizId: string
  /** The underlying quiz template id — used to load questions */
  quizId: string
  user: User
  onClose: () => void
  moduleTitle?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if the question type can be auto-graded by the backend. */
function isAutoGraded(type: string) {
  return (
    type === 'multiple_choice' ||
    type === 'true_false' ||
    type === 'checklist' ||
    type === 'complete_sentence' ||
    type === 'matching' ||
    type === 'ordering'
  )
}

/** Derive the correct label for a question's correct answer, for display. */
function getCorrectLabel(q: QuizQuestion): string | null {
  const cfg = q.config || {}
  if (q.type === 'multiple_choice') {
    const correctId = cfg.correct_option_id
    if (correctId === undefined || correctId === null) return null
    const options: { id: string; label: string }[] = cfg.options || []
    const found = options.find((o) => String(o.id) === String(correctId))
    return found ? found.label : String(correctId)
  }
  if (q.type === 'true_false') {
    if (cfg.correct_answer === undefined || cfg.correct_answer === null) return null
    return cfg.correct_answer === 'true' ? 'Verdadero' : 'Falso'
  }
  if (q.type === 'checklist') {
    const correctIds: string[] = (cfg.correct_ids || []).map(String)
    const options: { id: string; label: string }[] = (cfg.options || []).map((o: any, i: number) =>
      typeof o === 'string' ? { id: String(i), label: o } : { id: String(o.id ?? i), label: o.label ?? o }
    )
    const matches = options.filter((o) => correctIds.includes(String(o.id))).map((o) => o.label)
    return matches.length > 0 ? matches.join(', ') : null
  }
  if (q.type === 'complete_sentence') {
    return cfg.correct_option ? String(cfg.correct_option) : null
  }
  if (q.type === 'matching') {
    const pairs: { id: string; left: string; right: string }[] = cfg.pairs || []
    return pairs.map((p) => `${p.left} ➔ ${p.right}`).join(' | ')
  }
  if (q.type === 'ordering') {
    const items: { id: string; text: string }[] = cfg.items || []
    return items.map((it, idx) => `${idx + 1}. ${it.text}`).join(' → ')
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const QuizTakeScreen: React.FC<QuizTakeScreenProps> = ({
  moduleQuizId,
  quizId,
  user,
  onClose,
  moduleTitle,
}) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [existingResponse, setExistingResponse] = useState<StudentQuizResponse | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submittedResult, setSubmittedResult] = useState<StudentQuizResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [missingIds, setMissingIds] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const shouldReduceMotion = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // ── Particle canvas (same twinkling-star + shooting-star effect) ──────────
  useEffect(() => {
    if (loading || shouldReduceMotion) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let scrollY = 0
    const container = containerRef.current
    const onScroll = () => { if (container) scrollY = container.scrollTop }
    if (container) container.addEventListener('scroll', onScroll, { passive: true })

    interface Star {
      x: number; y: number; r: number
      baseAlpha: number; alpha: number
      speed: number; phase: number
      layer: number; color: string
    }
    interface Shooter {
      x: number; y: number
      vx: number; vy: number
      len: number; alpha: number
      life: number; maxLife: number
    }

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const colors = [
      '56, 189, 248',   // sky blue
      '99, 102, 241',   // indigo
      '244, 114, 182',  // pink
      '255, 255, 255',  // white
    ]

    const NUM_STARS = 280
    const stars: Star[] = Array.from({ length: NUM_STARS }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.8 + 0.5,
      baseAlpha: Math.random() * 0.65 + 0.35,
      alpha: 0,
      speed: Math.random() * 0.8 + 0.2,
      phase: Math.random() * Math.PI * 2,
      layer: Math.ceil(Math.random() * 3),
      color: colors[Math.floor(Math.random() * colors.length)],
    }))

    const shooters: Shooter[] = []
    let shooterTimer = 0
    const spawnShooter = () => {
      const angle = (Math.random() * Math.PI) / 6 + Math.PI / 8
      const speed = Math.random() * 7 + 6
      shooters.push({
        x: Math.random() * window.innerWidth * 0.8,
        y: Math.random() * window.innerHeight * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        len: Math.random() * 100 + 80,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 35 + 25,
      })
    }

    let frame = 0
    const draw = () => {
      animId = requestAnimationFrame(draw)
      frame++
      ctx.fillStyle = '#080c18'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const parallax = [0, scrollY * 0.12, scrollY * 0.28, scrollY * 0.50]
      for (const s of stars) {
        const yOff = parallax[s.layer] % canvas.height
        const dy = (s.y - yOff + canvas.height) % canvas.height
        s.alpha = s.baseAlpha * (0.5 + 0.5 * Math.sin(frame * s.speed * 0.05 + s.phase))
        ctx.beginPath()
        ctx.arc(s.x, dy, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${s.color}, ${s.alpha.toFixed(3)})`
        ctx.shadowBlur = s.r > 1.2 ? 6 : 0
        ctx.shadowColor = `rgba(${s.color}, 0.8)`
        ctx.fill()
      }
      ctx.shadowBlur = 0

      shooterTimer++
      if (shooterTimer >= 140) { shooterTimer = 0; spawnShooter() }
      for (let i = shooters.length - 1; i >= 0; i--) {
        const sh = shooters[i]
        sh.life++
        sh.alpha = 1 - sh.life / sh.maxLife
        if (sh.alpha <= 0) { shooters.splice(i, 1); continue }
        const tailX = sh.x - sh.vx * (sh.len / 10)
        const tailY = sh.y - sh.vy * (sh.len / 10)
        const grad = ctx.createLinearGradient(tailX, tailY, sh.x, sh.y)
        grad.addColorStop(0, `rgba(56, 189, 248, 0)`)
        grad.addColorStop(0.6, `rgba(99, 102, 241, ${(sh.alpha * 0.6).toFixed(3)})`)
        grad.addColorStop(1, `rgba(255, 255, 255, ${sh.alpha.toFixed(3)})`)
        ctx.beginPath()
        ctx.moveTo(tailX, tailY)
        ctx.lineTo(sh.x, sh.y)
        ctx.strokeStyle = grad
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(sh.x, sh.y, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${sh.alpha.toFixed(3)})`
        ctx.shadowBlur = 10
        ctx.shadowColor = '#38bdf8'
        ctx.fill()
        ctx.shadowBlur = 0
        sh.x += sh.vx
        sh.y += sh.vy
      }
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      if (container) container.removeEventListener('scroll', onScroll)
    }
  }, [loading, shouldReduceMotion])

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadData()
  }, [moduleQuizId, quizId, user.id])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [quizData, responseData] = await Promise.all([
        getQuiz(quizId),
        getModuleQuizResponse(moduleQuizId, user.id).catch(() => null),
      ])
      setQuiz(quizData)
      setExistingResponse(responseData)

      // Pre-populate answers from existing response
      if (responseData?.student_quiz_answers) {
        const init: Record<string, string> = {}
        responseData.student_quiz_answers.forEach((a: StudentQuizAnswer, idx: number) => {
          const key = a.question_id || a.question_snapshot?.id || a.id || `ans-idx-${idx}`
          init[key] = a.answer
        })
        setAnswers(init)
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar el cuestionario')
    } finally {
      setLoading(false)
    }
  }

  // ── Quiz state ─────────────────────────────────────────────────────────────
  const resultSource = submittedResult ?? existingResponse

  // Build list of questions. If reviewing an answered response, prefer the snapshotted questions
  // from student_quiz_answers so that deleted/edited questions are rendered exactly as answered.
  const questions: QuizQuestion[] = React.useMemo(() => {
    if (resultSource?.student_quiz_answers && resultSource.student_quiz_answers.length > 0) {
      return resultSource.student_quiz_answers
        .map((ans: StudentQuizAnswer, idx: number) => {
          const snap = ans.question_snapshot || (ans as any).quiz_questions
          const liveQ = (quiz?.questions || []).find((q) => q.id && q.id === ans.question_id)
          const targetId = ans.question_id || ans.question_snapshot?.id || ans.id || `ans-idx-${idx}`
          return {
            id: targetId,
            quiz_id: liveQ?.quiz_id || quizId,
            title: snap?.title ?? liveQ?.title ?? '',
            type: snap?.type ?? liveQ?.type ?? 'multiple_choice',
            config: snap?.config ?? liveQ?.config ?? {},
            question_order: snap?.question_order ?? liveQ?.question_order ?? idx,
            required: snap?.required ?? liveQ?.required ?? true,
            created_at: liveQ?.created_at || '',
            updated_at: liveQ?.updated_at || '',
          }
        })
        .sort((a, b) => a.question_order - b.question_order)
    }

    return ((quiz?.questions || []) as QuizQuestion[])
      .slice()
      .sort((a, b) => a.question_order - b.question_order)
  }, [resultSource, quiz, quizId])

  const totalSlides = questions.length + 2
  const finalSlideIndex = totalSlides - 1

  const pendingCount = questions.filter((q) => !isAutoGraded(q.type)).length

  const isQuestionAnswered = (q: QuizQuestion) => {
    const v = answers[q.id]
    if (v === undefined || v === null || v === '') return false
    if (q.type === 'checklist') {
      try {
        let arr: string[] = []
        if (Array.isArray(v)) arr = v
        else if (typeof v === 'string' && v.startsWith('[')) arr = JSON.parse(v)
        else if (typeof v === 'string' && v) arr = v.split(',')
        return Array.isArray(arr) && arr.length > 0
      } catch {
        return false
      }
    }
    if (q.type === 'matching') {
      try {
        const pairs = q.config?.pairs || []
        let map: Record<string, string> = {}
        if (typeof v === 'string' && v.startsWith('{')) map = JSON.parse(v)
        else if (typeof v === 'object' && v !== null) map = v
        return pairs.length > 0 && pairs.every((p: any) => Boolean(map[p.id]))
      } catch {
        return false
      }
    }
    if (q.type === 'ordering') {
      try {
        let arr: string[] = []
        if (Array.isArray(v)) arr = v
        else if (typeof v === 'string' && v.startsWith('[')) arr = JSON.parse(v)
        return Array.isArray(arr) && arr.length === (q.config?.items || []).length
      } catch {
        return false
      }
    }
    return true
  }

  const answeredCount = questions.filter(isQuestionAnswered).length

  // Build per-question correctness map from existing response or just-submitted result
  const answerCorrectness: Record<string, boolean | null> = {}
  if (resultSource?.student_quiz_answers) {
    resultSource.student_quiz_answers.forEach((a: StudentQuizAnswer, idx: number) => {
      const key = a.question_id || a.question_snapshot?.id || a.id || `ans-idx-${idx}`
      answerCorrectness[key] = a.is_correct ?? null
    })
  }

  // ── Scroll helpers ─────────────────────────────────────────────────────────
  const scrollToIndex = useCallback((idx: number) => {
    const el = sectionRefs.current[idx]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

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
  }, [loading, questions.length, submittedResult])

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

  // ── Answer handlers ────────────────────────────────────────────────────────
  const clearMissing = (id: string) =>
    setMissingIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev))

  const handleSelect = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    setValidationError(null)
    clearMissing(questionId)
  }

  const handleChecklistToggle = (questionId: string, optionId: string) => {
    const raw = answers[questionId]
    let current: string[] = []
    try {
      if (Array.isArray(raw)) current = raw.map(String)
      else if (typeof raw === 'string' && raw.startsWith('[')) current = JSON.parse(raw).map(String)
      else if (typeof raw === 'string' && raw) current = raw.split(',').map((s) => s.trim())
    } catch {
      current = []
    }

    const next = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId]

    setAnswers((prev) => ({ ...prev, [questionId]: JSON.stringify(next) }))
    setValidationError(null)
    clearMissing(questionId)
  }

  const handleTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }))
    setValidationError(null)
    clearMissing(questionId)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (submitting || existingResponse || submittedResult) return

    const missing = questions.filter(
      (q) => q.required && !isQuestionAnswered(q)
    )
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

      const payload = questions.map((q) => ({
        question_id: q.id,
        answer: answers[q.id] ?? '',
      }))

      const result = await submitModuleQuizResponse(moduleQuizId, user.id, payload)
      setSubmittedResult(result)

      // Populate answers from the result for review
      if (result.student_quiz_answers) {
        const map: Record<string, string> = {}
        result.student_quiz_answers.forEach((a: StudentQuizAnswer, idx: number) => {
          const key = a.question_id || a.question_snapshot?.id || a.id || `ans-idx-${idx}`
          map[key] = a.answer
        })
        setAnswers(map)
      }

      scrollToIndex(finalSlideIndex)
    } catch (err: any) {
      setError(err.message || 'Error al enviar tus respuestas. Inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Reveal animation props ─────────────────────────────────────────────────
  const revealProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 32 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: false, amount: 0.6 },
        transition: { duration: 0.5, ease: 'easeOut' as const },
      }

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#080c18',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: '4px solid rgba(56, 189, 248, 0.2)',
            borderTopColor: '#38bdf8',
            animation: 'spin 1s linear infinite',
            marginBottom: '1.5rem',
          }}
        />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
          Cargando Cuestionario...
        </p>
      </div>
    )
  }

  const currentQuestionNumber =
    activeIndex >= 1 && activeIndex <= questions.length ? activeIndex : null
  const isReviewing = !!(existingResponse || submittedResult)

  // ── Score calculation for display ─────────────────────────────────────────
  const displayResult = submittedResult ?? existingResponse
  const score = displayResult?.score
  const maxScore = displayResult?.max_score

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Starfield canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 9999,
          backgroundColor: '#080c18',
        }}
        aria-hidden="true"
      />

      {/* Scroll container */}
      <div
        ref={containerRef}
        className="qts-scroll"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'transparent',
          color: 'white',
          overflowY: 'auto',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <style>{`
          .qts-scroll {
            scroll-snap-type: y mandatory;
            scrollbar-width: none;
          }
          .qts-scroll::-webkit-scrollbar { display: none; }
          .qts-slide {
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
            .qts-slide { padding: 5rem 1.25rem 6rem 1.25rem; }
            .qts-progress { right: 50% !important; top: auto !important; bottom: 14px !important; transform: translateX(50%) !important; flex-direction: row !important; }
          }
          .qts-option:hover { background: rgba(255,255,255,0.08); }
          .qts-option-correct { background: rgba(34, 197, 94, 0.18) !important; border-color: #22c55e !important; }
          .qts-option-wrong   { background: rgba(239, 68, 68, 0.15) !important; border-color: #ef4444 !important; }
          .qts-option-reveal  { background: rgba(34, 197, 94, 0.08) !important; border-color: rgba(34, 197, 94, 0.5) !important; }
          .qts-textarea:focus { border-color: #38bdf8 !important; }
        `}</style>

        {/* Back button */}
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
            transition: 'background 0.2s ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
        >
          <ArrowLeft size={18} /> Volver
        </button>

        {/* Vertical progress rail */}
        {questions.length > 0 && (
          <div
            className="qts-progress"
            style={{
              position: 'fixed',
              right: '28px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {currentQuestionNumber && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.5)',
                  marginBottom: '4px',
                  letterSpacing: '0.03em',
                }}
              >
                {currentQuestionNumber}/{questions.length}
              </span>
            )}
            {questions.map((q, idx) => {
              const isAnswered = isQuestionAnswered(q)
              const isActive = activeIndex === idx + 1
              const isMissing = missingIds.includes(q.id)
              const correctness = answerCorrectness[q.id]

              const barColor = isMissing
                ? '#ef4444'
                : isReviewing && correctness === true
                ? '#22c55e'
                : isReviewing && correctness === false
                ? '#ef4444'
                : isAnswered
                ? 'linear-gradient(90deg, #38bdf8, #6366f1)'
                : 'rgba(255,255,255,0.18)'

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
                    background: barColor,
                    boxShadow: isActive ? '0 0 10px rgba(56, 189, 248, 0.6)' : 'none',
                    transition: 'all 0.25s ease',
                  }}
                />
              )
            })}
          </div>
        )}

        {/* ── Intro slide ── */}
        <section
          ref={(el) => (sectionRefs.current[0] = el)}
          data-index={0}
          className="qts-slide"
        >
          <motion.div {...revealProps} style={{ maxWidth: '640px', width: '100%' }}>
            <div
              style={{
                background: `linear-gradient(135deg, rgba(8, 24, 56, 0.9) 0%, rgba(8, 12, 24, 0.97) 100%), url(${bannerImg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '24px',
                padding: '2.75rem',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                boxShadow: '0 20px 45px rgba(0,0,0,0.4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.75rem',
                    flexShrink: 0,
                    boxShadow: '0 8px 16px rgba(56, 189, 248, 0.3)',
                  }}
                >
                  📝
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.6)',
                    }}
                  >
                    Cuestionario{moduleTitle ? ` · ${moduleTitle}` : ''}
                  </span>
                </div>
              </div>

              <h1
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: 'white',
                  margin: '0 0 12px 0',
                  lineHeight: 1.2,
                }}
              >
                {resultSource?.quiz_snapshot?.title || quiz?.title || 'Cuestionario'}
              </h1>
              <p
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '1.05rem',
                  lineHeight: '1.6',
                  margin: 0,
                }}
              >
                {resultSource?.quiz_snapshot?.description ?? quiz?.description ??
                  'Responde este cuestionario para poner a prueba tus conocimientos sobre este módulo. Tus respuestas serán calificadas automáticamente.'}
              </p>

              {isReviewing && (
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
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>
                    Ya completaste este cuestionario.
                    {score !== undefined && score !== null && maxScore
                      ? ` Puntuación: ${score}/${maxScore}`
                      : ''}
                    {' '}Desliza para revisar tus respuestas.
                  </span>
                </div>
              )}

              {questions.length === 0 ? (
                <p style={{ marginTop: '1.5rem', color: 'rgba(255,255,255,0.5)' }}>
                  Este cuestionario no tiene preguntas disponibles por el momento.
                </p>
              ) : (
                <button
                  onClick={() => scrollToIndex(1)}
                  style={{
                    marginTop: '2rem',
                    background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
                    color: 'white',
                    border: 'none',
                    padding: '14px 32px',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(56, 189, 248, 0.3)',
                  }}
                >
                  {isReviewing ? 'Ver mis respuestas' : 'Comenzar'}
                </button>
              )}
            </div>

            {!shouldReduceMotion && (
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: '2rem',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                <ChevronDown size={26} />
              </motion.div>
            )}
          </motion.div>
        </section>

        {/* ── Question slides ── */}
        {questions.map((q, idx) => {
          const isAnswered = isQuestionAnswered(q)
          const currentAnswer = answers[q.id]
          const isMissing = missingIds.includes(q.id)
          const questionCorrectness = answerCorrectness[q.id]
          const correctLabel = isReviewing ? getCorrectLabel(q) : null

          // Border color after submission
          const borderColor = isMissing
            ? 'rgba(239, 68, 68, 0.6)'
            : isReviewing && questionCorrectness === true
            ? 'rgba(34, 197, 94, 0.5)'
            : isReviewing && questionCorrectness === false
            ? 'rgba(239, 68, 68, 0.5)'
            : isAnswered
            ? 'rgba(56, 189, 248, 0.4)'
            : 'rgba(255, 255, 255, 0.08)'

          const options: { id: string; label: string }[] = (q.config?.options || []).map(
            (o: any, i: number) =>
              typeof o === 'string' ? { id: String(i), label: o } : { id: String(o.id ?? i), label: o.label ?? o }
          )

          return (
            <section
              key={q.id}
              ref={(el) => (sectionRefs.current[idx + 1] = el)}
              data-index={idx + 1}
              id={`question-${q.id}`}
              className="qts-slide"
            >
              <motion.div {...revealProps} style={{ maxWidth: '640px', width: '100%' }}>
                <div
                  style={{
                    background: '#0f1623',
                    borderRadius: '20px',
                    padding: '2.5rem',
                    border: `1px solid ${borderColor}`,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <span
                          style={{
                            background: isReviewing
                              ? questionCorrectness === true
                                ? '#22c55e'
                                : questionCorrectness === false
                                ? '#ef4444'
                                : 'rgba(255,255,255,0.1)'
                              : isAnswered
                              ? '#38bdf8'
                              : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '20px',
                          }}
                        >
                          Pregunta {idx + 1} de {questions.length}
                        </span>
                        {q.required && (
                          <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                            * Obligatoria
                          </span>
                        )}
                        {isReviewing && (
                          isAutoGraded(q.type) ? (
                            <span
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: questionCorrectness === true ? '#4ade80' : questionCorrectness === false ? '#fca5a5' : 'rgba(255,255,255,0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              {questionCorrectness === true ? (
                                <><CheckCircle2 size={14} /> Correcta</>
                              ) : questionCorrectness === false ? (
                                <><XCircle size={14} /> Incorrecta</>
                              ) : null}
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: '#fbbf24',
                                background: 'rgba(251, 191, 36, 0.15)',
                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              ⏳ Pendiente de revisión
                            </span>
                          )
                        )}
                      </div>
                      <h3
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: 700,
                          color: 'white',
                          margin: 0,
                          lineHeight: '1.4',
                        }}
                      >
                        {q.title}
                      </h3>
                    </div>

                    {isAnswered && !isReviewing && <CheckCircle2 size={26} color="#38bdf8" style={{ flexShrink: 0 }} />}
                    {isReviewing && questionCorrectness === true && <CheckCircle2 size={26} color="#22c55e" style={{ flexShrink: 0 }} />}
                    {isReviewing && questionCorrectness === false && <XCircle size={26} color="#ef4444" style={{ flexShrink: 0 }} />}
                  </div>

                  {q.config?.description && (
                    <p
                      style={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '0.95rem',
                        marginBottom: '1.5rem',
                        lineHeight: '1.5',
                      }}
                    >
                      {q.config.description}
                    </p>
                  )}

                  {isMissing && (
                    <p style={{ color: '#fca5a5', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>
                      Esta pregunta es obligatoria.
                    </p>
                  )}

                  {/* Correct answer reveal (when wrong) */}
                  {isReviewing && questionCorrectness === false && correctLabel !== null && (
                    <div
                      style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        marginBottom: '1.25rem',
                        color: '#4ade80',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <CheckCircle2 size={16} />
                      Respuesta correcta: {correctLabel}
                    </div>
                  )}

                  {/* ── Multiple choice ── */}
                  {q.type === 'multiple_choice' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {options.map((option) => {
                        const isSelected = String(currentAnswer) === String(option.id)
                        const isCorrectOption =
                          String(q.config?.correct_option_id) === String(option.id)
                        const optClassName = isReviewing
                          ? isSelected && isCorrectOption
                            ? 'qts-option qts-option-correct'
                            : isSelected && !isCorrectOption
                            ? 'qts-option qts-option-wrong'
                            : isCorrectOption
                            ? 'qts-option qts-option-reveal'
                            : 'qts-option'
                          : 'qts-option'

                        return (
                          <div
                            key={option.id}
                            className={optClassName}
                            onClick={() =>
                              !isReviewing && handleSelect(q.id, String(option.id))
                            }
                            style={{
                              background: isSelected
                                ? 'rgba(56, 189, 248, 0.15)'
                                : 'rgba(255, 255, 255, 0.04)',
                              border: isSelected
                                ? '2px solid #38bdf8'
                                : '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '14px',
                              padding: '1rem 1.25rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              cursor: isReviewing ? 'default' : 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <div
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                border: isSelected
                                  ? '6px solid #38bdf8'
                                  : '2px solid rgba(255, 255, 255, 0.4)',
                                background: isSelected ? 'white' : 'transparent',
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontSize: '0.95rem',
                                color: isSelected ? 'white' : 'rgba(255,255,255,0.85)',
                                fontWeight: isSelected ? 600 : 400,
                                flex: 1,
                              }}
                            >
                              {option.label}
                            </span>
                            {isReviewing && isCorrectOption && (
                              <CheckCircle2 size={18} color="#4ade80" />
                            )}
                            {isReviewing && isSelected && !isCorrectOption && (
                              <XCircle size={18} color="#f87171" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* ── True / False ── */}
                  {q.type === 'true_false' && (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {['true', 'false'].map((val) => {
                        const isSelected = String(currentAnswer) === val
                        const isCorrectOption =
                          String(q.config?.correct_answer) === val
                        const label = val === 'true' ? 'Verdadero ✓' : 'Falso ✗'

                        const optClassName = isReviewing
                          ? isSelected && isCorrectOption
                            ? 'qts-option qts-option-correct'
                            : isSelected && !isCorrectOption
                            ? 'qts-option qts-option-wrong'
                            : isCorrectOption
                            ? 'qts-option qts-option-reveal'
                            : 'qts-option'
                          : 'qts-option'

                        return (
                          <div
                            key={val}
                            className={optClassName}
                            onClick={() => !isReviewing && handleSelect(q.id, val)}
                            style={{
                              flex: 1,
                              minWidth: '120px',
                              background: isSelected
                                ? 'rgba(56, 189, 248, 0.15)'
                                : 'rgba(255,255,255,0.04)',
                              border: isSelected
                                ? '2px solid #38bdf8'
                                : '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '14px',
                              padding: '1.25rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '10px',
                              cursor: isReviewing ? 'default' : 'pointer',
                              transition: 'all 0.2s ease',
                              fontWeight: isSelected ? 700 : 500,
                              fontSize: '1.05rem',
                              color: isSelected ? 'white' : 'rgba(255,255,255,0.8)',
                            }}
                          >
                            {label}
                            {isReviewing && isCorrectOption && <CheckCircle2 size={18} color="#4ade80" />}
                            {isReviewing && isSelected && !isCorrectOption && <XCircle size={18} color="#f87171" />}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* ── Checklist ── */}
                  {q.type === 'checklist' && (() => {
                    let selectedIds: string[] = []
                    try {
                      if (Array.isArray(currentAnswer)) selectedIds = currentAnswer.map(String)
                      else if (typeof currentAnswer === 'string' && currentAnswer.startsWith('[')) selectedIds = JSON.parse(currentAnswer).map(String)
                      else if (typeof currentAnswer === 'string' && currentAnswer) selectedIds = currentAnswer.split(',').map((s) => s.trim())
                    } catch {
                      selectedIds = []
                    }
                    const correctIds: string[] = (q.config?.correct_ids || []).map(String)

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 4px 0' }}>
                          (Puedes seleccionar una o varias opciones)
                        </p>
                        {options.map((option) => {
                          const isSelected = selectedIds.includes(String(option.id))
                          const isCorrectOption = correctIds.includes(String(option.id))
                          const optClassName = isReviewing
                            ? isSelected && isCorrectOption
                              ? 'qts-option qts-option-correct'
                              : isSelected && !isCorrectOption
                              ? 'qts-option qts-option-wrong'
                              : isCorrectOption
                              ? 'qts-option qts-option-reveal'
                              : 'qts-option'
                            : 'qts-option'

                          return (
                            <div
                              key={option.id}
                              className={optClassName}
                              onClick={() => !isReviewing && handleChecklistToggle(q.id, String(option.id))}
                              style={{
                                background: isSelected
                                  ? 'rgba(56, 189, 248, 0.15)'
                                  : 'rgba(255, 255, 255, 0.04)',
                                border: isSelected
                                  ? '2px solid #38bdf8'
                                  : '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '14px',
                                padding: '1rem 1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                cursor: isReviewing ? 'default' : 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <div
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '6px',
                                  border: isSelected ? '2px solid #38bdf8' : '2px solid rgba(255, 255, 255, 0.4)',
                                  background: isSelected ? '#38bdf8' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  flexShrink: 0,
                                }}
                              >
                                {isSelected && '✓'}
                              </div>
                              <span
                                style={{
                                  fontSize: '0.95rem',
                                  color: isSelected ? 'white' : 'rgba(255,255,255,0.85)',
                                  fontWeight: isSelected ? 600 : 400,
                                  flex: 1,
                                }}
                              >
                                {option.label}
                              </span>
                              {isReviewing && isCorrectOption && <CheckCircle2 size={18} color="#4ade80" />}
                              {isReviewing && isSelected && !isCorrectOption && <XCircle size={18} color="#f87171" />}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}

                  {/* ── Complete Sentence ── */}
                  {q.type === 'complete_sentence' && (() => {
                    const sentenceTemplate = q.config?.sentence_template || '___'
                    const correctOption = q.config?.correct_option || ''
                    const sentenceOptions: string[] = (q.config?.options || []).map((o: any) =>
                      typeof o === 'string' ? o : o.label ?? String(o)
                    )
                    const parts = sentenceTemplate.split('___')

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Sentence display */}
                        <div
                          style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            fontSize: '1.15rem',
                            lineHeight: '1.7',
                            color: 'rgba(255, 255, 255, 0.9)',
                          }}
                        >
                          {parts.map((part: string, pIdx: number) => (
                            <React.Fragment key={pIdx}>
                              {part}
                              {pIdx < parts.length - 1 && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    minWidth: '90px',
                                    padding: '2px 12px',
                                    margin: '0 4px',
                                    borderBottom: '2px solid #38bdf8',
                                    background: currentAnswer ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '6px',
                                    color: currentAnswer ? '#38bdf8' : 'rgba(255, 255, 255, 0.4)',
                                    fontWeight: 700,
                                    textAlign: 'center',
                                  }}
                                >
                                  {currentAnswer || '_____'}
                                </span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>

                        {/* Options pills */}
                        {sentenceOptions.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {sentenceOptions.map((opt, oIdx) => {
                              const isSelected = String(currentAnswer).trim().toLowerCase() === String(opt).trim().toLowerCase()
                              const isCorrectOption = String(correctOption).trim().toLowerCase() === String(opt).trim().toLowerCase()

                              const optClassName = isReviewing
                                ? isSelected && isCorrectOption
                                  ? 'qts-option qts-option-correct'
                                  : isSelected && !isCorrectOption
                                  ? 'qts-option qts-option-wrong'
                                  : isCorrectOption
                                  ? 'qts-option qts-option-reveal'
                                  : 'qts-option'
                                : 'qts-option'

                              return (
                                <div
                                  key={oIdx}
                                  className={optClassName}
                                  onClick={() => !isReviewing && handleSelect(q.id, opt)}
                                  style={{
                                    background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                    border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '12px',
                                    padding: '0.75rem 1.25rem',
                                    cursor: isReviewing ? 'default' : 'pointer',
                                    fontWeight: isSelected ? 700 : 500,
                                    color: isSelected ? 'white' : 'rgba(255,255,255,0.85)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  <span>{opt}</span>
                                  {isReviewing && isCorrectOption && <CheckCircle2 size={16} color="#4ade80" />}
                                  {isReviewing && isSelected && !isCorrectOption && <XCircle size={16} color="#f87171" />}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* ── Matching (Connect concepts) ── */}
                  {q.type === 'matching' && (() => {
                    const pairs: Array<{ id: string; left: string; right: string }> = q.config?.pairs || []
                    let userMap: Record<string, string> = {}
                    try {
                      if (typeof currentAnswer === 'string' && currentAnswer.startsWith('{')) userMap = JSON.parse(currentAnswer)
                      else if (typeof currentAnswer === 'object' && currentAnswer !== null) userMap = currentAnswer
                    } catch {
                      userMap = {}
                    }

                    const rightOptions = pairs.map((p) => p.right).sort((a, b) => a.localeCompare(b))

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                          Conecta cada concepto de la izquierda con su correspondiente definición a la derecha:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {pairs.map((p) => {
                            const selectedRight = userMap[p.id] || ''
                            const isCorrectPair = selectedRight === p.right
                            return (
                              <div
                                key={p.id}
                                style={{
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  border: isReviewing
                                    ? isCorrectPair
                                      ? '1px solid rgba(34, 197, 94, 0.6)'
                                      : '1px solid rgba(239, 68, 68, 0.6)'
                                    : selectedRight
                                    ? '1px solid rgba(56, 189, 248, 0.5)'
                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                  borderRadius: '14px',
                                  padding: '1rem 1.25rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.75rem',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 600, color: '#38bdf8', fontSize: '1rem' }}>
                                    {p.left}
                                  </span>
                                  {isReviewing && (
                                    isCorrectPair ? <CheckCircle2 size={18} color="#4ade80" /> : <XCircle size={18} color="#f87171" />
                                  )}
                                </div>
                                <div>
                                  <select
                                    disabled={isReviewing}
                                    value={selectedRight}
                                    onChange={(e) => {
                                      const nextMap = { ...userMap, [p.id]: e.target.value }
                                      handleTextChange(q.id, JSON.stringify(nextMap))
                                    }}
                                    style={{
                                      width: '100%',
                                      background: '#131b2e',
                                      border: '1px solid rgba(255,255,255,0.2)',
                                      borderRadius: '8px',
                                      padding: '0.6rem 0.8rem',
                                      color: 'white',
                                      fontSize: '0.9rem',
                                      outline: 'none',
                                      cursor: isReviewing ? 'default' : 'pointer',
                                    }}
                                  >
                                    <option value="">-- Selecciona el concepto correspondiente --</option>
                                    {rightOptions.map((opt, oIdx) => (
                                      <option key={oIdx} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                {isReviewing && !isCorrectPair && (
                                  <div style={{ fontSize: '0.8rem', color: '#4ade80', marginTop: '2px' }}>
                                    Correcto: {p.right}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}

                  {/* ── Ordering (Rank in order) ── */}
                  {q.type === 'ordering' && (() => {
                    const items: Array<{ id: string; text: string }> = q.config?.items || []
                    let userOrderIds: string[] = []
                    try {
                      if (typeof currentAnswer === 'string' && currentAnswer.startsWith('[')) userOrderIds = JSON.parse(currentAnswer)
                      else if (Array.isArray(currentAnswer)) userOrderIds = currentAnswer
                    } catch {
                      userOrderIds = []
                    }

                    if (userOrderIds.length !== items.length) {
                      userOrderIds = items.map((it) => it.id)
                    }

                    const currentOrderedItems = userOrderIds
                      .map((id) => items.find((it) => it.id === id))
                      .filter(Boolean) as Array<{ id: string; text: string }>

                    const moveItem = (fromIdx: number, toIdx: number) => {
                      if (toIdx < 0 || toIdx >= currentOrderedItems.length) return
                      const next = [...currentOrderedItems]
                      const [moved] = next.splice(fromIdx, 1)
                      next.splice(toIdx, 0, moved)
                      const nextIds = next.map((it) => it.id)
                      handleTextChange(q.id, JSON.stringify(nextIds))
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                          Ordena los siguientes elementos en la secuencia correcta (1 es el primero):
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {currentOrderedItems.map((item, idx) => {
                            const correctItemAtPos = items[idx]
                            const isPosCorrect = correctItemAtPos?.id === item.id

                            return (
                              <div
                                key={item.id}
                                style={{
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  border: isReviewing
                                    ? isPosCorrect
                                      ? '1px solid rgba(34, 197, 94, 0.6)'
                                      : '1px solid rgba(239, 68, 68, 0.6)'
                                    : '1px solid rgba(56, 189, 248, 0.3)',
                                  borderRadius: '12px',
                                  padding: '0.85rem 1rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                }}
                              >
                                <div
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: isReviewing ? (isPosCorrect ? '#22c55e' : '#ef4444') : '#38bdf8',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  {idx + 1}
                                </div>
                                <span style={{ flex: 1, fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)' }}>
                                  {item.text}
                                </span>
                                {!isReviewing && (
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                      disabled={idx === 0}
                                      onClick={() => moveItem(idx, idx - 1)}
                                      style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        border: 'none',
                                        color: 'white',
                                        borderRadius: '6px',
                                        padding: '4px 8px',
                                        cursor: idx === 0 ? 'default' : 'pointer',
                                        opacity: idx === 0 ? 0.3 : 1,
                                      }}
                                    >
                                      ▲
                                    </button>
                                    <button
                                      disabled={idx === currentOrderedItems.length - 1}
                                      onClick={() => moveItem(idx, idx + 1)}
                                      style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        border: 'none',
                                        color: 'white',
                                        borderRadius: '6px',
                                        padding: '4px 8px',
                                        cursor: idx === currentOrderedItems.length - 1 ? 'default' : 'pointer',
                                        opacity: idx === currentOrderedItems.length - 1 ? 0.3 : 1,
                                      }}
                                    >
                                      ▼
                                    </button>
                                  </div>
                                )}
                                {isReviewing && (
                                  isPosCorrect ? <CheckCircle2 size={18} color="#4ade80" /> : <XCircle size={18} color="#f87171" />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}

                  {/* ── Open / text ── */}
                  {q.type === 'open' && (
                    <textarea
                      className="qts-textarea"
                      disabled={isReviewing}
                      value={currentAnswer || ''}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      placeholder="Escribe tu respuesta aquí..."
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
                        fontFamily: 'inherit',
                        opacity: isReviewing ? 0.8 : 1,
                      }}
                    />
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
                    cursor: 'pointer',
                  }}
                >
                  {idx === questions.length - 1 ? 'Continuar' : 'Siguiente pregunta'}
                  <ChevronDown size={16} />
                </button>
              </motion.div>
            </section>
          )
        })}

        {/* ── Final slide ── */}
        <section
          ref={(el) => (sectionRefs.current[finalSlideIndex] = el)}
          data-index={finalSlideIndex}
          className="qts-slide"
        >
          <motion.div {...revealProps} style={{ maxWidth: '640px', width: '100%' }}>
            {/* Just submitted → score reveal */}
            {submittedResult ? (
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(8, 24, 56, 0.8), rgba(8, 12, 24, 0.97))',
                  borderRadius: '24px',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '3.5rem 2rem',
                  textAlign: 'center',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1.5rem',
                }}
              >
                <div
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background:
                      score !== undefined && score !== null && maxScore && score / maxScore >= 0.7
                        ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                        : 'linear-gradient(135deg, #38bdf8, #6366f1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 30px rgba(56, 189, 248, 0.4)',
                  }}
                >
                  <CheckCircle2 size={54} color="white" />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: '2rem',
                      fontWeight: 800,
                      marginBottom: '0.5rem',
                      color: 'white',
                    }}
                  >
                    ¡Cuestionario Enviado!
                  </h2>
                  {score !== undefined && score !== null && maxScore ? (
                    <>
                      <p
                        style={{
                          fontSize: '3rem',
                          fontWeight: 900,
                          color: score / maxScore >= 0.7 ? '#4ade80' : '#fbbf24',
                          margin: '0.5rem 0',
                        }}
                      >
                        {score}/{maxScore}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.05rem', margin: 0 }}>
                        {pendingCount > 0
                          ? `${Math.round((score / maxScore) * 100)}% de respuestas autoevaluadas correctas`
                          : `${Math.round((score / maxScore) * 100)}% de respuestas correctas`}
                      </p>
                      {pendingCount > 0 && (
                        <div
                          style={{
                            marginTop: '1rem',
                            background: 'rgba(251, 191, 36, 0.12)',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            borderRadius: '12px',
                            padding: '10px 16px',
                            color: '#fbbf24',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                          }}
                        >
                          <span>⏳ {pendingCount} {pendingCount === 1 ? 'pregunta pendiente' : 'preguntas pendientes'} de revisión manual por tu profesor</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
                      Tus respuestas han sido registradas. Las preguntas abiertas serán revisadas por tu profesor.
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    onClick={() => scrollToIndex(1)}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.2)',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Revisar respuestas
                  </button>
                  <button
                    onClick={onClose}
                    style={{
                      background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 8px 20px rgba(56, 189, 248, 0.3)',
                    }}
                  >
                    Regresar al Módulo
                  </button>
                </div>
              </div>
            ) : existingResponse ? (
              /* Already answered before opening */
              <div
                style={{
                  background: '#0f1623',
                  borderRadius: '20px',
                  padding: '3rem 2.5rem',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  textAlign: 'center',
                }}
              >
                <CheckCircle2 size={44} color="#4ade80" style={{ marginBottom: '1rem' }} />
                <h2
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    color: 'white',
                    marginBottom: '0.5rem',
                  }}
                >
                  Ya completaste este cuestionario
                </h2>
                {score !== undefined && score !== null && maxScore ? (
                  <p style={{ color: '#4ade80', fontSize: '1.4rem', fontWeight: 800, margin: '0.5rem 0 1rem 0' }}>
                    {score}/{maxScore} puntos autoevaluados
                  </p>
                ) : null}
                {pendingCount > 0 && (
                  <div
                    style={{
                      marginBottom: '1.25rem',
                      background: 'rgba(251, 191, 36, 0.12)',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      borderRadius: '12px',
                      padding: '10px 16px',
                      color: '#fbbf24',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>⏳ {pendingCount} {pendingCount === 1 ? 'pregunta pendiente' : 'preguntas pendientes'} de revisión manual por tu profesor</span>
                  </div>
                )}
                <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1.75rem' }}>
                  Tus respuestas ya fueron registradas. Puedes deslizarte hacia arriba para revisarlas.
                </p>
                <button
                  onClick={onClose}
                  style={{
                    background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
                    color: 'white',
                    border: 'none',
                    padding: '14px 32px',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(56, 189, 248, 0.3)',
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
              /* Ready to submit */
              <div
                style={{
                  background: '#0f1623',
                  borderRadius: '20px',
                  padding: '3rem 2.5rem',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <h2
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    color: 'white',
                    marginBottom: '0.5rem',
                  }}
                >
                  ¿Listo para enviar?
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1.75rem' }}>
                  Respondiste {answeredCount} de {questions.length} preguntas. Revisa tus
                  respuestas desplazándote hacia arriba si necesitas cambiar algo.
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
                      fontWeight: 600,
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
                      gap: '12px',
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
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      background: submitting
                        ? 'rgba(56, 189, 248, 0.5)'
                        : 'linear-gradient(135deg, #38bdf8, #6366f1)',
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
                      boxShadow: '0 8px 20px rgba(56, 189, 248, 0.3)',
                    }}
                  >
                    {submitting ? (
                      'Enviando respuestas...'
                    ) : (
                      <>
                        Enviar Cuestionario <Send size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </section>
      </div>
    </>
  )
}

export default QuizTakeScreen
