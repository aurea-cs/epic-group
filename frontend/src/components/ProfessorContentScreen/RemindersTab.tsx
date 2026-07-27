import React from 'react'
import type { CalendarEvent } from './types'
import { ActionButton, tdStyle, thStyle } from '../general/SharedUI'

interface RemindersTabProps {
    loading: boolean
    events: CalendarEvent[]
    onEdit: (event: CalendarEvent) => void
    onDelete: (id: string) => void
}

const RemindersTab: React.FC<RemindersTabProps> = ({ loading, events, onEdit, onDelete }) => {
    return (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(192,132,252,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <th style={thStyle}>Título</th>
                            <th style={thStyle}>Tipo</th>
                            <th style={thStyle}>Fecha</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td style={tdStyle} colSpan={4}>Cargando eventos…</td></tr>
                        ) : events.length === 0 ? (
                            <tr><td style={tdStyle} colSpan={4}>No hay eventos programados.</td></tr>
                        ) : (
                            events.map(ev => (
                                <tr key={ev.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={tdStyle}>{ev.title || 'Sin título'}</td>
                                    <td style={tdStyle}>{ev.type || '—'}</td>
                                    <td style={tdStyle}>{ev.event_date ? new Date(ev.event_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <ActionButton
                                                label="Editar" bg="rgba(255,255,255,0.06)" hoverBg="rgba(255,255,255,0.12)"
                                                textColor="#e5e7eb" border="1px solid rgba(255,255,255,0.12)"
                                                onClick={() => onEdit(ev)}
                                            />
                                            <ActionButton
                                                label="Eliminar" bg="rgba(248,113,113,0.12)" hoverBg="rgba(248,113,113,0.22)"
                                                textColor="#fca5a5" border="1px solid rgba(248,113,113,0.3)"
                                                onClick={() => onDelete(ev.id)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default RemindersTab