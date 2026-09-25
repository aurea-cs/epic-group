import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getCurriculumTree, CurriculumGradeTree } from '../../../lib/adminApi'
import { formatGradeDisplayName } from '../hooks/gradeFormat'

const CATEGORY_ORDER = ['primaria', 'secundaria', 'preparatoria', 'otros'] as const
type GradeCategory = (typeof CATEGORY_ORDER)[number]
type CategoryFilter = 'ALL' | GradeCategory

const CATEGORY_LABELS: Record<GradeCategory, string> = {
    primaria: 'Primaria',
    secundaria: 'Secundaria',
    preparatoria: 'Preparatoria',
    otros: 'Otros',
}

const CATEGORY_ICONS: Record<GradeCategory, string> = {
    primaria: '🎒',
    secundaria: '📘',
    preparatoria: '🎓',
    otros: '🏫',
}

/** Buckets a canonical grade name into one of the three school levels. */
function categorizeGrade(name: string): GradeCategory {
    const n = name.toLowerCase()
    if (n.includes('preparatoria')) return 'preparatoria'
    if (n.includes('secundaria')) return 'secundaria'
    if (n.includes('primaria')) return 'primaria'
    return 'otros'
}

/** Strips the repeated category word from a grade name for compact chips, e.g. "1° Primaria" -> "Nivel 1". */
function getShortGradeLabel(t: any, grade: CurriculumGradeTree, _category: GradeCategory): string {
    return formatGradeDisplayName(t, grade.name, grade.level)
}

const GlobalCurriculumTab: React.FC = () => {
    const { t } = useTranslation()
    const [tree, setTree] = useState<CurriculumGradeTree[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState<string>('')
    const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL')
    const [selectedGradeId, setSelectedGradeId] = useState<string>('ALL')

    const loadData = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getCurriculumTree()
            setTree(data || [])
        } catch (err: any) {
            console.error('Failed to load global curriculum structure:', err)
            setError(err.message || 'Failed to load curriculum tree.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    // Summary counters
    const stats = useMemo(() => {
        let totalGrades = tree.length
        let totalSubjects = 0
        let totalModules = 0

        tree.forEach((grade) => {
            totalSubjects += grade.subjects?.length || 0
            grade.subjects?.forEach((subj) => {
                totalModules += subj.modules?.length || 0
            })
        })

        return { totalGrades, totalSubjects, totalModules }
    }, [tree])

    // Grades bucketed by school level, sorted by level within each bucket.
    const groupedGrades = useMemo(() => {
        const map: Record<GradeCategory, CurriculumGradeTree[]> = {
            primaria: [],
            secundaria: [],
            preparatoria: [],
            otros: [],
        }
        tree.forEach((grade) => {
            map[categorizeGrade(grade.name)].push(grade)
        })
        Object.values(map).forEach((arr) => arr.sort((a, b) => (a.level ?? 0) - (b.level ?? 0)))
        return map
    }, [tree])

    const availableCategories = useMemo(
        () => CATEGORY_ORDER.filter((cat) => groupedGrades[cat].length > 0),
        [groupedGrades]
    )

    const handleSelectCategory = (cat: CategoryFilter) => {
        setSelectedCategory(cat)
        setSelectedGradeId('ALL') // grade choice only makes sense within a chosen category
    }

    // Filtered data based on category, grade, and search term
    const filteredTree = useMemo(() => {
        let result = selectedCategory === 'ALL' ? tree : groupedGrades[selectedCategory]

        if (selectedGradeId !== 'ALL') {
            result = result.filter((g) => g.id === selectedGradeId)
        }

        if (!searchTerm.trim()) return result

        const term = searchTerm.toLowerCase().trim()

        return result
            .map((grade) => {
                const translatedGradeName = formatGradeDisplayName(t, grade.name, grade.level)
                const gradeMatches =
                    grade.name.toLowerCase().includes(term) ||
                    translatedGradeName.toLowerCase().includes(term)

                const matchingSubjects = (grade.subjects || []).filter((subj) => {
                    const translatedSubjName = t(`dynamicSubjects.${subj.name}`, { defaultValue: subj.name })
                    const translatedShortName = subj.short_name
                        ? t(`dynamicSubjects.${subj.short_name}`, { defaultValue: subj.short_name })
                        : ''
                    const subjMatches =
                        subj.name.toLowerCase().includes(term) ||
                        translatedSubjName.toLowerCase().includes(term) ||
                        (subj.short_name &&
                            (subj.short_name.toLowerCase().includes(term) ||
                                translatedShortName.toLowerCase().includes(term)))

                    const matchingModules = (subj.modules || []).filter((mod) => {
                        const translatedModTitle = t(`dynamicSubjects.${mod.title}`, { defaultValue: mod.title })
                        return (
                            mod.title.toLowerCase().includes(term) ||
                            translatedModTitle.toLowerCase().includes(term)
                        )
                    })

                    return subjMatches || matchingModules.length > 0 || gradeMatches
                })

                if (gradeMatches || matchingSubjects.length > 0) {
                    return {
                        ...grade,
                        subjects: matchingSubjects,
                    }
                }
                return null
            })
            .filter(Boolean) as CurriculumGradeTree[]
    }, [tree, groupedGrades, selectedCategory, selectedGradeId, searchTerm, t])

    return (
        <div className="global-curriculum-tab">
            {/* Header & Controls */}
            <div className="gc-header">
                <div className="gc-header-info">
                    <h2>{t('extraContent.globalCurriculumTitle', 'Global Curriculum Structure')}</h2>
                    <p>{t('extraContent.globalCurriculumSubtitle', 'Visualization and administration of canonical grades, subjects, and modules')}</p>
                </div>
                <button className="gc-refresh-btn" onClick={loadData} disabled={loading} title={t('extraContent.reloadTitle', 'Reload Curriculum')}>
                    🔄 {loading ? t('extraContent.loading', 'Loading...') : t('extraContent.refresh', 'Refresh')}
                </button>
            </div>

            {error && (
                <div className="error-banner">
                    <p>⚠️ {error}</p>
                    <button className="btn-preview-category" onClick={loadData} style={{ marginTop: '0.5rem' }}>
                        {t('extraContent.retry', 'Retry')}
                    </button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="gc-stats-grid">
                <div className="gc-stat-card">
                    <div className="gc-stat-icon">🎓</div>
                    <div className="gc-stat-content">
                        <span className="gc-stat-value">{stats.totalGrades}</span>
                        <span className="gc-stat-label">{t('extraContent.totalGrades', 'Canonical Grades')}</span>
                    </div>
                </div>

                <div className="gc-stat-card">
                    <div className="gc-stat-icon">📚</div>
                    <div className="gc-stat-content">
                        <span className="gc-stat-value">{stats.totalSubjects}</span>
                        <span className="gc-stat-label">{t('extraContent.totalSubjects', 'Canonical Subjects')}</span>
                    </div>
                </div>

                <div className="gc-stat-card">
                    <div className="gc-stat-icon">🧩</div>
                    <div className="gc-stat-content">
                        <span className="gc-stat-value">{stats.totalModules}</span>
                        <span className="gc-stat-label">{t('extraContent.totalModules', 'Canonical Modules')}</span>
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="gc-toolbar">
                <div className="gc-search-box">
                    <span className="gc-search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder={t('extraContent.searchCurriculum', 'Search by grade, subject, or module...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="gc-search-input"
                    />
                    {searchTerm && (
                        <button className="gc-search-clear" onClick={() => setSearchTerm('')}>
                            ✕
                        </button>
                    )}
                </div>

                {/* Level 1: segmented by school level */}
                <div className="gc-category-filters">
                    <button
                        className={`gc-category-chip ${selectedCategory === 'ALL' ? 'active' : ''}`}
                        onClick={() => handleSelectCategory('ALL')}
                    >
                        {t('extraContent.allGrades', 'Todas')}
                    </button>
                    {availableCategories.map((cat) => (
                        <button
                            key={cat}
                            className={`gc-category-chip gc-category-${cat} ${selectedCategory === cat ? 'active' : ''}`}
                            onClick={() => handleSelectCategory(cat)}
                        >
                            {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
                            <span className="gc-category-count">({groupedGrades[cat].length})</span>
                        </button>
                    ))}
                </div>

                {/* Level 2: individual grades, only shown once a level is chosen */}
                {selectedCategory !== 'ALL' && groupedGrades[selectedCategory].length > 0 && (
                    <div className="gc-grade-filters">
                        <button
                            className={`gc-grade-chip ${selectedGradeId === 'ALL' ? 'active' : ''}`}
                            onClick={() => setSelectedGradeId('ALL')}
                        >
                            {t('extraContent.allGradesInCategory', 'Todos')}
                        </button>
                        {groupedGrades[selectedCategory].map((grade) => (
                            <button
                                key={grade.id}
                                className={`gc-grade-chip ${selectedGradeId === grade.id ? 'active' : ''}`}
                                onClick={() => setSelectedGradeId(grade.id)}
                            >
                                {getShortGradeLabel(t, grade, selectedCategory)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Content Display */}
            {loading ? (
                <div className="notice-box" style={{ padding: '3rem 1.5rem' }}>
                    <div className="add-ticket-icon" style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }}>
                        🌀
                    </div>
                    <p>{t('extraContent.loadingCurriculum', 'Loading canonical curriculum structure...')}</p>
                </div>
            ) : filteredTree.length === 0 ? (
                <div className="notice-box">
                    <p>🔍 {t('extraContent.noCurriculumData', 'No registered curriculum structures found.')}</p>
                </div>
            ) : (
                <div className="gc-tree-container">
                    {filteredTree.map((grade) => {
                        const badgeClass = categorizeGrade(grade.name)

                        return (
                            <div key={grade.id} className="gc-grade-card">
                                <div className="gc-grade-card-header">
                                    <div className="gc-grade-header-left">
                                        <span className="gc-grade-icon">🏫</span>
                                        <h3>{grade.name}</h3>
                                        <span className={`level-badge ${badgeClass}`}>
                                            {t(`dynamicSubjects.${CATEGORY_LABELS[badgeClass]}`, { defaultValue: CATEGORY_LABELS[badgeClass] })} • {t('professorCourses.level', { defaultValue: 'Nivel' })} {grade.level ?? '-'}
                                        </span>
                                    </div>
                                    <div className="gc-grade-meta">
                                        <span className="gc-meta-badge">
                                            {grade.subjects?.length || 0} {t('extraContent.totalSubjects', 'Subjects')}
                                        </span>
                                    </div>
                                </div>

                                <div className="gc-subjects-grid">
                                    {(!grade.subjects || grade.subjects.length === 0) ? (
                                        <div className="gc-empty-subject-notice">
                                            {t('extraContent.noSubjectsInGrade', 'No subjects registered in this grade.')}
                                        </div>
                                    ) : (
                                        grade.subjects.map((subj) => (
                                            <div key={subj.id} className="gc-subject-card">
                                                <div className="gc-subject-header">
                                                    <div className="gc-subject-title-area">
                                                        <span className="gc-subj-icon">📖</span>
                                                        <h4>{subj.name}</h4>
                                                    </div>
                                                    {subj.short_name && (
                                                        <span className="gc-shortname-badge">
                                                            {t(`dynamicSubjects.${subj.short_name}`, { defaultValue: subj.short_name })}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="gc-modules-section">
                                                    <div className="gc-modules-header">
                                                        <span>{t('extraContent.modules', { defaultValue: 'Módulos' })} ({subj.modules?.length || 0})</span>
                                                    </div>

                                                    {(!subj.modules || subj.modules.length === 0) ? (
                                                        <p className="gc-no-modules">{t('extraContent.noModulesCreated', 'No modules created yet.')}</p>
                                                    ) : (
                                                        <div className="gc-modules-list">
                                                            {subj.modules.map((mod, idx) => (
                                                                <div key={mod.id} className="gc-module-item">
                                                                    <span className="gc-module-order">
                                                                        #{mod.order_index ?? idx + 1}
                                                                    </span>
                                                                    <span className="gc-module-title">{mod.title}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default GlobalCurriculumTab