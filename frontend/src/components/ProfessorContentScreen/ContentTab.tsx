import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tdStyle, EyeToggle } from '../general/SharedUI'
import { ITEM_TYPE_ICON, type ModuleWithItems, type ModuleItem } from './types'

interface ContentTabProps {
    loading: boolean
    modules: ModuleWithItems[]
    itemVisibility: Record<string, boolean>
    onToggleItemVisibility: (itemId: string) => void
    onBulkDelete?: (itemIds: string[]) => void
    onBulkEditVisibility?: (itemIds: string[], visible: boolean) => void
    courseId?: string
}

const ContentTab: React.FC<ContentTabProps> = ({ 
    loading, 
    modules, 
    itemVisibility, 
    onToggleItemVisibility,
    onBulkDelete,
    onBulkEditVisibility,
    courseId
}) => {
    const navigate = useNavigate()
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [hoveredId, setHoveredId] = useState<string | null>(null)

    const handleItemClick = (item: ModuleItem, moduleId: string) => {
        const url = item.content_url
        if (!url) return

        if (item.type === 'pdf') {
            navigate(
                `/course/${courseId || 'unknown'}/module/${moduleId}/pdf?url=${encodeURIComponent(url)}`
            )
        } else {
            // video, link, or anything else — open in a new tab
            window.open(url, '_blank', 'noopener,noreferrer')
        }
    }

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        )
    }

    const toggleModuleSelection = (moduleId: string) => {
        const module = modules.find(m => m.id === moduleId)
        if (!module || !module.items) return
        
        const moduleItemIds = module.items.map(item => item.id)
        const allSelected = moduleItemIds.every(id => selectedIds.includes(id))
        
        if (allSelected) {
            setSelectedIds(prev => prev.filter(id => !moduleItemIds.includes(id)))
        } else {
            setSelectedIds(prev => {
                const newIds = new Set(prev)
                moduleItemIds.forEach(id => newIds.add(id))
                return Array.from(newIds)
            })
        }
    }

    const clearSelection = () => setSelectedIds([])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
            
            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div style={{ 
                    position: 'sticky', 
                    top: 0, 
                    zIndex: 10,
                    background: 'linear-gradient(90deg, rgba(124, 58, 237, 0.95) 0%, rgba(168, 85, 247, 0.95) 100%)', 
                    padding: '1rem 1.5rem', 
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.2)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontWeight: 600, color: '#fff' }}>
                            {selectedIds.length} {selectedIds.length === 1 ? 'elemento seleccionado' : 'elementos seleccionados'}
                        </span>
                        <button 
                            onClick={clearSelection}
                            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                            Cancelar
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button 
                            onClick={() => {
                                if (onBulkEditVisibility) onBulkEditVisibility(selectedIds, true)
                                clearSelection()
                            }}
                            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                        >
                            👁️ Mostrar
                        </button>
                        <button 
                            onClick={() => {
                                if (onBulkEditVisibility) onBulkEditVisibility(selectedIds, false)
                                clearSelection()
                            }}
                            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                        >
                            🚫 Ocultar
                        </button>
                        <button 
                            onClick={() => {
                                if (onBulkDelete) onBulkDelete(selectedIds)
                                clearSelection()
                            }}
                            style={{ background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.5)', color: '#fca5a5', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                        >
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ padding: '1.25rem', color: 'rgba(255,255,255,0.6)' }}>Cargando módulos…</div>
            ) : modules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)', border: '2px dashed rgba(255,255,255,0.12)', borderRadius: '16px' }}>
                    Este curso todavía no tiene módulos.
                </div>
            ) : (
                modules.map(m => {
                    const items = m.items || []
                    const moduleItemIds = items.map(i => i.id)
                    const allSelected = items.length > 0 && moduleItemIds.every(id => selectedIds.includes(id))
                    const someSelected = items.length > 0 && moduleItemIds.some(id => selectedIds.includes(id)) && !allSelected

                    return (
                        <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', overflow: 'hidden' }}>
                            {/* Module header */}
                            <div style={{ padding: '1.1rem 1.25rem', background: 'rgba(192,132,252,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <input 
                                    type="checkbox" 
                                    checked={allSelected}
                                    ref={input => {
                                        if (input) input.indeterminate = someSelected
                                    }}
                                    onChange={() => toggleModuleSelection(m.id)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#a855f7' }}
                                />
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f3e8ff' }}>{m.title}</h3>
                            </div>

                            {/* Items */}
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {items.length === 0 ? (
                                            <tr><td style={tdStyle} colSpan={3}>Este tema todavía no tiene contenido.</td></tr>
                                        ) : (
                                            items.map(item => {
                                                const isHovered = hoveredId === item.id
                                                const isSelected = selectedIds.includes(item.id)
                                                const isClickable = !!item.content_url

                                                return (
                                                <tr
                                                    key={item.id}
                                                    onMouseEnter={() => setHoveredId(item.id)}
                                                    onMouseLeave={() => setHoveredId(null)}
                                                    onClick={(e) => {
                                                        // Don't trigger row click if the user clicked the checkbox or eye toggle
                                                        if ((e.target as HTMLElement).closest('input, button')) return
                                                        handleItemClick(item, m.id)
                                                    }}
                                                    style={{
                                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                        background: isSelected
                                                            ? 'rgba(168, 85, 247, 0.15)'
                                                            : isHovered
                                                            ? 'rgba(168, 85, 247, 0.07)'
                                                            : 'transparent',
                                                        transition: 'background 0.18s',
                                                        cursor: isClickable ? 'pointer' : 'default',
                                                    }}
                                                >
                                                    <td style={{ ...tdStyle, width: '40px', textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleSelection(item.id)}
                                                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#a855f7' }}
                                                        />
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                                            <span style={{ fontSize: '1.1rem' }}>{ITEM_TYPE_ICON[item.type] || '📎'}</span>
                                                            <div>
                                                                <div style={{
                                                                    fontWeight: 600,
                                                                    color: isHovered && isClickable ? '#c084fc' : undefined,
                                                                    textDecoration: isHovered && isClickable ? 'underline' : 'none',
                                                                    transition: 'color 0.15s',
                                                                }}>
                                                                    {item.title}
                                                                </div>
                                                                {item.description && (
                                                                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{item.description}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ ...tdStyle, textAlign: 'right', width: 90 }}>
                                                        <EyeToggle checked={!!itemVisibility[item.id]} onChange={() => onToggleItemVisibility(item.id)} />
                                                    </td>
                                                </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    )
}

export default ContentTab
