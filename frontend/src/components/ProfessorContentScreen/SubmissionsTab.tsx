import React, { useState, useMemo } from 'react'
import type { Submission } from './types'
import { ActionButton, tdStyle, thStyle, inputStyleAlt } from '../general/SharedUI'
import CustomSelect from '../general/CustomSelect'

interface SubmissionsTabProps {
    loading: boolean
    submissions: Submission[]
    onGrade: (submission: Submission) => void
}

type StatusFilter = '' | 'graded' | 'ungraded'

const SubmissionsTab: React.FC<SubmissionsTabProps> = ({ loading, submissions, onGrade }) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('')

    const filtered = useMemo(() => {
        return submissions.filter(s => {
            const matchesSearch = !searchQuery || s.studentName.toLowerCase().includes(searchQuery.toLowerCase())
            const isGraded = s.grade != null || !!s.graded_at
            const matchesStatus =
                !statusFilter ||
                (statusFilter === 'graded' && isGraded) ||
                (statusFilter === 'ungraded' && !isGraded)
            return matchesSearch && matchesStatus
        })
    }, [submissions, searchQuery, statusFilter])

    return (
        <>
            {/* Filters */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 260px' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar por nombre de alumno..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ ...inputStyleAlt, paddingLeft: '36px', width: '100%', background: 'rgba(255,255,255,0.06)' }}
                    />
                </div>
                <div style={{ flex: '1 1' }}>
                    <CustomSelect
                        value={statusFilter || 'default'}
                        onChange={value => setStatusFilter(value === 'default' ? '' : value as StatusFilter)}
                        options={[
                            { value: 'default', label: 'Todas las entregas' },
                            { value: 'ungraded', label: 'Por calificar' },
                            { value: 'graded', label: 'Calificadas' },
                        ]}
                    />
                </div>
                {(searchQuery || statusFilter) && (
                    <button
                        onClick={() => { setSearchQuery(''); setStatusFilter('') }}
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
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📝</div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Cargando entregas...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{searchQuery || statusFilter ? '🔍' : '📝'}</div>
                        <h3 style={{ margin: '0 0 0.5rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                            {searchQuery || statusFilter ? 'Sin resultados' : 'No hay entregas disponibles'}
                        </h3>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.88rem' }}>
                            {searchQuery || statusFilter ? 'Prueba con otros filtros.' : 'Aún no hay entregas de tus alumnos.'}
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(192,132,252,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    <th style={thStyle}>Alumno</th>
                                    <th style={thStyle}>Archivos</th>
                                    <th style={thStyle}>Fecha de entrega</th>
                                    <th style={thStyle}>Estado</th>
                                    <th style={thStyle}>Calificación</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((submission, idx) => {
                                    const isGraded = submission.grade != null || !!submission.graded_at
                                    return (
                                        <tr
                                            key={submission.id}
                                            style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'background 0.15s' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(192,132,252,0.05)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>{submission.studentName}</td>
                                            <td style={tdStyle}>
                                                {submission.files.length === 0 ? (
                                                    '—'
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                        {submission.files.map(file => {
                                                            const href = file.signed_url || undefined
                                                            return (
                                                                <a
                                                                    key={file.id}
                                                                    href={href}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{ color: '#c084fc', textDecoration: 'none', fontSize: '0.85rem' }}
                                                                >
                                                                    {file.file_name || 'Archivo sin nombre'}
                                                                </a>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={tdStyle}>
                                                {submission.submitted_at
                                                    ? new Date(submission.submitted_at).toLocaleString('es-MX', {
                                                        day: '2-digit', month: 'short', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })
                                                    : '—'}
                                            </td>
                                            <td style={tdStyle}>
                                                {isGraded ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac', fontSize: '0.78rem', fontWeight: 500 }}>
                                                        ✅ Calificada
                                                    </span>
                                                ) : (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24', fontSize: '0.78rem', fontWeight: 500 }}>
                                                        ⏳ Por calificar
                                                    </span>
                                                )}
                                            </td>
                                            <td style={tdStyle}>{submission.grade ?? '—'}</td>
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <ActionButton
                                                        label={isGraded ? '✏️ Revisar' : '📝 Calificar'}
                                                        bg="rgba(192,132,252,0.13)" hoverBg="rgba(192,132,252,0.25)"
                                                        textColor="#e9d5ff" border="1px solid rgba(192,132,252,0.3)"
                                                        onClick={() => onGrade(submission)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    )
}

export default SubmissionsTab