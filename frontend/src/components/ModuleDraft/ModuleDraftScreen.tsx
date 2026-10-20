import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { useTranslation } from 'react-i18next'
import { Book, Gamepad2, Folder, Ticket, Globe } from 'lucide-react'
import { useDynamicTranslation } from '../../hooks/useDynamicTranslation'
import { getUserRole } from '../../utils/getUserRole'
import type { ModuleQuizAttachment } from '../../lib/adminApi'
import ExitTicketTakeScreen from '../ExitTicketTakeScreen'
import QuizTakeScreen from '../QuizTakeScreen'
import ThinkBlockViewerScreen from '../ThinkBlockViewerScreen'
import { ChatbotTutor } from '../ChatbotTutor'
import bannerImg from '../../assets/banner.png'
import {
  ContentCard,
  VrCard,
  ExitTicketCard,
  QuizCard,
  ThinkBlockCard,
  AssignmentCard,
  ModuleSection,
  SectionIcon,
  EmptyMessage
} from './components'
import { useModuleDraftData } from './hooks/useModuleDraftData'
import { useLanguageToggle } from './hooks/useLanguageToggle'
import { sortByOrder } from './utils/sortByOrder'
import './ModuleDraftScreen.css'

interface ModuleDraftScreenProps {
  user: User
}

const ModuleDraftScreen: React.FC<ModuleDraftScreenProps> = ({ user }) => {
  const { t } = useTranslation()
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>()
  const navigate = useNavigate()
  const userRole = getUserRole(user)

  const { moduleData, vrEntries, exitTickets, moduleQuizzes, thinkBlocks, assignments, loading } =
    useModuleDraftData(courseId, moduleId, user?.id, userRole)
  const { isSpanish, toggleLanguage } = useLanguageToggle()
  const { text: translatedModuleTitle } = useDynamicTranslation(moduleData?.title)

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [selectedQuizAttachment, setSelectedQuizAttachment] = useState<ModuleQuizAttachment | null>(null)
  const [showThinkBlocks, setShowThinkBlocks] = useState(false)

  const handleViewPdf = (url: string, itemId: string, isEditable: boolean) => {
    navigate(
      `/course/${courseId}/module/${moduleId}/pdf?url=${encodeURIComponent(url)}&itemId=${itemId}&editable=${isEditable ? 'true' : 'false'}`
    )
  }

  const items = moduleData?.items || []
  // student items: show_student=true (show_teacher is false by DB constraint)
  const contenidos = sortByOrder(items.filter(item => item.show_student === true))
  // teacher items: show_teacher=true and show_student is false
  const recursos = sortByOrder(items.filter(item => item.show_teacher === true && !item.show_student))
  const sortedVrEntries = sortByOrder(vrEntries)

  const hasEvaluations =
    exitTickets.length > 0 || moduleQuizzes.length > 0 || thinkBlocks.length > 0 || assignments.length > 0

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
        <div className="module-draft-right-panel">
          <div
            className="module-draft-hero-banner"
            style={{ backgroundImage: `url(${bannerImg})` }}
            aria-hidden="true"
          />

          <div className="module-draft-header-actions">
            <button
              onClick={toggleLanguage}
              className="module-draft-translate-btn"
              title={isSpanish ? t('moduleDraft.translateToEnglish') : t('moduleDraft.translateToSpanish')}
            >
              <Globe size={18} />
              <span>{isSpanish ? 'EN' : 'ES'}</span>
            </button>

            <button onClick={() => navigate(-1)} className="module-draft-back-button">
              {t('moduleDraft.back')}
            </button>
          </div>

          <h1 className="module-draft-title">
            {moduleData?.title
              ? `${translatedModuleTitle || moduleData.title}`
              : t('moduleDraft.defaultTitle')}
          </h1>

          <p className="module-draft-description">
            {t('moduleDraft.introDescription')}
          </p>

          <ModuleSection icon={<SectionIcon Icon={Book} />} title={t('moduleDraft.contents')}>
            {contenidos.length > 0 ? (
              contenidos.map((item, idx) => (
                <ContentCard key={item.id} item={item} index={idx} userId={user.id} onViewPdf={handleViewPdf} />
              ))
            ) : (
              <EmptyMessage>{t('moduleDraft.noContents')}</EmptyMessage>
            )}
          </ModuleSection>

          {userRole !== 'student' && (
            <ModuleSection icon={<SectionIcon Icon={Folder} />} title={t('moduleDraft.resources')}>
              {recursos.length > 0 ? (
                recursos.map((item, idx) => (
                  <ContentCard key={item.id} item={item} index={idx} userId={user.id} onViewPdf={handleViewPdf} />
                ))
              ) : (
                <EmptyMessage>{t('moduleDraft.noResources')}</EmptyMessage>
              )}
            </ModuleSection>
          )}

          {hasEvaluations && (
            <ModuleSection icon={<SectionIcon Icon={Ticket} />} title={t('moduleDraft.evaluations')}>
              {assignments.map(assignment => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onOpen={a => navigate(`/assignments/${a.id}`)}
                />
              ))}
              {exitTickets.map(ticket => (
                <ExitTicketCard key={ticket.id} ticket={ticket} onView={setSelectedTicketId} />
              ))}
              {moduleQuizzes.map(attachment => (
                <QuizCard key={attachment.id} attachment={attachment} onOpen={setSelectedQuizAttachment} />
              ))}
              {thinkBlocks.length > 0 && <ThinkBlockCard blocks={thinkBlocks} onOpen={() => setShowThinkBlocks(true)} />}
            </ModuleSection>
          )}

          <ModuleSection icon={<SectionIcon Icon={Gamepad2} />} title={t('moduleDraft.vrRooms')} spaced={false}>
            {sortedVrEntries.map(entry => (
              <VrCard key={entry.id} vrEntry={entry} />
            ))}
          </ModuleSection>
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

      {userRole === 'student' && <ChatbotTutor moduleId={moduleId!} studentId={user.id} />}
    </div>
  )
}

export default ModuleDraftScreen