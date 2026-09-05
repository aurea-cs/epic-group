import React from 'react'
import { type ModuleItem } from '../../../lib/adminApi'
import ImageUploadField from '../../general/ImageUploadField'

interface EditItemForm {
    title: string
    description: string
    content_url: string
    image_url: string
    is_editable: boolean
}

interface EditItemModalProps {
    editingItem: ModuleItem
    editItemForm: EditItemForm
    saving: boolean
    onFormChange: (form: EditItemForm) => void
    onSave: () => void
    onClose: () => void
}

const EditItemModal: React.FC<EditItemModalProps> = ({
    editingItem,
    editItemForm,
    saving,
    onFormChange,
    onSave,
    onClose,
}) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="school-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <h2>Editar Contenido</h2>
            </div>

            <div className="form-grid">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Título</label>
                    <input
                        type="text"
                        className="modern-input"
                        value={editItemForm.title}
                        onChange={e => onFormChange({ ...editItemForm, title: e.target.value })}
                        autoFocus
                    />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Descripción</label>
                    <textarea
                        className="modern-input"
                        style={{ minHeight: '120px' }}
                        value={editItemForm.description}
                        onChange={e => onFormChange({ ...editItemForm, description: e.target.value })}
                    />
                </div>

                {editingItem.type !== 'pdf' && (
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label>URL del Contenido</label>
                        <input
                            type="text"
                            className="modern-input"
                            value={editItemForm.content_url}
                            onChange={e => onFormChange({ ...editItemForm, content_url: e.target.value })}
                            placeholder="https://..."
                        />
                    </div>
                )}

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <ImageUploadField
                        label="Imagen de portada"
                        value={editItemForm.image_url}
                        onChange={url => onFormChange({ ...editItemForm, image_url: url })}
                    />
                </div>

                {editingItem.type === 'pdf' && (
                    <div className="form-group" style={{
                        gridColumn: 'span 2', display: 'flex',
                        alignItems: 'center', gap: '8px', marginTop: '8px',
                    }}>
                        <input
                            type="checkbox"
                            id="edit-is-editable"
                            checked={editItemForm.is_editable}
                            onChange={e => onFormChange({ ...editItemForm, is_editable: e.target.checked })}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label htmlFor="edit-is-editable" style={{ margin: 0, cursor: 'pointer', fontWeight: 'normal', color: 'white' }}>
                            Este PDF es un cuaderno interactivo (los alumnos podrán dibujar, rellenar campos y entregarlo)
                        </label>
                    </div>
                )}
            </div>

            <div className="modal-actions">
                <button className="btn-cancel-modern" onClick={onClose} disabled={saving}>
                    Cancelar
                </button>
                <button
                    className="btn-save-modern"
                    onClick={onSave}
                    disabled={saving}
                    style={{ background: saving ? 'rgba(192,132,252,0.35)' : '', boxShadow: saving ? 'none' : '' }}
                >
                    {saving ? 'Guardando...' : 'Guardar'}
                </button>
            </div>
        </div>
    </div>
)

export default EditItemModal