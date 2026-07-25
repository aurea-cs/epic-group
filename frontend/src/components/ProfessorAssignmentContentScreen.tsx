import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { Eye, EyeOff } from 'lucide-react'
import {
    getSubjectById,
    getCourseModules,
    toggleItemVisibility,
    type Subject,
    type CourseModule,
} from '../lib/adminApi'
import './HierarchyConfig.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface ProfessorAssignmentContentScreenProps {
    user: User
}

// ============================================================================
// Types — mirror the `assignments` and `calendar_events` tables exactly.
// ============================================================================

interface Assignment {
    id: string
    subject_id: string
    module_id: string | null
    professor_id: string
    title: string | null
    instructions_md: string | null
    due_at: string | null
    available_from: string | null
    max_score: number | null
    allowed_file_types: string[] | null
    max_file_size_mb: number | null
    allow_resubmission: boolean | null
    status: string | null
    created_at: string
    updated_at: string | null
}

interface CalendarEvent {
    id: string
    subject_id: string | null
    professor_id: string | null
    title: string | null
    description_md: string | null
    type: string | null
    event_date: string | null
    created_at: string
}

type TabKey = 'content' | 'assignments' | 'reminders'

// ============================================================================
// Local module item interface (content tab)
// ============================================================================

interface ModuleItem {
    id: string
    title: string
    description?: string | null
    type: 'pdf' | 'video' | 'assignment' | 'link' | string
    content_url?: string | null
    show_student?: boolean | null
}

type ModuleWithItems = CourseModule & { items?: ModuleItem[] }

const ITEM_TYPE_ICON: Record<string, string> = {
    pdf: '📄',
    video: '🎥',
    assignment: '📝',
    link: '🔗',
}

// ============================================================================
// Real API functions
// ============================================================================

// ---- assignments -----------------------------------------------------------

async function fetchAssignments(subjectId: string): Promise<Assignment[]> {
    const res = await fetch(`${API_URL}/api/subjects/${subjectId}/assignments`)
    if (!res.ok) throw new Error(`Error al cargar tareas: ${res.status}`)
    return res.json()
}

async function createAssignmentRequest(
    payload: Omit<Assignment, 'id' | 'created_at' | 'updated_at'>
): Promise<Assignment> {
    const res = await fetch(`${API_URL}/api/subjects/${payload.subject_id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error al crear tarea: ${res.status}`)
    }
    return res.json()
}

async function updateAssignmentRequest(
    id: string,
    payload: Partial<Omit<Assignment, 'id' | 'created_at' | 'subject_id' | 'professor_id'>>
): Promise<Assignment> {
    const res = await fetch(`${API_URL}/api/assignments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error al actualizar tarea: ${res.status}`)
    }
    return res.json()
}

async function deleteAssignmentRequest(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/assignments/${id}`, { method: 'DELETE' })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error al eliminar tarea: ${res.status}`)
    }
}

// ---- calendar events -------------------------------------------------------

async function fetchCalendarEvents(subjectId: string): Promise<CalendarEvent[]> {
    const res = await fetch(`${API_URL}/api/subjects/${subjectId}/calendar-events`)
    if (!res.ok) throw new Error(`Error al cargar eventos: ${res.status}`)
    return res.json()
}

async function createCalendarEventRequest(
    payload: Omit<CalendarEvent, 'id' | 'created_at'>
): Promise<CalendarEvent> {
    const res = await fetch(`${API_URL}/api/calendar-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error al crear evento: ${res.status}`)
    }
    return res.json()
}

async function updateCalendarEventRequest(
    id: string,
    payload: Partial<Omit<CalendarEvent, 'id' | 'created_at'>>
): Promise<CalendarEvent> {
    const res = await fetch(`${API_URL}/api/calendar-events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error al actualizar evento: ${res.status}`)
    }
    return res.json()
}

async function deleteCalendarEventRequest(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/calendar-events/${id}`, { method: 'DELETE' })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error al eliminar evento: ${res.status}`)
    }
}

// ============================================================================
// Small shared UI pieces
// ============================================================================

const tdStyle: React.CSSProperties = { padding: '0.9rem 1.25rem', verticalAlign: 'middle' }
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.9rem 1.25rem', fontWeight: 700 }

const ActionButton: React.FC<{
    label: string
    bg: string
    hoverBg: string
    textColor: string
    border: string
    onClick: () => void
    disabled?: boolean
}> = ({ label, bg, hoverBg, textColor, border, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border,
            background: bg,
            color: textColor,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            fontSize: '0.9rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            transition: 'background 0.15s',
        }}
        onMouseEnter={e => !disabled && (e.currentTarget.style.background = hoverBg)}
        onMouseLeave={e => !disabled && (e.currentTarget.style.background = bg)}
    >
        {label}
    </button>
)

const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: active ? '1px solid rgba(192,132,252,0.55)' : '1px solid rgba(255,255,255,0.08)',
            background: active ? 'rgba(192,132,252,0.22)' : 'rgba(255,255,255,0.03)',
            color: active ? '#f3e8ff' : 'rgba(255,255,255,0.65)',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            transition: 'all 0.15s',
        }}
    >
        {label}
    </button>
)

const StatusPill: React.FC<{ value: string | null }> = ({ value }) => {
    const v = (value || 'draft').toLowerCase()
    const map: Record<string, { bg: string; color: string; label: string }> = {
        published: { bg: 'rgba(74,222,128,0.15)', color: '#86efac', label: 'Publicada' },
        draft: { bg: 'rgba(250,204,21,0.15)', color: '#fde047', label: 'Borrador' },
        closed: { bg: 'rgba(248,113,113,0.15)', color: '#fca5a5', label: 'Cerrada' },
    }
    const s = map[v] || map.draft
    return (
        <span style={{ padding: '4px 10px', borderRadius: '999px', background: s.bg, color: s.color, fontSize: '0.78rem', fontWeight: 700 }}>
            {s.label}
        </span>
    )
}

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
    <button
        onClick={onChange}
        style={{
            width: 46,
            height: 26,
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            background: checked ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'rgba(255,255,255,0.15)',
            position: 'relative',
            transition: 'background 0.2s',
        }}
        aria-label={checked ? 'Visible' : 'Oculto'}
    >
        <span
            style={{
                position: 'absolute',
                top: 3,
                left: checked ? 23 : 3,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
            }}
        />
    </button>
)

const EyeToggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
    <button
        onClick={onChange}
        style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: checked ? '#c084fc' : 'rgba(255,255,255,0.25)',
            transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            e.currentTarget.style.color = checked ? '#d8b4fe' : 'rgba(255,255,255,0.45)'
        }}
        onMouseLeave={e => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.color = checked ? '#c084fc' : 'rgba(255,255,255,0.25)'
        }}
        aria-label={checked ? 'Visible para estudiantes' : 'Oculto para estudiantes'}
        title={checked ? 'Visible para estudiantes' : 'Oculto para estudiantes'}
    >
        {checked ? <Eye size={20} /> : <EyeOff size={20} />}
    </button>
)

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
    <div
        onClick={onClose}
        style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem',
        }}
    >
        <div
            onClick={e => e.stopPropagation()}
            style={{
                background: '#1a1625', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px',
                padding: '1.75rem', width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#f3e8ff' }}>{title}</h2>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            {children}
        </div>
    </div>
)

const fieldLabelStyle: React.CSSProperties = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '1rem',
    fontFamily: 'inherit',
}

// ============================================================================
// Main component
// ============================================================================

const ProfessorAssignmentContentScreen: React.FC<ProfessorAssignmentContentScreenProps> = ({ user }) => {
    const { courseId } = useParams<{ courseId: string }>()

    const [subject, setSubject] = useState<Subject | null>(null)
    const [modules, setModules] = useState<ModuleWithItems[]>([])
    const [itemVisibility, setItemVisibility] = useState<Record<string, boolean>>({})
    const [loading, setLoading] = useState(true)

    const [activeTab, setActiveTab] = useState<TabKey>('content')

    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [assignmentsLoading, setAssignmentsLoading] = useState(false)
    const [showAssignmentModal, setShowAssignmentModal] = useState(false)
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)

    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [eventsLoading, setEventsLoading] = useState(false)
    const [showEventModal, setShowEventModal] = useState(false)
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

    const [error, setError] = useState<string | null>(null)

    // ---- initial load: subject + modules ----
    useEffect(() => {
        if (!courseId) return
        setLoading(true)
        setError(null)
        Promise.all([getSubjectById(courseId), getCourseModules(courseId)])
            .then(([subj, mods]) => {
                setSubject(subj)
                setModules(mods as ModuleWithItems[])

                const visibilityMap: Record<string, boolean> = {}
                ;(mods as ModuleWithItems[]).forEach(m => {
                    (m.items || []).forEach(item => { visibilityMap[item.id] = item.show_student ?? true })
                })
                setItemVisibility(visibilityMap)
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false))
    }, [courseId])

    // ---- lazy-load each tab's data the first time it's opened ----
    const loadAssignments = useCallback(() => {
        if (!courseId) return
        setAssignmentsLoading(true)
        setError(null)
        fetchAssignments(courseId)
            .then(setAssignments)
            .catch(e => setError(e.message))
            .finally(() => setAssignmentsLoading(false))
    }, [courseId])

    const loadEvents = useCallback(() => {
        if (!courseId) return
        setEventsLoading(true)
        setError(null)
        fetchCalendarEvents(courseId)
            .then(setEvents)
            .catch(e => setError(e.message))
            .finally(() => setEventsLoading(false))
    }, [courseId])

    useEffect(() => {
        if (activeTab === 'assignments') loadAssignments()
        if (activeTab === 'reminders') loadEvents()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab])

    // ---- handlers ----

    const handleToggleItemVisibility = (itemId: string) => {
        const next = !itemVisibility[itemId]
        setItemVisibility(prev => ({ ...prev, [itemId]: next }))
        toggleItemVisibility(itemId, next).catch(() => {
            setItemVisibility(prev => ({ ...prev, [itemId]: !next }))
        })
    }

    const handleCreateAssignment = async (payload: Omit<Assignment, 'id' | 'created_at' | 'updated_at' | 'subject_id' | 'professor_id'>) => {
        if (!courseId) return
        const created = await createAssignmentRequest({
            ...payload,
            subject_id: courseId,
            professor_id: user.id,
        })
        setAssignments(prev => [created, ...prev])
        setShowAssignmentModal(false)
    }

    const handleUpdateAssignment = async (payload: Omit<Assignment, 'id' | 'created_at' | 'updated_at' | 'subject_id' | 'professor_id'>) => {
        if (!editingAssignment) return
        const updated = await updateAssignmentRequest(editingAssignment.id, payload)
        setAssignments(prev => prev.map(a => a.id === updated.id ? updated : a))
        setEditingAssignment(null)
        setShowAssignmentModal(false)
    }

    const handleDeleteAssignment = async (id: string) => {
        if (!window.confirm('¿Eliminar esta tarea? Esta acción no se puede deshacer.')) return
        await deleteAssignmentRequest(id)
        setAssignments(prev => prev.filter(a => a.id !== id))
    }

    const handleSaveEvent = async (payload: Omit<CalendarEvent, 'id' | 'created_at' | 'subject_id' | 'professor_id'>) => {
        if (!courseId) return
        if (editingEvent) {
            const updated = await updateCalendarEventRequest(editingEvent.id, payload)
            setEvents(prev => prev.map(e => (e.id === updated.id ? updated : e)))
        } else {
            const created = await createCalendarEventRequest({ ...payload, subject_id: courseId, professor_id: user.id })
            setEvents(prev => [created, ...prev])
        }
        setShowEventModal(false)
        setEditingEvent(null)
    }

    const handleDeleteEvent = async (id: string) => {
        if (!window.confirm('¿Eliminar este evento del calendario?')) return
        await deleteCalendarEventRequest(id)
        setEvents(prev => prev.filter(e => e.id !== id))
    }

    const formatDateTime = (iso: string | null) => {
        if (!iso) return '—'
        const d = new Date(iso)
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    }

    const moduleNameById = (id: string | null) => modules.find(m => m.id === id)?.title || '—'

    return (
        <div style={{ padding: '2rem 4rem', height: 'calc(100vh - 90px)', overflowY: 'auto', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", color: '#fff' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #c084fc 0%, #a855f7 40%, #7c3aed 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        {subject?.name}
                    </h1>
                    <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.92rem' }}>
                        Mis cursos {'> ' + (subject?.name || '') + ' >'} configuración
                    </p>
                </div>
            </div>

            {/* Global error banner */}
            {error && (
                <div style={{ marginBottom: '1rem', padding: '0.9rem 1.25rem', borderRadius: '12px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#fca5a5', fontSize: '0.9rem' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Tab bar */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <TabButton label="📒 Contenido" active={activeTab === 'content'} onClick={() => setActiveTab('content')} />
                <TabButton label="📝 Tareas" active={activeTab === 'assignments'} onClick={() => setActiveTab('assignments')} />
                <TabButton label="📅 Eventos" active={activeTab === 'reminders'} onClick={() => setActiveTab('reminders')} />

                <div style={{ flex: 1 }} />

                {activeTab === 'assignments' && (
                    <ActionButton
                        label="+ Nueva tarea"
                        bg="rgba(192,132,252,0.18)" hoverBg="rgba(192,132,252,0.3)" textColor="#f3e8ff"
                        border="1px solid rgba(192,132,252,0.4)"
                        onClick={() => { setEditingAssignment(null); setShowAssignmentModal(true) }}
                    />
                )}
                {activeTab === 'reminders' && (
                    <ActionButton
                        label="+ Nuevo evento"
                        bg="rgba(192,132,252,0.18)" hoverBg="rgba(192,132,252,0.3)" textColor="#f3e8ff"
                        border="1px solid rgba(192,132,252,0.4)"
                        onClick={() => { setEditingEvent(null); setShowEventModal(true) }}
                    />
                )}
            </div>

            {/* ==================== CONTENIDO ==================== */}
            {activeTab === 'content' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {loading ? (
                        <div style={{ padding: '1.25rem', color: 'rgba(255,255,255,0.6)' }}>Cargando módulos…</div>
                    ) : modules.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)', border: '2px dashed rgba(255,255,255,0.12)', borderRadius: '16px' }}>
                            Este curso todavía no tiene módulos.
                        </div>
                    ) : (
                        modules.map(m => {
                            const items = m.items || []
                            return (
                                <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', overflow: 'hidden' }}>
                                    {/* Module header */}
                                    <div style={{ padding: '1.1rem 1.25rem', background: 'rgba(192,132,252,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f3e8ff' }}>{m.title}</h3>
                                    </div>

                                    {/* Items */}
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <tbody>
                                                {items.length === 0 ? (
                                                    <tr><td style={tdStyle} colSpan={2}>Este tema todavía no tiene contenido.</td></tr>
                                                ) : (
                                                    items.map(item => (
                                                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <td style={tdStyle}>
                                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                                                    <span style={{ fontSize: '1.1rem' }}>{ITEM_TYPE_ICON[item.type] || '📎'}</span>
                                                                    <div>
                                                                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                                                                        {item.description && (
                                                                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{item.description}</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td style={{ ...tdStyle, textAlign: 'right', width: 90 }}>
                                                                <EyeToggle checked={!!itemVisibility[item.id]} onChange={() => handleToggleItemVisibility(item.id)} />
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {/* ==================== TAREAS ==================== */}
            {activeTab === 'assignments' && (
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
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assignmentsLoading ? (
                                    <tr><td style={tdStyle} colSpan={6}>Cargando tareas…</td></tr>
                                ) : assignments.length === 0 ? (
                                    <tr><td style={tdStyle} colSpan={6}>Todavía no has creado ninguna tarea.</td></tr>
                                ) : (
                                    assignments.map(a => (
                                        <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={tdStyle}>{a.title || 'Sin título'}</td>
                                            <td style={tdStyle}>{moduleNameById(a.module_id)}</td>
                                            <td style={tdStyle}>{formatDateTime(a.due_at)}</td>
                                            <td style={tdStyle}>{a.max_score ?? '—'}</td>
                                            <td style={tdStyle}><StatusPill value={a.status} /></td>
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <ActionButton
                                                        label="Editar"
                                                        bg="rgba(255,255,255,0.06)" hoverBg="rgba(255,255,255,0.12)"
                                                        textColor="#e5e7eb" border="1px solid rgba(255,255,255,0.12)"
                                                        onClick={() => { setEditingAssignment(a); setShowAssignmentModal(true) }}
                                                    />
                                                    <ActionButton
                                                        label="Eliminar"
                                                        bg="rgba(248,113,113,0.12)" hoverBg="rgba(248,113,113,0.22)"
                                                        textColor="#fca5a5" border="1px solid rgba(248,113,113,0.3)"
                                                        onClick={() => handleDeleteAssignment(a.id)}
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
            )}

            {/* ==================== EVENTOS ==================== */}
            {activeTab === 'reminders' && (
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
                                {eventsLoading ? (
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
                                                        onClick={() => { setEditingEvent(ev); setShowEventModal(true) }}
                                                    />
                                                    <ActionButton
                                                        label="Eliminar" bg="rgba(248,113,113,0.12)" hoverBg="rgba(248,113,113,0.22)"
                                                        textColor="#fca5a5" border="1px solid rgba(248,113,113,0.3)"
                                                        onClick={() => handleDeleteEvent(ev.id)}
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
            )}

            {showAssignmentModal && (
                <AssignmentFormModal
                    modules={modules}
                    initial={editingAssignment}
                    onClose={() => { setShowAssignmentModal(false); setEditingAssignment(null) }}
                    onSubmit={editingAssignment ? handleUpdateAssignment : handleCreateAssignment}
                />
            )}

            {showEventModal && (
                <EventFormModal
                    initial={editingEvent}
                    onClose={() => { setShowEventModal(false); setEditingEvent(null) }}
                    onSubmit={handleSaveEvent}
                />
            )}

            <div style={{ height: '3rem' }} />
        </div>
    )
}

// ============================================================================
// Assignment create/edit form (modal)
// ============================================================================

const AssignmentFormModal: React.FC<{
    modules: CourseModule[]
    initial: Assignment | null
    onClose: () => void
    onSubmit: (payload: Omit<Assignment, 'id' | 'created_at' | 'updated_at' | 'subject_id' | 'professor_id'>) => Promise<void>
}> = ({ modules, initial, onClose, onSubmit }) => {
    const [title, setTitle] = useState(initial?.title || '')
    const [instructions, setInstructions] = useState(initial?.instructions_md || '')
    const [moduleId, setModuleId] = useState<string>(initial?.module_id || '')
    const [dueAt, setDueAt] = useState(initial?.due_at ? initial.due_at.slice(0, 16) : '')
    const [availableFrom, setAvailableFrom] = useState(initial?.available_from ? initial.available_from.slice(0, 16) : '')
    const [maxScore, setMaxScore] = useState<number>(initial?.max_score ?? 100)
    const [allowedFileTypes, setAllowedFileTypes] = useState((initial?.allowed_file_types ?? ['pdf', 'docx']).join(', '))
    const [maxFileSizeMb, setMaxFileSizeMb] = useState<number>(initial?.max_file_size_mb ?? 10)
    const [allowResubmission, setAllowResubmission] = useState(initial?.allow_resubmission ?? false)
    const [status, setStatus] = useState(initial?.status || 'draft')
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const isEditing = !!initial

    const handleSubmit = async () => {
        if (!title.trim()) return
        setSaving(true)
        setFormError(null)
        try {
            await onSubmit({
                module_id: moduleId || null,
                title: title.trim(),
                instructions_md: instructions.trim() || null,
                due_at: dueAt ? new Date(dueAt).toISOString() : null,
                available_from: availableFrom ? new Date(availableFrom).toISOString() : null,
                max_score: maxScore,
                allowed_file_types: allowedFileTypes.split(',').map(t => t.trim()).filter(Boolean),
                max_file_size_mb: maxFileSizeMb,
                allow_resubmission: allowResubmission,
                status,
            })
        } catch (e: any) {
            setFormError(e.message || 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal title={isEditing ? 'Editar tarea' : 'Nueva tarea'} onClose={onClose}>
            {formError && (
                <div style={{ marginBottom: '1rem', padding: '0.7rem 1rem', borderRadius: '8px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#fca5a5', fontSize: '0.85rem' }}>
                    ⚠️ {formError}
                </div>
            )}

            <label style={fieldLabelStyle}>Título</label>
            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Ensayo sobre..." />

            <label style={fieldLabelStyle}>Instrucciones</label>
            <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Describe lo que el alumno debe entregar" />

            <label style={fieldLabelStyle}>Módulo</label>
            <select style={inputStyle} value={moduleId} onChange={e => setModuleId(e.target.value)}>
                <option value="">Sin módulo</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Disponible desde</label>
                    <input style={inputStyle} type="datetime-local" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Fecha de entrega</label>
                    <input style={inputStyle} type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Puntaje máximo</label>
                    <input style={inputStyle} type="number" value={maxScore} onChange={e => setMaxScore(Number(e.target.value))} />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Tamaño máximo (MB)</label>
                    <input style={inputStyle} type="number" value={maxFileSizeMb} onChange={e => setMaxFileSizeMb(Number(e.target.value))} />
                </div>
            </div>

            <label style={fieldLabelStyle}>Tipos de archivo permitidos (separados por coma)</label>
            <input style={inputStyle} value={allowedFileTypes} onChange={e => setAllowedFileTypes(e.target.value)} placeholder="pdf, docx, png" />

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Estado</label>
                    <select style={inputStyle} value={status} onChange={e => setStatus(e.target.value)}>
                        <option value="draft">Borrador</option>
                        <option value="published">Publicada</option>
                        <option value="closed">Cerrada</option>
                    </select>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '1.6rem' }}>
                    <Toggle checked={allowResubmission} onChange={() => setAllowResubmission(v => !v)} />
                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>Permitir reenvío</span>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <ActionButton label="Cancelar" bg="rgba(255,255,255,0.06)" hoverBg="rgba(255,255,255,0.12)" textColor="#e5e7eb" border="1px solid rgba(255,255,255,0.12)" onClick={onClose} />
                <ActionButton
                    label={saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear tarea'}
                    bg="rgba(168,85,247,0.5)" hoverBg="rgba(168,85,247,0.7)" textColor="#fff" border="1px solid rgba(192,132,252,0.5)"
                    onClick={handleSubmit} disabled={saving || !title.trim()}
                />
            </div>
        </Modal>
    )
}

// ============================================================================
// Calendar event create/edit form (modal)
// ============================================================================

const EVENT_TYPES = [
    { value: 'exam', label: 'Examen' },
    { value: 'deadline', label: 'Fecha límite' },
    { value: 'class', label: 'Clase' },
    { value: 'other', label: 'Otro' },
]

const EventFormModal: React.FC<{
    initial: CalendarEvent | null
    onClose: () => void
    onSubmit: (payload: Omit<CalendarEvent, 'id' | 'created_at' | 'subject_id' | 'professor_id'>) => Promise<void>
}> = ({ initial, onClose, onSubmit }) => {
    const [title, setTitle] = useState(initial?.title || '')
    const [description, setDescription] = useState(initial?.description_md || '')
    const [type, setType] = useState(initial?.type || 'class')
    const [eventDate, setEventDate] = useState(initial?.event_date || '')
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const handleSubmit = async () => {
        if (!title.trim() || !eventDate) return
        setSaving(true)
        setFormError(null)
        try {
            await onSubmit({
                title: title.trim(),
                description_md: description.trim() || null,
                type,
                event_date: eventDate,
            })
        } catch (e: any) {
            setFormError(e.message || 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal title={initial ? 'Editar evento' : 'Nuevo evento'} onClose={onClose}>
            {formError && (
                <div style={{ marginBottom: '1rem', padding: '0.7rem 1rem', borderRadius: '8px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#fca5a5', fontSize: '0.85rem' }}>
                    ⚠️ {formError}
                </div>
            )}

            <label style={fieldLabelStyle}>Título</label>
            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Examen parcial" />

            <label style={fieldLabelStyle}>Descripción</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalles del evento" />

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Tipo</label>
                    <select style={inputStyle} value={type} onChange={e => setType(e.target.value)}>
                        {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Fecha</label>
                    <input style={inputStyle} type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <ActionButton label="Cancelar" bg="rgba(255,255,255,0.06)" hoverBg="rgba(255,255,255,0.12)" textColor="#e5e7eb" border="1px solid rgba(255,255,255,0.12)" onClick={onClose} />
                <ActionButton
                    label={saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear evento'}
                    bg="rgba(168,85,247,0.5)" hoverBg="rgba(168,85,247,0.7)" textColor="#fff" border="1px solid rgba(192,132,252,0.5)"
                    onClick={handleSubmit} disabled={saving || !title.trim() || !eventDate}
                />
            </div>
        </Modal>
    )
}

export default ProfessorAssignmentContentScreen
