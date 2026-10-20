import React from 'react'
import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { useDynamicTranslation } from '../../../hooks/useDynamicTranslation'
import type { Assignment } from '../../../lib/adminApi'
import BaseCard from './BaseCard'
import ActionButton from './ActionButton'
import { EmojiCircle } from './CardMedia'
import { ACCENTS, BADGES, GRADIENTS } from '../theme'

interface AssignmentCardProps {
  assignment: Assignment
  onOpen: (assignment: Assignment) => void
}

/** Strips markdown syntax like headers, asterisks, brackets to produce a clean text snippet. */
const cleanMarkdownSnippet = (md?: string | null): string => {
  if (!md) return ''
  return md
    .replace(/^#+\s+/gm, '')
    .replace(/[*_`~[\]()]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
}

const AssignmentCard: React.FC<AssignmentCardProps> = ({ assignment, onOpen }) => {
  const { t, i18n } = useTranslation()
  const rawTitle = assignment.title || t('moduleDraft.assignment')
  const { text: title } = useDynamicTranslation(rawTitle)

  const snippet = cleanMarkdownSnippet(assignment.instructions_md)
  const defaultDesc = t('moduleDraft.defaultAssignmentDescription')
  const { text: description } = useDynamicTranslation(snippet || defaultDesc)

  // Determine badge state
  let badgeAccent = BADGES.assignment
  let badgeText = ''

  if (assignment.submission) {
    if (assignment.submission.grade !== undefined && assignment.submission.grade !== null) {
      badgeAccent = BADGES.submitted
      badgeText = `● ${t('moduleDraft.graded')}: ${assignment.submission.grade}/${assignment.max_score ?? 100}`
    } else {
      badgeAccent = BADGES.submitted
      badgeText = `● ${t('moduleDraft.submitted')}`
    }
  } else if (assignment.due_at) {
    const isOverdue = new Date(assignment.due_at).getTime() < Date.now()
    if (isOverdue) {
      badgeAccent = BADGES.overdue
      badgeText = `● ${t('moduleDraft.overdue')}`
    } else {
      const formattedDate = new Date(assignment.due_at).toLocaleDateString(i18n.language, {
        month: 'short',
        day: 'numeric'
      })
      badgeText = `● ${t('moduleDraft.due')}: ${formattedDate}`
    }
  } else {
    badgeText = `● ${assignment.max_score ? `${assignment.max_score} pts` : t('moduleDraft.assignment')}`
  }

  return (
    <BaseCard
      onClick={() => onOpen(assignment)}
      media={<EmojiCircle emoji="📋" gradient={GRADIENTS.assignment} />}
      title={title}
      description={description}
      clampDescription={true}
      badge={{
        accent: badgeAccent,
        content: <>{badgeText}</>
      }}
      footer={
        <ActionButton accent={ACCENTS.assignment}>
          {t('moduleDraft.viewAssignment')} <FileText size={16} />
        </ActionButton>
      }
    />
  )
}

export default AssignmentCard
