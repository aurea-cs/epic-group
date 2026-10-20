import React from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { type ModuleItem, type CourseModule } from '../../../lib/adminApi'

interface ItemActionsMenuProps {
    openMenuItemId: string | null
    menuPosition: { top: number; left: number } | null
    menuRef: React.RefObject<HTMLDivElement>
    modules: CourseModule[]
    visibilityLoading: string | null
    onToggleStudent: (item: ModuleItem) => void
    onToggleProfessor: (item: ModuleItem) => void
    onDelete: (item: ModuleItem) => void
    onClose: () => void
}

const ItemActionsMenu: React.FC<ItemActionsMenuProps> = ({
    openMenuItemId,
    menuPosition,
    menuRef,
    modules,
    visibilityLoading,
    onToggleStudent,
    onDelete,
    onClose,
}) => {
    const { i18n } = useTranslation()
    if (!openMenuItemId || !menuPosition) return null

    const item = modules.flatMap(m => m.items ?? []).find(i => i.id === openMenuItemId)
    if (!item) return null

    return createPortal(
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                top: menuPosition.top,
                left: menuPosition.left,
                zIndex: 9999,
                background: '#ffffff',
                borderRadius: '8px',
                minWidth: '220px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                overflow: 'hidden',
                border: '1px solid rgba(0,0,0,0.08)',
            }}
        >
            {/* Current audience + toggle */}
            <div style={{ padding: '0.5rem 0.9rem 0.3rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {i18n.language.startsWith('en') ? 'Audience' : 'Audiencia'}
            </div>

            <button
                onClick={() => { onToggleStudent(item); onClose() }}
                disabled={visibilityLoading === item.id}
                style={{
                    width: '100%', padding: '0.65rem 0.9rem', background: 'transparent',
                    border: 'none', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', cursor: 'pointer', color: '#1f295a', fontSize: '0.875rem',
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(31,41,90,0.06)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '20px', height: '20px', borderRadius: '50%',
                        background: item.show_student ? '#dcfce7' : '#ede9fe',
                        fontSize: '0.75rem',
                    }}>
                        {item.show_student ? '🎓' : '📚'}
                    </span>
                    {item.show_student
                        ? (i18n.language.startsWith('en') ? 'Students' : 'Estudiantes')
                        : (i18n.language.startsWith('en') ? 'Teachers' : 'Profesores')}
                </span>
                <span style={{
                    fontSize: '0.72rem', color: '#94a3b8', border: '1px solid #e2e8f0',
                    borderRadius: '4px', padding: '2px 6px',
                }}>
                    {i18n.language.startsWith('en') ? 'Switch' : 'Cambiar'}
                </span>
            </button>

            {item.content_url && (
                <>
                    <div style={{ height: '1px', background: 'rgba(31,41,90,0.1)' }} />
                    <a
                        href={item.content_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onClose}
                        style={{
                            width: '100%', padding: '0.65rem 0.9rem', background: 'transparent',
                            border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem',
                            cursor: 'pointer', color: '#1f295a', fontSize: '0.875rem', textDecoration: 'none',
                        }}
                    >
                        ⬇️ {i18n.language.startsWith('en') ? 'View content' : 'Ver contenido'}
                    </a>
                </>
            )}

            <div style={{ height: '1px', background: 'rgba(31,41,90,0.1)' }} />
            <button
                onClick={() => { onDelete(item); onClose() }}
                style={{
                    width: '100%', padding: '0.65rem 0.9rem', background: 'transparent',
                    border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    cursor: 'pointer', color: '#ff4757', fontSize: '0.875rem',
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,71,87,0.06)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
            >
                🗑️ {i18n.language.startsWith('en') ? 'Delete' : 'Eliminar'}
            </button>
        </div>,
        document.body
    )
}

export default ItemActionsMenu