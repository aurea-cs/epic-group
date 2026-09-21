import React from 'react'
import { useTranslation } from 'react-i18next'
import CustomSelect from '../../general/CustomSelect'
import ImageUploadField from '../../general/ImageUploadField'

type ItemType = 'pdf' | 'video' | 'link'

interface ItemForm {
    type: ItemType
    title: string
    description: string
    content_url: string
    image_url: string
    is_editable: boolean
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
    const { t, i18n } = useTranslation()
    return (
    <div className="modal-overlay" onClick={onClose}>
        <div className="school-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <h2>{i18n.language.startsWith('en') ? 'Add Content' : 'Agregar Contenido'}</h2>
            </div>

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
                        <label>{i18n.language.startsWith('en') ? 'Title' : 'Título'}</label>
                        <input
                            type="text"
                            className="modern-input"
                            value={itemForm.title}
                            onChange={e => onFormChange({ ...itemForm, title: e.target.value })}
                        />
                    </div>
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
                        <div className="form-group" style={{
                            gridColumn: 'span 2', display: 'flex',
                            alignItems: 'center', gap: '8px', marginTop: '8px',
                        }}>
                            <input
                                type="checkbox"
                                id="add-is-editable"
                                checked={itemForm.is_editable}
                                onChange={e => onFormChange({ ...itemForm, is_editable: e.target.checked })}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label htmlFor="add-is-editable" style={{ margin: 0, cursor: 'pointer', fontWeight: 'normal', color: 'white' }}>
                                {i18n.language.startsWith('en') ? 'This PDF is an interactive workbook (students can draw, fill fields and submit it)' : 'Este PDF es un cuaderno interactivo (los alumnos podrán dibujar, rellenar campos y entregarlo)'}
                            </label>
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