import { useTranslation } from 'react-i18next'
import { useDynamicTranslation } from '../../../hooks/useDynamicTranslation'
import { markItemAsRead } from '../../../lib/api'
import type { ModuleItem } from '../../../lib/adminApi'
import ciberImg from '../../../assets/ciber.png'
import BaseCard from './BaseCard'
import ActionButton from './ActionButton'
import { CircleImage } from './CardMedia'
import type { ViewPdfHandler } from '../types'

interface ContentCardProps {
  item: ModuleItem
  index: number
  userId: string
  onViewPdf: ViewPdfHandler
}

const ContentCard = ({ item, userId, onViewPdf }: ContentCardProps) => {
  const { t } = useTranslation()
  const { text: title } = useDynamicTranslation(item.title)
  const { text: description } = useDynamicTranslation(item.description || t('moduleDraft.defaultContentDescription'))

  const handleClick = () => {
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
  }

  return (
    <BaseCard
      onClick={handleClick}
      media={<CircleImage src={item.image_url || ciberImg} alt={title} />}
      title={title}
      description={description}
      footer={
        <ActionButton>
          {t('moduleDraft.viewResource')}
        </ActionButton>
      }
    />
  )
}

export default ContentCard