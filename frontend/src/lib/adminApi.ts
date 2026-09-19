const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ============================================
// TYPES
// ============================================

export interface EducationalCenter {
    id: string
    name: string
    address?: string
    phone?: string
    email?: string
    vr_code?: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface GradeLevel {
    id: string
    center_id: string
    name: string
    level?: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface Subject {
    id: string
    grade_id: string
    name: string
    short_name?: string
    description?: string
    start_date?: string
    end_date?: string
    visibility?: 'active' | 'hidden' | 'archived'
    max_students: number
    is_active: boolean
    schedule_days?: string[]
    schedule_start_time?: string
    schedule_end_time?: string
    campo_formativo?: string
    curriculum_subject_id?: string | null
    created_at: string
    updated_at: string
}

export interface CurriculumGrade {
    id: string
    name: string
    level?: number
    created_at?: string
}

export interface CurriculumSubject {
    id: string
    curriculum_grade_id: string
    name: string
    short_name?: string
    created_at?: string
}

export interface CurriculumModule {
    id: string
    curriculum_subject_id: string
    title: string
    order_index?: number
    created_at?: string
}

export interface CurriculumSubjectTree extends CurriculumSubject {
    modules: CurriculumModule[]
}

export interface CurriculumGradeTree extends CurriculumGrade {
    subjects: CurriculumSubjectTree[]
}

export type ThinkBlockPromptType = 'piensa' | 'observa' | 'experimenta' | 'otro'

export interface ThinkBlockPrompt {
    id?: string
    block_id?: string
    prompt_type: ThinkBlockPromptType
    icon?: string | null
    label?: string | null
    prompt_md: string
    prompt_order?: number
    created_at?: string
    my_answer?: string | null
}

export interface ThinkBlock {
    id: string
    curriculum_module_id: string
    fun_fact_md: string
    image_url?: string | null
    order_index: number
    is_active: boolean
    created_by?: string | null
    created_at?: string
    updated_at?: string
    prompts?: ThinkBlockPrompt[]
    think_block_prompts?: { count: number }[] | ThinkBlockPrompt[]
}

export interface Hierarchy {
    center: EducationalCenter
    grades: (GradeLevel & {
        subjects: Subject[]
    })[]
}

export interface GradeContent {
    id: string
    grade_id: string
    title: string
    description?: string
    file_name: string
    file_path: string
    file_size: number
    uploaded_by?: string
    created_at: string
    updated_at: string
    is_active: boolean
    download_url?: string
}


export interface ModuleItem {
    id: string
    module_id: string
    type: 'pdf' | 'video' | 'link' | 'assignment'
    title: string
    description?: string
    content_url?: string
    order_index: number
    is_visible: boolean
    show_student?: boolean
    show_teacher?: boolean
    created_at: string
    updated_at: string
    image_url?: string
    is_editable?: boolean
}

export interface CourseModule {
    id: string
    subject_id: string
    title: string
    order_index: number
    is_active: boolean
    curriculum_module_id?: string | null
    created_at: string
    updated_at: string
    items: ModuleItem[]
}

export interface VrCodeEntry {
    id: string
    module_id: string
    code: string
    created_at: string
    image_url?: string
    description?: string
    title?: string
    order_index?: number
}

export interface ExitTicketQuestion {
    id: string
    exit_ticket_id: string
    question_order: number
    type: 'multiple_choice' | 'text' | 'rating' | string
    title: string
    description?: string
    config?: Record<string, any>
    required: boolean
    created_at: string
}

export interface ExitTicketTemplate {
    id: string
    title: string
    description?: string
    is_active: boolean
    available_from?: string
    due_at?: string
    created_at: string
    updated_at: string
    questions?: ExitTicketQuestion[]
    exit_ticket_questions?: [{ count: number }] // present on list view (admin GET /)
}

export interface ModuleExitTicketAttachment {
    id: string
    module_id: string
    exit_ticket_id: string
    created_at: string
}

export interface StudentExitTicketAnswer {
    id: string
    response_id: string
    question_id: string
    answer: any
    created_at: string
    updated_at: string
    exit_ticket_questions?: {
        title: string
        type: string
        config?: Record<string, any>
    }
}

export interface StudentExitTicketResponse {
    id: string
    exit_ticket_id: string
    student_id: string
    status: 'in_progress' | 'submitted'
    started_at?: string
    submitted_at?: string
    created_at: string
    updated_at: string
    student_exit_ticket_answers?: StudentExitTicketAnswer[]
    users?: {
        id: string
        full_name: string
        email: string
    }
}

// ============================================
// EDUCATIONAL CENTERS
// ============================================

export const getCenters = async (): Promise<EducationalCenter[]> => {
    try {
        const response = await fetch(`${API_URL}/api/centers`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error fetching centers:', error)
        throw error
    }
}

export const getCenterById = async (id: string): Promise<EducationalCenter> => {
    try {
        const response = await fetch(`${API_URL}/api/centers/${id}`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error fetching center:', error)
        throw error
    }
}

export const createCenter = async (
    data: Partial<EducationalCenter>
): Promise<EducationalCenter> => {
    try {
        const response = await fetch(`${API_URL}/api/centers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error creating center:', error)
        throw error
    }
}

export const cloneCenter = async (
    sourceCenterId: string,
    data: Partial<EducationalCenter>
): Promise<EducationalCenter> => {
    try {
        const response = await fetch(`${API_URL}/api/centers/${sourceCenterId}/clone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error cloning center:', error)
        throw error
    }
}

export const updateCenter = async (
    id: string,
    data: Partial<EducationalCenter>
): Promise<EducationalCenter> => {
    try {
        const response = await fetch(`${API_URL}/api/centers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error updating center:', error)
        throw error
    }
}

export const deleteCenter = async (id: string): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/api/centers/${id}`, {
            method: 'DELETE',
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
        console.error('Error deleting center:', error)
        throw error
    }
}

// ============================================
// CENTER PROFESSORS
// ============================================

export const getCenterProfessors = async (centerId: string): Promise<any[]> => {
    try {
        const response = await fetch(`${API_URL}/api/centers/${centerId}/professors`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error fetching center professors:', error)
        throw error
    }
}

export const assignProfessor = async (centerId: string, userId: string): Promise<any> => {
    try {
        const response = await fetch(`${API_URL}/api/centers/${centerId}/professors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        })
        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error assigning professor:', error)
        throw error
    }
}

export const unassignProfessor = async (centerId: string, userId: string): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/api/centers/${centerId}/professors/${userId}`, {
            method: 'DELETE',
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
        console.error('Error unassigning professor:', error)
        throw error
    }
}

// ============================================
// GRADES
// ============================================

export const getGradesByCenter = async (centerId: string): Promise<GradeLevel[]> => {
    try {
        const response = await fetch(`${API_URL}/api/centers/${centerId}/grades`)
        if (!response.ok) {
            const errorBody = await response.text()
            throw new Error(`HTTP error! status: ${response.status} - ${errorBody}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error fetching grades:', error)
        throw error
    }
}

export const getGradeById = async (id: string): Promise<GradeLevel> => {
    try {
        const response = await fetch(`${API_URL}/api/grades/${id}`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error fetching grade:', error)
        throw error
    }
}

export const createGrade = async (
    data: Partial<GradeLevel>
): Promise<GradeLevel> => {
    try {
        const response = await fetch(`${API_URL}/api/grades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error creating grade:', error)
        throw error
    }
}

export const updateGrade = async (
    id: string,
    data: Partial<GradeLevel>
): Promise<GradeLevel> => {
    try {
        const response = await fetch(`${API_URL}/api/grades/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error updating grade:', error)
        throw error
    }
}

export const cloneGrade = async (
    sourceGradeId: string,
    targetCenterId: string,
    name?: string,
    level?: number
): Promise<GradeLevel> => {
    try {
        const response = await fetch(`${API_URL}/api/grades/${sourceGradeId}/clone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_center_id: targetCenterId, name, level }),
        })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error cloning grade:', error)
        throw error
    }
}

export const deleteGrade = async (id: string): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/api/grades/${id}`, {
            method: 'DELETE',
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
        console.error('Error deleting grade:', error)
        throw error
    }
}

// ============================================
// SUBJECTS
// ============================================

export const getSubjectsByGrade = async (gradeId: string): Promise<Subject[]> => {
    try {
        const response = await fetch(`${API_URL}/api/grades/${gradeId}/subjects`)
        if (!response.ok) {
            const errorData = await response.json()
            console.error('Error Details:', errorData)
            const errorMessage = errorData.details
                ? `${errorData.error}: ${JSON.stringify(errorData.details)}`
                : errorData.error || `HTTP error! status: ${response.status}`
            throw new Error(errorMessage)
        }
        return await response.json()
    } catch (error) {
        console.error('Error fetching subjects:', error)
        throw error
    }
}

export const getSubjectById = async (id: string): Promise<Subject> => {
    try {
        const response = await fetch(`${API_URL}/api/subjects/${id}`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error fetching subject:', error)
        throw error
    }
}

export const createSubject = async (
    data: Partial<Subject>
): Promise<Subject> => {
    try {
        const response = await fetch(`${API_URL}/api/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error creating subject:', error)
        throw error
    }
}

export const cloneSubject = async (
    sourceSubjectId: string,
    targetGradeId: string,
    name?: string
): Promise<Subject> => {
    try {
        const response = await fetch(`${API_URL}/api/subjects/${sourceSubjectId}/clone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_grade_id: targetGradeId, name }),
        })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error cloning subject:', error)
        throw error
    }
}

export const updateSubject = async (
    id: string,
    data: Partial<Subject>
): Promise<Subject> => {
    try {
        const response = await fetch(`${API_URL}/api/subjects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error updating subject:', error)
        throw error
    }
}

// ============================================
// SUBJECT PROFESSORS
// ============================================

export const getSubjectProfessors = async (subjectId: string): Promise<any[]> => {
    try {
        const response = await fetch(`${API_URL}/api/subjects/${subjectId}/professors`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error fetching subject professors:', error)
        throw error
    }
}

export const assignSubjectProfessor = async (subjectId: string, userId: string | string[]): Promise<any> => {
    try {
        const body = Array.isArray(userId) ? { userIds: userId } : { userId }
        const response = await fetch(`${API_URL}/api/subjects/${subjectId}/professors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error assigning professor to subject:', error)
        throw error
    }
}

export const unassignSubjectProfessor = async (subjectId: string, userId: string): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/api/subjects/${subjectId}/professors/${userId}`, {
            method: 'DELETE',
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
        console.error('Error unassigning professor from subject:', error)
        throw error
    }
}

export const deleteSubject = async (id: string): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/api/subjects/${id}`, {
            method: 'DELETE',
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
        console.error('Error deleting subject:', error)
        throw error
    }
}

// ============================================
// HIERARCHY
// ============================================

export const getHierarchy = async (centerId: string): Promise<Hierarchy> => {
    try {
        const response = await fetch(`${API_URL}/api/centers/${centerId}/hierarchy`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error fetching hierarchy:', error)
        throw error
    }
}

// ============================================
// GRADE CONTENT
// ============================================

export const getGradeContent = async (gradeId: string): Promise<GradeContent[]> => {
    try {
        const response = await fetch(`${API_URL}/api/grades/${gradeId}/content`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error fetching grade content:', error)
        throw error
    }
}

export const uploadGradeContent = async (
    gradeId: string,
    files: File[],
    titles?: string[]
): Promise<GradeContent[]> => {
    try {
        const formData = new FormData()

        files.forEach((file) => {
            formData.append('files', file)
        })

        if (titles && titles.length > 0) {
            formData.append('titles', JSON.stringify(titles))
        }

        const response = await fetch(`${API_URL}/api/grades/${gradeId}/content`, {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('Upload Error Details:', errorData)
            const errorMessage = errorData.details
                ? `${errorData.error}: ${JSON.stringify(errorData.details)}`
                : errorData.error || `HTTP error! status: ${response.status}`
            throw new Error(errorMessage)
        }

        const result = await response.json()
        return result.content || []
    } catch (error) {
        console.error('Error uploading content:', error)
        throw error
    }
}

export const deleteGradeContent = async (contentId: string): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/api/admin/content/${contentId}`, {
            method: 'DELETE',
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
        console.error('Error deleting content:', error)
        throw error
    }
}

// ============================================
// COURSE MODULES & ITEMS
// ============================================

export const getModuleVrCode = async (moduleId: string): Promise<VrCodeEntry[]> => {
    try {
        const response = await fetch(`${API_URL}/api/modules/${moduleId}/vr-code`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error fetching VR codes:', error)
        return []
    }
}

export const addModuleVrCode = async (
    moduleId: string,
    code: string,
    imageUrl?: string,
    title?: string,
    description?: string
): Promise<VrCodeEntry> => {
    try {
        const response = await fetch(`${API_URL}/api/modules/${moduleId}/vr-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, image_url: imageUrl || null, title: title || null, description: description || null }),
        })
        if (!response.ok) {
            const err = await response.json()
            throw new Error(err.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error adding VR code:', error)
        throw error
    }
}

/** @deprecated use addModuleVrCode / updateModuleVrCode instead */
export const saveModuleVrCode = addModuleVrCode

export const updateModuleVrCode = async (
    entryId: string,
    code: string,
    imageUrl?: string,
    title?: string,
    description?: string
): Promise<VrCodeEntry> => {
    try {
        const response = await fetch(`${API_URL}/api/modules/vr-code/${entryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, image_url: imageUrl || null, title: title || null, description: description || null }),
        })
        if (!response.ok) {
            const err = await response.json()
            throw new Error(err.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error updating VR code:', error)
        throw error
    }
}

export const deleteModuleVrCode = async (entryId: string): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/api/modules/vr-code/${entryId}`, {
            method: 'DELETE',
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
        console.error('Error deleting VR code:', error)
        throw error
    }
}

export const getCourseModules = async (subjectId: string): Promise<CourseModule[]> => {
    try {
        const response = await fetch(`${API_URL}/api/subjects/${subjectId}/modules`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error fetching course modules:', error)
        throw error
    }
}

export const createCourseModule = async (
    subjectId: string,
    title: string,
    order_index: number = 0,
    curriculum_module_id?: string | null
): Promise<CourseModule> => {
    try {
        const response = await fetch(`${API_URL}/api/subjects/${subjectId}/modules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, order_index, curriculum_module_id: curriculum_module_id || null }),
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error creating module:', error)
        throw error
    }
}

export const updateCourseModule = async (id: string, data: Partial<CourseModule>): Promise<CourseModule> => {
    const response = await fetch(`${API_URL}/api/modules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        const msg = errBody?.error || errBody?.message || `HTTP error! status: ${response.status}`
        console.error('Error updating module:', msg, errBody)
        throw new Error(msg)
    }
    return await response.json()
}

export const deleteCourseModule = async (id: string): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/api/modules/${id}`, {
            method: 'DELETE',
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
        console.error('Error deleting module:', error)
        throw error
    }
}

// ITEMS

export const createModuleItem = async (
    moduleId: string,
    data: Partial<ModuleItem>
): Promise<ModuleItem> => {
    try {
        const response = await fetch(`${API_URL}/api/modules/${moduleId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error creating item:', error)
        throw error
    }
}

export const uploadModuleItem = async (
    moduleId: string,
    file: File,
    data: { title: string, description?: string, order_index?: number, is_editable?: boolean }
): Promise<ModuleItem> => {
    try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', data.title)
        if (data.description) formData.append('description', data.description)
        if (data.order_index) formData.append('order_index', data.order_index.toString())
        if (data.is_editable !== undefined) formData.append('is_editable', data.is_editable.toString())

        const response = await fetch(`${API_URL}/api/modules/${moduleId}/items/upload`, {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error uploading item:', error)
        throw error
    }
}

export const updateModuleItem = async (
    id: string,
    data: Partial<ModuleItem>
): Promise<ModuleItem> => {
    try {
        const response = await fetch(`${API_URL}/api/items/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error updating item:', error)
        throw error
    }
}

export const deleteModuleItem = async (id: string): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/api/items/${id}`, {
            method: 'DELETE',
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
        console.error('Error deleting item:', error)
        throw error
    }
}

export const toggleItemVisibility = async (itemId: string, show_student: boolean): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/api/module-items/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ show_student }),
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
        console.error('Error toggling item visibility:', error)
        throw error
    }
}

export const toggleItemVisibilityProfessor = async (itemId: string, show_teacher: boolean): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/api/module-items-p/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ show_teacher }),
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
        console.error('Error toggling item visibility for professors:', error)
        throw error
    }
}

// ============================================
// AGENDA
// ============================================

export const getUserAgenda = async (userId: string, role: string): Promise<Subject[]> => {
    try {
        const response = await fetch(`${API_URL}/api/agenda/${userId}?role=${role}`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error fetching user agenda:', error)
        throw error
    }
}

// ============================================
// IMAGE UPLOAD
// ============================================


export const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`${API_URL}/api/upload/image`, {
        method: 'POST',
        body: formData,
    })
    if (!response.ok) throw new Error(`Upload failed: ${response.status}`)
    const data = await response.json()
    return data.url
}

export const reorderModuleItems = async (
    moduleId: string,
    order: { id: string; order_index: number }[]
): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/api/modules/${moduleId}/items/reorder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order }),
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
        console.error('Error reordering module items:', error)
        throw error
    }
}

export const reorderModuleVrCodes = async (
    moduleId: string,
    order: { id: string; order_index: number }[]
): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/api/modules/${moduleId}/vr-entries/reorder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order }),
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
        console.error('Error reordering VR entries:', error)
        throw error
    }
}

// ============================================
// EXIT TICKETS - TEMPLATE CRUD
// ============================================

export const getExitTickets = async (): Promise<ExitTicketTemplate[]> => {
    try {
        const response = await fetch(`${API_URL}/api/exit-tickets`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error fetching exit tickets:', error)
        throw error
    }
}

export const getExitTicket = async (id: string): Promise<ExitTicketTemplate> => {
    try {
        const response = await fetch(`${API_URL}/api/exit-tickets/${id}`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error fetching exit ticket:', error)
        throw error
    }
}

export interface CreateExitTicketPayload {
    title: string
    description?: string
    is_active?: boolean
    available_from?: string
    due_at?: string
    questions?: CreateExitTicketQuestionPayload[]
}

export const createExitTicket = async (
    payload: CreateExitTicketPayload
): Promise<ExitTicketTemplate> => {
    try {
        const response = await fetch(`${API_URL}/api/exit-tickets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error creating exit ticket:', error)
        throw error
    }
}

export interface UpdateExitTicketPayload {
    title?: string
    description?: string
    is_active?: boolean
    available_from?: string
    due_at?: string
}

export const updateExitTicket = async (
    id: string,
    payload: UpdateExitTicketPayload
): Promise<ExitTicketTemplate> => {
    try {
        const response = await fetch(`${API_URL}/api/exit-tickets/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error updating exit ticket:', error)
        throw error
    }
}

export const deleteExitTicket = async (id: string): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/api/exit-tickets/${id}`, {
            method: 'DELETE',
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
        console.error('Error deleting exit ticket:', error)
        throw error
    }
}

// ============================================
// EXIT TICKETS - QUESTION CRUD
// ============================================

export interface CreateExitTicketQuestionPayload {
    question_order?: number
    type: string
    title: string
    description?: string
    config?: Record<string, any>
    required?: boolean
}

export const addExitTicketQuestion = async (
    exitTicketId: string,
    payload: CreateExitTicketQuestionPayload
): Promise<ExitTicketQuestion> => {
    try {
        const response = await fetch(`${API_URL}/api/exit-tickets/${exitTicketId}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error adding exit ticket question:', error)
        throw error
    }
}

export interface UpdateExitTicketQuestionPayload {
    question_order?: number
    type?: string
    title?: string
    description?: string
    config?: Record<string, any>
    required?: boolean
}

export const updateExitTicketQuestion = async (
    questionId: string,
    payload: UpdateExitTicketQuestionPayload
): Promise<ExitTicketQuestion> => {
    try {
        const response = await fetch(`${API_URL}/api/exit-tickets/questions/${questionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error updating exit ticket question:', error)
        throw error
    }
}

export const deleteExitTicketQuestion = async (questionId: string): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/api/exit-tickets/questions/${questionId}`, {
            method: 'DELETE',
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
        console.error('Error deleting exit ticket question:', error)
        throw error
    }
}

export interface BulkReplaceQuestionPayload {
    type: string
    title: string
    description?: string
    config?: Record<string, any>
    required?: boolean
}

/**
 * Atomically replaces ALL questions for a ticket with the supplied list.
 * Internally: DELETE all existing → INSERT all new (ordered by array index).
 * This avoids unique-constraint collisions on (exit_ticket_id, question_order).
 */
export const bulkReplaceExitTicketQuestions = async (
    exitTicketId: string,
    questions: BulkReplaceQuestionPayload[]
): Promise<ExitTicketQuestion[]> => {
    try {
        const response = await fetch(
            `${API_URL}/api/exit-tickets/${exitTicketId}/questions/bulk`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questions }),
            }
        )
        if (!response.ok) {
            const err = await response.json().catch(() => ({}))
            throw new Error(err.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error bulk-replacing exit ticket questions:', error)
        throw error
    }
}

// ============================================
// EXIT TICKETS - MODULE ATTACHMENT
// ============================================

export const getModuleExitTickets = async (
    moduleId: string
): Promise<ExitTicketTemplate[]> => {
    try {
        const response = await fetch(`${API_URL}/api/exit-tickets/modules/${moduleId}`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error fetching module exit tickets:', error)
        throw error
    }
}

export const attachExitTicketsToModule = async (
    moduleId: string,
    exitTicketIds: string[]
): Promise<ModuleExitTicketAttachment[]> => {
    try {
        const response = await fetch(`${API_URL}/api/exit-tickets/modules/${moduleId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exit_ticket_ids: exitTicketIds }),
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error attaching exit ticket to module:', error)
        throw error
    }
}

export const detachExitTicketFromModule = async (
    moduleId: string,
    exitTicketId: string
): Promise<void> => {
    try {
        const response = await fetch(
            `${API_URL}/api/exit-tickets/modules/${moduleId}/${exitTicketId}`,
            { method: 'DELETE' }
        )
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
        console.error('Error detaching exit ticket from module:', error)
        throw error
    }
}

// ============================================
// EXIT TICKETS - RESPONSES (teacher/admin view)
// ============================================

export const getExitTicketResponsesForModule = async (
    moduleId: string,
    exitTicketId: string
): Promise<StudentExitTicketResponse[]> => {
    try {
        const response = await fetch(
            `${API_URL}/api/exit-tickets/modules/${moduleId}/${exitTicketId}/responses`
        )
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error fetching exit ticket responses:', error)
        throw error
    }
}

export const getExitTicketResponse = async (
    responseId: string
): Promise<StudentExitTicketResponse> => {
    try {
        const response = await fetch(`${API_URL}/api/exit-tickets/responses/${responseId}`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error fetching exit ticket response:', error)
        throw error
    }
}

export const getMyExitTicketResponse = async (
    ticketId: string,
    moduleId: string,
    studentId: string
): Promise<StudentExitTicketResponse | null> => {
    try {
        const response = await fetch(
            `${API_URL}/api/exit-tickets/${ticketId}/my-response?module_id=${moduleId}&student_id=${studentId}`
        )
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error fetching student response:', error)
        return null
    }
}

export const submitExitTicketResponse = async (
    ticketId: string,
    moduleId: string,
    studentId: string,
    answers: Array<{ question_id: string; answer: any }>
): Promise<any> => {
    try {
        const response = await fetch(`${API_URL}/api/exit-tickets/${ticketId}/responses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                module_id: moduleId,
                student_id: studentId,
                answers,
            }),
        })
        const data = await response.json()
        if (!response.ok) {
            throw new Error(data.error || 'Error al enviar el cuestionario')
        }
        return data
    } catch (error) {
        console.error('Error submitting exit ticket response:', error)
        throw error
    }
}

// ============================================
// CURRICULUM
// ============================================

export const getCurriculumGrades = async (): Promise<CurriculumGrade[]> => {
    try {
        const response = await fetch(`${API_URL}/api/curriculum/grades`)
        if (!response.ok) {
            const errorBody = await response.text()
            throw new Error(`HTTP error! status: ${response.status} - ${errorBody}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error fetching curriculum grades:', error)
        throw error
    }
}

export const getCurriculumSubjectsByGrade = async (gradeId: string): Promise<CurriculumSubject[]> => {
    try {
        const response = await fetch(`${API_URL}/api/curriculum/grades/${gradeId}/subjects`)
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error fetching curriculum subjects:', error)
        throw error
    }
}

export const getCurriculumModulesBySubject = async (subjectId: string): Promise<CurriculumModule[]> => {
    try {
        const response = await fetch(`${API_URL}/api/curriculum/subjects/${subjectId}/modules`)
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error fetching curriculum modules:', error)
        throw error
    }
}

export const getCurriculumTree = async (): Promise<CurriculumGradeTree[]> => {
    try {
        const response = await fetch(`${API_URL}/api/curriculum/tree`)
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error fetching curriculum tree:', error)
        throw error
    }
}

// ============================================
// THINK BLOCKS (PIENSA, OBSERVA Y EXPERIMENTA)
// ============================================

export const getThinkBlocks = async (curriculumModuleId?: string): Promise<ThinkBlock[]> => {
    try {
        const url = curriculumModuleId
            ? `${API_URL}/api/think-blocks?curriculum_module_id=${curriculumModuleId}`
            : `${API_URL}/api/think-blocks`
        const response = await fetch(url)
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error fetching think blocks:', error)
        throw error
    }
}

/** Fetch think blocks for a specific module instance (resolves via curriculum_module_id). */
export const getModuleThinkBlocks = async (moduleId: string): Promise<ThinkBlock[]> => {
    try {
        const response = await fetch(`${API_URL}/api/think-blocks/modules/${moduleId}`)
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error fetching module think blocks:', error)
        throw error
    }
}


export const getThinkBlock = async (id: string): Promise<ThinkBlock> => {
    try {
        const response = await fetch(`${API_URL}/api/think-blocks/${id}`)
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error fetching think block:', error)
        throw error
    }
}

export const createThinkBlock = async (payload: {
    curriculum_module_id: string
    fun_fact_md: string
    image_url?: string | null
    order_index?: number
    is_active?: boolean
    prompts?: Partial<ThinkBlockPrompt>[]
}): Promise<ThinkBlock> => {
    try {
        const response = await fetch(`${API_URL}/api/think-blocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error creating think block:', error)
        throw error
    }
}

export const updateThinkBlock = async (
    id: string,
    payload: Partial<ThinkBlock>
): Promise<ThinkBlock> => {
    try {
        const response = await fetch(`${API_URL}/api/think-blocks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error updating think block:', error)
        throw error
    }
}

export const deleteThinkBlock = async (id: string): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/api/think-blocks/${id}`, {
            method: 'DELETE',
        })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
    } catch (error) {
        console.error('Error deleting think block:', error)
        throw error
    }
}

export const bulkReplaceThinkBlockPrompts = async (
    id: string,
    prompts: Array<{ prompt_type?: string; icon?: string | null; label?: string | null; prompt_md: string; prompt_order?: number }>
): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/api/think-blocks/${id}/prompts/bulk`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompts }),
        })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
    } catch (error) {
        console.error('Error replacing think block prompts:', error)
        throw error
    }
}

/** Save or update a student's open response for a single think block prompt. */
export const saveStudentThinkBlockAnswer = async (
    promptId: string,
    studentId: string,
    answerMd: string
): Promise<any> => {
    try {
        const response = await fetch(`${API_URL}/api/think-blocks/prompts/${promptId}/answer`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId, answer_md: answerMd }),
        })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error saving think block prompt answer:', error)
        throw error
    }
}

/** Save or update multiple student open responses for a think block. */
export const saveStudentThinkBlockAnswers = async (
    blockId: string,
    studentId: string,
    answers: { prompt_id: string; answer_md: string }[]
): Promise<any> => {
    try {
        const response = await fetch(`${API_URL}/api/think-blocks/${blockId}/answers`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId, answers }),
        })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error saving think block answers:', error)
        throw error
    }
}

// ============================================
// QUIZZES
// ============================================

export type QuizQuestionType =
    | 'multiple_choice'
    | 'true_false'
    | 'checklist'
    | 'open'
    | 'complete_sentence'
    | 'matching'
    | 'ordering'

export interface QuizQuestion {
    id: string
    quiz_id: string
    question_order: number
    type: QuizQuestionType
    title: string
    config?: Record<string, any>
    required: boolean
    created_at?: string
}

export interface Quiz {
    id: string
    title: string
    description?: string
    curriculum_module_id?: string
    created_by?: string
    is_active: boolean
    created_at: string
    updated_at: string
    questions?: QuizQuestion[]
    quiz_questions?: [{ count: number }]
}

export interface CreateQuizPayload {
    title: string
    description?: string
    is_active?: boolean
    curriculum_module_id?: string
    questions?: Omit<QuizQuestion, 'id' | 'quiz_id' | 'created_at'>[]
}

export interface UpdateQuizPayload {
    title?: string
    description?: string
    is_active?: boolean
    curriculum_module_id?: string
}

export interface BulkReplaceQuizQuestionsPayload {
    type: QuizQuestionType
    title: string
    config?: Record<string, any>
    required?: boolean
}

export const getQuizzes = async (curriculumModuleId?: string): Promise<Quiz[]> => {
    try {
        const url = curriculumModuleId
            ? `${API_URL}/api/quizzes?curriculum_module_id=${curriculumModuleId}`
            : `${API_URL}/api/quizzes`
        const response = await fetch(url)
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error fetching quizzes:', error)
        throw error
    }
}

export const getQuiz = async (id: string): Promise<Quiz> => {
    try {
        const response = await fetch(`${API_URL}/api/quizzes/${id}`)
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error fetching quiz:', error)
        throw error
    }
}

export const createQuiz = async (payload: CreateQuizPayload): Promise<Quiz> => {
    try {
        const response = await fetch(`${API_URL}/api/quizzes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error creating quiz:', error)
        throw error
    }
}

export const updateQuiz = async (id: string, payload: UpdateQuizPayload): Promise<Quiz> => {
    try {
        const response = await fetch(`${API_URL}/api/quizzes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error updating quiz:', error)
        throw error
    }
}

export const deleteQuiz = async (id: string): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/api/quizzes/${id}`, { method: 'DELETE' })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
    } catch (error) {
        console.error('Error deleting quiz:', error)
        throw error
    }
}

export const bulkReplaceQuizQuestions = async (
    quizId: string,
    questions: BulkReplaceQuizQuestionsPayload[]
): Promise<QuizQuestion[]> => {
    try {
        const response = await fetch(`${API_URL}/api/quizzes/${quizId}/questions/bulk`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questions }),
        })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error bulk-replacing quiz questions:', error)
        throw error
    }
}

// ============================================
// MODULE QUIZZES ATTACHMENT
// ============================================

export interface ModuleQuizAttachment {
    id: string
    quiz_id: string
    module_id?: string
    due_at?: string | null
    available_from?: string | null
    is_active: boolean
    quizzes: Quiz
}

export const getModuleQuizzes = async (
    moduleId: string
): Promise<ModuleQuizAttachment[]> => {
    try {
        const response = await fetch(`${API_URL}/api/quizzes/modules/${moduleId}`)
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error fetching module quizzes:', error)
        throw error
    }
}

export const attachQuizzesToModule = async (
    moduleId: string,
    quizIds: string[],
    dueAt?: string,
    availableFrom?: string
): Promise<ModuleQuizAttachment[]> => {
    try {
        const response = await fetch(`${API_URL}/api/quizzes/modules/${moduleId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quiz_ids: quizIds,
                due_at: dueAt || null,
                available_from: availableFrom || null,
            }),
        })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error attaching quizzes to module:', error)
        throw error
    }
}

export const detachQuizFromModule = async (
    moduleId: string,
    quizId: string
): Promise<void> => {
    try {
        const response = await fetch(
            `${API_URL}/api/quizzes/modules/${moduleId}/${quizId}`,
            { method: 'DELETE' }
        )
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
    } catch (error) {
        console.error('Error detaching quiz from module:', error)
        throw error
    }
}

// ============================================
// STUDENT QUIZ RESPONSES
// ============================================

export interface StudentQuizAnswer {
    id?: string
    response_id?: string
    question_id: string
    answer: string
    is_correct?: boolean | null
    points_awarded?: number | null
    quiz_questions?: {
        title: string
        type: string
        config: Record<string, any>
        question_order: number
    }
}

export interface StudentQuizResponse {
    id: string
    module_quiz_id: string
    student_id: string
    status: 'in_progress' | 'submitted'
    started_at?: string
    submitted_at?: string
    score?: number | null
    max_score?: number | null
    student_quiz_answers?: StudentQuizAnswer[]
}

/** Fetch a student's existing response for a specific module_quiz attachment. Returns null if not yet answered. */
export const getModuleQuizResponse = async (
    moduleQuizId: string,
    studentId: string
): Promise<StudentQuizResponse | null> => {
    try {
        const response = await fetch(
            `${API_URL}/api/quizzes/module-quizzes/${moduleQuizId}/my-response?student_id=${studentId}`
        )
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error fetching module quiz response:', error)
        throw error
    }
}

/** Submit a student's answers to a module quiz attachment. Auto-graded on the backend. */
export const submitModuleQuizResponse = async (
    moduleQuizId: string,
    studentId: string,
    answers: { question_id: string; answer: string | string[] | boolean }[]
): Promise<StudentQuizResponse> => {
    try {
        const response = await fetch(
            `${API_URL}/api/quizzes/module-quizzes/${moduleQuizId}/responses`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: studentId, answers }),
            }
        )
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error('Error submitting module quiz response:', error)
        throw error
    }
}