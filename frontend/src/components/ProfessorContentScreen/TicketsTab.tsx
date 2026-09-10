import React, { useState, useMemo } from 'react'
import { tdStyle, thStyle, inputStyleAlt } from '../general/SharedUI'
import CustomSelect from '../general/CustomSelect'
import { StudentExitTicketResponse } from './types'

interface TicketsTabProps {
    loading: boolean
    tickets: StudentExitTicketResponse[]
}

const TicketsTab: React.FC<TicketsTabProps> = ({ loading, tickets }) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [moduleFilter, setModuleFilter] = useState<string>('default')
    const [selectedTicket, setSelectedTicket] = useState<StudentExitTicketResponse | null>(null)

    const moduleOptions = useMemo(() => {
        const modules = Array.from(new Set(tickets.map(t => t.module_title).filter(Boolean))).sort()
        return [
            { value: 'default', label: 'Todos los módulos' },
            ...modules.map(m => ({ value: m!, label: m! })),
        ]
    }, [tickets])

    const filtered = useMemo(() => {
        return tickets.filter(t => {
            const studentName = t.student_name || t.student_id
            const matchesSearch =
                !searchQuery ||
                studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.student_email && t.student_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                t.student_id.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesModule =
                !moduleFilter ||
                moduleFilter === 'default' ||
                t.module_title === moduleFilter

            return matchesSearch && matchesModule
        })
    }, [tickets, searchQuery, moduleFilter])

    return (
        <>
            {/* Filters */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 260px' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar por alumno..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ ...inputStyleAlt, paddingLeft: '36px', width: '100%', background: 'rgba(255,255,255,0.06)' }}
                    />
                </div>
                <div style={{ flex: '1 1 220px' }}>
                    <CustomSelect
                        value={moduleFilter}
                        onChange={setModuleFilter}
                        options={moduleOptions}
                    />
                </div>
                {(searchQuery || (moduleFilter && moduleFilter !== 'default')) && (
                    <button
                        onClick={() => { setSearchQuery(''); setModuleFilter('default') }}
                        style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                    >
                        ✕ Limpiar
                    </button>
                )}
                <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎟️</div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Cargando entregas de tickets...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{searchQuery || moduleFilter !== 'default' ? '🔍' : '🎟️'}</div>
                        <h3 style={{ margin: '0 0 0.5rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                            {searchQuery || moduleFilter !== 'default' ? 'Sin resultados' : 'No hay respuestas registradas'}
                        </h3>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.88rem' }}>
                            {searchQuery || moduleFilter !== 'default' ? 'Prueba con otros filtros.' : 'Aún ningún alumno ha respondido tickets de salida en esta materia.'}
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(192,132,252,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    <th style={thStyle}>Alumno</th>
                                    <th style={thStyle}>Módulo</th>
                                    <th style={thStyle}>Fecha de entrega</th>
                                    <th style={thStyle}>Estado</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((ticket, idx) => {
                                    return (
                                        <tr
                                            key={ticket.id}
                                            style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'background 0.15s' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(192,132,252,0.05)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>
                                                <div>{ticket.student_name || ticket.student_id}</div>
                                                {ticket.student_email && (
                                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
                                                        {ticket.student_email}
                                                    </div>
                                                )}
                                            </td>

                                            <td style={tdStyle}>
                                                {ticket.module_title ? (
                                                    <span style={{ fontSize: '0.78rem', background: 'rgba(108, 92, 231, 0.15)', color: '#c084fc', padding: '0.2rem 0.55rem', borderRadius: '8px', border: '1px solid rgba(192,132,252,0.2)' }}>
                                                        {ticket.module_title}
                                                    </span>
                                                ) : '—'}
                                            </td>

                                            <td style={tdStyle}>
                                                {ticket.submitted_at
                                                    ? new Date(ticket.submitted_at).toLocaleString('es-MX', {
                                                        day: '2-digit', month: 'short', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })
                                                    : '—'}
                                            </td>

                                            <td style={tdStyle}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac', fontSize: '0.78rem', fontWeight: 500 }}>
                                                    ✅ Entregado
                                                </span>
                                            </td>

                                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                <button
                                                    onClick={() => setSelectedTicket(ticket)}
                                                    style={{
                                                        padding: '0.35rem 0.75rem',
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(192,132,252,0.3)',
                                                        background: 'rgba(108,92,231,0.2)',
                                                        color: '#e2e8f0',
                                                        fontSize: '0.82rem',
                                                        fontWeight: 500,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s',
                                                    }}
                                                >
                                                    👁️ Ver respuestas ({ticket.responses?.length ?? 0})
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Response Detail */}
            {selectedTicket && (
                <div
                    onClick={() => setSelectedTicket(null)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2000, padding: '1.5rem',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#1a1625', border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '20px', padding: '1.75rem', maxWidth: '640px', width: '100%',
                            maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff' }}>
                                    🎟️ {selectedTicket.ticket_title}
                                </h3>
                                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.88rem', color: '#c084fc' }}>
                                    Alumno: <strong>{selectedTicket.student_name}</strong> {selectedTicket.student_email && `(${selectedTicket.student_email})`}
                                </p>
                                {selectedTicket.module_title && (
                                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                                        Módulo: {selectedTicket.module_title}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedTicket(null)}
                                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '1.2rem', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            {!selectedTicket.responses || selectedTicket.responses.length === 0 ? (
                                <p style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.5)' }}>
                                    No se encontraron preguntas o respuestas asociadas.
                                </p>
                            ) : (
                                selectedTicket.responses.map((ans, idx) => (
                                    <div
                                        key={ans.question_id || idx}
                                        style={{
                                            background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '12px',
                                            padding: '1rem',
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, color: '#f3e8ff', marginBottom: '0.4rem', fontSize: '0.92rem' }}>
                                            {idx + 1}. {ans.question_title || `Pregunta ${idx + 1}`}
                                        </div>
                                        <div style={{
                                            background: 'rgba(108, 92, 231, 0.15)',
                                            border: '1px solid rgba(192, 132, 252, 0.2)',
                                            borderRadius: '8px',
                                            padding: '0.6rem 0.85rem',
                                            color: '#ffffff',
                                            fontSize: '0.9rem',
                                            whiteSpace: 'pre-wrap',
                                        }}>
                                            {ans.answer_text}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button
                                onClick={() => setSelectedTicket(null)}
                                style={{
                                    padding: '0.5rem 1.25rem',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'rgba(255,255,255,0.08)',
                                    color: '#ffffff',
                                    cursor: 'pointer',
                                }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default TicketsTab