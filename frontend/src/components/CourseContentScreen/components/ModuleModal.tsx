import React from 'react'
import { useTranslation } from 'react-i18next'
import { type CourseModule, type CurriculumModule } from '../../../lib/adminApi'

interface ModuleModalProps {
    editingModule: CourseModule | null
    moduleForm: { title: string; curriculum_module_id?: string | null }
    modulesCount: number
    curriculumModules?: CurriculumModule[]
    onFormChange: (form: { title: string; curriculum_module_id?: string | null }) => void
    onSave: (count: number) => void
    onClose: () => void
}

const ModuleModal: React.FC<ModuleModalProps> = ({
    editingModule,
    moduleForm,
    modulesCount,
    curriculumModules = [],
    onFormChange,
    onSave,
    onClose,
}) => {
    const { t, i18n } = useTranslation()

    const handleCurriculumModuleSelect = (cmId: string) => {
        if (!cmId) {
            onFormChange({ ...moduleForm, curriculum_module_id: null })
            return
        }
        const selectedCM = curriculumModules.find((cm) => cm.id === cmId)
        const updatedTitle = moduleForm.title.trim() ? moduleForm.title : (selectedCM?.title || '')
        onFormChange({
            title: updatedTitle,
            curriculum_module_id: cmId,
        })
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="school-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{editingModule 
                        ? (i18n.language.startsWith('en') ? 'Edit Module' : 'Editar Módulo') 
                        : (i18n.language.startsWith('en') ? 'New Module' : 'Nuevo Módulo')}</h2>
                </div>

                <div className="form-group">
                    <label>{i18n.language.startsWith('en') ? 'Module Name (Ex: Topic 1) *' : 'Nombre del Módulo (Ej: Tema 1) *'}</label>
                    <input
                        type="text"
                        className="modern-input"
                        value={moduleForm.title}
                        onChange={(e) => onFormChange({ ...moduleForm, title: e.target.value })}
                        autoFocus
                    />
                </div>

                {curriculumModules.length > 0 && (
                    <div className="form-group" style={{ marginTop: '1.25rem' }}>
                        <label>{i18n.language.startsWith('en') ? 'Canonical Curriculum Module (Optional)' : 'Módulo Canónico del Currículum (Opcional)'}</label>
                        <select
                            className="selection-select"
                            style={{
                                width: '100%',
                                padding: '0.65rem 0.9rem',
                                background: 'rgba(37, 22, 78, 0.85)',
                                border: '1px solid rgba(192, 132, 252, 0.35)',
                                color: '#ffffff',
                                borderRadius: '10px',
                                fontSize: '0.9rem',
                                marginTop: '0.4rem',
                                cursor: 'pointer',
                            }}
                            value={moduleForm.curriculum_module_id || ''}
                            onChange={(e) => handleCurriculumModuleSelect(e.target.value)}
                        >
                            <option value="">-- {i18n.language.startsWith('en') ? 'None (Unlinked)' : 'Ninguno (Sin vincular)'} --</option>
                            {curriculumModules.map((cm) => (
                                <option key={cm.id} value={cm.id}>
                                    #{cm.order_index ?? '-'} {cm.title}
                                </option>
                            ))}
                        </select>
                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.35rem', display: 'block' }}>
                            {i18n.language.startsWith('en') ? 'By linking this module to a canonical module, it will automatically inherit its Quizzes and Experiments (Think, Observe and Experiment).' : 'Al vincular este módulo a un módulo canónico, heredará automáticamente sus Cuestionarios y Experimentos (Piensa, Observa y Experimenta).'}
                        </span>
                    </div>
                )}

                <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                    <button className="btn-cancel-modern" onClick={onClose}>
                        {i18n.language.startsWith('en') ? 'Cancel' : 'Cancelar'}
                    </button>
                    <button
                        className="btn-save-modern"
                        onClick={() => onSave(modulesCount)}
                        disabled={!moduleForm.title.trim()}
                    >
                        {i18n.language.startsWith('en') ? 'Save' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ModuleModal