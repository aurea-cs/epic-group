import React from 'react'
import type { Assignment, ModuleWithItems } from './types'
import { ActionButton, StatusPill, tdStyle, thStyle } from '../general/SharedUI'
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
                            <th style={thStyle}>Vence</th>
                            <th style={thStyle}>Puntaje</th>
                            <th style={thStyle}>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td style={tdStyle} colSpan={5}>Cargando tareas…</td></tr>
                        ) : assignments.length === 0 ? (
                            <tr><td style={tdStyle} colSpan={5}>Todavía no has creado ninguna tarea.</td></tr>
                        ) : (
                            assignments.map(a => (
                                <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={tdStyle}>{a.title || 'Sin título'}</td>
                                    <td style={tdStyle}>{moduleNameById(a.module_id)}</td>
                                    <td style={tdStyle}>{formatDateTime(a.due_at)}</td>
                                    <td style={tdStyle}>{a.max_score ?? '—'}</td>
                                    <td style={tdStyle}><StatusPill value={a.status} /></td>
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