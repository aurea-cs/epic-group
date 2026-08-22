import React, { useState } from 'react'
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
    const [isCorrect, setIsCorrect] = useState<boolean | null>(savedResponse?.is_correct ?? null)

    const handleClick = (index: number) => {
        setSelectedIndex(index)
        setIsCorrect(index === config.correct_index)
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

    return (
        <div style={{
            background: 'rgba(255,255,255,0.92)', borderRadius: '8px', padding: '10px',
            display: 'flex', flexDirection: 'column', gap: '6px', height: '100%', boxSizing: 'border-box',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)', overflow: 'auto',
        }}>
            {config.prompt && <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{config.prompt}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {config.options.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => handleClick(index)}
                        style={{
                            textAlign: 'left', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ccc',
                            cursor: 'pointer', fontSize: '0.8rem',
                            background: selectedIndex === index
                                ? (isCorrect === null ? '#e0e7ff' : isCorrect ? '#bbf7d0' : '#fecaca')
                                : 'white',
                            fontWeight: selectedIndex === index ? 600 : 400,
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