import type { CourseModule } from '../../lib/adminApi'

// ============================================================================
// Types — mirror the `assignments` and `calendar_events` tables exactly.
// ============================================================================

export interface Assignment {
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

export interface CalendarEvent {
    id: string
    subject_id: string | null
    professor_id: string | null
    title: string | null
    description_md: string | null
    type: string | null
    event_date: string | null
    created_at: string
}

export interface Student {
  id: string
  name: string
  email: string
  avatar_url?: string
  created_at?: string
  centers: Center[]
}

export interface Center {
  id: string
  name: string
}

export type TabKey = 'content' | 'assignments' | 'reminders' | 'students' | 'pov-students' | 'submissions'

// ============================================================================
// Local module item interface (content tab)
// ============================================================================

export interface ModuleItem {
    id: string
    title: string
    description?: string | null
    type: 'pdf' | 'video' | 'assignment' | 'link' | string
    content_url?: string | null
    show_student?: boolean | null
}

export interface SubmissionFile {
    id: string
    file_name: string | null
    storage_path: string | null
    external_url: string | null
    signed_url: string | null 
    mime_type?: string | null
    file_size_bytes?: number | null
    uploaded_at?: string | null
}

export interface Submission {
    id: string
    assignment_id: string
    student_id: string
    submitted_at: string
    status: string | null
    files: SubmissionFile[]
    grade: number | null
    feedback_md: string | null
    graded_at: string | null
    graded_by: string | null
    studentName: string        
    body_md?: string | null

}

export interface AssignmentDetail {
  id: string
  title: string
  instructions_md: string | null
  due_at: string | null
  available_from: string | null
  max_score: number | null
  allowed_file_types: string[] | null
  max_file_size_mb: number | null
  allow_resubmission: boolean | null
  status: string | null
  subjects: { id: string; name: string; short_name: string | null } | null
  submission: Submission | null
}

export type ModuleWithItems = CourseModule & { items?: ModuleItem[] }

export const ITEM_TYPE_ICON: Record<string, string> = {
    pdf: '📄',
    video: '🎥',
    assignment: '📝',
    link: '🔗',
}

export const EVENT_TYPES = [
    { value: 'exam', label: 'Examen' },
    { value: 'deadline', label: 'Fecha límite' },
    { value: 'class', label: 'Clase' },
    { value: 'other', label: 'Otro' },
]