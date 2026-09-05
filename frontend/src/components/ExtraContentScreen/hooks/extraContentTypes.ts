export interface CategoryItem {
    id: string
    name: string
    icon: string
    description: string
    badgeText: string
    badgeClass: 'primaria' | 'secundaria'
}

// Local form-state shape for a question while it's being built/edited in the
// modal — mirrors ExitTicketQuestion from adminApi but allows `id` to be
// absent for questions that haven't been persisted yet.
export interface ExitTicketQuestionFormState {
    id?: string
    title: string
    type: 'multiple_choice' | 'text' | 'rating'
    required: boolean
    question_order?: number
}