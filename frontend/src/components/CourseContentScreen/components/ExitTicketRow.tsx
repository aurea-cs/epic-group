import React from 'react'
import { type ExitTicketTemplate } from '../../../lib/adminApi'

interface ExitTicketRowProps {
    ticket: ExitTicketTemplate
    onDetach: (ticket: ExitTicketTemplate) => void
    onSwitch: (ticket: ExitTicketTemplate) => void
}

const ExitTicketRow: React.FC<ExitTicketRowProps> = ({ ticket, onDetach, onSwitch }) => {
    const questionCount =
        ticket.questions?.length ??
        ticket.exit_ticket_questions?.[0]?.count ??
        0

    return (
        <div className="module-item-row exit-ticket">
            <div style={{ fontSize: '1.5rem' }}>🎟️</div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 'bold' }}>{ticket.title}</div>

                {ticket.description && (
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.1rem' }}>
                        {ticket.description}
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.3rem' }}>
                    <span style={{
                        fontSize: '0.72rem',
                        color: ticket.is_active ? '#6ee7a8' : 'rgba(255,255,255,0.35)',
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                    }}>
                        <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: ticket.is_active ? '#6ee7a8' : 'rgba(255,255,255,0.3)',
                            display: 'inline-block',
                        }} />
                        {ticket.is_active ? 'Activo' : 'Inactivo'}
                    </span>

                    {questionCount > 0 && (
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                            {questionCount} {questionCount === 1 ? 'pregunta' : 'preguntas'}
                        </span>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                    onClick={() => onSwitch(ticket)}
                    title="Cambiar ticket de salida"
                    style={{
                        width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                        background: 'rgba(108, 92, 231, 0.2)', color: '#6c5ce7',
                        cursor: 'pointer', fontSize: '0.85rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    🔄
                </button>
                <button
                    onClick={() => onDetach(ticket)}
                    title="Desconectar ticket de salida"
                    style={{
                        width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                        background: 'rgba(220,38,38,0.15)', color: '#f87171',
                        cursor: 'pointer', fontSize: '0.85rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    🗑️
                </button>
            </div>
        </div>
    )
}

export default ExitTicketRow
