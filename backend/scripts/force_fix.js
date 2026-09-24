const fs = require('fs');
const path = '../frontend/src/components/ExtraContentScreen/components/exitTicketEditorScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// The file is currently completely broken at the top. Let's find the first safe anchor.
// `setTitle(data.title || '')` should be there.
const anchor = `                setTitle(data.title || '')`;
const idx = content.indexOf(anchor);

if (idx === -1) {
    console.error("Could not find anchor!");
    process.exit(1);
}

const newTop = `import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    getExitTicket,
    createExitTicket,
    updateExitTicket,
    bulkReplaceExitTicketQuestions,
    deleteExitTicketQuestion
} from '../../../lib/adminApi'

export interface ExitTicketQuestionFormState {
    id?: string
    title: string
    type: 'multiple_choice' | 'text' | 'rating'
    required: boolean
    question_order?: number
    config?: {
        options?: { label: string }[]
    }
}

interface ExitTicketEditorScreenProps {
    templateId: string | null
    onBack: () => void
    onSaved: () => void
}

const getDefaultNewQuestions = (i18n: any): ExitTicketQuestionFormState[] => [
    { title: i18n.language.startsWith('en') ? 'What main concept did you learn today in class?' : '¿Qué concepto principal aprendiste hoy en clase?', type: 'text', required: true, question_order: 0 },
    { title: i18n.language.startsWith('en') ? 'How clear was today\\'s lesson?' : '¿Qué tan clara fue la lección de hoy?', type: 'rating', required: true, question_order: 1 },
]

const ExitTicketEditorScreen: React.FC<ExitTicketEditorScreenProps> = ({ templateId, onBack, onSaved }) => {
    const { t, i18n } = useTranslation()
    const isEditing = !!templateId

    const [loadingDetail, setLoadingDetail] = useState(isEditing)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    // Main form fields
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [isActive, setIsActive] = useState(true)
    const [questions, setQuestions] = useState<ExitTicketQuestionFormState[]>(
        isEditing ? [] : getDefaultNewQuestions(i18n)
    )

    // Question form fields (for add / edit modal)
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
    const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null)
    const [newTitle, setNewTitle] = useState('')
    const [newType, setNewType] = useState<'multiple_choice' | 'text' | 'rating'>('multiple_choice')
    const [newRequired, setNewRequired] = useState(true)
    const [newOptions, setNewOptions] = useState<string[]>(i18n.language.startsWith('en') ? ['Option 1', 'Option 2'] : ['Opción 1', 'Opción 2'])
    const [newOptionInput, setNewOptionInput] = useState('')

    // Live preview state (for testing interactive elements)
    const [previewAnswers, setPreviewAnswers] = useState<Record<number, any>>({})

    useEffect(() => {
        if (!templateId) return
        let cancelled = false

        const loadDetail = async () => {
            try {
                setLoadingDetail(true)
                setLoadError(null)
                const data = await getExitTicket(templateId)
                if (cancelled) return

`;

content = newTop + content.substring(idx);

fs.writeFileSync(path, content, 'utf8');
console.log("Forced fix successful!");
