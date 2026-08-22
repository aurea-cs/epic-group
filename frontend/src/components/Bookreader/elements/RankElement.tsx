// IMPORTANT NOT TESTED IN PDF - NOT WORKING PROPERLY

import React, { useState } from 'react'
import { RankConfig, SavedResponse } from '../types.ts'

interface Props {
    config: RankConfig
    savedResponse: SavedResponse | null
    onAnswer: (response: any) => void
}

// Reordering via up/down buttons rather than drag-and-drop — avoids pulling
// in a DnD library for the first version. Swap for dnd-kit later if drag
// feels important; the response shape ({ order: string[] }) won't need to change.
const RankElement: React.FC<Props> = ({ config, savedResponse, onAnswer }) => {
    const initialOrder = savedResponse?.response?.order ?? config.items.map(i => i.id)
    const [order, setOrder] = useState<string[]>(initialOrder)

    const itemById = (id: string) => config.items.find(i => i.id === id)

    const move = (index: number, direction: -1 | 1) => {
        const target = index + direction
        if (target < 0 || target >= order.length) return
        const updated = [...order]
        ;[updated[index], updated[target]] = [updated[target], updated[index]]
        setOrder(updated)
        onAnswer({ order: updated })
    }

    return (
        <div style={{
            background: 'rgba(255,255,255,0.92)', borderRadius: '8px', padding: '10px',
            display: 'flex', flexDirection: 'column', gap: '6px', height: '100%', boxSizing: 'border-box',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)', overflow: 'auto',
        }}>
            {config.prompt && <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{config.prompt}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {order.map((id, index) => {
                    const item = itemById(id)
                    if (!item) return null
                    return (
                        <div key={id} style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            border: '1px solid #ccc', borderRadius: '6px', padding: '4px 6px',
                        }}>
                            <span style={{ fontSize: '0.7rem', color: '#71717a', width: '14px' }}>{index + 1}</span>
                            <span style={{ flex: 1, fontSize: '0.8rem' }}>{item.label}</span>
                            <button onClick={() => move(index, -1)} disabled={index === 0}
                                style={arrowButtonStyle(index === 0)}>↑</button>
                            <button onClick={() => move(index, 1)} disabled={index === order.length - 1}
                                style={arrowButtonStyle(index === order.length - 1)}>↓</button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function arrowButtonStyle(disabled: boolean): React.CSSProperties {
    return {
        border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.3 : 1, fontSize: '0.9rem', padding: '2px 4px',
    }
}

export default RankElement