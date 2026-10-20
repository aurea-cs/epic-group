import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import type { ThinkBlock } from '../../../lib/adminApi'
import BaseCard from './BaseCard'
import ActionButton from './ActionButton'
import { CircleImage, EmojiCircle } from './CardMedia'
import { ACCENTS, BADGES, GRADIENTS } from '../theme'

interface ThinkBlockCardProps {
  blocks: ThinkBlock[]
  onOpen: () => void
}

const ThinkBlockCard = ({ blocks, onOpen }: ThinkBlockCardProps) => {
  const { t } = useTranslation()
  const firstBlock = blocks[0]

  firstBlock?.fun_fact_md
    ? firstBlock.fun_fact_md.replace(/[#*`_]/g, '').trim()
    : t('moduleDraft.thinkObserveExperimentDesc')

  if (!firstBlock) return null

  const title = t('moduleDraft.thinkObserveExperimentTitle')
  const experimentLabel = blocks.length === 1 ? t('moduleDraft.experimentSingle') : t('moduleDraft.experimentPlural')

  return (
    <BaseCard
      onClick={onOpen}
      media={
        firstBlock.image_url ? (
          <CircleImage src={firstBlock.image_url} alt={title} shadow />
        ) : (
          <EmojiCircle emoji="🔬" gradient={GRADIENTS.thinkBlock} />
        )
      }
      title={title}
      description={t("moduleDraft.thinkObserveExperimentDesc")}
      clampDescription
      badge={{
        accent: BADGES.thinkBlock,
        content: (
          <>
            ● {blocks.length} {experimentLabel}
            
          </>
        )
      }}
      footer={
        <ActionButton accent={ACCENTS.thinkBlock}>
          {t('moduleDraft.viewExperiments')} <FileText size={16} />
        </ActionButton>
      }
    />
  )
}

export default ThinkBlockCard