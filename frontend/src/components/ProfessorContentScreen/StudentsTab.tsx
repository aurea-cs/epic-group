import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Student } from './types'
import { ActionButton, tdStyle, thStyle, inputStyleAlt } from '../general/SharedUI'

interface StudentsTabProps {
    loading: boolean
    students: Student[]
    onEdit: (student: Student) => void
    onDelete: (id: string) => void
    allCenters: { id: string, name: string }[]
    hideActions?: boolean
}

function avatarColor(name: string): string {
  const colors = ['#7c3aed, #4f46e5', '#0891b2, #0e7490', '#059669, #047857', '#d97706, #b45309', '#dc2626, #b91c1c', '#7c3aed, #a855f7', '#0284c7, #0369a1']
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + h
  return colors[Math.abs(h) % colors.length]
}

function formatTime(totalSeconds?: number): string {
  if (!totalSeconds) return '0s'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

const StudentsTab: React.FC<StudentsTabProps> = ({ loading, students, onEdit, onDelete, hideActions }) => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCenter, setFilterCenter] = useState('')

    const filtered = students.filter(s => {
    const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCenter = !filterCenter || s.centers.some(c => c.id === filterCenter)
    return matchesSearch && matchesCenter
   })

   
    return (
        <>
                {/* Filters */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>🔍</span>
            <input type="text" placeholder="Buscar por nombre o correo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ ...inputStyleAlt, paddingLeft: '36px', width: '100%', background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {(searchQuery || filterCenter) && (
            <button onClick={() => { setSearchQuery(''); setFilterCenter('') }} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
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
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎓</div>
              <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Cargando alumnos...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{searchQuery || filterCenter ? '🔍' : '🎓'}</div>
              <h3 style={{ margin: '0 0 0.5rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{searchQuery || filterCenter ? 'Sin resultados' : 'No hay alumnos aún'}</h3>
              <p style={{ margin: '0 0 1.5rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.88rem' }}>{searchQuery || filterCenter ? 'Prueba con otros filtros.' : 'Crea el primer alumno para comenzar.'}</p>

            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(192,132,252,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={thStyle}>Alumno</th>
                    <th style={thStyle}>Correo Electrónico</th>
                    <th style={thStyle}>Centros Inscritos</th>
                    <th style={thStyle}>Tiempo</th>
                    {!hideActions && <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((student, idx) => (
                    <tr
                      key={student.id}
                      style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'background 0.15s', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(192,132,252,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => navigate(`/alumnos/${student.id}`)}
                    >
                      {/* Avatar + Name */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${avatarColor(student.name)})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', fontWeight: 700, color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                            {student.avatar_url
                              ? <img src={student.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : student.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.93rem', color: '#fff' }}>{student.name}</div>
                            {student.created_at && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>Desde {new Date(student.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' })}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={tdStyle}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.87rem' }}>{student.email}</span>
                      </td>

                      {/* Centers */}
                      <td style={tdStyle}>
                        {student.centers.length === 0
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24', fontSize: '0.78rem', fontWeight: 500 }}>⚠️ Sin inscripción</span>
                          : <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                              {student.centers.map(c => (
                                <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)', color: '#67e8f9', fontSize: '0.78rem', fontWeight: 500 }}>
                                  🏫 {c.name}
                                </span>
                              ))}
                            </div>
                        }
                      </td>

                      {/* Time */}
                      <td style={tdStyle}>
                        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', fontWeight: 500 }}>
                          ⏱️ {formatTime(student.total_time_seconds)}
                        </span>
                      </td>

                      {/* Actions */}
                      {!hideActions && (
                        <td style={{ ...tdStyle, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <ActionButton label="✏️ Editar" bg="rgba(192,132,252,0.13)" hoverBg="rgba(192,132,252,0.25)" textColor="#e9d5ff" border="1px solid rgba(192,132,252,0.3)" onClick={() => onEdit(student)} />
                            <ActionButton label="🗑️" bg="rgba(239,68,68,0.1)" hoverBg="rgba(239,68,68,0.22)" textColor="#fca5a5" border="1px solid rgba(239,68,68,0.22)" onClick={() => onDelete(student.id)} />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        </>
    )
}

export default StudentsTab