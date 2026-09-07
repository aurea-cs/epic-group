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
    created_at: string
    updated_at: string
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
    attached_at: string
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

export const createCourseModule = async (subjectId: string, title: string, order_index: number = 0): Promise<CourseModule> => {
    try {
        const response = await fetch(`${API_URL}/api/subjects/${subjectId}/modules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, order_index }),
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error creating module:', error)
        throw error
    }
}

export const updateCourseModule = async (id: string, data: Partial<CourseModule>): Promise<CourseModule> => {
    try {
        const response = await fetch(`${API_URL}/api/modules/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return await response.json()
    } catch (error) {
        console.error('Error updating module:', error)
        throw error
    }
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