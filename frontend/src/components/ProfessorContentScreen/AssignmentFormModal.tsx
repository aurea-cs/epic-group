import React, { useState } from 'react'
import {
    MDXEditor,
    headingsPlugin,
    listsPlugin,
    quotePlugin,
    thematicBreakPlugin,
    linkPlugin,
    linkDialogPlugin,
    imagePlugin,
    markdownShortcutPlugin,
    toolbarPlugin,
    UndoRedo,
    BoldItalicUnderlineToggles,
    BlockTypeSelect,
    ListsToggle,
    CreateLink,
    InsertImage,
    Separator,
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'
import './AssignmentFormModal.css'
import type { CourseModule } from '../../lib/adminApi'
import {type Assignment } from './types'
import ConfirmModal from '../general/ConfirmModal'
import { ActionButton, Modal, Toggle, fieldLabelStyle, inputStyle } from '../general/SharedUI'
import CustomSelect from '../general/CustomSelect'
import CustomNumberPicker from '../general/CustomNumberPicker'
import CustomDatePicker from '../general/CustomDatePicker'


const NO_MODULE = '__none__'
interface AssignmentFormModalProps {
    modules: CourseModule[]
    initial: Assignment | null
    onClose: () => void
    onSubmit: (payload: Omit<Assignment, 'id' | 'created_at' | 'updated_at' | 'subject_id' | 'professor_id'>) => Promise<void>
}

const AssignmentFormModal: React.FC<AssignmentFormModalProps> = ({ modules, initial, onClose, onSubmit }) => {
    const [title, setTitle] = useState(initial?.title || '')
    const [instructions, setInstructions] = useState(initial?.instructions_md || '')
    const [moduleId, setModuleId] = useState<string>(initial?.module_id || '')
    const [dueAt, setDueAt] = useState(initial?.due_at ? initial.due_at.slice(0, 16) : '')
    const [availableFrom, setAvailableFrom] = useState(initial?.available_from ? initial.available_from.slice(0, 16) : '')
    const [maxScore, setMaxScore] = useState<number>(initial?.max_score ?? 100)
    const [allowedFileTypes, setAllowedFileTypes] = useState((initial?.allowed_file_types ?? ['pdf', 'docx']).join(', '))
    const [maxFileSizeMb, setMaxFileSizeMb] = useState<number>(initial?.max_file_size_mb ?? 10)
    const [allowResubmission, setAllowResubmission] = useState(initial?.allow_resubmission ?? false)
    const [status, setStatus] = useState(initial?.status || 'draft')
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [showConfirm, setShowConfirm] = useState(false)

    const isEditing = !!initial

    const isDirty =
    title !== (initial?.title || '') ||
    instructions !== (initial?.instructions_md || '') ||
    moduleId !== (initial?.module_id || '') ||
    dueAt !== (initial?.due_at ? initial.due_at.slice(0, 16) : '') ||
    availableFrom !== (initial?.available_from ? initial.available_from.slice(0, 16) : '') ||
    maxScore !== (initial?.max_score ?? 100) ||
    allowedFileTypes !== (initial?.allowed_file_types ?? ['pdf','docx']).join(', ') ||
    maxFileSizeMb !== (initial?.max_file_size_mb ?? 10) ||
    allowResubmission !== (initial?.allow_resubmission ?? false) ||
    status !== (initial?.status || 'draft')

    const handleAttemptClose = () => {
        if (!isDirty) return onClose()
        setShowConfirm(true)
    }
    
    const handleSubmit = async () => {
        if (!title.trim()) return
        setSaving(true)
        setFormError(null)
        try {
            await onSubmit({
                module_id: moduleId || null,
                title: title.trim(),
                instructions_md: instructions.trim() || null,
                due_at: dueAt ? new Date(dueAt).toISOString() : null,
                available_from: availableFrom ? new Date(availableFrom).toISOString() : null,
                max_score: maxScore,
                allowed_file_types: allowedFileTypes.split(',').map(t => t.trim()).filter(Boolean),
                max_file_size_mb: maxFileSizeMb,
                allow_resubmission: allowResubmission,
                status,
            })
        } catch (e: any) {
            setFormError(e.message || 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal title={isEditing ? 'Editar tarea' : 'Nueva tarea'} onClose={handleAttemptClose}>
            {showConfirm && (
                <ConfirmModal
                    message="¿Seguro que quieres cerrar? Perderás los cambios."
                    confirmLabel="Sí, cerrar"
                    cancelLabel="Seguir editando"
                    danger
                    onConfirm={onClose}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
            {formError && (
                <div style={{ marginBottom: '1rem', padding: '0.7rem 1rem', borderRadius: '8px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#fca5a5', fontSize: '0.85rem' }}>
                    ⚠️ {formError}
                </div>
            )}

            <label style={fieldLabelStyle}>Título</label>
            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Ensayo sobre..." />

            <label style={fieldLabelStyle}>Instrucciones</label>
            <div className="instructions-editor-wrapper dark-theme dark-editor">
                <MDXEditor
                    markdown={instructions}
                    onChange={setInstructions}
                    placeholder="Describe lo que el alumno debe entregar"
                    contentEditableClassName="instructions-editor-content"
                    plugins={[
                        headingsPlugin(),
                        listsPlugin(),
                        quotePlugin(),
                        thematicBreakPlugin(),
                        linkPlugin(),
                        linkDialogPlugin(),
                        imagePlugin(),
                        markdownShortcutPlugin(),
                        toolbarPlugin({
                            toolbarContents: () => (
                                <>
                                    <UndoRedo />
                                    <Separator />
                                    <BoldItalicUnderlineToggles />
                                    <Separator />
                                    <BlockTypeSelect />
                                    <Separator />
                                    <ListsToggle />
                                    <Separator />
                                    <CreateLink />
                                    <InsertImage />
                                </>
                            ),
                        }),
                    ]}
                />
            </div>

            <label style={fieldLabelStyle}>Módulo</label>
             <CustomSelect
                value={moduleId || NO_MODULE}
                onChange={v => setModuleId(v === NO_MODULE ? '' : v)}
                options={[
                    { value: NO_MODULE, label: 'Sin módulo' },
                    ...modules.map(m => ({ value: m.id, label: m.title })),
                ]}
            />

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Disponible desde</label>
                    <CustomDatePicker
                        value={availableFrom}
                        onChange={setAvailableFrom}
                        includeTime
                        placeholder="Seleccionar fecha y hora"
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Fecha de entrega</label>
                    <input style={inputStyle} type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Puntaje máximo</label>
                    <input style={inputStyle} type="number" value={maxScore} onChange={e => setMaxScore(Number(e.target.value))} />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Tamaño máximo (MB)</label>
                    <input style={inputStyle} type="number" value={maxFileSizeMb} onChange={e => setMaxFileSizeMb(Number(e.target.value))} />
                </div>
                <div style={{ flex: 1 }}>
                     <label style={fieldLabelStyle}>Tipos de archivo permitidos</label>
            <input style={inputStyle} value={allowedFileTypes} onChange={e => setAllowedFileTypes(e.target.value)} placeholder="pdf, docx, png" />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Estado</label>
                    <select style={inputStyle} value={status} onChange={e => setStatus(e.target.value)}>
                        <option value="draft">Borrador</option>
                        <option value="published">Publicada</option>
                        <option value="closed">Cerrada</option>
                    </select>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '1.6rem' }}>
                    <Toggle checked={allowResubmission} onChange={() => setAllowResubmission(v => !v)} />
                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>Permitir reenvío</span>
                </div>
            </div>


            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <ActionButton label="Cancelar" bg="rgba(255,255,255,0.06)" hoverBg="rgba(255,255,255,0.12)" textColor="#e5e7eb" border="1px solid rgba(255,255,255,0.12)" onClick={handleAttemptClose} />
                <ActionButton
                    label={saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear tarea'}
                    bg="rgba(168,85,247,0.5)" hoverBg="rgba(168,85,247,0.7)" textColor="#fff" border="1px solid rgba(192,132,252,0.5)"
                    onClick={handleSubmit} disabled={saving || !title.trim()}
                />
            </div>
        </Modal>
    )
}

export default AssignmentFormModal
