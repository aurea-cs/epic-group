import React, { useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import { OpenEndedConfig, SavedResponse } from '../types'

interface Props {
    config: OpenEndedConfig
    savedResponse: SavedResponse | null
    onAnswer: (response: any) => void
}

const OpenEndedElement: React.FC<Props> = ({ config, savedResponse, onAnswer }) => {
    const [text, setText] = useState<string>(savedResponse?.response?.text ?? '')
    const [draftText, setDraftText] = useState<string>(savedResponse?.response?.text ?? '')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const lastTapRef = useRef<number>(0)

    const handleOpenModal = () => {
        setDraftText(text)
        setIsModalOpen(true)
    }

    const handleSave = () => {
        setText(draftText)
        onAnswer({ text: draftText })
        setIsModalOpen(false)
    }

    const handleTouchStart = () => {
        const now = Date.now()
        if (now - lastTapRef.current < 300) {
            handleOpenModal()
        }
        lastTapRef.current = now
    }

    const modalContent = isModalOpen ? (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '16px',
            }}
            onClick={() => setIsModalOpen(false)}
        >
            <div
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    width: '100%',
                    maxWidth: '520px',
                    padding: '20px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                        {config.prompt || 'Escribe tu respuesta'}
                    </h3>
                    <button
                        onClick={() => setIsModalOpen(false)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            color: '#6b7280',
                            padding: '4px 8px',
                        }}
                    >
                        ✕
                    </button>
                </div>

                <textarea
                    value={draftText}
                    onChange={e => setDraftText(e.target.value)}
                    placeholder={config.placeholder || 'Escribe tu respuesta completa aquí...'}
                    autoFocus
                    style={{
                        width: '100%',
                        height: '160px',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '0.9rem',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        outline: 'none',
                    }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                        onClick={() => setIsModalOpen(false)}
                        style={{
                            padding: '8px 14px',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            background: '#f3f4f6',
                            color: '#374151',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#2563eb',
                            color: '#ffffff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                        }}
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    ) : null

    return (
        <>
            <div
                onDoubleClick={handleOpenModal}
                onTouchStart={handleTouchStart}
                title="Haz doble clic o doble toque para responder"
                style={{
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '6px',
                    border: '1px dashed #9ca3af',
                    padding: '4px 6px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    userSelect: 'none',
                    position: 'relative',
                    transition: 'border-color 0.2s, background 0.2s',
                }}
            >
                {config.prompt && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#4b5563', lineHeight: 1.1, marginBottom: '2px' }}>
                        {config.prompt}
                    </span>
                )}

                {text ? (
                    <p style={{
                        margin: 0,
                        fontSize: '0.75rem',
                        color: '#1f2937',
                        lineHeight: 1.2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-word',
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                    }}>
                        {text}
                    </p>
                ) : (
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', lineHeight: 1.2 }}>
                        {config.placeholder || 'Doble clic para responder...'}
                    </span>
                )}
            </div>

            {isModalOpen && ReactDOM.createPortal(modalContent, document.body)}
        </>
    )
}

export default OpenEndedElement