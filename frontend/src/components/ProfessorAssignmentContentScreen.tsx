import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import {
    getSubjectById,
    getCourseModules,
    toggleItemVisibility,
    type Subject,
} from '../lib/adminApi'
import './HierarchyConfig.css'

import type { Assignment, CalendarEvent, ModuleWithItems, TabKey } from './ProfessorContentScreen/types'

import { ActionButton, TabButton } from './general/SharedUI'
import ContentTab from './ProfessorContentScreen/ContentTab'
import AssignmentsTab from './ProfessorContentScreen/AssignmentsTab'
import RemindersTab from './ProfessorContentScreen/RemindersTab'
import AssignmentFormModal from './ProfessorContentScreen/AssignmentFormModal'
import EventFormModal from './ProfessorContentScreen/EventFormModal'
import ConfirmModal from './general/ConfirmModal'
import { set } from 'date-fns'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface ProfessorAssignmentContentScreenProps {
    user: User
}

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
    const [confirmDeleteAssignmentId, setConfirmDeleteAssignmentId] = useState<string | null>(null)    
    const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null)

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
        await deleteCalendarEventRequest(id)
        setEvents(prev => prev.filter(e => e.id !== id))
    }

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

            {confirmDeleteAssignmentId && (
                <ConfirmModal
                    message="¿Seguro que quieres eliminar esta tarea?"
                    confirmLabel="Sí, eliminar"
                    cancelLabel="Cancelar"
                    danger
                    onConfirm={() => {
                        handleDeleteAssignment(confirmDeleteAssignmentId)
                        setConfirmDeleteAssignmentId(null)
                    }}
                    onCancel={() => setConfirmDeleteAssignmentId(null)}
                />
            )}
            {confirmDeleteEventId && (
                <ConfirmModal
                    message="¿Seguro que quieres eliminar este evento?"
                    confirmLabel="Sí, eliminar"
                    cancelLabel="Cancelar"
                    danger
                    onConfirm={() => {
                        handleDeleteEvent(confirmDeleteEventId)
                        setConfirmDeleteEventId(null)
                    }}
                    onCancel={() => setConfirmDeleteEventId(null)}
                />
            )}
            {/* Tab bar */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <TabButton label="📒 Contenido" active={activeTab === 'content'} onClick={() => setActiveTab('content')} />
                <TabButton label="📝 Tareas" active={activeTab === 'assignments'} onClick={() => setActiveTab('assignments')} />
                <TabButton label="📅 Eventos" active={activeTab === 'reminders'} onClick={() => setActiveTab('reminders')} />

                <div style={{ flex: 1 }} />

                {activeTab === 'assignments' && (
                    <ActionButton
                        label="Nueva tarea ➕"
                        bg="rgba(192,132,252,0.18)" hoverBg="rgba(192,132,252,0.3)" textColor="#f3e8ff"
                        border="1px solid rgba(192,132,252,0.4)"
                        onClick={() => { setEditingAssignment(null); setShowAssignmentModal(true) }}
                    />
                )}
                {activeTab === 'reminders' && (
                    <ActionButton
                        label="Nuevo evento ➕"
                        bg="rgba(192,132,252,0.18)" hoverBg="rgba(192,132,252,0.3)" textColor="#f3e8ff"
                        border="1px solid rgba(192,132,252,0.4)"
                        onClick={() => { setEditingEvent(null); setShowEventModal(true) }}
                    />
                )}
            </div>

            {activeTab === 'content' && (
                <ContentTab
                    loading={loading}
                    modules={modules}
                    itemVisibility={itemVisibility}
                    onToggleItemVisibility={handleToggleItemVisibility}
                />
            )}

            {activeTab === 'assignments' && (
                <AssignmentsTab
                    loading={assignmentsLoading}
                    assignments={assignments}
                    modules={modules}
                    onEdit={a => { setEditingAssignment(a); setShowAssignmentModal(true) }}
                    onDelete={id => setConfirmDeleteAssignmentId(id)}
                />
            )}

            {activeTab === 'reminders' && (
                <RemindersTab
                    loading={eventsLoading}
                    events={events}
                    onEdit={ev => { setEditingEvent(ev); setShowEventModal(true) }}
                    onDelete={id => setConfirmDeleteEventId(id)}
                />
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

export default ProfessorAssignmentContentScreen