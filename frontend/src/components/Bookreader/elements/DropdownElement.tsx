import React, { useState } from 'react'
import { DropdownConfig, SavedResponse } from '../types'

interface Props {
    config: DropdownConfig
    savedResponse: SavedResponse | null
    onAnswer: (response: any) => void
}

const DropdownElement: React.FC<Props> = ({ config, savedResponse, onAnswer }) => {
    const [selected, setSelected] = useState<string>(savedResponse?.response?.selected ?? '')
    const [isCorrect, setIsCorrect] = useState<boolean | null>(savedResponse?.is_correct ?? null)

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value
        const selectedIdx = config.options.indexOf(val)
        setSelected(val)

        let correctState: boolean | null = null
        if (typeof config.correct_value === 'string') {
            correctState = val.trim().toLowerCase() === config.correct_value.trim().toLowerCase()
        } else if (typeof config.correct_index === 'number') {
            correctState = selectedIdx === config.correct_index
        }

        setIsCorrect(correctState)
        onAnswer({ selected: val, selected_index: selectedIdx })
    }

    const isSelected = Boolean(selected)
    
    let borderColor = '#9ca3af'
    let bgColor = 'rgba(255, 255, 255, 0.95)'
    let textColor = '#1f2937'

    if (isSelected) {
        if (isCorrect === true) {
            borderColor = '#16a34a'
            bgColor = '#f0fdf4'
            textColor = '#15803d'
        } else if (isCorrect === false) {
            borderColor = '#dc2626'
            bgColor = '#fef2f2'
            textColor = '#b91c1c'
        } else {
            borderColor = '#2563eb'
            bgColor = '#eff6ff'
            textColor = '#1d4ed8'
        }
    }

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
            gap: '4px',
        }}>
            {config.prompt && (
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                    {config.prompt}
                </span>
            )}

            <select
                value={selected}
                onChange={handleChange}
                style={{
                    width: '100%',
                    height: 'fit-content',
                    borderRadius: '4px',
                    border: `1.5px solid ${borderColor}`,
                    background: bgColor,
                    color: textColor,
                    fontSize: '0.65rem',
                    fontWeight: isSelected ? 600 : 400,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    outline: 'none',
                    boxSizing: 'border-box',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
            >
                <option value="" disabled hidden>
                    {config.placeholder || '-- Elije --'}
                </option>
                {config.options.map((opt, idx) => (
                    <option key={idx} value={opt} style={{ color: '#1f2937', fontWeight: 400 }}>
                        {opt}
                    </option>
                ))}
            </select>
        </div>
    )
}

export default DropdownElement
