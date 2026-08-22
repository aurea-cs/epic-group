import { PageElement } from './types'
 
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
 
export const getPageElements = async (itemId: string, studentId?: string): Promise<PageElement[]> => {
    const query = studentId ? `?student_id=${encodeURIComponent(studentId)}` : ''
    const response = await fetch(`${API_URL}/api/modules/items/${itemId}/elements${query}`)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.json()
}
 
export const submitElementResponse = async (
    elementId: string,
    studentId: string,
    response: any
): Promise<{ is_correct: boolean | null }> => {
    const res = await fetch(`${API_URL}/api/elements/${elementId}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, response })
    })
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
    return await res.json()
}
 
// Admin authoring: replace all elements for a book in one shot from JSON.
export const saveModuleItemElements = async (itemId: string, elements: any[]): Promise<{ count: number }> => {
    const res = await fetch(`${API_URL}/api/admin/modules/items/${itemId}/elements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elements })
    })
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
    return await res.json()
}