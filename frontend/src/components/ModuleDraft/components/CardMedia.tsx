import { COLORS } from '../theme'

const CIRCLE_SIZE = '150px'

interface CircleImageProps {
  src: string
  alt: string
  shadow?: boolean
}

export const CircleImage = ({ src, alt, shadow = false }: CircleImageProps) => (
  <img
    src={src}
    alt={alt}
    style={{
      width: CIRCLE_SIZE,
      height: CIRCLE_SIZE,
      borderRadius: '50%',
      objectFit: 'cover',
      ...(shadow && { boxShadow: '0 8px 16px rgba(0,0,0,0.2)' })
    }}
  />
)

interface EmojiCircleProps {
  emoji: string
  gradient: string
}

export const EmojiCircle = ({ emoji, gradient }: EmojiCircleProps) => (
  <div
    style={{
      width: '134px',
      height: '140px',
      borderRadius: '50%',
      background: gradient,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `6px solid ${COLORS.ringDefault}`,
      fontSize: '4.5rem',
      boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
    }}
  >
    {emoji}
  </div>
)