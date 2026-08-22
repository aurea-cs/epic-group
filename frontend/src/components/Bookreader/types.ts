export type ElementType = 'true_false' | 'multiple_choice' | 'open_ended' | 'connect' | 'rank' | 'checkbox' | 'dropdown' 

export interface TrueFalseConfig {
    prompt?: string
    correct: boolean
    compact?: boolean
    labels?: [string, string] // e.g. ["V", "F"] or ["Verdadero", "Falso"]
}

export interface MultipleChoiceConfig {
    prompt: string
    options: string[]
    correct_index: number
}

export interface OpenEndedConfig {
    prompt: string
    placeholder?: string
}

export interface ConnectPoint {
    id: string
    x: number // 0-1, relative to this element's own box (not the whole page)
    y: number
    label?: string
}

export interface ConnectConfig {
    prompt?: string
    points: ConnectPoint[]
    correct_pairs: [string, string][]
}

export interface RankItem {
    id: string
    label: string
}

export interface RankConfig {
    prompt: string
    items: RankItem[]
    correct_order: string[]
}

export interface CheckboxConfig {
    label?: string
    correct?: boolean
}

export interface DropdownConfig {
    prompt?: string
    placeholder?: string
    options: string[]
    correct_value?: string
    correct_index?: number
}

export type ElementConfig = TrueFalseConfig | MultipleChoiceConfig | OpenEndedConfig | ConnectConfig | RankConfig | CheckboxConfig | DropdownConfig 

export interface SavedResponse {
    response: any
    is_correct: boolean | null
}

export interface PageElement {
    id: string
    type: ElementType
    page_number: number
    x: number
    y: number
    width: number
    height: number
    config: ElementConfig
    order_index: number
    saved_response: SavedResponse | null
}