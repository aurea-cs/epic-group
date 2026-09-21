const fs = require('fs');
const path = '../frontend/src/components/ExtraContentScreen/components/exitTicketEditorScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove duplicated imports block
const doubleImports = `import { useTranslation } from 'react-i18next'
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
}`;

const firstIdx = content.indexOf(doubleImports);
const lastIdx = content.lastIndexOf(doubleImports);
if (firstIdx !== lastIdx && firstIdx !== -1) {
    // It's duplicated, remove the second occurrence
    content = content.substring(0, lastIdx) + content.substring(lastIdx + doubleImports.length);
}

// 2. Fix the component start by injecting the state
const badStart = `const ExitTicketEditorScreen: React.FC<ExitTicketEditorScreenProps> = ({ templateId, onBack, onSaved }) => {
    useEffect(() => {
        if (!templateId) return`;

const goodStart = `const ExitTicketEditorScreen: React.FC<ExitTicketEditorScreenProps> = ({ templateId, onBack, onSaved }) => {
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
        if (!templateId) return`;

content = content.replace(badStart, goodStart);

// 3. Fix the setNewOptions array nesting
content = content.split(`[i18n.language.startsWith('en') ? ['Option 1', 'Option 2'] : ['Opción 1', 'Opción 2']]`).join(`i18n.language.startsWith('en') ? ['Option 1', 'Option 2'] : ['Opción 1', 'Opción 2']`);

// Also fix one leftover 'type: 'multiple_choice' | 'text' | 'rating'' missing from the first interface
content = content.replace(
`export interface ExitTicketQuestionFormState {
    id?: string
    title: string
import { useTranslation } from 'react-i18next'`,
`export interface ExitTicketQuestionFormState {
    id?: string
    title: string
    type: 'multiple_choice' | 'text' | 'rating'
    required: boolean
    question_order?: number
    config?: {
        options?: { label: string }[]
    }
}
import { useTranslation } from 'react-i18next'`);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed exitTicketEditorScreen.tsx');
