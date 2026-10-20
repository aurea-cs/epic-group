import React from 'react'
import { ACCENTS, Accent } from '../theme'

interface ActionButtonProps {
  children: React.ReactNode
  accent?: Accent
  variant?: 'solid' | 'outline'
  disabled?: boolean
}

/**
 * Presentational button. It has no onClick on purpose: clicks bubble up to the
 * parent BaseCard, which owns the action.
 */
const ActionButton = ({ children, accent = ACCENTS.neutral, variant = 'solid', disabled = false }: ActionButtonProps) => {
  const common: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 'bold',
    borderRadius: '8px'
  }

  if (disabled) {
    return (
      <button
        disabled
        style={{
          ...common,
          width: '100%',
          gap: '8px',
          padding: '12px',
          border: 'none',
          backgroundColor: 'rgba(255,255,255,0.2)',
          color: 'rgba(255,255,255,0.5)',
          cursor: 'not-allowed'
        }}
      >
        {children}
      </button>
    )
  }

  if (variant === 'outline') {
    return (
      <button
        style={{
          ...common,
          flex: 1,
          gap: '6px',
          padding: '10px',
          fontSize: '0.875rem',
          backgroundColor: 'transparent',
          color: 'white',
          border: '1px solid white',
          cursor: 'pointer',
          transition: 'background 0.2s, color 0.2s'
        }}
        onMouseOver={e => {
          e.currentTarget.style.backgroundColor = 'white'
          e.currentTarget.style.color = ACCENTS.neutral.text
        }}
        onMouseOut={e => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = 'white'
        }}
      >
        {children}
      </button>
    )
  }

  return (
    <button
      style={{
        ...common,
        width: '100%',
        gap: '8px',
        padding: '12px',
        border: 'none',
        backgroundColor: accent.bg,
        color: accent.text,
        cursor: 'pointer',
        transition: 'background 0.2s'
      }}
      onMouseOver={e => (e.currentTarget.style.backgroundColor = accent.hoverBg)}
      onMouseOut={e => (e.currentTarget.style.backgroundColor = accent.bg)}
    >
      {children}
    </button>
  )
}

export default ActionButton