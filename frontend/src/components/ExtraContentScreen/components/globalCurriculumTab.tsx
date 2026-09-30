import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
    getCurriculumTree,
    createCurriculumSubject,
    updateCurriculumSubject,
    deleteCurriculumSubject,
    CurriculumGradeTree,
    CurriculumSubjectTree,
} from '../../../lib/adminApi'
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

/** Formats grade display name for compact chips. */
function getShortGradeLabel(t: any, grade: CurriculumGradeTree, _category: GradeCategory): string {
    return formatGradeDisplayName(t, grade.name, grade.level)
}

// ─────────────────────────────────────────────────────────
// Modal types
// ─────────────────────────────────────────────────────────
type ModalMode = 'add' | 'edit' | 'delete' | null

interface ModalState {
    mode: ModalMode
    gradeId: string | null
    gradeName: string | null
    subject: CurriculumSubjectTree | null
}

const INITIAL_MODAL: ModalState = { mode: null, gradeId: null, gradeName: null, subject: null }

// ─────────────────────────────────────────────────────────
// Add / Edit Subject Modal
// ─────────────────────────────────────────────────────────
interface SubjectFormModalProps {
    mode: 'add' | 'edit'
    gradeName: string
    subject: CurriculumSubjectTree | null
    gradeId: string
    onClose: () => void
    onSaved: () => void
}

const SubjectFormModal: React.FC<SubjectFormModalProps> = ({
    mode,
    gradeName,
    subject,
    gradeId,
    onClose,
    onSaved,
}) => {
    const { t } = useTranslation()
    const [name, setName] = useState(subject?.name ?? '')
    const [shortName, setShortName] = useState(subject?.short_name ?? '')
    const [busy, setBusy] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) {
            setFormError(t('extraContent.subjectNameRequired', 'Subject name is required.'))
            return
        }
        setBusy(true)
        setFormError(null)
        try {
            if (mode === 'add') {
                await createCurriculumSubject({
                    curriculum_grade_id: gradeId,
                    name: name.trim(),
                    short_name: shortName.trim() || undefined,
                })
            } else {
                await updateCurriculumSubject(subject!.id, {
                    name: name.trim(),
                    short_name: shortName.trim() || undefined,
                })
            }
            onSaved()
        } catch (err: any) {
            setFormError(err.message || t('extraContent.errorGeneric', 'An error occurred.'))
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="gc-modal-overlay" onClick={onClose}>
            <div className="gc-modal" onClick={(e) => e.stopPropagation()}>
                <div className="gc-modal-header">
                    <h3 className="gc-modal-title">
                        {mode === 'add'
                            ? `📖 ${t('extraContent.addSubject', 'Add Subject')}`
                            : `✏️ ${t('extraContent.editSubject', 'Edit Subject')}`}
                    </h3>
                    <span className="gc-modal-grade-badge">{gradeName}</span>
                </div>

                <form onSubmit={handleSubmit} className="gc-modal-body">
                    {/* Translation note */}
                    <div className="gc-translation-note">
                        <span className="gc-translation-note-label">
                            {t('extraContent.translationNoteLabel', 'Translation note:')}
                        </span>{' '}
                        {t(
                            'extraContent.translationNoteText',
                            'The name will be used as a dynamic translation key (dynamicSubjects.<name>).'
                        )}
                    </div>

                    {/* Subject name */}
                    <div className="gc-form-group">
                        <label className="gc-form-label">
                            {t('extraContent.subjectNameLabel', 'Subject name *')}
                        </label>
                        <input
                            type="text"
                            className="gc-form-input"
                            placeholder={t('extraContent.subjectNamePlaceholder', 'e.g. Mathematics')}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            maxLength={120}
                        />
                    </div>

                    {/* Short name */}
                    <div className="gc-form-group">
                        <label className="gc-form-label">
                            {t('extraContent.subjectShortNameLabel', 'Abbreviation (optional)')}
                        </label>
                        <input
                            type="text"
                            className="gc-form-input"
                            placeholder={t('extraContent.subjectShortNamePlaceholder', 'e.g. MATH')}
                            value={shortName}
                            onChange={(e) => setShortName(e.target.value)}
                            maxLength={20}
                        />
                    </div>

                    {formError && <div className="gc-form-error">{formError}</div>}

                    <div className="gc-modal-actions">
                        <button
                            type="button"
                            className="btn-preview-category"
                            onClick={onClose}
                            disabled={busy}
                        >
                            {t('extraContent.cancel', 'Cancel')}
                        </button>
                        <button
                            type="submit"
                            className="btn-manage-category"
                            disabled={busy}
                        >
                            {busy
                                ? mode === 'add'
                                    ? t('extraContent.creating', 'Creating...')
                                    : t('extraContent.saving', 'Saving...')
                                : mode === 'add'
                                    ? t('extraContent.create', 'Create subject')
                                    : t('extraContent.saveChanges', 'Save changes')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────
// Delete Confirmation Modal
// ─────────────────────────────────────────────────────────
interface DeleteModalProps {
    subject: CurriculumSubjectTree
    onClose: () => void
    onDeleted: () => void
}

const DeleteSubjectModal: React.FC<DeleteModalProps> = ({ subject, onClose, onDeleted }) => {
    const { t } = useTranslation()
    const [confirmText, setConfirmText] = useState('')
    const [busy, setBusy] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const isConfirmed = confirmText.trim() === subject.name.trim()

    const handleDelete = async () => {
        if (!isConfirmed) return
        setBusy(true)
        setFormError(null)
        try {
            await deleteCurriculumSubject(subject.id)
            onDeleted()
        } catch (err: any) {
            setFormError(err.message || t('extraContent.errorGeneric', 'An error occurred.'))
            setBusy(false)
        }
    }

    return (
        <div className="gc-modal-overlay" onClick={onClose}>
            <div className="gc-modal gc-modal-danger" onClick={(e) => e.stopPropagation()}>
                <div className="gc-modal-header">
                    <h3 className="gc-modal-title">
                        🗑️ {t('extraContent.deleteSubject', 'Delete Subject')}
                    </h3>
                    <span className="gc-modal-grade-badge gc-badge-danger">{subject.name}</span>
                </div>

                <div className="gc-modal-body">
                    {/* Cascade warning */}
                    <div className="gc-cascade-warning">
                        <p className="gc-cascade-warning-title">
                            {t('extraContent.deleteWarningTitle', '⚠️ Warning: Cascading impact')}
                        </p>
                        <p className="gc-cascade-warning-msg">
                            {t('extraContent.deleteWarningMsg', 'Deleting this canonical subject will affect the entire platform:')}
                        </p>
                        <ul className="gc-cascade-warning-list">
                            <li>{t('extraContent.deleteWarningBullet1', 'All curriculum modules under this subject will be deleted.')}</li>
                            <li>{t('extraContent.deleteWarningBullet2', 'Center subjects linked to this canonical subject will lose their curriculum link.')}</li>
                            <li>{t('extraContent.deleteWarningBullet3', "'Think, Observe and Experiment' blocks tied to those modules will become unavailable.")}</li>
                        </ul>
                        {subject.modules && subject.modules.length > 0 && (
                            <p className="gc-cascade-module-count">
                                📦 {subject.modules.length} {t('extraContent.modules', 'Modules')} — {t('extraContent.deleteWarningBullet1', 'will be deleted')}
                            </p>
                        )}
                    </div>

                    {/* Confirm by typing name */}
                    <div className="gc-form-group">
                        <label className="gc-form-label">
                            {t('extraContent.deleteConfirmLabel', 'Type the subject name to confirm:')}
                        </label>
                        <input
                            type="text"
                            className="gc-form-input gc-input-danger"
                            placeholder={t('extraContent.deleteConfirmPlaceholder', 'Exact subject name')}
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            autoFocus
                        />
                        <p className="gc-confirm-hint">
                            <code className="gc-confirm-name">{subject.name}</code>
                        </p>
                    </div>

                    {formError && <div className="gc-form-error">{formError}</div>}

                    <div className="gc-modal-actions">
                        <button
                            type="button"
                            className="btn-preview-category"
                            onClick={onClose}
                            disabled={busy}
                        >
                            {t('extraContent.cancel', 'Cancel')}
                        </button>
                        <button
                            type="button"
                            className="btn-danger-confirm"
                            onClick={handleDelete}
                            disabled={!isConfirmed || busy}
                        >
                            {busy
                                ? t('extraContent.deleting', 'Deleting...')
                                : t('extraContent.deleteConfirmBtn', 'Yes, permanently delete')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────
// Main Tab Component
// ─────────────────────────────────────────────────────────
const GlobalCurriculumTab: React.FC = () => {
    const { t } = useTranslation()
    const [tree, setTree] = useState<CurriculumGradeTree[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState<string>('')
    const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL')
    const [selectedGradeId, setSelectedGradeId] = useState<string>('ALL')
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

    // Modal state
    const [modal, setModal] = useState<ModalState>(INITIAL_MODAL)

    const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }, [])

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
        setSelectedGradeId('ALL')
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

    // ── Modal handlers ──────────────────────────────────────
    const openAddModal = (grade: CurriculumGradeTree) => {
        setModal({
            mode: 'add',
            gradeId: grade.id,
            gradeName: formatGradeDisplayName(t, grade.name, grade.level),
            subject: null,
        })
    }

    const openEditModal = (grade: CurriculumGradeTree, subj: CurriculumSubjectTree) => {
        setModal({
            mode: 'edit',
            gradeId: grade.id,
            gradeName: formatGradeDisplayName(t, grade.name, grade.level),
            subject: subj,
        })
    }

    const openDeleteModal = (grade: CurriculumGradeTree, subj: CurriculumSubjectTree) => {
        setModal({
            mode: 'delete',
            gradeId: grade.id,
            gradeName: formatGradeDisplayName(t, grade.name, grade.level),
            subject: subj,
        })
    }

    const closeModal = () => setModal(INITIAL_MODAL)

    const handleSaved = async () => {
        const wasEdit = modal.mode === 'edit'
        closeModal()
        await loadData()
        showToast(
            wasEdit
                ? t('extraContent.updateSuccess', 'Subject updated successfully.')
                : t('extraContent.createSuccess', 'Subject created successfully.')
        )
    }

    const handleDeleted = async () => {
        closeModal()
        await loadData()
        showToast(t('extraContent.deleteSuccess', 'Subject deleted successfully.'))
    }

    return (
        <div className="global-curriculum-tab">
            {/* Toast notification */}
            {toast && (
                <div className={`gc-toast gc-toast-${toast.type}`}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}

            {/* Add / Edit Modal */}
            {(modal.mode === 'add' || modal.mode === 'edit') && (
                <SubjectFormModal
                    mode={modal.mode}
                    gradeName={modal.gradeName ?? ''}
                    gradeId={modal.gradeId!}
                    subject={modal.subject}
                    onClose={closeModal}
                    onSaved={handleSaved}
                />
            )}

            {/* Delete Modal */}
            {modal.mode === 'delete' && modal.subject && (
                <DeleteSubjectModal
                    subject={modal.subject}
                    onClose={closeModal}
                    onDeleted={handleDeleted}
                />
            )}

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
                                        {/* Add subject button */}
                                        <button
                                            className="gc-add-subject-btn"
                                            onClick={() => openAddModal(grade)}
                                            title={t('extraContent.addSubject', 'Add Subject')}
                                        >
                                            ＋ {t('extraContent.addSubject', 'Add Subject')}
                                        </button>
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
                                                        <h4>
                                                            {t(`dynamicSubjects.${subj.name}`, { defaultValue: subj.name })}
                                                        </h4>
                                                    </div>
                                                    <div className="gc-subject-actions">
                                                        {subj.short_name && (
                                                            <span className="gc-shortname-badge">
                                                                {t(`dynamicSubjects.${subj.short_name}`, { defaultValue: subj.short_name })}
                                                            </span>
                                                        )}
                                                        {/* Edit button */}
                                                        <button
                                                            className="btn-icon-action gc-subject-action-btn"
                                                            onClick={() => openEditModal(grade, subj)}
                                                            title={t('extraContent.editSubject', 'Edit Subject')}
                                                        >
                                                            ✏️
                                                        </button>
                                                        {/* Delete button */}
                                                        <button
                                                            className="btn-icon-action btn-icon-danger gc-subject-action-btn"
                                                            onClick={() => openDeleteModal(grade, subj)}
                                                            title={t('extraContent.deleteSubject', 'Delete Subject')}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
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