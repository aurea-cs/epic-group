import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    getCenters,
    getGradesByCenter,
    getGradeById,
    getSubjectsByGrade,
    getCourseModules,
    copyModuleToSubject,
    type EducationalCenter,
    type GradeLevel,
    type Subject,
    type CourseModule,
} from '../../../lib/adminApi'

const DEFAULT_CENTER_ID = 'e4ff0eef-c068-4988-a448-6beed8badccf'

interface CopyModuleModalProps {
    /** The subject ID that will receive the copied module */
    targetSubjectId: string
    /** Pre-select this center (falls back to blank if not found) */
    defaultCenterId?: string
    /** Pre-select the grade that matches this ID after loading grades */
    defaultGradeId?: string
    onSuccess: () => Promise<void>
    onClose: () => void
}

const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.9rem',
    background: 'rgba(37, 22, 78, 0.85)',
    border: '1px solid rgba(192, 132, 252, 0.35)',
    color: '#ffffff',
    borderRadius: '10px',
    fontSize: '0.9rem',
    marginTop: '0.4rem',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
}

const CopyModuleModal: React.FC<CopyModuleModalProps> = ({
    targetSubjectId,
    defaultCenterId = DEFAULT_CENTER_ID,
    defaultGradeId,
    onSuccess,
    onClose,
}) => {
    const { i18n } = useTranslation()
    const isEn = i18n.language.startsWith('en')

    // ── Cascading state ──────────────────────────────────────────────────────
    const [centers, setCenters] = useState<EducationalCenter[]>([])
    const [grades, setGrades] = useState<GradeLevel[]>([])
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [modules, setModules] = useState<CourseModule[]>([])

    const [selectedCenterId, setSelectedCenterId] = useState('')
    const [selectedGradeId, setSelectedGradeId] = useState('')
    const [selectedSubjectId, setSelectedSubjectId] = useState('')
    const [selectedModuleId, setSelectedModuleId] = useState('')

    const [loadingCenters, setLoadingCenters] = useState(true)
    const [loadingGrades, setLoadingGrades] = useState(false)
    const [loadingSubjects, setLoadingSubjects] = useState(false)
    const [loadingModules, setLoadingModules] = useState(false)
    const [saving, setSaving] = useState(false)

    // Load centers on mount – then pre-select defaultCenterId if it exists
    useEffect(() => {
        setLoadingCenters(true)
        getCenters()
            .then((data) => {
                setCenters(data)
                // Only pre-select if the center actually exists in the list
                if (defaultCenterId && data.some((c) => c.id === defaultCenterId)) {
                    setSelectedCenterId(defaultCenterId)
                }
            })
            .catch(console.error)
            .finally(() => setLoadingCenters(false))
    }, [])

    // Load grades when center changes – match by name + level against the current grade
    useEffect(() => {
        if (!selectedCenterId) { setGrades([]); setSubjects([]); setModules([]); return }
        setLoadingGrades(true)
        setSelectedGradeId('')
        setSelectedSubjectId('')
        setSelectedModuleId('')
        setSubjects([])
        setModules([])

        const fetchAll = async () => {
            const [centerGrades, currentGrade] = await Promise.all([
                getGradesByCenter(selectedCenterId),
                // Fetch current user's grade to get its name + level for matching
                defaultGradeId ? getGradeById(defaultGradeId).catch(() => null) : Promise.resolve(null),
            ])
            setGrades(centerGrades)
            if (currentGrade) {
                // Match by name AND level so cross-center grades align correctly
                const match = centerGrades.find(
                    (g) =>
                        g.name === currentGrade.name &&
                        g.level === currentGrade.level
                )
                if (match) setSelectedGradeId(match.id)
            }
        }

        fetchAll().catch(console.error).finally(() => setLoadingGrades(false))
    }, [selectedCenterId])

    // Load subjects when grade changes
    useEffect(() => {
        if (!selectedGradeId) { setSubjects([]); setModules([]); return }
        setLoadingSubjects(true)
        setSelectedSubjectId('')
        setSelectedModuleId('')
        setModules([])
        getSubjectsByGrade(selectedGradeId)
            .then(setSubjects)
            .catch(console.error)
            .finally(() => setLoadingSubjects(false))
    }, [selectedGradeId])

    // Load modules when subject changes
    useEffect(() => {
        if (!selectedSubjectId) { setModules([]); return }
        setLoadingModules(true)
        setSelectedModuleId('')
        getCourseModules(selectedSubjectId)
            .then(setModules)
            .catch(console.error)
            .finally(() => setLoadingModules(false))
    }, [selectedSubjectId])

    const handleCopy = async () => {
        if (!selectedModuleId) return
        setSaving(true)
        try {
            await copyModuleToSubject(selectedModuleId, targetSubjectId)
            await onSuccess()
            onClose()
        } catch (err: any) {
            console.error('[CopyModuleModal] Copy error:', err)
            alert(err.message || (isEn ? 'Error copying module' : 'Error al copiar módulo'))
        } finally {
            setSaving(false)
        }
    }

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="school-modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '520px' }}
            >
                {/* Header */}
                <div className="modal-header">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isEn ? 'Copy existing module' : 'Copiar módulo existente'}
                    </h2>
                </div>

                {/* Center */}
                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                    <label>{isEn ? 'Center' : 'Centro'}</label>
                    {loadingCenters ? (
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                            {isEn ? 'Loading…' : 'Cargando…'}
                        </div>
                    ) : (
                        <select
                            style={selectStyle}
                            value={selectedCenterId}
                            onChange={(e) => setSelectedCenterId(e.target.value)}
                        >
                            <option value="">-- {isEn ? 'Select center' : 'Selecciona centro'} --</option>
                            {centers.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Grade */}
                <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>{isEn ? 'Grade' : 'Grado'}</label>
                    {loadingGrades ? (
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                            {isEn ? 'Loading…' : 'Cargando…'}
                        </div>
                    ) : (
                        <select
                            style={{ ...selectStyle, opacity: !selectedCenterId ? 0.4 : 1 }}
                            value={selectedGradeId}
                            onChange={(e) => setSelectedGradeId(e.target.value)}
                            disabled={!selectedCenterId}
                        >
                            <option value="">-- {isEn ? 'Select grade' : 'Selecciona grado'} --</option>
                            {grades.map((g) => (
                                <option key={g.id} value={g.id}>{g.name} ({isEn ? "Level " : "Nivel "}{g.level}) </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Subject */}
                <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>{isEn ? 'Subject' : 'Materia'}</label>
                    {loadingSubjects ? (
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                            {isEn ? 'Loading…' : 'Cargando…'}
                        </div>
                    ) : (
                        <select
                            style={{ ...selectStyle, opacity: !selectedGradeId ? 0.4 : 1 }}
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                            disabled={!selectedGradeId}
                        >
                            <option value="">-- {isEn ? 'Select subject' : 'Selecciona materia'} --</option>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {isEn && s.name_en ? s.name_en : s.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Module */}
                <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>{isEn ? 'Module' : 'Módulo'}</label>
                    {loadingModules ? (
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                            {isEn ? 'Loading…' : 'Cargando…'}
                        </div>
                    ) : (
                        <select
                            style={{ ...selectStyle, opacity: !selectedSubjectId ? 0.4 : 1 }}
                            value={selectedModuleId}
                            onChange={(e) => setSelectedModuleId(e.target.value)}
                            disabled={!selectedSubjectId}
                        >
                            <option value="">-- {isEn ? 'Select module' : 'Selecciona módulo'} --</option>
                            {modules.map((m) => (
                                <option key={m.id} value={m.id}>{m.title}</option>
                            ))}
                        </select>
                    )}
                    {selectedSubjectId && !loadingModules && modules.length === 0 && (
                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.35rem', display: 'block' }}>
                            {isEn ? 'No modules in this subject.' : 'No hay módulos en esta materia.'}
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="modal-actions" style={{ marginTop: '1.75rem' }}>
                    <button className="btn-cancel-modern" onClick={onClose} disabled={saving}>
                        {isEn ? 'Cancel' : 'Cancelar'}
                    </button>
                    <button
                        className="btn-save-modern"
                        onClick={handleCopy}
                        disabled={!selectedModuleId || saving}
                        style={{ opacity: !selectedModuleId || saving ? 0.5 : 1 }}
                    >
                        {saving
                            ? (isEn ? 'Copying…' : 'Copiando…')
                            : (isEn ? 'Copy Module' : 'Copiar Módulo')}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CopyModuleModal
