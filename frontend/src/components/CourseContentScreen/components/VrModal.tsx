import React from 'react'
import { type VrCodeEntry } from '../../../lib/adminApi'
import ImageUploadField from '../../general/ImageUploadField'

interface VrForm {
    code: string
    image_url: string
    title: string
    description: string
}

interface VrModalProps {
    editingEntry: VrCodeEntry | null
    vrForm: VrForm
    vrLoading: boolean
    onFormChange: (form: VrForm) => void
    onSave: () => void
    onClose: () => void
}

const VrModal: React.FC<VrModalProps> = ({
    editingEntry,
    vrForm,
    vrLoading,
    onFormChange,
    onSave,
    onClose,
}) => (
    <div className="modal-overlay" onClick={() => { if (!vrLoading) onClose() }}>
        <div className="school-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h2 style={{ margin: 0 }}>
                    {editingEntry ? '🚀  Editar Sala VR' : '🚀  Nueva Sala VR'}
                </h2>
            </div>

            {vrLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6c5ce7' }}>
                    <div className="loading-spinner" />
                </div>
            ) : (
                <>
                    <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                        <div className="form-group">
                            <label>Link de la Sala</label>
                            <input
                                type="text"
                                className="modern-input"
                                value={vrForm.code}
                                onChange={e => onFormChange({ ...vrForm, code: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="form-group">
                            <label>
                                Título{' '}
                                <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional)</span>
                            </label>
                            <input
                                type="text"
                                className="modern-input"
                                value={vrForm.title}
                                onChange={e => onFormChange({ ...vrForm, title: e.target.value })}
                                placeholder="Ej: Sala de Exploración"
                            />
                        </div>
                        <div className="form-group">
                            <label>
                                Descripción{' '}
                                <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional)</span>
                            </label>
                            <textarea
                                className="modern-input"
                                value={vrForm.description}
                                onChange={e => onFormChange({ ...vrForm, description: e.target.value })}
                                placeholder="Descripción breve de la sala..."
                                style={{ minHeight: '80px' }}
                            />
                        </div>
                        <div className="form-group">
                            <ImageUploadField
                                label="Imagen de la sala"
                                value={vrForm.image_url}
                                onChange={url => onFormChange({ ...vrForm, image_url: url })}
                            />
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button
                            className="btn-cancel-modern"
                            onClick={onClose}
                            disabled={vrLoading}
                        >
                            Cancelar
                        </button>
                        <button
                            className="btn-save-modern"
                            onClick={onSave}
                            disabled={vrLoading}
                        >
                            Guardar
                        </button>
                    </div>
                </>
            )}
        </div>
    </div>
)

export default VrModal