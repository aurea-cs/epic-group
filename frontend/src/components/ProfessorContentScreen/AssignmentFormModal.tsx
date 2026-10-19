import React, { useState, useRef } from 'react'
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
import { type Assignment, type AssignmentAttachment } from './types'
import ConfirmModal from '../general/ConfirmModal'
import { ActionButton, Modal, Toggle, fieldLabelStyle, inputStyle } from '../general/SharedUI'
import CustomSelect from '../general/CustomSelect'
import NumberPicker from "react-widgets/NumberPicker";
import 'react-widgets/styles.css'
import CustomDatePicker from '../general/CustomDatePicker'
import CustomMultiSelect from '../general/CustomMultiSelect'

const formatFileSize = (bytes?: number | null): string => {
    if (!bytes || bytes <= 0) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const getFileIcon = (fileName?: string): string => {
    if (!fileName) return '📎'
    const ext = fileName.split('.').pop()?.toLowerCase()
    switch (ext) {
        case 'pdf': return '📄'
        case 'doc':
        case 'docx': return '📝'
        case 'xls':
        case 'xlsx':
        case 'csv': return '📊'
        case 'ppt':
        case 'pptx': return '📽️'
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif': return '🖼️'
        case 'zip':
        case 'rar': return '📦'
        default: return '📎'
    }
}

const NO_MODULE = '__none__'
interface AssignmentFormModalProps {
    modules: CourseModule[]
    initial: Assignment | null
    onClose: () => void
    onSubmit: (
        payload: Omit<Assignment, 'id' | 'created_at' | 'updated_at' | 'subject_id' | 'professor_id'>,
        newAttachments?: File[],
        deletedAttachmentIds?: string[]
    ) => Promise<void>
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
    const [moduleItemId, setModuleItemId] = useState<string>(initial?.module_item_id || '')

    // Attachments state
    const [existingAttachments, setExistingAttachments] = useState<AssignmentAttachment[]>(initial?.attachments || [])
    const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<string[]>([])
    const [newFiles, setNewFiles] = useState<File[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

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
    status !== (initial?.status || 'draft') ||
    moduleItemId !== (initial?.module_item_id || '') ||
    newFiles.length > 0 ||
    deletedAttachmentIds.length > 0

    const handleAttemptClose = () => {
        if (!isDirty) return onClose()
        setShowConfirm(true)
    }

    const handleFilesSelected = (selected: File[]) => {
        setNewFiles(prev => [...prev, ...selected])
    }
    
    const handleSubmit = async () => {
        if (!title.trim()) return
        setSaving(true)
        setFormError(null)
        try {
            await onSubmit(
                {
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
                    module_item_id: moduleItemId || null,
                },
                newFiles,
                deletedAttachmentIds
            )
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
            <div style={{ marginBottom: '1rem' }}>
             <CustomSelect
                value={moduleId || NO_MODULE}
                onChange={v => {
                    const val = v === NO_MODULE ? '' : v;
                    setModuleId(val);
                    setModuleItemId('');
                }}
                options={[
                    { value: NO_MODULE, label: 'Sin módulo' },
                    ...modules.map(m => ({ value: m.id, label: m.title })),
                ]}
            />
            </div>

            {moduleId && (
                <>
                    <label style={fieldLabelStyle}>Recurso PDF asociado (opcional)</label>
                    <div style={{ marginBottom: '1rem' }}>
                        <CustomSelect
                            value={moduleItemId || NO_MODULE}
                            onChange={v => {
                                const val = v === NO_MODULE ? '' : v;
                                setModuleItemId(val);
                            }}
                            options={[
                                { value: NO_MODULE, label: 'Ninguno' },
                                ...(modules.find(m => m.id === moduleId)?.items?.filter(item => item.type === 'pdf') || []).map(item => ({
                                    value: item.id,
                                    label: item.title,
                                })),
                            ]}
                        />
                    </div>
                </>
            )}

            {/* Document Attachments Section */}
            <div style={{ marginBottom: '1.25rem' }}>
                <label style={fieldLabelStyle}>📎 Documentos adjuntos (Material para el alumno)</label>
                
                {/* Existing attachments list */}
                {existingAttachments.length > 0 && (
                    <div className="existing-attachments-container">
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.35rem' }}>
                            Archivos actuales:
                        </div>
                        <div className="attachments-list">
                            {existingAttachments.map(att => {
                                const isDeleted = deletedAttachmentIds.includes(att.id)
                                return (
                                    <div
                                        key={att.id}
                                        className={`attachment-item ${isDeleted ? 'attachment-item--deleted' : ''}`}
                                    >
                                        <span className="attachment-item__icon">{getFileIcon(att.file_name)}</span>
                                        <div className="attachment-item__info">
                                            {(att.url || att.file_url) && !isDeleted ? (
                                                <a
                                                    href={att.url || att.file_url || '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="attachment-item__name"
                                                    title={att.file_name}
                                                >
                                                    {att.file_name}
                                                </a>
                                            ) : (
                                                <span className="attachment-item__name" title={att.file_name}>
                                                    {att.file_name}
                                                </span>
                                            )}
                                            {att.file_size_bytes && (
                                                <span className="attachment-item__size">
                                                    {formatFileSize(att.file_size_bytes)}
                                                </span>
                                            )}
                                        </div>
                                        {isDeleted ? (
                                            <button
                                                type="button"
                                                className="attachment-item__del-btn"
                                                style={{ color: '#34d399' }}
                                                onClick={() => setDeletedAttachmentIds(prev => prev.filter(id => id !== att.id))}
                                                title="Deshacer eliminación"
                                            >
                                                Deshacer
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="attachment-item__del-btn"
                                                onClick={() => setDeletedAttachmentIds(prev => [...prev, att.id])}
                                                title="Eliminar archivo"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Newly selected files list */}
                {newFiles.length > 0 && (
                    <div className="new-attachments-container" style={{ marginTop: existingAttachments.length > 0 ? '0.6rem' : 0 }}>
                        <div style={{ fontSize: '0.78rem', color: '#c084fc', marginBottom: '0.35rem' }}>
                            Nuevos archivos para adjuntar:
                        </div>
                        <div className="attachments-list">
                            {newFiles.map((file, idx) => (
                                <div key={idx} className="attachment-item attachment-item--new">
                                    <span className="attachment-item__icon">{getFileIcon(file.name)}</span>
                                    <div className="attachment-item__info">
                                        <span className="attachment-item__name" title={file.name}>
                                            {file.name}
                                        </span>
                                        <span className="attachment-item__size">{formatFileSize(file.size)}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="attachment-item__del-btn"
                                        onClick={() => setNewFiles(prev => prev.filter((_, i) => i !== idx))}
                                        title="Quitar archivo"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Drag and Drop Zone */}
                <div
                    className={`attachment-dropzone ${isDragging ? 'attachment-dropzone--active' : ''}`}
                    style={{ marginTop: (existingAttachments.length > 0 || newFiles.length > 0) ? '0.6rem' : 0 }}
                    onDragOver={e => {
                        e.preventDefault()
                        setIsDragging(true)
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => {
                        e.preventDefault()
                        setIsDragging(false)
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            handleFilesSelected(Array.from(e.dataTransfer.files))
                        }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.zip"
                        onChange={e => {
                            if (e.target.files && e.target.files.length > 0) {
                                handleFilesSelected(Array.from(e.target.files))
                                e.target.value = ''
                            }
                        }}
                    />
                    <div style={{ fontSize: '1.25rem' }}>📁</div>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 500 }}>
                        Haz clic o arrastra archivos aquí para adjuntarlos
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                        PDF, DOCX, XLSX, PPTX, imágenes, etc.
                    </div>
                </div>
            </div>

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
                    <CustomDatePicker
                        value={dueAt}
                        onChange={setDueAt}
                        includeTime
                        placeholder="Seleccionar fecha y hora"
                    />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 2 }}>
                    <label style={fieldLabelStyle}>Tipos de archivo permitidos</label>
                    <CustomMultiSelect
                        value={allowedFileTypes}
                        onChange={setAllowedFileTypes}
                        placeholder="pdf, docx, png"
                        options={[
                            { value: 'pdf', label: 'PDF' },
                            { value: 'docx', label: 'DOCX' },
                            { value: 'png', label: 'PNG' },
                            { value: 'jpg', label: 'JPG' },
                            { value: 'xlsx', label: 'XLSX' },
                        ]}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Tamaño máximo (MB)</label>
                    <NumberPicker 
                        value={maxFileSizeMb}
                        containerClassName="custom-number-picker"
                        onChange={(value: number | null) => setMaxFileSizeMb(value ?? maxFileSizeMb)}
                        min={0}
                        step={1}
                    />
                </div>
                                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Puntaje máximo</label>
                    <NumberPicker 
                        value={maxScore}
                        containerClassName="custom-number-picker"
                        onChange={(value: number | null) => setMaxScore(value ?? maxScore)}
                        min={0}
                        step={2}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>

                
                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Estado</label>

                    <CustomSelect
                        value={status}
                        onChange={setStatus}
                        options={[
                            { value: 'draft', label: 'Borrador' },
                            { value: 'published', label: 'Publicada' },
                            { value: 'closed', label: 'Cerrada' },
                        ]}
                    />
                </div>

                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
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
