import React from 'react'
import { type CourseModule } from '../../../lib/adminApi'

interface ModuleModalProps {
    editingModule: CourseModule | null
    moduleForm: { title: string }
    modulesCount: number
    onFormChange: (form: { title: string }) => void
    onSave: (count: number) => void
    onClose: () => void
}

const ModuleModal: React.FC<ModuleModalProps> = ({
    editingModule,
    moduleForm,
    modulesCount,
    onFormChange,
    onSave,
    onClose,
}) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="school-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <h2>{editingModule ? 'Editar Módulo' : 'Nuevo Módulo'}</h2>
            </div>
            <div className="form-group">
                <label>Nombre del Módulo (Ej: Tema 1)</label>
                <input
                    type="text"
                    className="modern-input"
                    value={moduleForm.title}
                    onChange={e => onFormChange({ title: e.target.value })}
                    autoFocus
                />
            </div>
            <div className="modal-actions">
                <button className="btn-cancel-modern" onClick={onClose}>Cancelar</button>
                <button className="btn-save-modern" onClick={() => onSave(modulesCount)}>
                    Guardar
                </button>
            </div>
        </div>
    </div>
)

export default ModuleModal