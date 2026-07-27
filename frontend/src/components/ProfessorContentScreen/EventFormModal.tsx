import React, { useState } from 'react'
import { EVENT_TYPES, type CalendarEvent } from './types'
import { ActionButton, Modal, fieldLabelStyle, inputStyle } from '../general/SharedUI'
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
import ConfirmModal from '../general/ConfirmModal'
import './AssignmentFormModal.css'
import CustomSelect from '../general/CustomSelect'
import CustomDatePicker from '../general/CustomDatePicker'

interface EventFormModalProps {
    initial: CalendarEvent | null
    onClose: () => void
    onSubmit: (payload: Omit<CalendarEvent, 'id' | 'created_at' | 'subject_id' | 'professor_id'>) => Promise<void>
}

const EventFormModal: React.FC<EventFormModalProps> = ({ initial, onClose, onSubmit }) => {
    const [title, setTitle] = useState(initial?.title || '')
    const [description, setDescription] = useState(initial?.description_md || '')
    const [type, setType] = useState(initial?.type || 'class')
    const [eventDate, setEventDate] = useState(initial?.event_date || '')
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [showConfirm, setShowConfirm] = useState(false)
    
    const isDirty = title.trim() !== (initial?.title || '') ||
        description.trim() !== (initial?.description_md || '') ||
        type !== (initial?.type || 'class') ||
        eventDate !== (initial?.event_date || '')

    const handleAttemptClose = () => {
        if (!isDirty) return onClose()
        setShowConfirm(true)
    }

    const handleSubmit = async () => {
        if (!title.trim() || !eventDate) return
        setSaving(true)
        setFormError(null)
        try {
            await onSubmit({
                title: title.trim(),
                description_md: description.trim() || null,
                type,
                event_date: eventDate,
            })
        } catch (e: any) {
            setFormError(e.message || 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal title={initial ? 'Editar evento' : 'Nuevo evento'} onClose={handleAttemptClose}>
            {formError && (
                <div style={{ marginBottom: '1rem', padding: '0.7rem 1rem', borderRadius: '8px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#fca5a5', fontSize: '0.85rem' }}>
                    ⚠️ {formError}
                </div>
            )}
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

            <label style={fieldLabelStyle}>Título</label>
            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Examen parcial" />

            <label style={fieldLabelStyle}>Descripción</label>
             <div className="instructions-editor-wrapper dark-theme dark-editor">
                            <MDXEditor
                                markdown={description}
                                onChange={setDescription}
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

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Tipo</label>

                    <CustomSelect
                        value={type}
                        onChange={e => setType(e)}
                        options={EVENT_TYPES}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Fecha</label>
                    <CustomDatePicker
                        value={eventDate}
                        onChange={setEventDate}
                        includeTime
                        placeholder="Seleccionar fecha"
                    />
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <ActionButton label="Cancelar" bg="rgba(255,255,255,0.06)" hoverBg="rgba(255,255,255,0.12)" textColor="#e5e7eb" border="1px solid rgba(255,255,255,0.12)" onClick={handleAttemptClose} />
                <ActionButton
                    label={saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear evento'}
                    bg="rgba(168,85,247,0.5)" hoverBg="rgba(168,85,247,0.7)" textColor="#fff" border="1px solid rgba(192,132,252,0.5)"
                    onClick={handleSubmit} disabled={saving || !title.trim() || !eventDate}
                />
            </div>
        </Modal>
    )
}

export default EventFormModal