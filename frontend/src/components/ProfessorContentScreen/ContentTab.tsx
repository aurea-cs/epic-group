import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tdStyle, EyeToggle } from '../general/SharedUI'
import { ITEM_TYPE_ICON, type ModuleWithItems, type ModuleItem } from './types'
import { getModuleVrCode, type VrCodeEntry } from '../../lib/adminApi'

interface ContentTabProps {
    loading: boolean
    modules: ModuleWithItems[]
    itemVisibility: Record<string, boolean>
    onToggleItemVisibility: (itemId: string) => void
    courseId?: string
}

const ContentTab: React.FC<ContentTabProps> = ({ 
    loading, 
    modules, 
    itemVisibility, 
    onToggleItemVisibility,
    courseId
}) => {
    const navigate = useNavigate()
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const [vrEntriesByModule, setVrEntriesByModule] = useState<Record<string, VrCodeEntry[]>>({})

    // Load VR room entries for every module, same approach as CourseContentScreen:
    // one request per module, fired in parallel.
    useEffect(() => {
        if (loading || modules.length === 0) return

        let cancelled = false

        const loadVrEntries = async () => {
            try {
                const entries = await Promise.all(
                    modules.map(m => getModuleVrCode(m.id))
                )
                if (cancelled) return
                const vrMap: Record<string, VrCodeEntry[]> = {}
                modules.forEach((m, index) => {
                    vrMap[m.id] = entries[index]
                })
                setVrEntriesByModule(vrMap)
            } catch (err) {
                console.error('Error fetching VR room entries:', err)
            }
        }

        loadVrEntries()

        return () => {
            cancelled = true
        }
    }, [loading, modules])

    const handleItemClick = (item: ModuleItem, moduleId: string) => {
        const url = item.content_url
        if (!url) return

        if (item.type === 'pdf') {
            navigate(
                `/course/${courseId || 'unknown'}/module/${moduleId}/pdf?url=${encodeURIComponent(url)}&itemId=${item.id}&editable=${item.is_editable ? 'true' : 'false'}`
            )
        } else {
            // video, link, or anything else — open in a new tab
            window.open(url, '_blank', 'noopener,noreferrer')
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>

            {loading ? (
                <div style={{ padding: '1.25rem', color: 'rgba(255,255,255,0.6)' }}>Cargando módulos…</div>
            ) : modules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)', border: '2px dashed rgba(255,255,255,0.12)', borderRadius: '16px' }}>
                    Este curso todavía no tiene módulos.
                </div>
            ) : (
                modules.map(m => {
                    const items = m.items || []
                    const vrEntries = vrEntriesByModule[m.id] || []
                    const hasContent = items.length > 0 || vrEntries.length > 0

                    return (
                        <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', overflow: 'hidden' }}>
                            {/* Module header */}
                            <div style={{ padding: '1.1rem 1.25rem', background: 'rgba(192,132,252,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f3e8ff' }}>{m.title}</h3>
                            </div>

                            {/* Items */}
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {!hasContent ? (
                                            <tr><td style={tdStyle} colSpan={2}>Este tema todavía no tiene contenido.</td></tr>
                                        ) : (
                                            <>
                                            {vrEntries.map(entry => {
                                                const isHovered = hoveredId === entry.id

                                                return (
                                                <tr
                                                    key={entry.id}
                                                    onMouseEnter={() => setHoveredId(entry.id)}
                                                    onMouseLeave={() => setHoveredId(null)}
                                                    onClick={(e) => {
                                                        if ((e.target as HTMLElement).closest('button, a')) return
                                                        window.open(entry.code, '_blank', 'noopener,noreferrer')
                                                    }}
                                                    style={{
                                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                        background: isHovered
                                                            ? 'rgba(168, 85, 247, 0.07)'
                                                            : 'transparent',
                                                        transition: 'background 0.18s',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <td style={tdStyle}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                                            <span style={{ fontSize: '1.1rem' }}>🚀</span>
                                                            <div>
                                                                <div style={{
                                                                    fontWeight: 600,
                                                                    color: isHovered ? '#c084fc' : undefined,
                                                                    textDecoration: isHovered ? 'underline' : 'none',
                                                                    transition: 'color 0.15s',
                                                                }}>
                                                                    {entry.title || 'Sala VR'}
                                                                </div>
                                                                {entry.description && (
                                                                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{entry.description}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ ...tdStyle, textAlign: 'right', width: 90 }}>
                                                        <a
                                                            href={entry.code}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ fontSize: '0.8rem', color: '#c4b5fd', textDecoration: 'none', fontWeight: 600 }}
                                                        >
                                                            Ver 🔗
                                                        </a>
                                                    </td>
                                                </tr>
                                                )
                                            })}
                                            {items.map(item => {
                                                const isHovered = hoveredId === item.id
                                                const isClickable = !!item.content_url

                                                return (
                                                <tr
                                                    key={item.id}
                                                    onMouseEnter={() => setHoveredId(item.id)}
                                                    onMouseLeave={() => setHoveredId(null)}
                                                    onClick={(e) => {
                                                        // Don't trigger row click if the user clicked the eye toggle
                                                        if ((e.target as HTMLElement).closest('button')) return
                                                        handleItemClick(item, m.id)
                                                    }}
                                                    style={{
                                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                        background: isHovered
                                                            ? 'rgba(168, 85, 247, 0.07)'
                                                            : 'transparent',
                                                        transition: 'background 0.18s',
                                                        cursor: isClickable ? 'pointer' : 'default',
                                                    }}
                                                >
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
                                            })}
                                            </>
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