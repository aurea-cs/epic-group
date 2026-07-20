import React, { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'

interface StudentsAdminScreenProps {
  user: User
}

interface Center {
  id: string
  name: string
}

interface Student {
  id: string
  name: string
  email: string
  avatar_url?: string
  created_at?: string
  centers: Center[]
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ─── Shared Styles ────────────────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
}
const modalStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  border: '1px solid rgba(192,132,252,0.25)',
  borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '480px',
  boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(192,132,252,0.1)',
  color: '#fff', maxHeight: '90vh', overflowY: 'auto'
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '10px', color: '#fff', fontSize: '0.92rem', outline: 'none'
}
const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', fontWeight: 500, display: 'block'
}
const cancelBtnStyle: React.CSSProperties = {
  flex: 1, padding: '10px 14px',
  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '8px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.9rem'
}
const submitBtnStyle = (disabled: boolean): React.CSSProperties => ({
  flex: 2, padding: '10px 16px',
  background: disabled ? 'rgba(192,132,252,0.35)' : 'linear-gradient(135deg, #a855f7, #7c3aed)',
  border: 'none', borderRadius: '8px', color: '#fff',
  cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 600,
  boxShadow: disabled ? 'none' : '0 4px 15px rgba(168,85,247,0.35)'
})
const tdStyle: React.CSSProperties = { padding: '0.9rem 1.25rem', verticalAlign: 'middle' }

// ─── Helper components ────────────────────────────────────────────────────────
const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <div style={{ marginTop: '6px' }}>{children}</div>
  </div>
)

const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div style={{
    background: 'rgba(239,68,68,0.13)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '8px', padding: '10px 14px', color: '#fca5a5', fontSize: '0.85rem'
  }}>
    ⚠️ {message}
  </div>
)

const Th: React.FC<{ children: React.ReactNode; align?: 'left' | 'right' }> = ({ children, align = 'left' }) => (
  <th style={{
    padding: '0.9rem 1.25rem', textAlign: align,
    fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em',
    color: 'rgba(192,132,252,0.8)', textTransform: 'uppercase', whiteSpace: 'nowrap'
  }}>{children}</th>
)

const ActionButton: React.FC<{
  label: string; bg: string; hoverBg: string; textColor: string; border: string; onClick: () => void
}> = ({ label, bg, hoverBg, textColor, border, onClick }) => (
  <button
    onClick={onClick}
    style={{ padding: '6px 12px', borderRadius: '8px', border, background: bg, color: textColor, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', transition: 'background 0.15s' }}
    onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
    onMouseLeave={e => (e.currentTarget.style.background = bg)}
  >
    {label}
  </button>
)

const StatCard: React.FC<{ icon: string; value: number; label: string; color: string }> = ({ icon, value, label, color }) => (
  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
    <span style={{ fontSize: '1.6rem' }}>{icon}</span>
    <div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{label}</div>
    </div>
  </div>
)

function avatarColor(name: string): string {
  const colors = ['#7c3aed, #4f46e5', '#0891b2, #0e7490', '#059669, #047857', '#d97706, #b45309', '#dc2626, #b91c1c', '#7c3aed, #a855f7', '#0284c7, #0369a1']
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + h
  return colors[Math.abs(h) % colors.length]
}

// ─── Add Student Modal ────────────────────────────────────────────────────────
const AddStudentModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ fullName: '', email: '', password: 'ingles2025' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.email || !form.password) { setError('Todos los campos son requeridos.'); return }
    setSubmitting(true); setError('')
    try {
      const res = await fetch(`${API}/api/admin/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email, password: form.password, fullName: form.fullName, role: 'student' }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear alumno')
      onSuccess(); onClose()
    } catch (err: any) { setError(err.message || 'Error desconocido') }
    finally { setSubmitting(false) }
  }

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#c084fc' }}>➕ Nuevo Alumno</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>Crea una cuenta de alumno en la plataforma</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.6rem', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FormField label="Nombre Completo *">
            <input type="text" style={inputStyle} placeholder="Ej: María García López" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} autoFocus />
          </FormField>
          <FormField label="Correo Electrónico *">
            <input type="email" style={inputStyle} placeholder="alumno@ejemplo.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Contraseña *">
            <input type="text" style={inputStyle} placeholder="Contraseña temporal" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </FormField>
          {error && <ErrorBanner message={error} />}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancelar</button>
            <button type="submit" disabled={submitting} style={submitBtnStyle(submitting)}>{submitting ? 'Creando...' : '✓ Crear Alumno'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Edit Student Modal ───────────────────────────────────────────────────────
const EditStudentModal: React.FC<{ student: Student; allCenters: Center[]; onClose: () => void; onSuccess: () => void }> = ({ student, allCenters, onClose, onSuccess }) => {
  const [form, setForm] = useState({ fullName: student.name, email: student.email })
  const [selectedCenterIds, setSelectedCenterIds] = useState<string[]>(student.centers.map(c => c.id))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const toggleCenter = (id: string) => setSelectedCenterIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.email) { setError('Nombre y correo son requeridos.'); return }
    setSubmitting(true); setError('')
    try {
      const res = await fetch(`${API}/api/admin/users/${student.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: form.fullName, email: form.email, centerIds: selectedCenterIds }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al actualizar alumno')
      onSuccess(); onClose()
    } catch (err: any) { setError(err.message || 'Error desconocido') }
    finally { setSubmitting(false) }
  }

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ ...modalStyle, maxWidth: '520px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#c084fc' }}>✏️ Editar Alumno</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>
              Modificando a <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{student.name}</strong>
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.6rem', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FormField label="Nombre Completo *">
            <input type="text" style={inputStyle} value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} autoFocus />
          </FormField>
          <FormField label="Correo Electrónico *">
            <input type="email" style={inputStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </FormField>

          <div>
            <label style={labelStyle}>Centros Inscritos</label>
            {allCenters.length === 0
              ? <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: '6px 0 0' }}>No hay centros disponibles.</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
                  {allCenters.map(center => {
                    const checked = selectedCenterIds.includes(center.id)
                    return (
                      <label key={center.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '8px 12px', background: checked ? 'rgba(192,132,252,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${checked ? 'rgba(192,132,252,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', cursor: 'pointer', color: checked ? '#e9d5ff' : 'rgba(255,255,255,0.6)', fontSize: '0.88rem', userSelect: 'none' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleCenter(center.id)} style={{ accentColor: '#c084fc', width: '15px', height: '15px', cursor: 'pointer' }} />
                        {center.name}
                      </label>
                    )
                  })}
                </div>
            }
            <p style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.3)', margin: '6px 0 0' }}>Desmarcar un centro elimina las inscripciones del alumno en ese centro.</p>
          </div>

          {error && <ErrorBanner message={error} />}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancelar</button>
            <button type="submit" disabled={submitting} style={submitBtnStyle(submitting)}>{submitting ? 'Guardando...' : '✓ Guardar Cambios'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
const DeleteConfirmModal: React.FC<{ student: Student; onClose: () => void; onConfirm: () => void; deleting: boolean }> = ({ student, onClose, onConfirm, deleting }) => (
  <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
    <div style={{ ...modalStyle, maxWidth: '420px', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
      <h3 style={{ margin: '0 0 0.5rem', color: '#f87171', fontSize: '1.2rem' }}>Eliminar Alumno</h3>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
        ¿Estás seguro de que quieres eliminar a{' '}<strong style={{ color: '#fff' }}>{student.name}</strong>?
        Esta acción es <span style={{ color: '#f87171', fontWeight: 600 }}>irreversible</span> y eliminará todas sus inscripciones y datos.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={onClose} style={cancelBtnStyle} disabled={deleting}>Cancelar</button>
        <button onClick={onConfirm} disabled={deleting} style={{ flex: 2, padding: '10px 16px', background: deleting ? 'rgba(239,68,68,0.4)' : 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', borderRadius: '8px', color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
          {deleting ? 'Eliminando...' : '🗑️ Sí, Eliminar'}
        </button>
      </div>
    </div>
  </div>
)

// ─── Main Component ───────────────────────────────────────────────────────────
const StudentsAdminScreen: React.FC<StudentsAdminScreenProps> = () => {
  const [students, setStudents] = useState<Student[]>([])
  const [allCenters, setAllCenters] = useState<Center[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCenter, setFilterCenter] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/students`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setStudents(Array.isArray(data) ? data : [])
    } catch (err) { console.error('Error fetching students:', err) }
    finally { setLoading(false) }
  }, [])

  const fetchCenters = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/centers`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAllCenters(Array.isArray(data) ? data : [])
    } catch (err) { console.error('Error fetching centers:', err) }
  }, [])

  useEffect(() => { fetchStudents(); fetchCenters() }, [fetchStudents, fetchCenters])

  const handleDelete = async () => {
    if (!deletingStudent) return
    setIsDeleting(true)
    try {
      const res = await fetch(`${API}/api/admin/users/${deletingStudent.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar')
      setStudents(prev => prev.filter(s => s.id !== deletingStudent.id))
      setDeletingStudent(null)
    } catch (err: any) { alert(err.message || 'Error al eliminar') }
    finally { setIsDeleting(false) }
  }

  const filtered = students.filter(s => {
    const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCenter = !filterCenter || s.centers.some(c => c.id === filterCenter)
    return matchesSearch && matchesCenter
  })

  return (
    <>
      {showAddModal && <AddStudentModal onClose={() => setShowAddModal(false)} onSuccess={fetchStudents} />}
      {editingStudent && <EditStudentModal student={editingStudent} allCenters={allCenters} onClose={() => setEditingStudent(null)} onSuccess={fetchStudents} />}
      {deletingStudent && <DeleteConfirmModal student={deletingStudent} onClose={() => setDeletingStudent(null)} onConfirm={handleDelete} deleting={isDeleting} />}

      <div style={{ padding: '2rem 2.5rem', height: 'calc(100vh - 90px)', overflowY: 'auto', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", color: '#fff' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #c084fc 0%, #a855f7 40%, #7c3aed 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Gestión de Alumnos
            </h1>
            <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.92rem' }}>
              Administra, edita y organiza todos los alumnos de la plataforma
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{ padding: '11px 22px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(168,85,247,0.4)', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(168,85,247,0.55)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(168,85,247,0.4)' }}
          >
            ➕ Nuevo Alumno
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard icon="🎓" value={students.length} label="Total Alumnos" color="#a855f7" />
          <StatCard icon="🏫" value={allCenters.length} label="Centros" color="#06b6d4" />
          <StatCard icon="🔗" value={students.filter(s => s.centers.length > 0).length} label="Con inscripción" color="#10b981" />
          <StatCard icon="⚠️" value={students.filter(s => s.centers.length === 0).length} label="Sin centro" color="#f59e0b" />
        </div>

        {/* Filters */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>🔍</span>
            <input type="text" placeholder="Buscar por nombre o correo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ ...inputStyle, paddingLeft: '36px', width: '100%', background: 'rgba(255,255,255,0.06)' }} />
          </div>
          <div style={{ flex: '1 1 220px' }}>
            <select value={filterCenter} onChange={e => setFilterCenter(e.target.value)} style={{ ...inputStyle, width: '100%', background: 'rgba(255,255,255,0.06)', appearance: 'none', cursor: 'pointer' }}>
              <option value="">Todos los centros</option>
              {allCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
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

        {/* Table */}
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
              {!searchQuery && !filterCenter && (
                <button onClick={() => setShowAddModal(true)} style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(168,85,247,0.35)' }}>➕ Nuevo Alumno</button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(192,132,252,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <Th>Alumno</Th>
                    <Th>Correo Electrónico</Th>
                    <Th>Centros Inscritos</Th>
                    <Th align="right">Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((student, idx) => (
                    <tr
                      key={student.id}
                      style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'background 0.15s', cursor: 'default' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(192,132,252,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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

                      {/* Actions */}
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <ActionButton label="✏️ Editar" bg="rgba(192,132,252,0.13)" hoverBg="rgba(192,132,252,0.25)" textColor="#e9d5ff" border="1px solid rgba(192,132,252,0.3)" onClick={() => setEditingStudent(student)} />
                          <ActionButton label="🗑️" bg="rgba(239,68,68,0.1)" hoverBg="rgba(239,68,68,0.22)" textColor="#fca5a5" border="1px solid rgba(239,68,68,0.22)" onClick={() => setDeletingStudent(student)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ height: '3rem' }} />
      </div>
    </>
  )
}

export default StudentsAdminScreen
