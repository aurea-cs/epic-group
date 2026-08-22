import React, { useState, useRef, useEffect } from 'react'
import { OpenEndedConfig, SavedResponse } from '../types.ts'

interface Props {
    config: OpenEndedConfig
    savedResponse: SavedResponse | null
    onAnswer: (response: any) => void
}

const SAVE_DEBOUNCE_MS = 800

const OpenEndedElement: React.FC<Props> = ({ config, savedResponse, onAnswer }) => {
    const [text, setText] = useState<string>(savedResponse?.response?.text ?? '')
    const [saved, setSaved] = useState(true)
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleChange = (value: string) => {
        setText(value)
        setSaved(false)
        if (debounceTimer.current) clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(() => {
            onAnswer({ text: value })
            setSaved(true)
        }, SAVE_DEBOUNCE_MS)
    }

    useEffect(() => {
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
    }, [])

    return (
        <div style={{
            background: 'rgba(255,255,255,0.92)', borderRadius: '8px', padding: '10px',
            display: 'flex', flexDirection: 'column', gap: '6px', height: '100%', boxSizing: 'border-box',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }}>
            {config.prompt && <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{config.prompt}</p>}
            <textarea
                value={text}
                onChange={e => handleChange(e.target.value)}
                placeholder={config.placeholder || 'Escribe tu respuesta...'}
                style={{
                    flex: 1, resize: 'none', fontSize: '0.8rem', padding: '6px',
                    borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'inherit',
                }}
            />
            <span style={{ fontSize: '0.65rem', color: saved ? '#16a34a' : '#a1a1aa', alignSelf: 'flex-end' }}>
                {saved ? 'Guardado' : 'Guardando...'}
            </span>
        </div>
    )
}

export default OpenEndedElement