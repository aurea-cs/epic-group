import React from 'react'
import { BADGES, BadgeAccent } from '../theme'

interface CardBadgeProps {
  children: React.ReactNode
  accent?: BadgeAccent
}

/** Small pill under a card's description, e.g. "● 5 questions". */
const CardBadge = ({ children, accent = BADGES.neutral }: CardBadgeProps) => (
  <div
    style={{
      marginTop: '10px',
      backgroundColor: accent.bg,
      color: accent.text,
      borderRadius: '8px',
      padding: '6px 12px',
      fontSize: '0.82rem',
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px'
    }}
  >
    {children}
  </div>
)

export default CardBadge