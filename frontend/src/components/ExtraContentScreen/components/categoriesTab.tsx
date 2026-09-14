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
            setError(err.message || t('extraContent.errorLoadGrades'))
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
                  name: t('extraContent.catComprueba'),
                  icon: '📝',
                  description: t('extraContent.descCompruebaPri'),
                  badgeText: t('extraContent.badgePrimaria'),
                  badgeClass: 'primaria',
              },
              {
                  id: 'ticket',
                  name: t('extraContent.catTicket'),
                  icon: '🎟️',
                  description: t('extraContent.descTicketPri'),
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
              {
                  id: 'ticket',
                  name: t('extraContent.catTicket'),
                  icon: '🎟️',
                  description: t('extraContent.descTicketSec'),
                  badgeText: t('extraContent.badgeSecundaria'),
                  badgeClass: 'secundaria',
              },
          ]

    return (
        <>
            {error && (
                <div className="error-banner">
                    ⚠️ {error}
                </div>
            )}

            {/* Compact selection bar: grade + subject live side by side instead of
                two full-width stacked sections, so completed choices take up
                minimal vertical space once made. */}
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
            </div>

            {/* Categories: the actual destination content, given full visual weight */}
            {selectedGrade && selectedSubject && (
                <>
                    <div className="section-label">
                        <span>{t('extraContent.step3')}</span>
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
                                        <span>{cat.id === 'ticket' ? t('extraContent.btnManageTemplates') : t('extraContent.btnAdminister')}</span>
                                    </button>
                                    <button className="btn-preview-category" onClick={() => setManagingCategory(cat)}>
                                        {t('extraContent.btnPreview')}
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