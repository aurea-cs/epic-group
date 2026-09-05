import React from 'react'
import { createPortal } from 'react-dom'
import Toggle from './Toggle'
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
    onToggleProfessor,
    onDelete,
    onClose,
}) => {
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
                <span>Contenido para estudiantes</span>
                <Toggle on={item.show_student!} color="#22c55e" />
            </button>

            <button
                onClick={() => { onToggleProfessor(item); onClose() }}
                disabled={visibilityLoading === item.id}
                style={{
                    width: '100%', padding: '0.65rem 0.9rem', background: 'transparent',
                    border: 'none', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', cursor: 'pointer', color: '#1f295a', fontSize: '0.875rem',
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(31,41,90,0.06)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
            >
                <span>Contenido para profesores</span>
                <Toggle on={item.show_teacher!} color="#8b5cf6" />
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
                        ⬇️ Ver contenido
                    </a>
                </>
            )}

            <div style={{ height: '1px', background: 'rgba(31,41,90,0.1)' }} />
            <button
                onClick={() => { onClose(); onDelete(item) }}
                style={{
                    width: '100%', padding: '0.65rem 0.9rem', background: 'transparent',
                    border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    cursor: 'pointer', color: '#dc2626', fontSize: '0.875rem',
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.06)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
            >
                🗑️ Eliminar
            </button>
        </div>,
        document.body
    )
}

export default ItemActionsMenu