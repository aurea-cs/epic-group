import React from 'react'
import { type ModuleItem } from '../../../lib/adminApi'

interface ItemRowProps {
    item: ModuleItem
    openMenuItemId: string | null
    kebabRef: (el: HTMLButtonElement | null) => void
    onEdit: (item: ModuleItem) => void
    onKebabClick: (e: React.MouseEvent, itemId: string) => void
}

const typeIcon = (type: string) => {
    if (type === 'pdf') return '📄'
    if (type === 'video') return '🎥'
    return '🔗'
}

const ItemRow: React.FC<ItemRowProps> = ({
    item,
    openMenuItemId,
    kebabRef,
    onEdit,
    onKebabClick,
}) => (
    <div className="module-item-row standard">
        <div style={{ fontSize: '1.5rem' }}>{typeIcon(item.type)}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 'bold' }}>{item.title}</div>
            {item.description && (
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                    {item.description}
                </div>
            )}

            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.35rem' }}>
                <span style={{
                    fontSize: '0.72rem',
                    color: item.show_student ? '#6ee7a8' : 'rgba(255,255,255,0.35)',
                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                }}>
                    <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: item.show_student ? '#6ee7a8' : 'rgba(255,255,255,0.3)',
                        display: 'inline-block',
                    }} />
                    Estudiantes
                </span>
                <span style={{
                    fontSize: '0.72rem',
                    color: item.show_teacher ? '#c4b5fd' : 'rgba(255,255,255,0.35)',
                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                }}>
                    <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: item.show_teacher ? '#c4b5fd' : 'rgba(255,255,255,0.3)',
                        display: 'inline-block',
                    }} />
                    Profesores
                </span>
            </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
                onClick={() => onEdit(item)}
                title="Editar"
                style={{
                    width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                    background: 'rgba(255,255,255,0.12)', color: '#fff',
                    cursor: 'pointer', fontSize: '0.85rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                ✏️
            </button>
            <button
                ref={kebabRef}
                onClick={(e) => onKebabClick(e, item.id)}
                title="Más opciones"
                style={{
                    width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                    background: openMenuItemId === item.id
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(255,255,255,0.08)',
                    color: '#fff', cursor: 'pointer', fontSize: '1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                ⋮
            </button>
        </div>
    </div>
)

export default ItemRow