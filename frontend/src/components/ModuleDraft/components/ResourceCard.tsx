import { useTranslation } from 'react-i18next'
import { Play } from 'lucide-react'
import { useDynamicTranslation } from '../../../hooks/useDynamicTranslation'
import type { ModuleItem } from '../../../lib/adminApi'
import ciberImg from '../../../assets/ciber.png'
import BaseCard from './BaseCard'
import ActionButton from './ActionButton'
import { CircleImage } from './CardMedia'
import type { ViewPdfHandler } from '../types'

interface ResourceCardProps {
  item: ModuleItem
  onViewPdf: ViewPdfHandler
}

const ResourceCard = ({ item, onViewPdf }: ResourceCardProps) => {
  const { t } = useTranslation()
  const { text: title } = useDynamicTranslation(item.title)
  const { text: description } = useDynamicTranslation(item.description || t('moduleDraft.defaultResourceDescription'))

  const isVideo = item.type === 'video'

  const handleClick = () => {
    if (!item.content_url) return
    if (isVideo) {
      window.open(item.content_url, '_blank')
    } else {
      onViewPdf(item.content_url, item.id, !!item.is_editable)
    }
  }

  return (
    <BaseCard
      onClick={handleClick}
      media={<CircleImage src={item.image_url || ciberImg} alt={title} />}
      title={title}
      description={description}
      footer={
        item.content_url ? (
          <ActionButton>
            {isVideo ? (
              <>
                {t('moduleDraft.viewVideo')} <Play size={16} fill="currentColor" />
              </>
            ) : (
              t('moduleDraft.viewResource')
            )}
          </ActionButton>
        ) : (
          <ActionButton disabled>{t('moduleDraft.noUrlConfigured')}</ActionButton>
        )
      }
    />
  )
}

export default ResourceCard