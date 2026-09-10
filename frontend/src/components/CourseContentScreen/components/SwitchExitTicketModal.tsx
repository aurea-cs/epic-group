import React, { useEffect, useState } from 'react'
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
        (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
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
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
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
                <div className="modal-header" style={{ marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.4rem' }}>
                        {isSwitchMode ? '🔄 Cambiar Ticket de Salida' : '🎟️ Adjuntar Ticket de Salida'}
                    </h2>
                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                        {isSwitchMode
                            ? `Reemplazar "${currentTicket.title}" por otro ticket global.`
                            : 'Selecciona un ticket de salida global para adjuntar a este módulo.'
                        }
                    </p>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <input
                        type="text"
                        className="modern-input"
                        placeholder="🔍 Buscar ticket por nombre..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ width: '100%' }}
                    />
                </div>

                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    paddingRight: '0.25rem',
                    marginBottom: '1rem',
                }}>
                    {loading && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                            Cargando tickets de salida...
                        </div>
                    )}

                    {error && (
                        <div style={{ padding: '1rem', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '0.9rem' }}>
                            {error}
                        </div>
                    )}

                    {!loading && !error && filteredTemplates.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                            No se encontraron tickets de salida disponibles.
                        </div>
                    )}

                    {!loading && !error && filteredTemplates.map(tpl => {
                        const isCurrent = currentTicket?.id === tpl.id
                        const isAlreadyAttached = !isCurrent && attachedTicketIds.includes(tpl.id)
                        const questionCount =
                            tpl.questions?.length ??
                            tpl.exit_ticket_questions?.[0]?.count ??
                            0
                        const isSelecting = selectingId === tpl.id

                        return (
                            <div
                                key={tpl.id}
                                style={{
                                    border: isCurrent ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    padding: '0.85rem 1rem',
                                    background: isCurrent ? '#f5f3ff' : '#ffffff',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    transition: 'all 0.2s',
                                    opacity: isAlreadyAttached ? 0.75 : 1,
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontWeight: 'bold', color: '#1e293b' }}>
                                            {tpl.title}
                                        </span>
                                        {isCurrent && (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                background: '#8b5cf6',
                                                color: '#fff',
                                                padding: '0.15rem 0.45rem',
                                                borderRadius: '12px',
                                                fontWeight: 600,
                                            }}>
                                                Actual
                                            </span>
                                        )}
                                        {isAlreadyAttached && (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                background: '#e2e8f0',
                                                color: '#64748b',
                                                padding: '0.15rem 0.45rem',
                                                borderRadius: '12px',
                                                fontWeight: 600,
                                            }}>
                                                Ya adjuntado
                                            </span>
                                        )}
                                    </div>

                                    {tpl.description && (
                                        <p style={{
                                            margin: '0.2rem 0 0 0',
                                            fontSize: '0.82rem',
                                            color: '#64748b',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {tpl.description}
                                        </p>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.3rem' }}>
                                        <span style={{
                                            fontSize: '0.72rem',
                                            color: tpl.is_active ? '#16a34a' : '#94a3b8',
                                            fontWeight: 500,
                                        }}>
                                            ● {tpl.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                        {questionCount > 0 && (
                                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                                {questionCount} {questionCount === 1 ? 'pregunta' : 'preguntas'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    {isCurrent ? (
                                        <button
                                            disabled
                                            style={{
                                                padding: '0.4rem 0.75rem',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: '#e2e8f0',
                                                color: '#94a3b8',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                cursor: 'not-allowed',
                                            }}
                                        >
                                            Seleccionado
                                        </button>
                                    ) : isAlreadyAttached ? (
                                        <button
                                            disabled
                                            style={{
                                                padding: '0.4rem 0.75rem',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: '#f1f5f9',
                                                color: '#94a3b8',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                cursor: 'not-allowed',
                                            }}
                                        >
                                            Adjuntado
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleSelect(tpl.id)}
                                            disabled={!!selectingId}
                                            className="btn-save-modern"
                                            style={{
                                                padding: '0.4rem 0.85rem',
                                                fontSize: '0.8rem',
                                                cursor: selectingId ? 'wait' : 'pointer',
                                            }}
                                        >
                                            {isSelecting ? (isSwitchMode ? 'Cambiando…' : 'Adjuntando…') : (isSwitchMode ? 'Seleccionar' : '+ Adjuntar')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="modal-actions" style={{ justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                    <button className="btn-cancel-modern" onClick={onClose} disabled={!!selectingId}>
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    )
}

export default SwitchExitTicketModal
