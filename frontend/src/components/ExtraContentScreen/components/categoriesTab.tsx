import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    getCurriculumGrades,
    getCurriculumSubjectsByGrade,
    getCurriculumModulesBySubject,
    type CurriculumGrade,
    type CurriculumSubject,
    type CurriculumModule,
} from '../../../lib/adminApi'
import { formatGradeDisplayName, getStageOrder } from '../hooks/gradeFormat'
import CategoryPreviewModal from './categoryPreviewModal'
import ModuleQuizManagerScreen from './moduleQuizManagerScreen'
import ModuleExperimentManagerScreen from './moduleExperimentManagerScreen'
import type { CategoryItem } from '../hooks/extraContentTypes'

const CategoriesTab: React.FC = () => {
    const { t, i18n } = useTranslation()

    const [grades, setGrades] = useState<CurriculumGrade[]>([])
    const [selectedGrade, setSelectedGrade] = useState<CurriculumGrade | null>(null)
    const [subjects, setSubjects] = useState<CurriculumSubject[]>([])
    const [selectedSubject, setSelectedSubject] = useState<CurriculumSubject | null>(null)
    const [modules, setModules] = useState<CurriculumModule[]>([])
    const [selectedModule, setSelectedModule] = useState<CurriculumModule | null>(null)

    const [loadingGrades, setLoadingGrades] = useState(true)
    const [loadingSubjects, setLoadingSubjects] = useState(false)
    const [loadingModules, setLoadingModules] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [managingCategory, setManagingCategory] = useState<CategoryItem | null>(null)
    
    // States for full screen managers
    const [administeringQuizModule, setAdministeringQuizModule] = useState<{
        grade: CurriculumGrade
        subject: CurriculumSubject
        module: CurriculumModule | null
    } | null>(null)

    const [administeringExperimentModule, setAdministeringExperimentModule] = useState<{
        grade: CurriculumGrade
        subject: CurriculumSubject
        module: CurriculumModule | null
    } | null>(null)

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

    useEffect(() => {
        if (selectedSubject) {
            loadModules(selectedSubject.id)
        } else {
            setModules([])
            setSelectedModule(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSubject])

    const loadGrades = async () => {
        try {
            setLoadingGrades(true)
            setError(null)
            const data = await getCurriculumGrades()
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
            console.error('Error loading curriculum grades:', err)
            setError(err.message || t('extraContent.errorLoadGrades'))
        } finally {
            setLoadingGrades(false)
        }
    }

    const loadSubjects = async (gradeId: string) => {
        try {
            setLoadingSubjects(true)
            const data = await getCurriculumSubjectsByGrade(gradeId)
            setSubjects(data || [])
            setSelectedSubject(data && data.length > 0 ? data[0] : null)
        } catch (err: any) {
            console.error('Error loading curriculum subjects for grade:', err)
            setSubjects([])
            setSelectedSubject(null)
        } finally {
            setLoadingSubjects(false)
        }
    }

    const loadModules = async (subjectId: string) => {
        try {
            setLoadingModules(true)
            const data = await getCurriculumModulesBySubject(subjectId)
            setModules(data || [])
            setSelectedModule(data && data.length > 0 ? data[0] : null)
        } catch (err: any) {
            console.error('Error loading curriculum modules for subject:', err)
            setModules([])
            setSelectedModule(null)
        } finally {
            setLoadingModules(false)
        }
    }

    const gradeNameLower = selectedGrade?.name?.toLowerCase() || ''
    const isPrimaria = gradeNameLower.includes('primaria')

    const categories: CategoryItem[] = isPrimaria
        ? [
              {
                  id: 'comprueba',
                  name: t('extraContent.catComprueba'),
                  icon: '📝',
                  description: t('extraContent.descCompruebaPri'),
                  badgeText: t('extraContent.badgePrimaria'),
                  badgeClass: 'primaria',
              },
          ]
        : [
              {
                  id: 'piensa',
                  name: t('extraContent.catPiensa'),
                  icon: '🔬',
                  description: t('extraContent.descPiensaSec'),
                  badgeText: t('extraContent.badgeSecundaria'),
                  badgeClass: 'secundaria',
              },
              {
                  id: 'comprueba',
                  name: t('extraContent.catComprueba'),
                  icon: '📝',
                  description: t('extraContent.descCompruebaSec'),
                  badgeText: t('extraContent.badgeSecundaria'),
                  badgeClass: 'secundaria',
              },
          ]

    if (administeringQuizModule) {
        return (
            <ModuleQuizManagerScreen
                grade={administeringQuizModule.grade}
                subject={administeringQuizModule.subject}
                module={administeringQuizModule.module}
                onBack={() => setAdministeringQuizModule(null)}
            />
        )
    }

    if (administeringExperimentModule) {
        return (
            <ModuleExperimentManagerScreen
                grade={administeringExperimentModule.grade}
                subject={administeringExperimentModule.subject}
                module={administeringExperimentModule.module}
                onBack={() => setAdministeringExperimentModule(null)}
            />
        )
    }

    const handleCategoryClick = (catId: string) => {
        if (!selectedGrade || !selectedSubject) return
        
        if (catId === 'comprueba') {
            setAdministeringQuizModule({
                grade: selectedGrade,
                subject: selectedSubject,
                module: selectedModule,
            })
        } else if (catId === 'piensa') {
            setAdministeringExperimentModule({
                grade: selectedGrade,
                subject: selectedSubject,
                module: selectedModule,
            })
        }
    }

    return (
        <>
            {error && (
                <div className="error-banner">
                    ⚠️ {error}
                </div>
            )}

            {/* Compact selection bar: grade + subject + module */}
            <div className="selection-bar">
                <div className="selection-field">
                    <label className="selection-label">{t('extraContent.step1')}</label>
                    {loadingGrades ? (
                        <div className="selection-skeleton">{t('extraContent.loadingGrades')}</div>
                    ) : grades.length === 0 ? (
                        <div className="selection-empty">{t('extraContent.noGrades')}</div>
                    ) : (
                        <select
                            value={selectedGrade?.id || ''}
                            onChange={(e) => {
                                const found = grades.find((g) => g.id === e.target.value)
                                if (found) setSelectedGrade(found)
                            }}
                            className="selection-select"
                        >
                            <option value="" disabled>
                                {t('extraContent.selectGrade')}
                            </option>
                            {grades.map((grade) => (
                                <option key={grade.id} value={grade.id}>
                                    {formatGradeDisplayName(t, grade.name, grade.level)}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {selectedGrade && (
                    <>
                        <div className="selection-divider">→</div>

                        <div className="selection-field selection-field-grow">
                            <label className="selection-label">{t('extraContent.step2')}</label>
                            {loadingSubjects ? (
                                <div className="selection-skeleton">{t('extraContent.loadingSubjects')}</div>
                            ) : subjects.length === 0 ? (
                                <div className="selection-empty">{t('extraContent.noSubjects')}</div>
                            ) : (
                                <div className="subject-chip-row">
                                    {subjects.map((subj) => {
                                        const isActive = selectedSubject?.id === subj.id
                                        return (
                                            <button
                                                key={subj.id}
                                                type="button"
                                                className={`subject-chip ${isActive ? 'active' : ''}`}
                                                onClick={() => setSelectedSubject(subj)}
                                            >
                                                {t(`dynamicSubjects.${subj.name}`, { defaultValue: subj.name })}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {selectedGrade && selectedSubject && (
                    <>
                        <div className="selection-divider">→</div>

                        <div className="selection-field">
                            <label className="selection-label">{t('extraContent.stepModule')}</label>
                            {loadingModules ? (
                                <div className="selection-skeleton">{t('extraContent.loadingModules')}</div>
                            ) : modules.length === 0 ? (
                                <div className="selection-empty">{t('extraContent.noModules')}</div>
                            ) : (
                                <select
                                    value={selectedModule?.id || ''}
                                    onChange={(e) => {
                                        const found = modules.find((m) => m.id === e.target.value)
                                        if (found) setSelectedModule(found)
                                    }}
                                    className="selection-select"
                                >
                                    <option value="" disabled>
                                        {t('extraContent.selectModule')}
                                    </option>
                                    {modules.map((mod) => (
                                        <option key={mod.id} value={mod.id}>
                                            {i18n.language.startsWith('en') ? t(`dynamicSubjects.${mod.title}`, mod.title) : mod.title}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Categories: the actual destination content, given full visual weight */}
            {selectedGrade && selectedSubject && (
                <>
                    <div className="section-label">
                        <span>{t('extraContent.step3')}</span>
                    </div>

                    <div className="categories-grid">
                        {categories.map((cat) => (
                            <div 
                                key={cat.id} 
                                className="category-card"
                                onClick={() => handleCategoryClick(cat.id)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="category-card-header">
                                    <div className="category-icon-wrapper">{cat.icon}</div>
                                    <div className="category-info">
                                        <h3>{cat.name}</h3>
                                        <span className={`level-badge ${cat.badgeClass}`}>{cat.badgeText}</span>
                                    </div>
                                </div>

                                <div className="category-card-body">{cat.description}</div>
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
                    module={selectedModule}
                    onClose={() => setManagingCategory(null)}
                />
            )}
        </>
    )
}

export default CategoriesTab