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

export type TabKey = 'content' | 'assignments' | 'reminders'

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