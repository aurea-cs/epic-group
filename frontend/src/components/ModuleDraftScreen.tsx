import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { useTranslation } from 'react-i18next'
import { useDynamicTranslation } from '../hooks/useDynamicTranslation'
import {
  getCourseModules,
  getModuleVrCode,
  getModuleExitTickets,
  getModuleQuizzes,
  getModuleThinkBlocks,
  CourseModule,
  ModuleItem,
  VrCodeEntry,
  ExitTicketTemplate,
  ModuleQuizAttachment,
  ThinkBlock
} from '../lib/adminApi'
import { getUserRole } from '../utils/getUserRole'
import { Book, Gamepad2, FileText, ArrowRight, Folder, Play, Ticket, Globe } from 'lucide-react'
import { markItemAsRead } from '../lib/api'
import ExitTicketTakeScreen from './ExitTicketTakeScreen'
import QuizTakeScreen from './QuizTakeScreen'
import ThinkBlockViewerScreen from './ThinkBlockViewerScreen'
import { ChatbotTutor } from './ChatbotTutor'
import bannerImg from '../assets/banner.png'

import ciberImg from '../assets/ciber.png'
import dentrodespaceshipImg from '../assets/dentrodespaceship.png'
import './ModuleDraftScreen.css'

interface ModuleDraftScreenProps {
  user: User
}

const ContentCard = ({ item, index, onViewPdf, userId }: { item: ModuleItem, index: number, onViewPdf: (url: string, itemId: string, isEditable: boolean) => void, userId: string }) => {
  const { t } = useTranslation()
  const { text: translatedTitle } = useDynamicTranslation(item.title)
  const { text: translatedDescription } = useDynamicTranslation(item.description || t('moduleDraft.defaultContentDescription'))

  return (
    <div 
      className="hoverable-card"
      onClick={() => {
        if (!item.content_url) {
          alert(t('moduleDraft.noUrlAlert'))
          return
        }
        const readItems = JSON.parse(localStorage.getItem('readItems') || '{}')
        readItems[item.id] = true
        localStorage.setItem('readItems', JSON.stringify(readItems))
        
        markItemAsRead(userId, item.id).catch(console.error)
        
        if (item.type === 'pdf') {
          onViewPdf(item.content_url, item.id, !!item.is_editable)
        } else {
          window.open(item.content_url, '_blank', 'noopener,noreferrer')
        }
      }}
      style={{
        backgroundColor: '#25164E',
        borderRadius: '16px',
        padding: '24px',
        width: '320px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <img
          src={item.image_url || ciberImg}
          alt={translatedTitle}
          style={{
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '6px solid #432E7E'
          }}
        />
      </div>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>
          {translatedTitle}
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
          {translatedDescription}
        </p>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <button
          style={{
            width: '100%',
            backgroundColor: 'white',
            color: '#25164E',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
        >
          {t('moduleDraft.notebookTopic', { index: index + 1 })} <FileText size={16} />
        </button>
      </div>
    </div>
  )
}

const VrCard = ({ vrEntry }: { vrEntry: VrCodeEntry }) => {
  const { t } = useTranslation()
  const { text: translatedTitle } = useDynamicTranslation(vrEntry.title || "Sala VR")
  const { text: translatedDescription } = useDynamicTranslation(vrEntry.description || t('moduleDraft.defaultVrDescription'))
  const vrUrl = vrEntry.code

  return (
    <div 
      className="hoverable-card"
      onClick={() => window.open(vrUrl, '_blank', 'noopener,noreferrer')}
      style={{
        backgroundColor: '#25164E',
        borderRadius: '16px',
        padding: '0',
        width: '320px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
      <img
        src={vrEntry.image_url || dentrodespaceshipImg}
        alt="VR Room"
        style={{ width: '100%', height: '200px', objectFit: 'cover' }}
      />
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>
            {translatedTitle}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
            {translatedDescription}
          </p>
          <div style={{
            marginTop: '10px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {t('moduleDraft.vrPlatform')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
          <button
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              color: 'white',
              border: '1px solid white',
              padding: '10px',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = '#25164E';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'white';
            }}
          >
            {t('moduleDraft.enter')} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

const ResourceCard = ({ item, onViewPdf }: { item: ModuleItem, index: number, onViewPdf: (url: string, itemId: string, isEditable: boolean) => void }) => {
  const { t } = useTranslation()
  const { text: translatedTitle } = useDynamicTranslation(item.title)
  const { text: translatedDescription } = useDynamicTranslation(item.description || t('moduleDraft.defaultResourceDescription'))

  const handleClick = () => {
    if (item.content_url) {
      if (item.type === 'video') { window.open(item.content_url, '_blank') }
      else {
        onViewPdf(item.content_url!, item.id, !!item.is_editable)
      }
    }
  }

  return (
    <div 
      className="hoverable-card"
      onClick={handleClick}
      style={{
        backgroundColor: '#25164E',
        borderRadius: '16px',
        padding: '24px',
        width: '320px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <img
          src={item.image_url || ciberImg}
          alt={translatedTitle}
          style={{
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '6px solid #1E40AF'
          }}
        />
      </div>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>
          {translatedTitle}
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
          {translatedDescription}
        </p>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {item.content_url && (
          <button
            style={{
              width: '100%',
              backgroundColor: 'white',
              color: '#25164E',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            {item.type === 'video' ? (
              <>{t('moduleDraft.viewVideo')} <Play size={16} fill="currentColor" /></>
            ) : (
              <>{t('moduleDraft.viewResource')} </>
            )}
          </button>
        )}
        {!item.content_url && (
          <button
            disabled
            style={{
              width: '100%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.5)',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 'bold',
              cursor: 'not-allowed',
            }}
          >
            {t('moduleDraft.noUrlConfigured')}
          </button>
        )}
      </div>
    </div>
  )
}

const ExitTicketCard = ({ ticket, onView }: { ticket: ExitTicketTemplate, onView: (id: string) => void }) => {
  const { t } = useTranslation()
  const { text: translatedTitle } = useDynamicTranslation(ticket.title)
  const { text: translatedDescription } = useDynamicTranslation(ticket.description || t('moduleDraft.defaultExitTicketDescription'))

  const questionCount =
    ticket.questions?.length ??
    ticket.exit_ticket_questions?.[0]?.count ??
    0

  return (
    <div 
      className="hoverable-card"
      onClick={() => onView(ticket.id)}
      style={{
        backgroundColor: '#25164E',
        borderRadius: '16px',
        padding: '24px',
        width: '320px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #a855f7 0%, #6c5ce7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '6px solid #432E7E',
          fontSize: '4.5rem',
          boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
        }}>
          🎟️
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>
          {translatedTitle}
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
          {translatedDescription}
        </p>
        <div style={{
          marginTop: '10px',
          backgroundColor: 'rgba(168,85,247,0.15)',
          borderRadius: '8px',
          padding: '6px 12px',
          color: '#c084fc',
          fontSize: '0.82rem',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          ● {questionCount > 0 ? `${questionCount} ${questionCount === 1 ? t('moduleDraft.questionSingle') : t('moduleDraft.questionPlural')}` : t('moduleDraft.exitTicket')}
        </div>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <button
          style={{
            width: '100%',
            backgroundColor: '#c084fc',
            color: '#1a1625',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#d8b4fe'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#c084fc'}
        >
          {t('moduleDraft.viewExitTicket')} <FileText size={16} />
        </button>
      </div>
    </div>
  )
}

const QuizCard = ({ attachment, onOpen }: { attachment: ModuleQuizAttachment; onOpen: (attachment: ModuleQuizAttachment) => void }) => {
  const { t } = useTranslation()
  const quiz = attachment.quizzes
  const { text: translatedTitle } = useDynamicTranslation(quiz?.title || t('moduleDraft.quiz'))
  const { text: translatedDescription } = useDynamicTranslation(quiz?.description || t('moduleDraft.defaultQuizDescription'))

  if (!quiz) return null

  const questionCount =
    quiz.questions?.length ??
    (quiz.quiz_questions && quiz.quiz_questions[0] ? quiz.quiz_questions[0].count : 0)

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    onOpen(attachment)
  }

  return (
    <div 
      className="hoverable-card"
      onClick={handleOpen}
      style={{
        backgroundColor: '#25164E',
        borderRadius: '16px',
        padding: '24px',
        width: '320px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #38bdf8 0%, #1e40af 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '6px solid #432E7E',
          fontSize: '4.5rem',
          boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
        }}>
          📝
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>
          {translatedTitle}
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
          {translatedDescription}
        </p>
        <div style={{
          marginTop: '10px',
          backgroundColor: 'rgba(56,189,248,0.15)',
          borderRadius: '8px',
          padding: '6px 12px',
          color: '#38bdf8',
          fontSize: '0.82rem',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          ● {questionCount > 0 ? `${questionCount} ${questionCount === 1 ? t('moduleDraft.questionSingle') : t('moduleDraft.questionPlural')}` : t('moduleDraft.quiz')}
        </div>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <button
          onClick={handleOpen}
          style={{
            width: '100%',
            backgroundColor: '#38bdf8',
            color: '#0f172a',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7dd3fc'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#38bdf8'}
        >
          {t('moduleDraft.viewQuiz')} <FileText size={16} />
        </button>
      </div>
    </div>
  )
}

const ThinkBlockCard = ({ blocks, onOpen }: { blocks: ThinkBlock[]; onOpen: () => void }) => {
  const { t } = useTranslation()
  const firstBlock = blocks[0]

  const cleanDescription = firstBlock?.fun_fact_md 
    ? firstBlock.fun_fact_md.replace(/[#*`_]/g, '').trim()
    : t('moduleDraft.thinkObserveExperimentDesc')

  const { text: translatedDescription } = useDynamicTranslation(cleanDescription)

  if (!firstBlock) return null

  const totalPrompts = blocks.reduce((acc, block) => {
    const pCount = Array.isArray(block.prompts) 
      ? block.prompts.length 
      : (Array.isArray(block.think_block_prompts) && block.think_block_prompts.length > 0
          ? (typeof block.think_block_prompts[0] === 'object' && 'count' in block.think_block_prompts[0]
              ? (block.think_block_prompts[0] as { count: number }).count
              : block.think_block_prompts.length)
          : 0)
    return acc + pCount
  }, 0)

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    onOpen()
  }

  return (
    <div 
      className="hoverable-card"
      onClick={handleOpen}
      style={{
        backgroundColor: '#25164E',
        borderRadius: '16px',
        padding: '24px',
        width: '320px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {firstBlock.image_url ? (
          <img
            src={firstBlock.image_url}
            alt={t('moduleDraft.thinkObserveExperimentTitle')}
            style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '6px solid #432E7E',
              boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
            }}
          />
        ) : (
          <div style={{
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '6px solid #432E7E',
            fontSize: '4.5rem',
            boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
          }}>
            🔬
          </div>
        )}
      </div>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>
          {t('moduleDraft.thinkObserveExperimentTitle')}
        </h3>
        <p style={{
          fontSize: '0.875rem',
          color: 'rgba(255,255,255,0.7)',
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {translatedDescription || cleanDescription}
        </p>
        <div style={{
          marginTop: '10px',
          backgroundColor: 'rgba(52,211,153,0.15)',
          borderRadius: '8px',
          padding: '6px 12px',
          color: '#34d399',
          fontSize: '0.82rem',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          ● {blocks.length} {blocks.length === 1 ? t('moduleDraft.experimentSingle') : t('moduleDraft.experimentPlural')}{totalPrompts > 0 ? ` (${totalPrompts} ${t('moduleDraft.activities')})` : ''}
        </div>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <button
          onClick={handleOpen}
          style={{
            width: '100%',
            backgroundColor: '#34d399',
            color: '#064e3b',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#6ee7b7'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#34d399'}
        >
          {t('moduleDraft.viewExperiments')} <FileText size={16} />
        </button>
      </div>
    </div>
  )
}

const ModuleDraftScreen: React.FC<ModuleDraftScreenProps> = ({ user }) => {
  const { t, i18n } = useTranslation()
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>()
  const navigate = useNavigate()
  const [moduleData, setModuleData] = useState<CourseModule | null>(null)
  const [vrEntries, setVrEntries] = useState<VrCodeEntry[]>([])
  const [exitTickets, setExitTickets] = useState<ExitTicketTemplate[]>([])
  const [moduleQuizzes, setModuleQuizzes] = useState<ModuleQuizAttachment[]>([])
  const [thinkBlocks, setThinkBlocks] = useState<ThinkBlock[]>([])
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [selectedQuizAttachment, setSelectedQuizAttachment] = useState<ModuleQuizAttachment | null>(null)
  const [showThinkBlocks, setShowThinkBlocks] = useState(false)
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)

  const { text: translatedModuleTitle } = useDynamicTranslation(moduleData?.title)

  const userRole = getUserRole(user)

  const toggleLanguage = () => {
    const current = i18n.language || 'es'
    const next = current.startsWith('es') ? 'en' : 'es'
    i18n.changeLanguage(next)

    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement
    if (select) {
      select.value = next
      select.dispatchEvent(new Event('change'))
    }
  }

  const handleViewPdf = (url: string, itemId: string, isEditable: boolean) => {
    navigate(
      `/course/${courseId}/module/${moduleId}/pdf?url=${encodeURIComponent(url)}&itemId=${itemId}&editable=${isEditable ? 'true' : 'false'}`
    )
  }

  useEffect(() => {
    if (courseId && moduleId) {
      loadData()
    }
  }, [courseId, moduleId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [modules, vr, tickets, quizzes, thinking] = await Promise.all([
        getCourseModules(courseId!),
        getModuleVrCode(moduleId!),
        getModuleExitTickets(moduleId!).catch(() => []),
        getModuleQuizzes(moduleId!).catch(() => []),
        getModuleThinkBlocks(moduleId!, user?.id).catch(() => [])
      ])

      const targetModule = modules.find(m => m.id === moduleId)
      if (!targetModule) {
        throw new Error('Módulo no encontrado')
      }

      setModuleData(targetModule)
      setVrEntries(vr)
      setExitTickets(tickets)
      setModuleQuizzes(quizzes)
      setThinkBlocks(thinking)
    } catch (err: any) {
      setError(err.message || 'Error al cargar los ítems del módulo')
    } finally {
      setLoading(false)
    }
  }

  // Filter contenidos: items with show_student === true, sorted by order_index
  const contenidos = (moduleData?.items || [])
    .filter(item => item.show_student === true)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

  // Filter recursos: items with show_teacher === true, sorted by order_index
  const recursos = (moduleData?.items || [])
    .filter(item => item.show_teacher === true)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

  // VR Entries sorted by order_index
  const sortedVrEntries = vrEntries
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#7334EF' }}>
        <p style={{ color: 'white', fontSize: '1.2rem' }}>{t('moduleDraft.loading')}</p>
      </div>
    )
  }

  return (
    <div className="module-draft-container">
      <div className="module-draft-inner">
        {/* Lado Izquierdo */}
        <div
          className="module-draft-left-panel"
          style={{ backgroundImage: `url(${bannerImg})` }}
        />

        {/* Lado Derecho */}
        <div className="module-draft-right-panel">
          <div className="module-draft-header-actions">
            <button
              onClick={toggleLanguage}
              className="module-draft-translate-btn"
              title={i18n.language.startsWith('es') ? t('moduleDraft.translateToEnglish') : t('moduleDraft.translateToSpanish')}
            >
              <Globe size={18} />
              <span>{i18n.language.startsWith('es') ? 'EN' : 'ES'}</span>
            </button>

            <button
              onClick={() => navigate(-1)}
              className="module-draft-back-button"
            >
              {t('moduleDraft.back')}
            </button>
          </div>

          <h1 className="module-draft-title">
            {moduleData?.title ? `${t('moduleDraft.modulePrefix')} - ${translatedModuleTitle || moduleData.title}` : t('moduleDraft.defaultTitle')}
          </h1>

          <p style={{ color: 'white', fontSize: '1rem', lineHeight: '1.6', opacity: 0.9, marginBottom: '3rem', maxWidth: '1000px' }}>
            {t('moduleDraft.introDescription')}
          </p>

          {/* Contenidos Section */}
          <div style={{ marginBottom: '4rem' }}>
            <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
              <Book size={24} color="#FCEE50" /> {t('moduleDraft.contents')}
            </h2>
            <div style={{
              display: 'flex',
              gap: '24px',
              overflowX: 'auto',
              paddingTop: '12px',
              paddingBottom: '2rem',
              paddingLeft: '8px',
              paddingRight: '8px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.3) transparent'
            }}>
              {contenidos.length > 0 ? (
                contenidos.map((item, idx) => (
                  <ContentCard key={item.id} item={item} index={idx} onViewPdf={handleViewPdf} userId={user.id} />
                ))
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                  {t('moduleDraft.noContents')}
                </p>
              )}
            </div>
          </div>

          {/* Recursos Section */}
          {userRole !== 'student' && (
            <div style={{ marginBottom: '4rem' }}>
              <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                <Folder size={24} color="#FCEE50" /> {t('moduleDraft.resources')}
              </h2>
              <div style={{
                display: 'flex',
                gap: '24px',
                overflowX: 'auto',
                paddingTop: '12px',
                paddingBottom: '2rem',
                paddingLeft: '8px',
                paddingRight: '8px',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.3) transparent'
              }}>
                {recursos.length > 0 ? (
                  recursos.map((item, idx) => (
                    <ResourceCard key={item.id} item={item} index={idx} onViewPdf={handleViewPdf} />
                  ))
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                    {t('moduleDraft.noResources')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Ticket de Salida, Quizzes & Think Blocks Section */}
          {(exitTickets.length > 0 || moduleQuizzes.length > 0 || thinkBlocks.length > 0) && (
            <div style={{ marginBottom: '4rem' }}>
              <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                <Ticket size={24} color="#FCEE50" /> {t('moduleDraft.evaluations')}
              </h2>
              <div style={{
                display: 'flex',
                gap: '24px',
                overflowX: 'auto',
                paddingTop: '12px',
                paddingBottom: '2rem',
                paddingLeft: '8px',
                paddingRight: '8px',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.3) transparent'
              }}>
                {exitTickets.map((ticket) => (
                  <ExitTicketCard key={ticket.id} ticket={ticket} onView={setSelectedTicketId} />
                ))}
                {moduleQuizzes.map((attachment) => (
                  <QuizCard key={attachment.id} attachment={attachment} onOpen={setSelectedQuizAttachment} />
                ))}
                {thinkBlocks.length > 0 && (
                  <ThinkBlockCard blocks={thinkBlocks} onOpen={() => setShowThinkBlocks(true)} />
                )}
              </div>
            </div>
          )}

          {/* Salas VR Section */}
          <div>
            <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
              <Gamepad2 size={24} color="#FCEE50" /> {t('moduleDraft.vrRooms')}
            </h2>
            <div style={{
              display: 'flex',
              gap: '24px',
              overflowX: 'auto',
              paddingTop: '12px',
              paddingBottom: '2rem',
              paddingLeft: '8px',
              paddingRight: '8px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.3) transparent'
            }}>
              {sortedVrEntries.map((entry) => (
                <VrCard key={entry.id} vrEntry={entry} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedTicketId && (
        <ExitTicketTakeScreen
          ticketId={selectedTicketId}
          moduleId={moduleId!}
          user={user}
          onClose={() => setSelectedTicketId(null)}
          moduleTitle={moduleData?.title}
        />
      )}

      {selectedQuizAttachment && (
        <QuizTakeScreen
          moduleQuizId={selectedQuizAttachment.id}
          quizId={selectedQuizAttachment.quiz_id}
          user={user}
          onClose={() => setSelectedQuizAttachment(null)}
          moduleTitle={moduleData?.title}
        />
      )}

      {showThinkBlocks && (
        <ThinkBlockViewerScreen
          blocks={thinkBlocks}
          user={user}
          onClose={() => setShowThinkBlocks(false)}
          moduleTitle={moduleData?.title}
        />
      )}

      {/* Chatbot Tutor */}
      {userRole === 'student' && (
        <ChatbotTutor moduleId={moduleId!} studentId={user.id} />
      )}
    </div>
  )
}

export default ModuleDraftScreen
