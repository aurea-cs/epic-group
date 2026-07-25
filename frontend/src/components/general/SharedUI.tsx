import React from 'react'
import { Eye, EyeOff } from 'lucide-react'

// ============================================================================
// Shared style objects
// ============================================================================

export const tdStyle: React.CSSProperties = { padding: '0.9rem 1.25rem', verticalAlign: 'middle' }
export const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.9rem 1.25rem', fontWeight: 700 }

export const fieldLabelStyle: React.CSSProperties = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }
export const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '1rem',
    fontFamily: 'inherit',
}

// ============================================================================
// Small shared UI pieces
// ============================================================================

export const ActionButton: React.FC<{
    label: string
    bg: string
    hoverBg: string
    textColor: string
    border: string
    onClick: () => void
    disabled?: boolean
}> = ({ label, bg, hoverBg, textColor, border, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border,
            background: bg,
            color: textColor,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            fontSize: '0.9rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            transition: 'background 0.15s',
        }}
        onMouseEnter={e => !disabled && (e.currentTarget.style.background = hoverBg)}
        onMouseLeave={e => !disabled && (e.currentTarget.style.background = bg)}
    >
        {label}
    </button>
)

export const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: active ? '1px solid rgba(192,132,252,0.55)' : '1px solid rgba(255,255,255,0.08)',
            background: active ? 'rgba(192,132,252,0.22)' : 'rgba(255,255,255,0.03)',
            color: active ? '#f3e8ff' : 'rgba(255,255,255,0.65)',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            transition: 'all 0.15s',
        }}
    >
        {label}
    </button>
)

export const StatusPill: React.FC<{ value: string | null }> = ({ value }) => {
    const v = (value || 'draft').toLowerCase()
    const map: Record<string, { bg: string; color: string; label: string }> = {
        published: { bg: 'rgba(74,222,128,0.15)', color: '#86efac', label: 'Publicada' },
        draft: { bg: 'rgba(250,204,21,0.15)', color: '#fde047', label: 'Borrador' },
        closed: { bg: 'rgba(248,113,113,0.15)', color: '#fca5a5', label: 'Cerrada' },
    }
    const s = map[v] || map.draft
    return (
        <span style={{ padding: '4px 10px', borderRadius: '999px', background: s.bg, color: s.color, fontSize: '0.78rem', fontWeight: 700 }}>
            {s.label}
        </span>
    )
}

export const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
    <button
        onClick={onChange}
        style={{
            width: 46,
            height: 26,
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            background: checked ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'rgba(255,255,255,0.15)',
            position: 'relative',
            transition: 'background 0.2s',
        }}
        aria-label={checked ? 'Visible' : 'Oculto'}
    >
        <span
            style={{
                position: 'absolute',
                top: 3,
                left: checked ? 23 : 3,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
            }}
        />
    </button>
)

export const EyeToggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
    <button
        onClick={onChange}
        style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: checked ? '#c084fc' : 'rgba(255,255,255,0.25)',
            transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            e.currentTarget.style.color = checked ? '#d8b4fe' : 'rgba(255,255,255,0.45)'
        }}
        onMouseLeave={e => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.color = checked ? '#c084fc' : 'rgba(255,255,255,0.25)'
        }}
        aria-label={checked ? 'Visible para estudiantes' : 'Oculto para estudiantes'}
        title={checked ? 'Visible para estudiantes' : 'Oculto para estudiantes'}
    >
        {checked ? <Eye size={20} /> : <EyeOff size={20} />}
    </button>
)

export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
    <div
        onClick={onClose}
        style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem',
        }}
    >
        <div
            onClick={e => e.stopPropagation()}
            style={{
                background: '#1a1625', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px',
                padding: '1.75rem', 
                width: '95vw',        
                height: '95vh',       
                maxWidth: '1200px', 
                overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#f3e8ff' }}>{title}</h2>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            {children}
        </div>
    </div>
)