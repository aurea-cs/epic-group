import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getGradesByCenter, getSubjectsByGrade, type GradeLevel, type Subject } from '../../../lib/adminApi'
import { formatGradeDisplayName, getStageOrder } from '../hooks/gradeFormat'
import CategoryPreviewModal from './categoryPreviewModal'
import type { CategoryItem } from '../hooks/extraContentTypes'

const HARDCODED_CENTER_ID = '3162dec3-a792-44d6-9868-1c9682d215c3'

interface CategoriesTabProps {
    onNavigateToExitTickets: () => void
}

const CategoriesTab: React.FC<CategoriesTabProps> = ({ onNavigateToExitTickets }) => {
    const { t } = useTranslation()

    const [grades, setGrades] = useState<GradeLevel[]>([])
    const [selectedGrade, setSelectedGrade] = useState<GradeLevel | null>(null)
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)

    const [loadingGrades, setLoadingGrades] = useState(true)
    const [loadingSubjects, setLoadingSubjects] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [managingCategory, setManagingCategory] = useState<CategoryItem | null>(null)

    useEffect(() => {
        loadGrades()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (selectedGrade) {
            loadSubjects(selectedGrade.id)
        } else {
            setSubjects([])
            setSelectedSubject(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedGrade])

    const loadGrades = async () => {
        try {
            setLoadingGrades(true)
            setError(null)
            const data = await getGradesByCenter(HARDCODED_CENTER_ID)
            const sorted = (data || []).sort((a, b) => {
                const stageA = getStageOrder(a.name)
                const stageB = getStageOrder(b.name)
                if (stageA !== stageB) return stageA - stageB
                const levelA = a.level !== undefined && a.level !== null ? Number(a.level) : 0
                const levelB = b.level !== undefined && b.level !== null ? Number(b.level) : 0
                return levelA - levelB
            })
            setGrades(sorted)
            if (sorted && sorted.length > 0) {
                setSelectedGrade(sorted[0])
            }
        } catch (err: any) {
            console.error('Error loading grades for hardcoded center:', err)
            setError(err.message || 'Error al cargar grados del centro')
        } finally {
            setLoadingGrades(false)
        }
    }

    const loadSubjects = async (gradeId: string) => {
        try {
            setLoadingSubjects(true)
            const data = await getSubjectsByGrade(gradeId)
            setSubjects(data || [])
            setSelectedSubject(data && data.length > 0 ? data[0] : null)
        } catch (err: any) {
            console.error('Error loading subjects for grade:', err)
            setSubjects([])
            setSelectedSubject(null)
        } finally {
            setLoadingSubjects(false)
        }
    }

    const gradeNameLower = selectedGrade?.name?.toLowerCase() || ''
    const isPrimaria = gradeNameLower.includes('primaria')

    const categories: CategoryItem[] = isPrimaria
        ? [
              {
                  id: 'comprueba',
                  name: 'Comprueba lo que aprendiste',
                  icon: '📝',
                  description: 'Actividades de verificación y cuestionarios de aprendizaje interactivos.',
                  badgeText: 'Primaria',
                  badgeClass: 'primaria',
              },
              {
                  id: 'ticket',
                  name: 'Ticket de salida',
                  icon: '🎟️',
                  description:
                      'Pregunta o cuestionario global de cierre para evaluar la comprensión al finalizar la clase.',
                  badgeText: 'Primaria',
                  badgeClass: 'primaria',
              },
          ]
        : [
              {
                  id: 'piensa',
                  name: 'Piensa, experimenta, observa',
                  icon: '🔬',
                  description: 'Módulos prácticos de indagación, hipótesis, experimentación y análisis crítico.',
                  badgeText: 'Secundaria / Prepa',
                  badgeClass: 'secundaria',
              },
              {
                  id: 'comprueba',
                  name: 'Comprueba lo que aprendiste',
                  icon: '📝',
                  description: 'Evaluaciones objetivas y retos de consolidación de conceptos clave.',
                  badgeText: 'Secundaria / Prepa',
                  badgeClass: 'secundaria',
              },
              {
                  id: 'ticket',
                  name: 'Ticket de salida',
                  icon: '🎟️',
                  description: 'Cuestionario global de salida para medir avance diario y conceptos retenidos.',
                  badgeText: 'Secundaria / Prepa',
                  badgeClass: 'secundaria',
              },
          ]

    return (
        <>
            {error && (
                <div
                    style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#f87171',
                        padding: '1rem 1.5rem',
                        borderRadius: '12px',
                        marginBottom: '2rem',
                        textAlign: 'center',
                    }}
                >
                    ⚠️ {error}
                </div>
            )}

            {/* STEP 1: Grade Level Selection */}
            <div className="section-label">
                <span className="step-num">1</span>
                <span>Selecciona el Grado</span>
            </div>

            {loadingGrades ? (
                <div className="notice-box">Cargando grados del centro...</div>
            ) : grades.length === 0 ? (
                <div className="notice-box">No se encontraron grados en el centro educativo base.</div>
            ) : (
                <div style={{ marginBottom: '2.5rem', maxWidth: '500px' }}>
                    <select
                        value={selectedGrade?.id || ''}
                        onChange={(e) => {
                            const found = grades.find((g) => g.id === e.target.value)
                            if (found) setSelectedGrade(found)
                        }}
                        className="modern-input"
                        style={{
                            width: '100%',
                            padding: '0.85rem 1.25rem',
                            fontSize: '1.05rem',
                            fontWeight: '600',
                            background: 'rgba(37, 22, 78, 0.85)',
                            border: '1px solid rgba(192, 132, 252, 0.4)',
                            color: '#ffffff',
                            borderRadius: '12px',
                            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                            cursor: 'pointer',
                        }}
                    >
                        <option value="" disabled>
                            -- Selecciona un grado --
                        </option>
                        {grades.map((grade) => (
                            <option key={grade.id} value={grade.id} style={{ background: '#25164E', color: '#ffffff' }}>
                                {formatGradeDisplayName(t, grade.name, grade.level)}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* STEP 2: Subject Selection */}
            {selectedGrade && (
                <>
                    <div className="section-label">
                        <span className="step-num">2</span>
                        <span>Selecciona la Materia ({formatGradeDisplayName(t, selectedGrade.name, selectedGrade.level)})</span>
                    </div>

                    {loadingSubjects ? (
                        <div className="notice-box">Cargando materias del grado...</div>
                    ) : subjects.length === 0 ? (
                        <div className="notice-box">No hay materias registradas en este grado.</div>
                    ) : (
                        <div className="subjects-grid">
                            {subjects.map((subj) => {
                                const isActive = selectedSubject?.id === subj.id
                                return (
                                    <div
                                        key={subj.id}
                                        className={`subject-card ${isActive ? 'active' : ''}`}
                                        onClick={() => setSelectedSubject(subj)}
                                    >
                                        <div className="subject-card-title">{subj.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                                            {subj.campo_formativo || 'Campo General'}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </>
            )}

            {/* STEP 3: Content Categories */}
            {selectedGrade && selectedSubject && (
                <>
                    <div className="section-label" style={{ marginTop: '2rem' }}>
                        <span className="step-num">3</span>
                        <span>
                            Categorías de Contenido — {selectedSubject.name} (
                            {formatGradeDisplayName(t, selectedGrade.name, selectedGrade.level)})
                        </span>
                    </div>

                    <div className="categories-grid">
                        {categories.map((cat) => (
                            <div key={cat.id} className="category-card">
                                <div className="category-card-header">
                                    <div className="category-icon-wrapper">{cat.icon}</div>
                                    <div className="category-info">
                                        <h3>{cat.name}</h3>
                                        <span className={`level-badge ${cat.badgeClass}`}>{cat.badgeText}</span>
                                    </div>
                                </div>

                                <div className="category-card-body">{cat.description}</div>

                                <div className="category-card-actions">
                                    <button
                                        className="btn-manage-category"
                                        onClick={() => {
                                            if (cat.id === 'ticket') {
                                                onNavigateToExitTickets()
                                            } else {
                                                setManagingCategory(cat)
                                            }
                                        }}
                                    >
                                        <span>{cat.id === 'ticket' ? '🎟️ Gestionar Plantillas' : '⚙️ Administrar'}</span>
                                    </button>
                                    <button className="btn-preview-category" onClick={() => setManagingCategory(cat)}>
                                        👁️ Vista Previa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {managingCategory && selectedGrade && selectedSubject && (
                <CategoryPreviewModal
                    category={managingCategory}
                    grade={selectedGrade}
                    subject={selectedSubject}
                    onClose={() => setManagingCategory(null)}
                />
            )}
        </>
    )
}

export default CategoriesTab