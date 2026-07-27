import React from 'react'
import { tdStyle, EyeToggle } from '../general/SharedUI'
import { ITEM_TYPE_ICON, type ModuleWithItems } from './types'
interface ContentTabProps {
    loading: boolean
    modules: ModuleWithItems[]
    itemVisibility: Record<string, boolean>
    onToggleItemVisibility: (itemId: string) => void
}

const ContentTab: React.FC<ContentTabProps> = ({ loading, modules, itemVisibility, onToggleItemVisibility }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {loading ? (
                <div style={{ padding: '1.25rem', color: 'rgba(255,255,255,0.6)' }}>Cargando módulos…</div>
            ) : modules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)', border: '2px dashed rgba(255,255,255,0.12)', borderRadius: '16px' }}>
                    Este curso todavía no tiene módulos.
                </div>
            ) : (
                modules.map(m => {
                    const items = m.items || []
                    return (
                        <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', overflow: 'hidden' }}>
                            {/* Module header */}
                            <div style={{ padding: '1.1rem 1.25rem', background: 'rgba(192,132,252,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f3e8ff' }}>{m.title}</h3>
                            </div>

                            {/* Items */}
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {items.length === 0 ? (
                                            <tr><td style={tdStyle} colSpan={2}>Este tema todavía no tiene contenido.</td></tr>
                                        ) : (
                                            items.map(item => (
                                                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={tdStyle}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                                            <span style={{ fontSize: '1.1rem' }}>{ITEM_TYPE_ICON[item.type] || '📎'}</span>
                                                            <div>
                                                                <div style={{ fontWeight: 600 }}>{item.title}</div>
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
                                            ))
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
