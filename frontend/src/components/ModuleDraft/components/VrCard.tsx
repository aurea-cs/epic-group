import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { useDynamicTranslation } from '../../../hooks/useDynamicTranslation'
import type { VrCodeEntry } from '../../../lib/adminApi'
import dentrodespaceshipImg from '../../../assets/dentrodespaceship.png'
import BaseCard from './BaseCard'
import ActionButton from './ActionButton'

const logVrClick = async () => {
  const { supabase } = await import('../../../lib/supabase')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return

  await supabase.from('activity_logs').insert({
    user_id: session.user.id,
    duration_seconds: 5,
    path: '/vr-room'
  })
  console.log('Logged initial VR click')
}

const VrCard = ({ vrEntry }: { vrEntry: VrCodeEntry }) => {
  const { t } = useTranslation()
  const { text: title } = useDynamicTranslation(vrEntry.title || 'Sala VR')
  const { text: description } = useDynamicTranslation(vrEntry.description || t('moduleDraft.defaultVrDescription'))

  const handleClick = () => {
    sessionStorage.setItem('external_tracking_path', '/vr-room')
    window.open(vrEntry.code, '_blank', 'noopener,noreferrer')
    logVrClick().catch(console.error)
  }

  return (
    <BaseCard
      onClick={handleClick}
      mediaLayout="banner"
      media={
        <img
          src={vrEntry.image_url || dentrodespaceshipImg}
          alt="VR Room"
          style={{ width: '100%', height: '170px', objectFit: 'cover' }}
        />
      }
      title={title}
      description={description}
      footer={
        <ActionButton variant="outline">
          {t('moduleDraft.enter')} <ArrowRight size={16} />
        </ActionButton>
      }
    />
  )
}

export default VrCard