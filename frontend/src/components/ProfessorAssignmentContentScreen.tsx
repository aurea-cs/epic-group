import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import {
    getSubjectById,
    getCourseModules,
    toggleItemVisibility,
    type Subject,
} from '../lib/adminApi'
import { getUserRole } from '../utils/getUserRole'
import { useTranslation } from 'react-i18next'
import './HierarchyConfig.css'

import type { Assignment, CalendarEvent, Student, ModuleWithItems, Center, Submission, TabKey, StudentExitTicketResponse, StudentQuizSubjectResponse, SubjectQuiz } from './ProfessorContentScreen/types'

import { ActionButton, TabButton } from './general/SharedUI'
import ContentTab from './ProfessorContentScreen/ContentTab'
import AssignmentsTab from './ProfessorContentScreen/AssignmentsTab'
import RemindersTab from './ProfessorContentScreen/RemindersTab'
import AssignmentFormModal from './ProfessorContentScreen/AssignmentFormModal'
import EventFormModal from './ProfessorContentScreen/EventFormModal'
import ConfirmModal from './general/ConfirmModal'
import StudentsTab from './ProfessorContentScreen/StudentsTab'
import StudentFormModal from './ProfessorContentScreen/StudentFormModal'
import SubmissionsTab from './ProfessorContentScreen/SubmissionsTab'
import GradingModal from './ProfessorContentScreen/GradingModal'
import TicketsTab from './ProfessorContentScreen/TicketsTab'
import QuizzesTab from './ProfessorContentScreen/QuizzesTab'

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

// ---- students -------------------------------------------------------

async function fetchStudents(subjectId: string): Promise<Student[]> {
    const res = await fetch(`${API_URL}/api/subjects/${subjectId}/students`)
    if (!res.ok) throw new Error(`Error al cargar estudiantes: ${res.status}`)
    return res.json()
}

async function createStudentRequest(
    payload: Omit<Student, 'id' | 'created_at'>
): Promise<Student> {
    const res = await fetch(`${API_URL}/api/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error al crear estudiante: ${res.status}`)
    }
    return res.json()
}

async function updateStudentRequest(
    id: string,
    payload: Partial<Omit<Student, 'id' | 'created_at'>>
): Promise<Student> {
    const res = await fetch(`${API_URL}/api/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error al actualizar estudiante: ${res.status}`)
    }
    return res.json()
}

async function deleteStudentRequest(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/students/${id}`, { method: 'DELETE' })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error al eliminar estudiante: ${res.status}`)
    }
}

// ---- submissions -------------------------------------------------------

async function fetchSubmissions(subjectId: string): Promise<Submission[]> {
    const res = await fetch(`${API_URL}/api/subjects/${subjectId}/submissions`)
    if (!res.ok) throw new Error(`Error al cargar entregas: ${res.status}`)
    return res.json()
}

async function gradeStudentSubmission(
    id: string,
    payload: Partial<Pick<Submission, 'grade' | 'feedback_md' | 'graded_by' | 'status'>>
): Promise<Submission> {
    const res = await fetch(`${API_URL}/api/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error al calificar: ${res.status}`)
    }
    return res.json()
}

// ---- tickets -------------------------------------------------------

async function fetchTickets(subjectId: string): Promise<StudentExitTicketResponse[]> {
    const res = await fetch(`${API_URL}/api/subjects/${subjectId}/tickets`)
    if (!res.ok) throw new Error(`Error al cargar tickets: ${res.status}`)
    return res.json()
}

async function fetchSubjectQuizzes(subjectId: string): Promise<{ quizzes: SubjectQuiz[]; responses: StudentQuizSubjectResponse[] }> {
    const res = await fetch(`${API_URL}/api/subjects/${subjectId}/quizzes`)
    if (!res.ok) throw new Error(`Error al cargar quizes del curso: ${res.status}`)
    const data = await res.json()
    if (Array.isArray(data)) {
        return { quizzes: [], responses: data }
    }
    return { quizzes: data.quizzes || [], responses: data.responses || [] }
}


const ProfessorAssignmentContentScreen: React.FC<ProfessorAssignmentContentScreenProps> = ({ user }) => {
    const { courseId } = useParams<{ courseId: string }>()
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()
    const isAdmin = getUserRole(user) === 'admin'

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

    const [students, setStudents] = useState<Student[]>([])
    const [studentsLoading, setStudentsLoading] = useState(false)
    const [showStudentModal, setShowStudentModal] = useState(false)
    const [editingStudent, setEditingStudent] = useState<Student | null>(null)
    const [allCenters, setAllCenters] = useState<Center[]>([])

    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [submissionsLoading, setSubmissionsLoading] = useState(false)
    const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null)

    const [tickets, setTickets] = useState<StudentExitTicketResponse[]>([])
    const [ticketsLoading, setTicketsLoading] = useState(false)

    const [subjectQuizzes, setSubjectQuizzes] = useState<SubjectQuiz[]>([])
    const [quizResponses, setQuizResponses] = useState<StudentQuizSubjectResponse[]>([])
    const [quizzesLoading, setQuizzesLoading] = useState(false)

    const [error, setError] = useState<string | null>(null)
    const [confirmDeleteAssignmentId, setConfirmDeleteAssignmentId] = useState<string | null>(null)
    const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null)
    const [confirmDeleteStudentId, setConfirmDeleteStudentId] = useState<string | null>(null)

    // ---- initial load: subject + modules + quizzes check ----
    useEffect(() => {
        if (!courseId) return
        setLoading(true)
        setError(null)
        Promise.all([
            getSubjectById(courseId),
            getCourseModules(courseId),
            fetchSubjectQuizzes(courseId).catch(() => ({ quizzes: [], responses: [] }))
        ])
            .then(([subj, mods, quizData]) => {
                setSubject(subj)
                setModules(mods as ModuleWithItems[])
                setSubjectQuizzes(quizData.quizzes)
                setQuizResponses(quizData.responses)

                const visibilityMap: Record<string, boolean> = {}
                    ; (mods as ModuleWithItems[]).forEach(m => {
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

    const fetchCenters = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/centers`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            setAllCenters(Array.isArray(data) ? data : [])
        } catch (err) { console.error('Error fetching centers:', err) }
    }, [])

    const loadStudents = useCallback(async () => {
        if (!courseId) return

        setStudentsLoading(true)
        setError(null)

        try {
            await fetchCenters()

            const students = await fetchStudents(courseId)
            setStudents(students)
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setStudentsLoading(false)
        }
    }, [courseId, fetchCenters])

    const loadSubmissions = useCallback(() => {
        if (!courseId) return
        setSubmissionsLoading(true)
        setError(null)
        fetchSubmissions(courseId)
            .then(setSubmissions)
            .catch(e => setError(e.message))
            .finally(() => setSubmissionsLoading(false))
    }, [courseId])

    const loadTickets = useCallback(() => {
        if (!courseId) return
        setTicketsLoading(true)
        setError(null)
        fetchTickets(courseId)
            .then(setTickets)
            .catch(e => setError(e.message))
            .finally(() => setTicketsLoading(false))
    }, [courseId])

    const loadQuizzes = useCallback(() => {
        if (!courseId) return
        setQuizzesLoading(true)
        setError(null)
        fetchSubjectQuizzes(courseId)
            .then(data => {
                setSubjectQuizzes(data.quizzes)
                setQuizResponses(data.responses)
            })
            .catch(e => setError(e.message))
            .finally(() => setQuizzesLoading(false))
    }, [courseId])

    // Reload all tab data whenever the subject (courseId) changes
    useEffect(() => {
        setTickets([])
        setSubjectQuizzes([])
        setQuizResponses([])
        setAssignments([])
        setSubmissions([])
        setStudents([])
        setEvents([])
    }, [courseId])

    useEffect(() => {
        if (activeTab === 'assignments') loadAssignments()
        if (activeTab === 'reminders') loadEvents()
        if (activeTab === 'students') loadStudents()
        if (activeTab === 'submissions') { loadAssignments(); loadSubmissions() }
        if (activeTab === 'tickets') loadTickets()
        if (activeTab === 'quizzes') loadQuizzes()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, courseId])

    // ---- handlers ----

    const handleToggleItemVisibility = (itemId: string) => {
        const next = !itemVisibility[itemId]
        setItemVisibility(prev => ({ ...prev, [itemId]: next }))
        toggleItemVisibility(itemId, next).catch(() => {
            setItemVisibility(prev => ({ ...prev, [itemId]: !next }))
        })
    }

    const logAction = async (actionType: 'create' | 'delete' | 'update', itemType: 'assignment' | 'event', title: string, details?: string) => {
        try {
            const subjectName = subject ? (i18n.language.startsWith('en') && subject.name_en ? subject.name_en : subject.name) : 'Materia desconocida';
            await fetch(`${API_URL}/api/users/${user.id}/professor-actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actionType,
                    itemType,
                    title,
                    subjectName,
                    details
                })
            });
        } catch (err) {
            console.error('Failed to log action', err);
        }
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
        logAction('create', 'assignment', created.title || 'Sin título')
    }

    const handleUpdateAssignment = async (payload: Omit<Assignment, 'id' | 'created_at' | 'updated_at' | 'subject_id' | 'professor_id'>) => {
        if (!editingAssignment) return
        
        const changes: string[] = [];
        if (payload.title !== editingAssignment.title) changes.push(`Título: "${payload.title}"`);
        if (payload.instructions_md !== editingAssignment.instructions_md) changes.push(`Descripción editada`);
        if (payload.due_at !== editingAssignment.due_at) changes.push(`Entrega: ${payload.due_at ? payload.due_at.split('T')[0] : 'No'}`);
        if (payload.available_from !== editingAssignment.available_from) changes.push(`Disp: ${payload.available_from ? payload.available_from.split('T')[0] : 'No'}`);
        if (payload.max_score !== editingAssignment.max_score) changes.push(`Pts: ${payload.max_score}`);
        if (payload.module_id !== editingAssignment.module_id) changes.push(`Módulo cambiado`);
        if (payload.module_item_id !== editingAssignment.module_item_id) changes.push(`PDF cambiado`);
        if (payload.assigned_pages !== editingAssignment.assigned_pages) changes.push(`Págs: ${payload.assigned_pages || 'Todas'}`);
        if (JSON.stringify(payload.allowed_file_types) !== JSON.stringify(editingAssignment.allowed_file_types)) {
            changes.push(`Formatos: ${(payload.allowed_file_types || []).join(',')}`);
        }
        if (payload.max_file_size_mb !== editingAssignment.max_file_size_mb) changes.push(`Peso: ${payload.max_file_size_mb}MB`);
        if (payload.allow_resubmission !== editingAssignment.allow_resubmission) changes.push(`Reenvío: ${payload.allow_resubmission ? 'Sí' : 'No'}`);
        if (payload.status !== editingAssignment.status) {
             changes.push(`Estatus: ${payload.status}`);
        }
        
        let details = changes.length > 0 ? changes.join('; ') : undefined;
        if (details && details.length > 120) details = details.slice(0, 117) + '...';

        const updated = await updateAssignmentRequest(editingAssignment.id, payload)
        setAssignments(prev => prev.map(a => a.id === updated.id ? updated : a))
        setEditingAssignment(null)
        setShowAssignmentModal(false)
        logAction('update', 'assignment', updated.title || 'Sin título', details)
    }

    const handleDeleteAssignment = async (id: string) => {
        const assignmentToDel = assignments.find(a => a.id === id);
        await deleteAssignmentRequest(id)
        setAssignments(prev => prev.filter(a => a.id !== id))
        if (assignmentToDel) {
            logAction('delete', 'assignment', assignmentToDel.title || 'Sin título');
        }
    }

    const handleSaveEvent = async (payload: Omit<CalendarEvent, 'id' | 'created_at' | 'subject_id' | 'professor_id'>) => {
        if (!courseId) return
        if (editingEvent) {
            const changes: string[] = [];
            if (payload.title !== editingEvent.title) changes.push(`Título: "${payload.title}"`);
            if (payload.description_md !== editingEvent.description_md) changes.push(`Descripción editada`);
            if (payload.event_date !== editingEvent.event_date) changes.push(`Fecha: ${payload.event_date ? payload.event_date.split('T')[0] : 'No'}`);
            // Event type:
            if (payload.type !== editingEvent.type) changes.push(`Tipo: ${payload.type}`);
            
            let details = changes.length > 0 ? changes.join('; ') : undefined;
            if (details && details.length > 120) details = details.slice(0, 117) + '...';

            const updated = await updateCalendarEventRequest(editingEvent.id, payload)
            setEvents(prev => prev.map(e => (e.id === updated.id ? updated : e)))
            logAction('update', 'event', updated.title || 'Sin título', details)
        } else {
            const created = await createCalendarEventRequest({ ...payload, subject_id: courseId, professor_id: user.id })
            setEvents(prev => [created, ...prev])
            logAction('create', 'event', created.title || 'Sin título')
        }
        setShowEventModal(false)
        setEditingEvent(null)
    }

    const handleDeleteEvent = async (id: string) => {
        const eventToDel = events.find(e => e.id === id);
        await deleteCalendarEventRequest(id)
        setEvents(prev => prev.filter(e => e.id !== id))
        if (eventToDel) {
            logAction('delete', 'event', eventToDel.title || 'Sin título');
        }
    }

    const handleSaveStudent = async (payload: Omit<Student, 'id' | 'created_at'>) => {
        if (editingStudent) {
            const updated = await updateStudentRequest(editingStudent.id, payload)
            setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)))
        } else {
            const created = await createStudentRequest(payload)
            setStudents(prev => [created, ...prev])
        }
        setShowStudentModal(false)
        setEditingStudent(null)
    }

    const handleDeleteStudent = async (id: string) => {
        await deleteStudentRequest(id)
        setStudents(prev => prev.filter(s => s.id !== id))
    }

    const handleGradeSubmission = async (payload: { grade: number | null; feedback_md: string | null; status: string }) => {
        if (!gradingSubmission) return
        const updated = await gradeStudentSubmission(gradingSubmission.id, {
            ...payload,
            graded_by: user.id
        })
        setSubmissions(prev => prev.map(s => s.id === updated.id ? updated : s))
        setGradingSubmission(null)
    }


    return (
        <div style={{ padding: '2rem 4rem', height: 'calc(100vh - 90px)', overflowY: 'auto', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", color: '#fff' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #c084fc 0%, #a855f7 40%, #7c3aed 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        {subject ? (i18n.language.startsWith('en') && subject.name_en ? subject.name_en : subject.name) : ''}
                    </h1>
                    <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.92rem' }}>
                        {t('professorCourses.myCourses', 'Mis materias')} {'> '}
                        {subject ? (i18n.language.startsWith('en') && subject.name_en ? subject.name_en : subject.name) : ''}
                        {' > '} {t('general.configuration', 'Configuración')}
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
            {confirmDeleteStudentId && (
                <ConfirmModal
                    message="¿Seguro que quieres eliminar a este alumno del curso?"
                    confirmLabel="Sí, eliminar"
                    cancelLabel="Cancelar"
                    danger
                    onConfirm={() => {
                        handleDeleteStudent(confirmDeleteStudentId)
                        setConfirmDeleteStudentId(null)
                    }}
                    onCancel={() => setConfirmDeleteStudentId(null)}
                />
            )}

            {/* Tab bar */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <TabButton label="📒 Contenido" active={activeTab === 'content'} onClick={() => setActiveTab('content')} />
                <TabButton label="📂 Tareas" active={activeTab === 'assignments'} onClick={() => setActiveTab('assignments')} />
                <TabButton label="📝 Entregas" active={activeTab === 'submissions'} onClick={() => setActiveTab('submissions')} />
                {subjectQuizzes.length > 0 && (
                    <TabButton label="📋 Quizes" active={activeTab === 'quizzes'} onClick={() => setActiveTab('quizzes')} />
                )}
                <TabButton label="🎟️ Tickets" active={activeTab === 'tickets'} onClick={() => setActiveTab('tickets')} />
                <TabButton label="📅 Eventos" active={activeTab === 'reminders'} onClick={() => setActiveTab('reminders')} />
                <TabButton label="👥 Alumnos" active={activeTab === 'students'} onClick={() => setActiveTab('students')} />
                <TabButton label="🌕 Vista planetas" active={false} onClick={() => navigate(`/course/${courseId}/planet/1`, { state: { title: subject?.name, courseTitle: subject?.name } })} />

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
                {activeTab === 'students' && isAdmin && (
                    <ActionButton
                        label="Nuevo alumno ➕"
                        bg="rgba(192,132,252,0.18)" hoverBg="rgba(192,132,252,0.3)" textColor="#f3e8ff"
                        border="1px solid rgba(192,132,252,0.4)"
                        onClick={() => { setEditingStudent(null); setShowStudentModal(true) }}
                    />
                )}
            </div>

            {activeTab === 'content' && (
                <ContentTab
                    loading={loading}
                    modules={modules}
                    itemVisibility={itemVisibility}
                    onToggleItemVisibility={handleToggleItemVisibility}
                    courseId={courseId}
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

            {activeTab === 'tickets' && (
                <TicketsTab
                    loading={ticketsLoading}
                    tickets={tickets}
                />
            )}

            {activeTab === 'quizzes' && subjectQuizzes.length > 0 && (
                <QuizzesTab
                    loading={quizzesLoading}
                    quizzes={subjectQuizzes}
                    quizResponses={quizResponses}
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

            {activeTab === 'students' && (
                <StudentsTab
                    loading={studentsLoading}
                    students={students}
                    onEdit={student => { setEditingStudent(student); setShowStudentModal(true) }}
                    onDelete={id => setConfirmDeleteStudentId(id)}
                    allCenters={allCenters}
                    hideActions={!isAdmin}
                />
            )}

            {activeTab === 'submissions' && (
                <SubmissionsTab
                    loading={submissionsLoading}
                    submissions={submissions}
                    onGrade={(submission) => setGradingSubmission(submission)}
                />
            )}

            {gradingSubmission && (
                <GradingModal
                    submission={gradingSubmission}
                    maxScore={assignments.find(a => a.id === gradingSubmission.assignment_id)?.max_score ?? null}
                    onClose={() => setGradingSubmission(null)}
                    onSubmit={handleGradeSubmission}
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

            {showStudentModal && (
                <StudentFormModal
                    initial={editingStudent}
                    onClose={() => { setShowStudentModal(false); setEditingStudent(null) }}
                    onSubmit={handleSaveStudent}
                    allCenters={allCenters}
                />
            )}

            <div style={{ height: '3rem' }} />
        </div>
    )
}

export default ProfessorAssignmentContentScreen