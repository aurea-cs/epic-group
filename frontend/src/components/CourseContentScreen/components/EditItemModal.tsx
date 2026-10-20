import React from 'react'
import { type ModuleItem } from '../../../lib/adminApi'
import ImageUploadField from '../../general/ImageUploadField'

interface EditItemForm {
    title: string
    description: string
    content_url: string
    image_url: string
    is_editable: boolean
    audience: 'student' | 'teacher'
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

            <div className="form-grid">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label style={{ marginBottom: '8px', display: 'block' }}>Audiencia</label>
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
                            onClick={() => onFormChange({ ...editItemForm, audience: 'student' })}
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
                                background: editItemForm.audience === 'student' ? '#10b981' : 'transparent',
                                color: editItemForm.audience === 'student' ? '#ffffff' : '#64748b',
                                boxShadow: editItemForm.audience === 'student' ? '0 2px 6px rgba(16, 185, 129, 0.35)' : 'none',
                            }}
                        >
                            <span>🎓</span>
                            <span>Estudiantes</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onFormChange({ ...editItemForm, audience: 'teacher' })}
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
                                background: editItemForm.audience === 'teacher' ? '#8b5cf6' : 'transparent',
                                color: editItemForm.audience === 'teacher' ? '#ffffff' : '#64748b',
                                boxShadow: editItemForm.audience === 'teacher' ? '0 2px 6px rgba(139, 92, 246, 0.35)' : 'none',
                            }}
                        >
                            <span>📚</span>
                            <span>Profesores</span>
                        </button>
                    </div>
                </div>

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