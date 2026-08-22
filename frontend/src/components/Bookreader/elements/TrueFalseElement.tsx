import React, { useState } from 'react'
import { TrueFalseConfig, SavedResponse } from '../types.ts'

interface Props {
    config: TrueFalseConfig
    savedResponse: SavedResponse | null
    onAnswer: (response: any) => void
}

const TrueFalseElement: React.FC<Props> = ({ config, savedResponse, onAnswer }) => {
    const [selected, setSelected] = useState<boolean | null>(savedResponse?.response?.value ?? null)
    const [isCorrect, setIsCorrect] = useState<boolean | null>(savedResponse?.is_correct ?? null)

    const handleClick = (value: boolean) => {
        setSelected(value)
        setIsCorrect(value === config.correct)
        onAnswer({ value })
    }

    return (
        <div style={{
            background: 'rgba(255,255,255,0.92)', borderRadius: '8px', padding: '10px',
            display: 'flex', flexDirection: 'column', gap: '6px', height: '100%', boxSizing: 'border-box',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)', overflow: 'auto',
        }}>
            {config.prompt && <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{config.prompt}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
                {[true, false].map(value => (
                    <button
                        key={String(value)}
                        onClick={() => handleClick(value)}
                        style={{
                            flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #ccc',
                            cursor: 'pointer', fontSize: '0.85rem',
                            background: selected === value
                                ? (isCorrect === null ? '#e0e7ff' : isCorrect ? '#bbf7d0' : '#fecaca')
                                : 'white',
                            fontWeight: selected === value ? 600 : 400,
                        }}
                    >
                        {value ? 'Verdadero' : 'Falso'}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default TrueFalseElement