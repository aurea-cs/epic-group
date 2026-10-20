import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { useDynamicTranslation } from '../../../hooks/useDynamicTranslation'
import type { ModuleQuizAttachment } from '../../../lib/adminApi'
import BaseCard from './BaseCard'
import ActionButton from './ActionButton'
import { EmojiCircle } from './CardMedia'
import { ACCENTS, BADGES, GRADIENTS } from '../theme'
import { formatQuestionCount } from '../utils/questionCount'

interface QuizCardProps {
  attachment: ModuleQuizAttachment
  onOpen: (attachment: ModuleQuizAttachment) => void
}

const QuizCard = ({ attachment, onOpen }: QuizCardProps) => {
  const { t } = useTranslation()
  const quiz = attachment.quizzes
  const { text: title } = useDynamicTranslation(quiz?.title || t('moduleDraft.quiz'))
  const { text: description } = useDynamicTranslation(quiz?.description || t('moduleDraft.defaultQuizDescription'))

  if (!quiz) return null

  const questionCount = quiz.questions?.length ?? quiz.quiz_questions?.[0]?.count ?? 0

  return (
    <BaseCard
      onClick={() => onOpen(attachment)}
      media={<EmojiCircle emoji="📝" gradient={GRADIENTS.quiz} />}
      title={title}
      description={description}
      badge={{
        accent: BADGES.quiz,
        content: <>● {formatQuestionCount(questionCount, t, t('moduleDraft.quiz'))}</>
      }}
      footer={
        <ActionButton accent={ACCENTS.quiz}>
          {t('moduleDraft.viewQuiz')} <FileText size={16} />
        </ActionButton>
      }
    />
  )
}

export default QuizCard