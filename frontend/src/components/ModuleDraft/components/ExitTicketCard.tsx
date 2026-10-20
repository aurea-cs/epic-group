import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { useDynamicTranslation } from '../../../hooks/useDynamicTranslation'
import type { ExitTicketTemplate } from '../../../lib/adminApi'
import BaseCard from './BaseCard'
import ActionButton from './ActionButton'
import { EmojiCircle } from './CardMedia'
import { ACCENTS, BADGES, GRADIENTS } from '../theme'
import { formatQuestionCount } from '../utils/questionCount'

interface ExitTicketCardProps {
  ticket: ExitTicketTemplate
  onView: (id: string) => void
}

const ExitTicketCard = ({ ticket, onView }: ExitTicketCardProps) => {
  const { t } = useTranslation()
  const { text: title } = useDynamicTranslation(ticket.title)
  const { text: description } = useDynamicTranslation(ticket.description || t('moduleDraft.defaultExitTicketDescription'))

  const questionCount = ticket.questions?.length ?? ticket.exit_ticket_questions?.[0]?.count ?? 0

  return (
    <BaseCard
      onClick={() => onView(ticket.id)}
      media={<EmojiCircle emoji="🎟️" gradient={GRADIENTS.exitTicket} />}
      title={title}
      description={description}
      badge={{
        accent: BADGES.exitTicket,
        content: <>● {formatQuestionCount(questionCount, t, t('moduleDraft.exitTicket'))}</>
      }}
      footer={
        <ActionButton accent={ACCENTS.exitTicket}>
          {t('moduleDraft.viewExitTicket')} <FileText size={16} />
        </ActionButton>
      }
    />
  )
}

export default ExitTicketCard