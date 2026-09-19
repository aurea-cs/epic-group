import React, { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Lightbulb, Compass, FlaskConical, HelpCircle, CheckCircle2, Send } from 'lucide-react'
import { User } from '@supabase/supabase-js'
import {
  type ThinkBlock,
  type ThinkBlockPrompt,
  type ThinkBlockPromptType,
  saveStudentThinkBlockAnswer,
  getStudentThinkBlockAnswers,
} from '../lib/adminApi'

interface ThinkBlockViewerScreenProps {
  blocks: ThinkBlock[]
  user: User
  onClose: () => void
  moduleTitle?: string
}

const PROMPT_TYPE_CONFIG: Record<
  ThinkBlockPromptType,
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  piensa: {
    label: 'Piensa',
    icon: <Lightbulb size={20} />,
    color: '#c084fc',
    bg: 'rgba(168, 85, 247, 0.15)',
    border: 'rgba(168, 85, 247, 0.35)',
  },
  observa: {
    label: 'Observa',
    icon: <Compass size={20} />,
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.15)',
    border: 'rgba(56, 189, 248, 0.35)',
  },
  experimenta: {
    label: 'Experimenta',
    icon: <FlaskConical size={20} />,
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.15)',
    border: 'rgba(52, 211, 153, 0.35)',
  },
  otro: {
    label: 'Reflexión',
    icon: <HelpCircle size={20} />,
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.15)',
    border: 'rgba(251, 191, 36, 0.35)',
  },
}

const ThinkBlockViewerScreen: React.FC<ThinkBlockViewerScreenProps> = ({
  blocks,
  user,
  onClose,
  moduleTitle,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const shouldReduceMotion = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({})
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({})

  // Initialize and load student answers from my_answer & backend API
  useEffect(() => {
    let isMounted = true

    const loadAnswers = async () => {
      const initial: Record<string, string> = {}
      blocks.forEach((b) => {
        const prompts = Array.isArray(b.prompts)
          ? b.prompts
          : Array.isArray(b.think_block_prompts)
          ? (b.think_block_prompts as ThinkBlockPrompt[])
          : []
        prompts.forEach((p) => {
          if (p.id) {
            initial[p.id] = p.my_answer || ''
          }
        })
      })

      if (isMounted) {
        setAnswers(initial)
      }

      if (user?.id && blocks.length > 0) {
        try {
          const fetchPromises = blocks
            .filter((b) => Boolean(b.id))
            .map((b) => getStudentThinkBlockAnswers(b.id, user.id).catch(() => []))
          const results = await Promise.all(fetchPromises)

          if (!isMounted) return

          const mergedMap: Record<string, string> = { ...initial }
          results.flat().forEach((ans: any) => {
            if (ans?.prompt_id && ans?.answer_md !== undefined && ans?.answer_md !== null) {
              mergedMap[ans.prompt_id] = ans.answer_md
            }
          })
          setAnswers(mergedMap)
        } catch (err) {
          console.error('Error fetching student think block answers:', err)
        }
      }
    }

    loadAnswers()

    return () => {
      isMounted = false
    }
  }, [blocks, user?.id])

  const handleSavePrompt = async (promptId: string) => {
    if (!promptId || !user?.id) return
    const text = answers[promptId] || ''
    try {
      setSavingMap((prev) => ({ ...prev, [promptId]: true }))
      setSavedMap((prev) => ({ ...prev, [promptId]: false }))
      await saveStudentThinkBlockAnswer(promptId, user.id, text)
      setSavedMap((prev) => ({ ...prev, [promptId]: true }))
      setTimeout(() => {
        setSavedMap((prev) => ({ ...prev, [promptId]: false }))
      }, 3000)
    } catch (err: any) {
      console.error('Error al guardar respuesta:', err)
      alert(err.message || 'Error al guardar respuesta')
    } finally {
      setSavingMap((prev) => ({ ...prev, [promptId]: false }))
    }
  }

  // ── Particle background canvas (emerald/teal glowing aura) ──────────
  useEffect(() => {
    if (shouldReduceMotion) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let scrollY = 0
    const container = containerRef.current
    const onScroll = () => { if (container) scrollY = container.scrollTop }
    if (container) container.addEventListener('scroll', onScroll, { passive: true })

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const colors = [
      '52, 211, 153',  // emerald
      '56, 189, 248',  // sky
      '168, 85, 247',  // purple
      '251, 191, 36',  // amber
    ]

    interface Particle {
      x: number; y: number; r: number
      baseAlpha: number; alpha: number
      speed: number; phase: number; color: string
    }

    const NUM_PARTICLES = 160
    const particles: Particle[] = Array.from({ length: NUM_PARTICLES }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2 + 0.6,
      baseAlpha: Math.random() * 0.6 + 0.25,
      alpha: 0,
      speed: Math.random() * 0.7 + 0.2,
      phase: Math.random() * Math.PI * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))

    let frame = 0
    const draw = () => {
      animId = requestAnimationFrame(draw)
      frame++
      ctx.fillStyle = '#091319'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (const p of particles) {
        const dy = (p.y - scrollY * 0.2 + canvas.height) % canvas.height
        p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(frame * p.speed * 0.04 + p.phase))
        ctx.beginPath()
        ctx.arc(p.x, dy, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.color}, ${p.alpha.toFixed(3)})`
        ctx.shadowBlur = p.r > 1.5 ? 8 : 0
        ctx.shadowColor = `rgba(${p.color}, 0.8)`
        ctx.fill()
      }
      ctx.shadowBlur = 0
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      if (container) container.removeEventListener('scroll', onScroll)
    }
  }, [shouldReduceMotion])

  const revealProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: false, amount: 0.3 },
        transition: { duration: 0.45, ease: 'easeOut' as const },
      }

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 9999,
          backgroundColor: '#091319',
        }}
        aria-hidden="true"
      />

      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'transparent',
          color: 'white',
          overflowY: 'auto',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          paddingBottom: '4rem',
        }}
      >
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
          onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
        >
          <ArrowLeft size={18} /> Volver al Módulo
        </button>

        {/* Top Header Banner */}
        <header
          style={{
            padding: '5rem 1.5rem 2.5rem 1.5rem',
            textAlign: 'center',
            maxWidth: '800px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '20px',
              background: 'rgba(52, 211, 153, 0.15)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              color: '#34d399',
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: '1rem',
            }}
          >
            🔬 Piensa, Observa y Experimenta {moduleTitle ? `· ${moduleTitle}` : ''}
          </div>
          <h1
            style={{
              fontSize: '2.4rem',
              fontWeight: 800,
              margin: '0 0 0.75rem 0',
              lineHeight: 1.2,
              background: 'linear-gradient(135deg, #ffffff 0%, #a7f3d0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Laboratorio de Pensamiento Crítico
          </h1>
          <p
            style={{
              fontSize: '1.05rem',
              color: 'rgba(255, 255, 255, 0.75)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Explora estos experimentos y registra tus observaciones y reflexiones en cada actividad.
          </p>
        </header>

        {/* Main Content Feed */}
        <main
          style={{
            maxWidth: '740px',
            margin: '0 auto',
            padding: '0 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2.5rem',
          }}
        >
          {blocks.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              No hay bloques de experimentos disponibles en este momento.
            </div>
          ) : (
            blocks.map((block, index) => {
              const prompts: ThinkBlockPrompt[] = Array.isArray(block.prompts)
                ? block.prompts
                : Array.isArray(block.think_block_prompts)
                ? (block.think_block_prompts as ThinkBlockPrompt[])
                : []

              return (
                <motion.article
                  key={block.id || index}
                  {...revealProps}
                  style={{
                    background: '#0f1d24',
                    borderRadius: '24px',
                    border: '1px solid rgba(52, 211, 153, 0.25)',
                    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Card Banner Image */}
                  {block.image_url ? (
                    <div style={{ width: '100%', height: '220px', overflow: 'hidden', position: 'relative' }}>
                      <img
                        src={block.image_url}
                        alt="Piensa, observa y experimenta"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(to top, #0f1d24 0%, transparent 80%)',
                        }}
                      />
                    </div>
                  ) : null}

                  <div style={{ padding: '2rem' }}>
                    {/* Card Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                      <span
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #34d399, #059669)',
                          color: '#042f2e',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        #{index + 1}
                      </span>
                      <h2
                        style={{
                          fontSize: '1.4rem',
                          fontWeight: 700,
                          color: 'white',
                          margin: 0,
                        }}
                      >
                        Piensa, Observa y Experimenta
                      </h2>
                    </div>

                    {/* Fun Fact / Main MD Content */}
                    {block.fun_fact_md && (
                      <div
                        style={{
                          background: 'rgba(52, 211, 153, 0.08)',
                          border: '1px solid rgba(52, 211, 153, 0.2)',
                          borderRadius: '16px',
                          padding: '1.25rem 1.5rem',
                          marginBottom: prompts.length > 0 ? '1.75rem' : 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#34d399',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          💡 Dato Curioso / Contexto
                        </div>
                        <p
                          style={{
                            fontSize: '1rem',
                            color: 'rgba(255, 255, 255, 0.9)',
                            lineHeight: 1.6,
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {block.fun_fact_md}
                        </p>
                      </div>
                    )}

                    {/* Prompts list */}
                    {prompts.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: 'rgba(255,255,255,0.5)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Actividades ({prompts.length})
                        </div>
                        {prompts.map((prompt, pIdx) => {
                          const typeCfg =
                            PROMPT_TYPE_CONFIG[prompt.prompt_type] || PROMPT_TYPE_CONFIG.otro

                          return (
                            <div
                              key={prompt.id || pIdx}
                              style={{
                                background: typeCfg.bg,
                                border: `1px solid ${typeCfg.border}`,
                                borderRadius: '16px',
                                padding: '1.25rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                              }}
                            >
                              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                                <div
                                  style={{
                                    color: typeCfg.color,
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '12px',
                                    padding: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  {prompt.icon ? (
                                    <span style={{ fontSize: '1.2rem' }}>{prompt.icon}</span>
                                  ) : (
                                    typeCfg.icon
                                  )}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div
                                    style={{
                                      fontSize: '0.8rem',
                                      fontWeight: 800,
                                      color: typeCfg.color,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.04em',
                                      marginBottom: '4px',
                                    }}
                                  >
                                    {prompt.label || typeCfg.label}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '0.98rem',
                                      color: 'rgba(255, 255, 255, 0.92)',
                                      lineHeight: 1.55,
                                      whiteSpace: 'pre-wrap',
                                    }}
                                  >
                                    {prompt.prompt_md}
                                  </div>
                                </div>
                              </div>

                              {/* Student Answer Input */}
                              {prompt.id && (
                                <div
                                  style={{
                                    marginTop: '0.25rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                  }}
                                >
                                  <label
                                    style={{
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                      color: 'rgba(255,255,255,0.6)',
                                    }}
                                  >
                                    Tu respuesta / observaciones:
                                  </label>
                                  <textarea
                                    value={answers[prompt.id] ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.value
                                      setAnswers((prev) => ({ ...prev, [prompt.id!]: val }))
                                    }}
                                    onBlur={() => handleSavePrompt(prompt.id!)}
                                    placeholder="Escribe aquí tu respuesta o conclusiones..."
                                    rows={3}
                                    style={{
                                      width: '100%',
                                      backgroundColor: 'rgba(0, 0, 0, 0.35)',
                                      border: '1px solid rgba(255, 255, 255, 0.12)',
                                      borderRadius: '12px',
                                      padding: '0.85rem 1rem',
                                      color: 'white',
                                      fontSize: '0.95rem',
                                      lineHeight: '1.5',
                                      resize: 'vertical',
                                      outline: 'none',
                                      boxSizing: 'border-box',
                                      fontFamily: 'inherit',
                                    }}
                                  />
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'flex-end',
                                      alignItems: 'center',
                                      gap: '10px',
                                    }}
                                  >
                                    {savedMap[prompt.id] && (
                                      <span
                                        style={{
                                          fontSize: '0.82rem',
                                          color: '#4ade80',
                                          fontWeight: 600,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                        }}
                                      >
                                        <CheckCircle2 size={14} /> Respuesta guardada
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleSavePrompt(prompt.id!)}
                                      disabled={savingMap[prompt.id]}
                                      style={{
                                        background: savingMap[prompt.id]
                                          ? 'rgba(52, 211, 153, 0.4)'
                                          : 'linear-gradient(135deg, #34d399, #059669)',
                                        color: '#042f2e',
                                        border: 'none',
                                        padding: '7px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        cursor: savingMap[prompt.id] ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s ease',
                                      }}
                                    >
                                      {savingMap[prompt.id] ? (
                                        'Guardando...'
                                      ) : (
                                        <>
                                          Enviar respuesta <Send size={14} />
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </motion.article>
              )
            })
          )}
        </main>
      </div>
    </>
  )
}

export default ThinkBlockViewerScreen
