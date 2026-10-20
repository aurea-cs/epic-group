import React from 'react'
import { COLORS } from '../theme'
import CardBadge from './CardBadge'
import { BadgeAccent } from '../theme'

interface BaseCardProps {
  onClick?: () => void
  /** Image / emoji shown at the top of the card. */
  media: React.ReactNode
  /** 'circle' centers the media inside the padding; 'banner' makes it full-bleed. */
  mediaLayout?: 'circle' | 'banner'
  title: string
  description: string
  clampDescription?: boolean
  badge?: { content: React.ReactNode; accent?: BadgeAccent }
  /** Extra content under the description (e.g. a platform notice). */
  extra?: React.ReactNode
  footer: React.ReactNode
}

const BaseCard = ({
  onClick,
  media,
  mediaLayout = 'circle',
  title,
  description,
  clampDescription = false,
  badge,
  extra,
  footer
}: BaseCardProps) => {
  const isBanner = mediaLayout === 'banner'

  const textBlock = (
    <div>
      <h3 style={{ fontSize: '1.0rem', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>{title}</h3>
      <p
        style={{
          fontSize: '0.775rem',
          color: COLORS.textMuted,
          lineHeight: '1.4',
          ...(clampDescription && {
            display: '-webkit-box',
            WebkitLineClamp: 3,
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          })
        }}
      >
        {description}
      </p>
      {badge && <CardBadge accent={badge.accent}>{badge.content}</CardBadge>}
      {extra}
    </div>
  )

  return (
    <div
      className="hoverable-card"
      onClick={onClick}
      style={{
        width: '280px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        cursor: onClick ? 'pointer' : undefined,
        ...(isBanner ? { padding: 0, overflow: 'hidden' } : { padding: '20px', gap: '16px' })
      }}
    >
      {isBanner ? (
        <>
          {media}
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {textBlock}
            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>{footer}</div>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'center' }}>{media}</div>
          {textBlock}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>{footer}</div>
        </>
      )}
    </div>
  )
}

export default BaseCard