import React, { useState } from 'react'
import { type ThinkBlock, type ThinkBlockPrompt, type ThinkBlockPromptType } from '../../../lib/adminApi'

const PROMPT_TYPE_LABELS: Record<ThinkBlockPromptType, string> = {
    piensa: 'Piensa',
    observa: 'Observa',
    experimenta: 'Experimenta',
    otro: 'Otro',
}

const PROMPT_TYPE_ICONS: Record<ThinkBlockPromptType, string> = {
    piensa: '🧠',
    observa: '🔍',
    experimenta: '🧪',
    otro: '💡',
}

const PROMPT_TYPE_COLORS: Record<ThinkBlockPromptType, string> = {
    piensa: 'rgba(167, 139, 250, 0.25)',
    observa: 'rgba(56, 189, 248, 0.2)',
    experimenta: 'rgba(52, 211, 153, 0.2)',
    otro: 'rgba(251, 191, 36, 0.2)',
}

interface ThinkBlockRowProps {
    block: ThinkBlock
}

const ThinkBlockRow: React.FC<ThinkBlockRowProps> = ({ block }) => {
    const [expanded, setExpanded] = useState(false)

    const prompts: ThinkBlockPrompt[] = (
        Array.isArray(block.prompts)
            ? block.prompts
            : Array.isArray(block.think_block_prompts)
                ? (block.think_block_prompts as ThinkBlockPrompt[])
                : []
    )

    const promptCount = prompts.length || (
        Array.isArray(block.think_block_prompts) &&
        (block.think_block_prompts[0] as any)?.count
            ? (block.think_block_prompts[0] as any).count
            : 0
    )

    // Truncate fun_fact_md for preview
    const preview = block.fun_fact_md?.length > 120
        ? block.fun_fact_md.slice(0, 120) + '…'
        : block.fun_fact_md

    return (
        <div
            className="module-item-row think-block-row"
            style={{
                flexDirection: 'column',
                alignItems: 'stretch',
                cursor: 'pointer',
                gap: 0,
                padding: 0,
                overflow: 'hidden',
            }}
        >
            {/* Header row */}
            <div
                onClick={() => setExpanded(prev => !prev)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                }}
            >
                <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>🔬</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                    }}>
                        <span style={{ color: '#a7f3d0' }}>Piensa, observa y experimenta</span>
                        <span style={{
                            fontSize: '0.68rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            background: 'rgba(52, 211, 153, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(52, 211, 153, 0.3)',
                        }}>
                            Think Block
                        </span>
                        {!block.is_active && (
                            <span style={{
                                fontSize: '0.68rem',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                background: 'rgba(220,38,38,0.15)',
                                color: '#f87171',
                                border: '1px solid rgba(220,38,38,0.3)',
                            }}>
                                Inactivo
                            </span>
                        )}
                    </div>

                    <div style={{
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.65)',
                        marginTop: '0.2rem',
                        lineHeight: 1.4,
                    }}>
                        {preview}
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginTop: '0.35rem',
                        flexWrap: 'wrap',
                    }}>
                        {typeof promptCount === 'number' && promptCount > 0 && (
                            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' }}>
                                {promptCount} {promptCount === 1 ? 'actividad' : 'actividades'}
                            </span>
                        )}
                        {prompts.length > 0 && prompts.map(p => (
                            <span
                                key={p.id || p.prompt_type}
                                title={PROMPT_TYPE_LABELS[p.prompt_type]}
                                style={{ fontSize: '0.9rem' }}
                            >
                                {PROMPT_TYPE_ICONS[p.prompt_type]}
                            </span>
                        ))}
                    </div>
                </div>

                <div style={{
                    flexShrink: 0,
                    fontSize: '0.75rem',
                    color: 'rgba(255,255,255,0.4)',
                    transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                }}>
                    ▶
                </div>
            </div>

            {/* Expanded prompts */}
            {expanded && prompts.length > 0 && (
                <div style={{
                    borderTop: '1px solid rgba(52, 211, 153, 0.15)',
                    background: 'rgba(0,0,0,0.15)',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                }}>
                    {prompts.map((p, idx) => (
                        <div
                            key={p.id || idx}
                            style={{
                                display: 'flex',
                                gap: '0.6rem',
                                alignItems: 'flex-start',
                                background: PROMPT_TYPE_COLORS[p.prompt_type],
                                borderRadius: '8px',
                                padding: '0.6rem 0.75rem',
                            }}
                        >
                            <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '0.05rem' }}>
                                {p.icon || PROMPT_TYPE_ICONS[p.prompt_type]}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    color: 'rgba(255,255,255,0.55)',
                                    marginBottom: '0.2rem',
                                }}>
                                    {p.label || PROMPT_TYPE_LABELS[p.prompt_type]}
                                </div>
                                <div style={{
                                    fontSize: '0.85rem',
                                    color: 'rgba(255,255,255,0.9)',
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-wrap',
                                }}>
                                    {p.prompt_md}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {expanded && prompts.length === 0 && (
                <div style={{
                    borderTop: '1px solid rgba(52, 211, 153, 0.15)',
                    background: 'rgba(0,0,0,0.15)',
                    padding: '0.75rem 1rem',
                    fontSize: '0.85rem',
                    color: 'rgba(255,255,255,0.45)',
                    fontStyle: 'italic',
                }}>
                    Sin actividades registradas en este bloque.
                </div>
            )}
        </div>
    )
}

export default ThinkBlockRow
