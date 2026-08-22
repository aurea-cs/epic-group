const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface BookPageData {
    id: string
    page_number: number
    source_pdf_page: number
    side: 'left' | 'right'
    image_url: string | null
    width: number
    height: number
}

export interface ModulePagesResponse {
    processing_status: 'pending' | 'processing' | 'ready' | 'failed'
    processing_error?: string | null
    total_pages?: number
    pages: BookPageData[]
}

export const getModuleItemPages = async (itemId: string): Promise<ModulePagesResponse> => {
    const response = await fetch(`${API_URL}/api/modules/items/${itemId}/pages`)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.json()
}