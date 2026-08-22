import React, { useState } from 'react'
import { CheckboxConfig, SavedResponse } from '../types'

interface Props {
    config: CheckboxConfig
    savedResponse: SavedResponse | null
    onAnswer: (response: any) => void
}

const CheckboxElement: React.FC<Props> = ({ config, savedResponse, onAnswer }) => {
    const [checked, setChecked] = useState<boolean>(
        savedResponse?.response?.checked ?? false
    )
    const [isCorrect, setIsCorrect] = useState<boolean | null>(
        savedResponse?.is_correct ?? null
    )

    const handleClick = () => {
        const nextChecked = !checked
        setChecked(nextChecked)
        
        let correctState: boolean | null = null
        if (typeof config.correct === 'boolean') {
            correctState = nextChecked === config.correct
            setIsCorrect(correctState)
        } else {
            setIsCorrect(null)
        }

        onAnswer({ checked: nextChecked })
    }

    const borderColor =
        isCorrect === true ? '#16a34a' :
        isCorrect === false ? '#dc2626' :
        checked ? '#2563eb' : '#4b5563'

    const bgColor = checked
        ? (isCorrect === true ? '#16a34a' : isCorrect === false ? '#dc2626' : '#2563eb')
        : 'rgba(255, 255, 255, 0.85)'

    return (
        <div
            onClick={handleClick}
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                boxSizing: 'border-box',
                gap: '6px',
            }}
        >
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    minWidth: '10px',
                    minHeight: '10px',
                    border: `2px solid ${borderColor}`,
                    borderRadius: '4px',
                    background: bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'all 0.15s ease-in-out',
                }}
            >
                {checked && (
                    <svg width="70%" height="70%" viewBox="0 0 24 24" fill="none">
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
            {config.label && (
                <span style={{ fontSize: '0.85rem', color: '#1f2937', fontWeight: 500 }}>
                    {config.label}
                </span>
            )}
        </div>
    )
}

export default CheckboxElement
