import React, { useState, useRef, useEffect } from 'react'
import { MultipleChoiceConfig, SavedResponse } from '../types.ts'

interface Props {
    // `compact?: true` renders tight inline pill buttons with no card/shadow —
    // for cases like filling a blank "( __ )" with a short H/N/etc. choice,
    // where the element's box is the blank itself, not a question card.
    config: MultipleChoiceConfig & { compact?: boolean }
    savedResponse: SavedResponse | null
    onAnswer: (response: any) => void
}

const MultipleChoiceElement: React.FC<Props> = ({ config, savedResponse, onAnswer }) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(savedResponse?.response?.selected_index ?? null)
    const isCorrect = savedResponse?.is_correct ?? null
    
    const containerRef = useRef<HTMLDivElement>(null)
    const [containerWidth, setContainerWidth] = useState<number>(0)

    useEffect(() => {
        if (!containerRef.current) return
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width)
            }
        })
        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [])

    const handleClick = (index: number) => {
        setSelectedIndex(index)
        onAnswer({ selected_index: index })
    }

    if (config.compact) {
        return (
            <div style={{ display: 'flex', gap: '2px', width: '100%', height: '100%' }}>
                {config.options.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => handleClick(index)}
                        style={{
                            flex: 1, minWidth: 0, padding: 0, border: '1px solid #71717a', borderRadius: '3px',
                            cursor: 'pointer', fontSize: '0.7rem', lineHeight: 1,
                            fontWeight: selectedIndex === index ? 700 : 500,
                            background: selectedIndex === index
                                ? (isCorrect === null ? '#e0e7ff' : isCorrect ? '#bbf7d0' : '#fecaca')
                                : 'rgba(255,255,255,0.9)',
                        }}
                    >
                        {option}
                    </button>
                ))}
            </div>
        )
    }

    // Determine smart column width based on option text length and container width
    const maxOptionChars = Math.max(...(config.options || []).map(o => (o ? o.length : 1)), 1)
    // Approximate minimum pixels required per column (short labels need ~50px, longer text needs more)
    const minColWidth = Math.max(55, Math.min(140, maxOptionChars * 7.5))

    return (
        <div
            ref={containerRef}
            style={{
                background: 'rgba(255,255,255,0.92)',
                borderRadius: '8px',
                padding: '4px 6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                height: '100%',
                boxSizing: 'border-box',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                overflow: 'auto',
            }}
        >
            {config.prompt && <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{config.prompt}</p>}
            
            <div style={{
                display: 'grid',
                gridTemplateColumns: containerWidth > 0 
                    ? `repeat(auto-fit, minmax(${minColWidth}px, 1fr))`
                    : '1fr',
                gap: '4px',
                width: '100%',
            }}>
                {config.options.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => handleClick(index)}
                        style={{
                            textAlign: 'left',
                            padding: '3px 6px',
                            borderRadius: '5px',
                            border: '1px solid #d1d5db',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            lineHeight: 1.2,
                            wordBreak: 'break-word',
                            background: selectedIndex === index
                                ? (isCorrect === null ? '#e0e7ff' : isCorrect ? '#bbf7d0' : '#fecaca')
                                : 'white',
                            fontWeight: selectedIndex === index ? 700 : 400,
                            transition: 'background 0.15s',
                        }}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default MultipleChoiceElement