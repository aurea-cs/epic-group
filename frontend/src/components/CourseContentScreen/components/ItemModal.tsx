import React from 'react'
import { useTranslation } from 'react-i18next'
import CustomSelect from '../../general/CustomSelect'
import ImageUploadField from '../../general/ImageUploadField'

type ItemType = 'pdf' | 'video' | 'link'
type AudienceType = 'student' | 'teacher'

interface ItemForm {
    type: ItemType
    title: string
    description: string
    content_url: string
    image_url: string
    is_editable: boolean
    audience: AudienceType
}

interface ItemModalProps {
    itemForm: ItemForm
    saving: boolean
    onFormChange: (form: ItemForm) => void
    onFileChange: (file: File | null) => void
    onSave: () => void
    onClose: () => void
}

const ItemModal: React.FC<ItemModalProps> = ({
    itemForm,
    saving,
    onFormChange,
    onFileChange,
    onSave,
    onClose,
}) => {
    const { i18n } = useTranslation()
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="school-modal-content" onClick={e => e.stopPropagation()}>
                <div className="form-grid">
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
                        <div className="form-group" style={{ width: '100%' }}>
                            <label style={{ marginBottom: '12px' }}>{i18n.language.startsWith('en') ? 'Type' : 'Tipo'}</label>
                            <CustomSelect
                                options={[
                                    { value: 'pdf', label: i18n.language.startsWith('en') ? 'PDF Document' : 'Documento PDF' },
                                    { value: 'video', label: i18n.language.startsWith('en') ? 'Video' : 'Video' },
                                    { value: 'link', label: i18n.language.startsWith('en') ? 'Link' : 'Enlace' },
                                ]}
                                value={itemForm.type}
                                onChange={val => onFormChange({ ...itemForm, type: val as ItemType })}
                            />
                        </div>
                        <div className="form-group" style={{ width: '100%' }}>
                            <label style={{ marginBottom: '12px' }}>{i18n.language.startsWith('en') ? 'Audience' : 'Audiencia'}</label>
                            <div style={{
                                display: 'flex',
                                background: 'rgba(31, 41, 90, 0.06)',
                                padding: '4px',
                                borderRadius: '10px',
                                border: '1px solid rgba(31, 41, 90, 0.12)',
                                minHeight: '44px',
                                boxSizing: 'border-box',
                            }}>
                                <button
                                    type="button"
                                    onClick={() => onFormChange({ ...itemForm, audience: 'student' })}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        transition: 'all 0.2s ease',
                                        background: itemForm.audience === 'student' ? '#10b981' : 'transparent',
                                        color: itemForm.audience === 'student' ? '#ffffff' : '#64748b',
                                        boxShadow: itemForm.audience === 'student' ? '0 2px 6px rgba(16, 185, 129, 0.35)' : 'none',
                                    }}
                                >
                                    <span>🎓</span>
                                    <span>{i18n.language.startsWith('en') ? 'Students' : 'Estudiantes'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onFormChange({ ...itemForm, audience: 'teacher' })}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        transition: 'all 0.2s ease',
                                        background: itemForm.audience === 'teacher' ? '#8b5cf6' : 'transparent',
                                        color: itemForm.audience === 'teacher' ? '#ffffff' : '#64748b',
                                        boxShadow: itemForm.audience === 'teacher' ? '0 2px 6px rgba(139, 92, 246, 0.35)' : 'none',
                                    }}
                                >
                                    <span>📚</span>
                                    <span>{i18n.language.startsWith('en') ? 'Teachers' : 'Profesores'}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label>{i18n.language.startsWith('en') ? 'Title' : 'Título'}</label>
                        <input
                            type="text"
                            className="modern-input"
                            value={itemForm.title}
                            onChange={e => onFormChange({ ...itemForm, title: e.target.value })}
                        />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label>{i18n.language.startsWith('en') ? 'Description' : 'Descripción'}</label>
                        <textarea
                            className="modern-input"
                            value={itemForm.description}
                            onChange={e => onFormChange({ ...itemForm, description: e.target.value })}
                        />
                    </div>

                    {itemForm.type === 'pdf' && (
                        <>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>{i18n.language.startsWith('en') ? 'PDF File' : 'Archivo PDF'}</label>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    className="modern-input"
                                    onChange={e => {
                                        const file = e.target.files?.[0] ?? null
                                        onFileChange(file)
                                        if (file && !itemForm.title) {
                                            onFormChange({ ...itemForm, title: file.name.replace('.pdf', '') })
                                        }
                                    }}
                                />
                            </div>

                        </>
                    )}

                    {itemForm.type !== 'pdf' && (
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>{i18n.language.startsWith('en') ? 'Content URL' : 'URL del Contenido'}</label>
                            <input
                                type="text"
                                className="modern-input"
                                value={itemForm.content_url}
                                onChange={e => onFormChange({ ...itemForm, content_url: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                    )}

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <ImageUploadField
                            label={i18n.language.startsWith('en') ? 'Cover Image' : 'Imagen de portada'}
                            value={itemForm.image_url}
                            onChange={url => onFormChange({ ...itemForm, image_url: url })}
                        />
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn-cancel-modern" onClick={onClose} disabled={saving}>
                        {i18n.language.startsWith('en') ? 'Cancel' : 'Cancelar'}
                    </button>
                    <button
                        className="btn-save-modern"
                        onClick={onSave}
                        disabled={saving}
                        style={{ background: saving ? 'rgba(192,132,252,0.35)' : '', boxShadow: saving ? 'none' : '' }}
                    >
                        {saving ? (i18n.language.startsWith('en') ? 'Saving...' : 'Guardando...') : (i18n.language.startsWith('en') ? 'Save' : 'Guardar')}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ItemModal