import React from 'react'
import { useTranslation } from 'react-i18next'
import { formatGradeDisplayName } from '../hooks/gradeFormat'
import type { CurriculumGrade, CurriculumSubject, CurriculumModule } from '../../../lib/adminApi'

interface ModuleExperimentManagerScreenProps {
    grade: CurriculumGrade
    subject: CurriculumSubject
    module: CurriculumModule | null
    onBack: () => void
}

const ModuleExperimentManagerScreen: React.FC<ModuleExperimentManagerScreenProps> = ({
    grade,
    subject,
    module,
    onBack,
}) => {
    const { t } = useTranslation()

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div className="workspace-header">
                <div className="workspace-header-info">
                    <button className="btn-back-link" onClick={onBack}>
                        ← {t('extraContent.btnBack', { defaultValue: 'Volver a Categorías' })}
                    </button>
                    <div>
                        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.35rem', fontWeight: 700 }}>
                            🔬 Piensa, observa y experimenta
                        </h2>
                        <span style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.55)' }}>
                            Gestión de experimentos del módulo
                        </span>
                    </div>
                </div>
            </div>

            {/* Context breadcrumb */}
            <div className="qm-context-bar">
                <div className="qm-context-item">
                    <span className="qm-context-label">Grado</span>
                    <span className="qm-context-value">{formatGradeDisplayName(t, grade.name, grade.level)}</span>
                </div>
                <span className="qm-context-sep">›</span>
                <div className="qm-context-item">
                    <span className="qm-context-label">Materia</span>
                    <span className="qm-context-value" style={{ color: '#c084fc' }}>{subject.name}</span>
                </div>
                <span className="qm-context-sep">›</span>
                <div className="qm-context-item">
                    <span className="qm-context-label">Módulo</span>
                    <span className="qm-context-value" style={{ color: '#4ade80' }}>
                        {module ? module.title : 'Sin módulo seleccionado'}
                    </span>
                </div>
            </div>

            {/* Content Body Placeholder */}
            <div
                style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '4rem 2rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.25rem',
                }}
            >
                <div
                    style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        background: 'rgba(108, 92, 231, 0.2)',
                        border: '1px solid rgba(108, 92, 231, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                    }}
                >
                    🚧
                </div>

                <div style={{ maxWidth: '540px' }}>
                    <h3 style={{ color: '#fff', fontSize: '1.35rem', marginBottom: '0.5rem' }}>
                        Próximamente
                    </h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                        Esta pantalla servirá para gestionar y administrar todos los contenidos y experimentos de la categoría <strong>Piensa, observa y experimenta</strong> para este módulo en el futuro.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default ModuleExperimentManagerScreen
