export const COLORS = {
  cardBg: '#25164E',
  cardBorder: 'rgba(255,255,255,0.05)',
  ringDefault: '#432E7E',
  ringResource: '#1E40AF',
  textMuted: 'rgba(255,255,255,0.7)',
  sectionIcon: '#FCEE50'
}

export interface Accent {
  bg: string
  hoverBg: string
  text: string
}

export interface BadgeAccent {
  bg: string
  text: string
}

export const ACCENTS = {
  neutral: { bg: 'white', hoverBg: '#f0f0f0', text: '#25164E' } as Accent,
  exitTicket: { bg: '#c084fc', hoverBg: '#d8b4fe', text: '#1a1625' } as Accent,
  quiz: { bg: '#38bdf8', hoverBg: '#7dd3fc', text: '#0f172a' } as Accent,
  thinkBlock: { bg: '#34d399', hoverBg: '#6ee7b7', text: '#064e3b' } as Accent,
  assignment: { bg: '#fb923c', hoverBg: '#fdba74', text: '#431407' } as Accent
}

export const BADGES = {
  neutral: { bg: 'rgba(255,255,255,0.1)', text: 'white' } as BadgeAccent,
  exitTicket: { bg: 'rgba(168,85,247,0.15)', text: '#c084fc' } as BadgeAccent,
  quiz: { bg: 'rgba(56,189,248,0.15)', text: '#38bdf8' } as BadgeAccent,
  thinkBlock: { bg: 'rgba(52,211,153,0.15)', text: '#34d399' } as BadgeAccent,
  assignment: { bg: 'rgba(251,146,60,0.15)', text: '#fb923c' } as BadgeAccent,
  submitted: { bg: 'rgba(52,211,153,0.15)', text: '#34d399' } as BadgeAccent,
  overdue: { bg: 'rgba(248,113,113,0.15)', text: '#f87171' } as BadgeAccent
}

export const GRADIENTS = {
  exitTicket: 'linear-gradient(135deg, #a855f7 0%, #6c5ce7 100%)',
  quiz: 'linear-gradient(135deg, #38bdf8 0%, #1e40af 100%)',
  thinkBlock: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
  assignment: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
}