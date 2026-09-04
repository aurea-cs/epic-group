import React from 'react'
import type { Assignment, ModuleWithItems } from './types'
import { StatusPill, tdStyle, thStyle } from '../general/SharedUI'

interface AssignmentsTabProps {
    loading: boolean
    assignments: Assignment[]
    modules: ModuleWithItems[]
    onEdit: (assignment: Assignment) => void
    onDelete: (id: string) => void
}

const formatDateTime = (iso: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.3rem 0.65rem',
    borderRadius: '8px',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'background 0.15s, opacity 0.15s',
    whiteSpace: 'nowrap',
}

const AssignmentsTab: React.FC<AssignmentsTabProps> = ({ loading, assignments, modules, onEdit, onDelete }) => {
    const moduleNameById = (id: string | null) => modules.find(m => m.id === id)?.title || '—'

    return (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(192,132,252,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <th style={thStyle}>Título</th>
                            <th style={thStyle}>Módulo</th>
                            <th style={thStyle}>PDF asignado</th>
                            <th style={thStyle}>Vence</th>
                            <th style={thStyle}>Puntaje</th>
                            <th style={thStyle}>Estado</th>
                            <th style={{ ...thStyle, textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td style={tdStyle} colSpan={7}>Cargando tareas…</td></tr>
                        ) : assignments.length === 0 ? (
                            <tr><td style={tdStyle} colSpan={7}>Todavía no has creado ninguna tarea.</td></tr>
                        ) : (
                            assignments.map(a => (
                                <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ ...tdStyle, fontWeight: 600 }}>{a.title || 'Sin título'}</td>
                                    <td style={tdStyle}>{moduleNameById(a.module_id)}</td>
                                    <td style={tdStyle}>
                                        {a.module_item_id ? (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(192,132,252,0.15)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.3)' }}>
                                                    📄 {a.assigned_pages ? `p. ${a.assigned_pages}` : 'Completo'}
                                                </span>
                                            </span>
                                        ) : (
                                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>—</span>
                                        )}
                                    </td>
                                    <td style={tdStyle}>{formatDateTime(a.due_at)}</td>
                                    <td style={tdStyle}>{a.max_score ?? '—'}</td>
                                    <td style={tdStyle}><StatusPill value={a.status} /></td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                            <button
                                                style={{
                                                    ...btnBase,
                                                    background: 'rgba(192,132,252,0.15)',
                                                    color: '#c084fc',
                                                    border: '1px solid rgba(192,132,252,0.3)',
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(192,132,252,0.28)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(192,132,252,0.15)')}
                                                onClick={() => onEdit(a)}
                                                title="Editar tarea"
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                style={{
                                                    ...btnBase,
                                                    background: 'rgba(248,113,113,0.12)',
                                                    color: '#fca5a5',
                                                    border: '1px solid rgba(248,113,113,0.3)',
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.25)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.12)')}
                                                onClick={() => onDelete(a.id)}
                                                title="Eliminar tarea"
                                            >
                                                🗑 Eliminar
                                            </button>
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

export default AssignmentsTab