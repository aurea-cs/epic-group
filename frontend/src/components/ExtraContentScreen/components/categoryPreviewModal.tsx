import React from 'react'
import { useTranslation } from 'react-i18next'
import { formatGradeDisplayName } from '../hooks/gradeFormat'
import type { CategoryItem } from '../hooks/extraContentTypes'
import type { GradeLevel, Subject } from '../../../lib/adminApi'

interface CategoryPreviewModalProps {
    category: CategoryItem
    grade: GradeLevel
    subject: Subject
    onClose: () => void
}

const CategoryPreviewModal: React.FC<CategoryPreviewModalProps> = ({ category, grade, subject, onClose }) => {
    const { t } = useTranslation()

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="school-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
                <div className="modal-header">
                    <div className="modal-icon">{category.icon}</div>
                    <h2>{category.name}</h2>
                    <p>
                        Materia: <strong>{subject.name}</strong> | Grado:{' '}
                        <strong>{formatGradeDisplayName(t, grade.name, grade.level)}</strong>
                    </p>
                </div>

                <div style={{ padding: '1rem 0' }}>
                    <div
                        style={{
                            background: 'rgba(108, 92, 231, 0.1)',
                            border: '1px solid rgba(108, 92, 231, 0.3)',
                            borderRadius: '10px',
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            fontSize: '0.9rem',
                            color: 'rgba(255,255,255,0.85)',
                        }}
                    >
                        ℹ️ Administra los recursos globales que se insertarán automáticamente en los módulos de esta
                        categoría.
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                padding: '0.85rem 1rem',
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: '600', color: '#fff' }}>{category.name} - Plantilla Base</div>
                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                                    Se aplica a todos los módulos de {subject.name}
                                </div>
                            </div>
                            <span
                                style={{
                                    background: 'rgba(34, 197, 94, 0.2)',
                                    color: '#4ade80',
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                }}
                            >
                                Activo
                            </span>
                        </div>
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn-cancel-modern" onClick={onClose}>
                        Cerrar
                    </button>
                    <button
                        className="btn-save-modern"
                        onClick={() => {
                            alert('Cambios guardados')
                            onClose()
                        }}
                    >
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CategoryPreviewModal