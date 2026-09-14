import React, { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { getExitTickets, type ExitTicketTemplate } from '../../../lib/adminApi'

interface SwitchExitTicketModalProps {
    isOpen: boolean
    currentTicket: ExitTicketTemplate | null
    attachedTicketIds?: string[]
    onClose: () => void
    onSelectTicket: (newTicketId: string) => Promise<void>
}

const SwitchExitTicketModal: React.FC<SwitchExitTicketModalProps> = ({
    isOpen,
    currentTicket,
    attachedTicketIds = [],
    onClose,
    onSelectTicket,
}) => {
    const [templates, setTemplates] = useState<ExitTicketTemplate[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectingId, setSelectingId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    const isSwitchMode = !!currentTicket

    useEffect(() => {
        if (!isOpen) return

        setSearchTerm('')
        setError(null)
        setLoading(true)

        getExitTickets()
            .then(data => {
                setTemplates(data)
            })
            .catch(err => {
                console.error('Error fetching global exit tickets:', err)
                setError('No se pudieron cargar los tickets de salida disponibles.')
            })
            .finally(() => {
                setLoading(false)
            })
    }, [isOpen])

    if (!isOpen) return null

    const filteredTemplates = templates.filter(t =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.description &&
            t.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const handleSelect = async (newTicketId: string) => {
        if (currentTicket && newTicketId === currentTicket.id) return

        try {
            setSelectingId(newTicketId)
            await onSelectTicket(newTicketId)
            onClose()
        } catch (err: any) {
            alert(err.message || 'Error al procesar el ticket de salida')
        } finally {
            setSelectingId(null)
        }
    }

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
            style={{ zIndex: 1000 }}
        >
            <div
                className="school-modal-content"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '560px',
                    width: '90%',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '1.75rem',
                }}
            >
                <div style={{ marginBottom: '1rem' }}>
                    <div
                        style={{
                            position: 'relative',
                            width: '100%',
                        }}
                    >
                        <Search
                            size={18}
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                left: '0.85rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#64748b',
                                pointerEvents: 'none',
                            }}
                        />

                        <input
                            type="text"
                            className="modern-input"
                            placeholder="Buscar ticket por nombre..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                paddingLeft: '2.6rem',
                            }}
                        />
                    </div>
                </div>

                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        paddingRight: '0.25rem',
                        marginBottom: '1rem',
                    }}
                >
                    {loading && (
                        <div
                            style={{
                                padding: '2rem',
                                textAlign: 'center',
                                color: '#64748b',
                            }}
                        >
                            Cargando tickets de salida...
                        </div>
                    )}

                    {error && (
                        <div
                            style={{
                                padding: '1rem',
                                background: '#fef2f2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {!loading &&
                        !error &&
                        filteredTemplates.length === 0 && (
                            <div
                                style={{
                                    padding: '2rem',
                                    textAlign: 'center',
                                    color: '#64748b',
                                    fontStyle: 'italic',
                                }}
                            >
                                No se encontraron tickets de salida disponibles.
                            </div>
                        )}

                    {!loading &&
                        !error &&
                        filteredTemplates.map(tpl => {
                            const isCurrent = currentTicket?.id === tpl.id
                            const isAlreadyAttached =
                                !isCurrent &&
                                attachedTicketIds.includes(tpl.id)

                            const questionCount =
                                tpl.questions?.length ??
                                tpl.exit_ticket_questions?.[0]?.count ??
                                0

                            const isSelecting = selectingId === tpl.id

                            return (
                                <div
                                    key={tpl.id}
                                    className="exit-ticket-option"
                                    style={{
                                        position: 'relative',
                                        border: isCurrent
                                            ? '2px solid #7c3aed'
                                            : '1px solid #cbd5e1',
                                        borderRadius: '10px',
                                        padding: '0.9rem 1rem',
                                        background: isCurrent
                                            ? '#f5f3ff'
                                            : '#ffffff',
                                        boxShadow: isCurrent
                                            ? '0 0 0 3px rgba(124, 58, 237, 0.10)'
                                            : '0 1px 2px rgba(15, 23, 42, 0.04)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        transition:
                                            'border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease',
                                        opacity: isAlreadyAttached ? 0.65 : 1,
                                    }}
                                >
                                    <div
                                        style={{
                                            flex: 1,
                                            minWidth: 0,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontWeight: 650,
                                                    color: '#0f172a',
                                                }}
                                            >
                                                {tpl.title}
                                            </span>

                                            {isAlreadyAttached && (
                                                <span
                                                    style={{
                                                        fontSize: '0.72rem',
                                                        background: '#f1f5f9',
                                                        color: '#475569',
                                                        border: '1px solid #cbd5e1',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '999px',
                                                        fontWeight: 600,
                                                        lineHeight: 1.2,
                                                    }}
                                                >
                                                    Ya adjuntado
                                                </span>
                                            )}
                                        </div>

                                        {tpl.description && (
                                            <p
                                                style={{
                                                    margin: '0.25rem 0 0 0',
                                                    fontSize: '0.82rem',
                                                    color: '#64748b',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {tpl.description}
                                            </p>
                                        )}

                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                marginTop: '0.4rem',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.3rem',
                                                    fontSize: '0.72rem',
                                                    color: tpl.is_active
                                                        ? '#15803d'
                                                        : '#64748b',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    style={{
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: tpl.is_active
                                                            ? '#16a34a'
                                                            : '#94a3b8',
                                                    }}
                                                />

                                                {tpl.is_active
                                                    ? 'Activo'
                                                    : 'Inactivo'}
                                            </span>

                                            {questionCount > 0 && (
                                                <span
                                                    style={{
                                                        fontSize: '0.72rem',
                                                        color: '#64748b',
                                                    }}
                                                >
                                                    {questionCount}{' '}
                                                    {questionCount === 1
                                                        ? 'pregunta'
                                                        : 'preguntas'}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        {isCurrent ? (
                                            <button
                                                disabled
                                                aria-label={`Ticket seleccionado: ${tpl.title}`}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.35rem',
                                                    padding: '0.45rem 0.75rem',
                                                    borderRadius: '7px',
                                                    border: '1px solid #7c3aed',
                                                    background: '#7c3aed',
                                                    color: '#ffffff',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 700,
                                                    cursor: 'not-allowed',
                                                    boxShadow:
                                                        '0 1px 2px rgba(124, 58, 237, 0.2)',
                                                }}
                                            >
                                                Actual
                                            </button>
                                        ) : isAlreadyAttached ? (
                                            <button
                                                disabled
                                                style={{
                                                    padding: '0.45rem 0.75rem',
                                                    borderRadius: '7px',
                                                    border: '1px solid #cbd5e1',
                                                    background: '#f1f5f9',
                                                    color: '#64748b',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 650,
                                                    cursor: 'not-allowed',
                                                }}
                                            >
                                                Adjuntado
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() =>
                                                    handleSelect(tpl.id)
                                                }
                                                disabled={!!selectingId}
                                                className="btn-save-modern"
                                                style={{
                                                    padding: '0.45rem 0.85rem',
                                                    fontSize: '0.8rem',
                                                    border: '1px solid #ae86f4ff',
                                                    background: '#ae86f4ff',
                                                    cursor: selectingId
                                                        ? 'wait'
                                                        : 'pointer',
                                                    
                                                }}
                                            >
                                                {isSelecting
                                                    ? isSwitchMode
                                                        ? 'Cambiando…'
                                                        : 'Añadiendo…'
                                                    : isSwitchMode
                                                        ? 'Cambiar'
                                                        : 'Añadir'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                </div>

                <div
                    className="modal-actions"
                    style={{
                        justifyContent: 'flex-end',
                        paddingTop: '0.5rem',
                    }}
                >
                    <button
                        className="btn-cancel-modern"
                        onClick={onClose}
                        disabled={!!selectingId}
                    >
                        Cancelar
                    </button>
                </div>
            </div>

            <style>
                {`
                    .exit-ticket-option:not(:has(button:disabled)):hover {
                        border-color: #a78bfa !important;
                        background: #faf8ff !important;
                        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08) !important;
                    }

                    .exit-ticket-option button:not(:disabled):focus-visible {
                        outline: 3px solid rgba(124, 58, 237, 0.3);
                        outline-offset: 2px;
                    }

                    .exit-ticket-option button:disabled {
                        -webkit-text-fill-color: inherit;
                    }
                `}
            </style>
        </div>
    )
}

export default SwitchExitTicketModal