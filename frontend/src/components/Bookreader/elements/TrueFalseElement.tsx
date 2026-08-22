import React, { useState } from 'react'
import { TrueFalseConfig, SavedResponse } from '../types'

interface Props {
    config: TrueFalseConfig
    savedResponse: SavedResponse | null
    onAnswer: (response: any) => void
}

const TrueFalseElement: React.FC<Props> = ({ config, savedResponse, onAnswer }) => {
    const [selected, setSelected] = useState<boolean | null>(savedResponse?.response?.value ?? null)
    const isCorrect = savedResponse?.is_correct ?? null

    const handleClick = (value: boolean) => {
        setSelected(value)
        onAnswer({ value })
    }

    const labels = config.labels || ['V', 'F']

    return (
        <div style={{
            width: 'fit-content',
            height: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-evenly',
            padding: '2px',
            background: 'rgba(255, 255, 255)',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            gap: '2px',
        }}>
            {config.prompt && (
                <p style={{ margin: '0 0 2px', fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>
                    {config.prompt}
                </p>
            )}
            
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                justifyContent: 'center'
            }}>
                {[true, false].map((val, idx) => {
                    const isSelected = selected === val
                    const labelText = labels[idx] !== undefined ? labels[idx] : (val ? 'V' : 'F')

                    let borderColor = '#6b7280'
                    let bgColor = 'transparent'

                    if (isSelected) {
                        if (isCorrect === true) {
                            borderColor = '#16a34a'
                            bgColor = '#16a34a'
                        } else if (isCorrect === false) {
                            borderColor = '#dc2626'
                            bgColor = '#dc2626'
                        } else {
                            borderColor = '#2563eb'
                            bgColor = '#2563eb'
                        }
                    }

                    return (
                        <div
                            key={String(val)}
                            onClick={() => handleClick(val)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                userSelect: 'none',
                                padding: '0px 0px',
                                borderRadius: '4px',
                                background: isSelected ? 'rgba(0,0,0,0.03)' : 'transparent',
                            }}
                        >
                            {/* Checkbox box */}
                            <div style={{
                                width: '10px',
                                height: '10px',
                                flexShrink: 0,
                                border: `2px solid ${borderColor}`,
                                borderRadius: '3px',
                                background: bgColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                            }}>
                                {isSelected && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M5 13l4 4L19 7"
                                            stroke="white"
                                            strokeWidth="3.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                            </div>

                            {/* Label */}
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: isSelected ? 700 : 500,
                                color: isSelected
                                    ? (isCorrect === true ? '#15803d' : isCorrect === false ? '#b91c1c' : '#1d4ed8')
                                    : '#374151',
                                lineHeight: 1,
                                display: 'none',
                            }}>
                                {labelText}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default TrueFalseElement