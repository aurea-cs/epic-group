import React, { useState, useRef } from 'react'
import { ConnectConfig, SavedResponse } from '../types.ts'

interface Props {
    config: ConnectConfig
    savedResponse: SavedResponse | null
    onAnswer: (response: any) => void
}

// Click a point, then click another point, to form a pair. Clicking an
// already-paired point removes that pair (toggle). Points are positioned
// as invisible/semi-visible hotspots over whatever illustration already
// exists in the page image — they don't render their own artwork.
const ConnectElement: React.FC<Props> = ({ config, savedResponse, onAnswer }) => {
    const [pairs, setPairs] = useState<[string, string][]>(savedResponse?.response?.pairs ?? [])
    const [pendingPoint, setPendingPoint] = useState<string | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const pointById = (id: string) => config.points.find(p => p.id === id)

    const findPairFor = (pointId: string) => pairs.find(([a, b]) => a === pointId || b === pointId)

    const handlePointClick = (pointId: string) => {
        const existingPair = findPairFor(pointId)
        if (existingPair) {
            // Clicking a point that's already paired removes that pair.
            const updated = pairs.filter(p => p !== existingPair)
            setPairs(updated)
            onAnswer({ pairs: updated })
            setPendingPoint(null)
            return
        }

        if (pendingPoint === null) {
            setPendingPoint(pointId)
            return
        }

        if (pendingPoint === pointId) {
            setPendingPoint(null)
            return
        }

        const updated: [string, string][] = [...pairs, [pendingPoint, pointId]]
        setPairs(updated)
        onAnswer({ pairs: updated })
        setPendingPoint(null)
    }

    return (
        <div
            ref={containerRef}
            style={{ position: 'relative', width: '100%', height: '100%' }}
        >
            {config.prompt && (
                <p style={{
                    position: 'absolute', top: '-24px', left: 0, margin: 0,
                    fontSize: '0.8rem', fontWeight: 600, color: 'white',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                }}>
                    {config.prompt}
                </p>
            )}

            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            >
                {pairs.map(([a, b], i) => {
                    const pa = pointById(a)
                    const pb = pointById(b)
                    if (!pa || !pb) return null
                    return (
                        <line
                            key={i}
                            x1={pa.x * 100} y1={pa.y * 100}
                            x2={pb.x * 100} y2={pb.y * 100}
                            stroke="#22c55e" strokeWidth={1.5}
                        />
                    )
                })}
            </svg>

            {config.points.map(point => {
                const isPaired = !!findPairFor(point.id)
                const isPending = pendingPoint === point.id
                return (
                    <button
                        key={point.id}
                        onClick={() => handlePointClick(point.id)}
                        title={point.label}
                        style={{
                            position: 'absolute',
                            left: `${point.x * 100}%`,
                            top: `${point.y * 100}%`,
                            transform: 'translate(-50%, -50%)',
                            width: '22px', height: '22px', borderRadius: '50%',
                            border: `2px solid ${isPaired ? '#22c55e' : isPending ? '#6366f1' : 'white'}`,
                            background: isPaired ? 'rgba(34,197,94,0.3)' : isPending ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.25)',
                            cursor: 'pointer', padding: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.65rem', color: 'white', fontWeight: 700,
                            boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
                        }}
                    >
                        {point.label}
                    </button>
                )
            })}
        </div>
    )
}

export default ConnectElement