import React from 'react'
import type { Submission } from './types'
import { ActionButton, tdStyle, thStyle } from '../general/SharedUI'

interface SubmissionsTabProps {
    loading: boolean
    submissions: Submission[]
    onGrade: (submission: Submission) => void
}

const SubmissionsTab: React.FC<SubmissionsTabProps> = ({ loading, submissions, onGrade }) => {
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
                            <tr><td style={tdStyle} colSpan={4}>Cargando entregas...</td></tr>
                        ) : submissions.length === 0 ? (
                            <tr><td style={tdStyle} colSpan={4}>No hay entregas disponibles.</td></tr>
                        ) : (
                            submissions.map(submission => (
                                <tr key={submission.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={tdStyle}>{submission.title || 'Sin título'}</td>
                                    <td style={tdStyle}>{submission.file_url || '—'}</td>
                                    <td style={tdStyle}>{submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <ActionButton
                                                label="Editar" bg="rgba(255,255,255,0.06)" hoverBg="rgba(255,255,255,0.12)"
                                                textColor="#e5e7eb" border="1px solid rgba(255,255,255,0.12)"
                                                onClick={() => onGrade(submission)}
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

export default SubmissionsTab