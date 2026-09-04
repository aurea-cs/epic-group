import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import {
    getCenterById,
    getCenters,
    getGradesByCenter,
    createGrade,
    cloneGrade,
    updateGrade,
    getSubjectsByGrade,
    createSubject,
    cloneSubject,
    updateSubject,
    deleteSubject,
    deleteGrade,
    type EducationalCenter,
    type GradeLevel,
    type Subject,
} from '../lib/adminApi'
import StudentManagement from './StudentManagement'
import TeacherManagement from './TeacherManagement'
import ContentManagement from './ContentManagement'
import './HierarchyConfig.css'
import ConfirmModal from './general/ConfirmModal'

interface SchoolDetailScreenProps {
    user: User
}

const SchoolDetailScreen: React.FC<SchoolDetailScreenProps> = () => {
    const { centerId } = useParams<{ centerId: string }>()
    const navigate = useNavigate()

    // State for confirming deletion
    const [confirmDeleteGrade, setConfirmDeleteGrade] = useState<GradeLevel | null>(null)
    const [confirmDeleteSubject, setConfirmDeleteSubject] = useState<Subject | null>(null)

    // State for data
    const [center, setCenter] = useState<EducationalCenter | null>(null)
    const [grades, setGrades] = useState<GradeLevel[]>([])
    const [selectedGrade, setSelectedGrade] = useState<GradeLevel | null>(null)
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)

    // State for loading and errors
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // State for modals
    const [showGradeModal, setShowGradeModal] = useState(false)
    const [showSubjectModal, setShowSubjectModal] = useState(false)
    const [showStudentModal, setShowStudentModal] = useState(false)
    const [showTeacherModal, setShowTeacherModal] = useState(false)
    const [showContentModal, setShowContentModal] = useState(false)
    const [showAddTypeModal, setShowAddTypeModal] = useState(false) // New selection modal
    const [showCourseTypeModal, setShowCourseTypeModal] = useState(false) // New selection modal for courses inside grade
    const [courseCreationMode, setCourseCreationMode] = useState<'options' | 'copy'>('options')

    // Grade copy modal states
    const [showGradeTypeModal, setShowGradeTypeModal] = useState(false)
    const [gradeCreationMode, setGradeCreationMode] = useState<'options' | 'copy'>('options')
    const [sourceGradeCenterId, setSourceGradeCenterId] = useState<string>('')
    const [sourceCenterGrades, setSourceCenterGrades] = useState<GradeLevel[]>([])
    const [sourceGradeSelectId, setSourceGradeSelectId] = useState<string>('')
    const [loadingGradeCopy, setLoadingGradeCopy] = useState(false)

    // Cascading dropdown state for copying courses
    const [allCenters, setAllCenters] = useState<EducationalCenter[]>([])
    const [sourceCenterId, setSourceCenterId] = useState<string>('')
    const [sourceGrades, setSourceGrades] = useState<GradeLevel[]>([])
    const [sourceGradeId, setSourceGradeId] = useState<string>('')
    const [sourceSubjects, setSourceSubjects] = useState<Subject[]>([])
    const [sourceSubjectId, setSourceSubjectId] = useState<string>('')
    const [loadingCopyData, setLoadingCopyData] = useState(false)

    useEffect(() => {
        if (showCourseTypeModal) {
            getCenters()
                .then(data => setAllCenters(data))
                .catch(err => console.error('Error loading centers for copy:', err))
        }
    }, [showCourseTypeModal])

    const handleSourceCenterChange = async (cId: string) => {
        setSourceCenterId(cId)
        setSourceGradeId('')
        setSourceGrades([])
        setSourceSubjectId('')
        setSourceSubjects([])
        if (!cId) return

        try {
            setLoadingCopyData(true)
            const gradesData = await getGradesByCenter(cId)
            setSourceGrades(gradesData)
        } catch (err: any) {
            console.error('Error fetching source grades:', err)
        } finally {
            setLoadingCopyData(false)
        }
    }

    const handleSourceGradeChange = async (gId: string) => {
        setSourceGradeId(gId)
        setSourceSubjectId('')
        setSourceSubjects([])
        if (!gId) return

        try {
            setLoadingCopyData(true)
            const subjectsData = await getSubjectsByGrade(gId)
            setSourceSubjects(subjectsData)
        } catch (err: any) {
            console.error('Error fetching source subjects:', err)
        } finally {
            setLoadingCopyData(false)
        }
    }
    const handleSourceGradeCenterChange = async (cId: string) => {
        setSourceGradeCenterId(cId)
        setSourceGradeSelectId('')
        setSourceCenterGrades([])
        if (!cId) return

        try {
            setLoadingGradeCopy(true)
            const gradesData = await getGradesByCenter(cId)
            setSourceCenterGrades(gradesData)
        } catch (err: any) {
            console.error('Error fetching grades for center:', err)
        } finally {
            setLoadingGradeCopy(false)
        }
    }

    const openGradeTypeModal = () => {
        setShowAddTypeModal(false)
        setGradeCreationMode('options')
        setSourceGradeCenterId('')
        setSourceGradeSelectId('')
        setSourceCenterGrades([])
        setShowGradeTypeModal(true)
    }

    const handleCopyGrade = async () => {
        if (!centerId || !sourceGradeSelectId) return

        try {
            setLoadingGradeCopy(true)
            const newGrade = await cloneGrade(sourceGradeSelectId, centerId)
            await loadGrades(centerId)
            setSelectedGrade(newGrade)
            await loadSubjects(newGrade.id)
            setShowGradeTypeModal(false)
            setSourceGradeCenterId('')
            setSourceGradeSelectId('')
        } catch (err: any) {
            setError(err.message || 'Error al copiar el grado')
        } finally {
            setLoadingGradeCopy(false)
        }
    }

    const openCourseTypeModal = () => {
        if (!selectedGrade) {
            alert('Por favor selecciona un grado primero para agregar un curso.')
            return
        }
        setShowAddTypeModal(false)
        setCourseCreationMode('options')
        setSourceCenterId('')
        setSourceGradeId('')
        setSourceGrades([])
        setSourceSubjectId('')
        setSourceSubjects([])
        setShowCourseTypeModal(true)
    }

    const handleCopySubject = async () => {
        if (!selectedGrade || !sourceSubjectId) return

        try {
            setLoadingCopyData(true)
            await cloneSubject(sourceSubjectId, selectedGrade.id)
            await loadSubjects(selectedGrade.id)
            setShowCourseTypeModal(false)
            setSourceCenterId('')
            setSourceGradeId('')
            setSourceSubjectId('')
        } catch (err: any) {
            setError(err.message || 'Error al copiar la materia')
        } finally {
            setLoadingCopyData(false)
        }
    }

    // State for forms
    const [gradeForm, setGradeForm] = useState({ name: '', level: 0 })
    const [subjectForm, setSubjectForm] = useState({
        name: '',
        max_students: 30,
        short_name: '',
        description: '',
        start_date: '',
        end_date: '',
        course_id: '',
        visibility: 'active'
    })

    const handleDeleteGrade = async (id: string) => {
        try {
            setLoading(true)
            await deleteGrade(id)
            await loadGrades(centerId!)
            setShowGradeModal(false)
        } catch (err: any) {
            setError(err.message || 'Error al eliminar grado')
        } finally {
            setLoading(false)
        }
    }

    // State for editing
    const [editingGrade, setEditingGrade] = useState<GradeLevel | null>(null)
    const [editingSubject,] = useState<Subject | null>(null)

    // Load center and grades on mount
    useEffect(() => {
        if (centerId) {
            loadCenterData(centerId)
            loadGrades(centerId)
        }
    }, [centerId])

    // Load subjects when grade is selected
    useEffect(() => {
        if (selectedGrade) {
            if (centerId) {
                localStorage.setItem(`selectedGrade_${centerId}`, selectedGrade.id)
            }
            loadSubjects(selectedGrade.id)
        } else if (grades.length > 0) {
            // Auto-select first grade if none is selected
            if (centerId) {
                const savedGradeId = localStorage.getItem(`selectedGrade_${centerId}`)
                const savedGrade = savedGradeId ? grades.find(g => g.id === savedGradeId) : null
                if (savedGrade) {
                    setSelectedGrade(savedGrade)
                } else {
                    setSelectedGrade(grades[0])
                }
            } else {
                setSelectedGrade(grades[0])
            }
        } else {
            setSubjects([])
        }
    }, [selectedGrade, grades, centerId])



    // ========== LOAD FUNCTIONS ==========

    const loadCenterData = async (id: string) => {
        try {
            setLoading(true)
            const data = await getCenterById(id)
            setCenter(data)
        } catch (err: any) {
            setError(err.message || 'Error al cargar centro educativo')
        } finally {
            setLoading(false)
        }
    }

    const loadGrades = async (id: string) => {
        try {
            setLoading(true)
            const data = await getGradesByCenter(id)
            setGrades(data)
        } catch (err: any) {
            setError(err.message || 'Error al cargar grados')
        } finally {
            setLoading(false)
        }
    }

    const loadSubjects = async (gradeId: string) => {
        try {
            setLoading(true)
            const data = await getSubjectsByGrade(gradeId)
            setSubjects(data)
        } catch (err: any) {
            setError(err.message || 'Error al cargar materias')
        } finally {
            setLoading(false)
        }
    }

    const isSecundaria = gradeForm.name === 'Secundaria';
    const isPrimaria = gradeForm.name === 'Primaria';
    const label = isSecundaria || isPrimaria ? 'Grado' : 'Semestre';
    const options = isSecundaria ? [1, 2, 3] : [1, 2, 3, 4, 5, 6];

    // ========== GRADE FUNCTIONS ==========

    const handleCreateGrade = () => {
        if (!center) return
        setGradeForm({ name: '', level: 0 })
        setEditingGrade(null)
        setShowGradeModal(true)
    }

    const handleSaveGrade = async () => {
        if (!center) return

        try {
            setLoading(true)
            if (editingGrade) {
                await updateGrade(editingGrade.id, gradeForm)
            } else {
                await createGrade({ ...gradeForm, center_id: center.id })
            }
            await loadGrades(center.id)
            setShowGradeModal(false)
        } catch (err: any) {
            setError(err.message || 'Error al guardar grado')
        } finally {
            setLoading(false)
        }
    }

    const openSubjectDetail = (subject: Subject) => {
        // Navigate to course content view (Moodle-like)
        if (selectedGrade && centerId) {
            navigate(`/admin/school/${centerId}/grade/${selectedGrade.id}/course/${subject.id}/content`)
        }
    }

    const handleSaveSubject = async () => {
        if (!selectedGrade) return

        try {
            setLoading(true)
            if (editingSubject) {
                await updateSubject(editingSubject.id, { ...subjectForm, visibility: subjectForm.visibility as Subject['visibility'] })
            } else {
                await createSubject({ ...subjectForm, grade_id: selectedGrade.id, visibility: subjectForm.visibility as Subject['visibility'] })
            }
            await loadSubjects(selectedGrade.id)
            setShowSubjectModal(false)
        } catch (err: any) {
            setError(err.message || 'Error al guardar materia')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteSubject = async (id: string) => {
        if (!selectedGrade) return

        try {
            setLoading(true)
            await deleteSubject(id)
            await loadSubjects(selectedGrade.id)
            if (selectedSubject?.id === id) {
                setSelectedSubject(null)
            }
        } catch (err: any) {
            setError(err.message || 'Error al eliminar materia')
        } finally {
            setLoading(false)
        }
    }




    return (
        <div className='course-content-screen'>

            <div className="hierarchy-config" style={{ marginTop: '0px', padding: '2rem 4rem' }}>
                {/* MAIN HEADER */}
                <div className="modern-header-row">
                    <div className="header-action-left" style={{ width: '150px' }}>
                        {!selectedGrade && (
                            <button
                                className="btn-back"
                                onClick={() => navigate('/admin')}
                            >
                                ← Volver
                            </button>
                        )}
                    </div>

                    <h1 className="center-title" style={{ margin: 0, fontSize: '2.5rem', color: 'white' }}>{center ? center.name : 'Cargando...'}</h1>

                    <div className="header-action-right" style={{ width: '150px', justifyContent: 'flex-end' }}>
                        <button
                            className="btn-add"
                            onClick={() => setShowAddTypeModal(true)}
                            disabled={!center}
                        >
                            + Agregar
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="error-banner" style={{ maxWidth: '800px', margin: '0 auto 2rem auto' }}>
                        <span>❌ {error}</span>
                        <button onClick={() => setError(null)}>✕</button>
                    </div>
                )}


                <div className="hierarchy-container" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>

                    {/* FILTER BAR */}
                    <div className="filter-bar-modern">
                        <div className="filter-group">
                            <label>Grado</label>
                            <select
                                className="modern-select"
                                value={selectedGrade?.id || ''}
                                onChange={(e) => {
                                    const grade = grades.find(g => g.id === e.target.value)
                                    setSelectedGrade(grade || null)
                                }}
                            >
                                {grades.length === 0 && <option value="">Sin grados registrados</option>}
                                {grades.map(grade => (
                                    <option key={grade.id} value={grade.id}>
                                        {grade.name} (Nivel {grade.level})
                                    </option>
                                ))}
                            </select>
                            <button style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }} onClick={() => { if (selectedGrade) setConfirmDeleteGrade(selectedGrade) }}> 🗑️ </button>
                        </div>
                        <div className="filter-actions">

                        </div>

                    </div>

                    {/* COURSES LIST VIEW */}
                    <div className="courses-list-container">
                        <div className="courses-list-header">
                            <div className="col-course">Materia</div>
                            <div className="col-code">Código</div>
                            <div className="col-students">Capacidad</div>
                            <div className="col-actions">Acciones</div>
                        </div>

                        <div className="courses-list-body">
                            {loading && subjects.length === 0 ? (
                                <p className="empty-text" style={{ color: 'white' }}>Cargando materias...</p>
                            ) : subjects.length === 0 ? (
                                <p className="empty-text" style={{ color: 'white' }}>No hay materias registradas en este grado.</p>
                            ) : (
                                subjects.map((subject) => (
                                    <div key={subject.id} className="course-list-row" onClick={() => openSubjectDetail(subject)}>
                                        <div className="col-course">
                                            <div className="course-icon-small">📚</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                {subject.campo_formativo && (
                                                    <span style={{ fontSize: '0.75rem', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', fontWeight: 600 }}>
                                                        {subject.campo_formativo}
                                                    </span>
                                                )}
                                                <span className="course-name">{subject.name}</span>
                                            </div>
                                        </div>
                                        <div className="col-code">
                                            {'-'}
                                        </div>
                                        <div className="col-students">
                                            Max. {subject.max_students}
                                        </div>
                                        <div className="col-actions">
                                            <button
                                                className="btn-icon-small delete"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setConfirmDeleteSubject(subject)
                                                }}
                                                title="Eliminar"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div >



            {
                showSubjectModal && (
                    <div className="modal-overlay" onClick={() => setShowSubjectModal(false)}>
                        <div className="school-modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="modal-icon">👥</div>
                                <h2>{editingSubject ? 'Editar Materia' : 'Nueva Materia'}</h2>
                            </div>
                            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label>Nombre *</label>
                                    <input
                                        type="text"
                                        value={subjectForm.name}
                                        onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                                        placeholder="Ej: Matemáticas Avanzadas"
                                        className="modern-input"
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Nombre Corto</label>
                                    <input
                                        type="text"
                                        value={subjectForm.short_name}
                                        onChange={(e) => setSubjectForm({ ...subjectForm, short_name: e.target.value })}
                                        placeholder="Ej: MAT-101"
                                        className="modern-input"
                                    />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label>Descripción</label>
                                    <textarea
                                        value={subjectForm.description}
                                        onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                                        placeholder="Descripción general..."
                                        className="modern-input"
                                        style={{ minHeight: '80px', resize: 'vertical' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Fecha de Inicio</label>
                                    <input
                                        type="date"
                                        value={subjectForm.start_date}
                                        onChange={(e) => setSubjectForm({ ...subjectForm, start_date: e.target.value })}
                                        className="modern-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Fecha de Fin</label>
                                    <input
                                        type="date"
                                        value={subjectForm.end_date}
                                        onChange={(e) => setSubjectForm({ ...subjectForm, end_date: e.target.value })}
                                        className="modern-input"
                                    />
                                </div>

                            </div>
                            <div className="modal-actions">
                                <button className="btn-cancel-modern" onClick={() => setShowSubjectModal(false)}>
                                    Cancelar
                                </button>
                                <button
                                    className="btn-save-modern"
                                    onClick={handleSaveSubject}
                                    disabled={!subjectForm.name || loading}
                                >
                                    {loading ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showContentModal && (
                    <div className="modal-overlay" onClick={() => setShowContentModal(false)}>
                        <div
                            className="school-modal-content"
                            style={{
                                maxWidth: '900px',
                                width: '90%',
                                background: '#1e1e2e',
                                color: '#ffffff',
                                borderRadius: '24px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                                padding: '0'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header" style={{
                                background: 'rgba(255,255,255,0.03)',
                                padding: '2rem',
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '24px 24px 0 0',
                                marginBottom: 0
                            }}>
                                <div className="modal-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
                                <h2 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 'bold' }}>Gestión de Contenido</h2>
                                {!selectedGrade && (
                                    <p style={{ color: '#ef4444', marginTop: '0.5rem' }}>
                                        Por favor, selecciona un grado primero
                                    </p>
                                )}
                            </div>
                            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '2rem' }}>
                                <ContentManagement gradeId={selectedGrade?.id} gradeName={selectedGrade?.name} />
                            </div>
                            <div className="modal-actions" style={{ padding: '0 2rem 2rem 2rem', marginTop: '0' }}>
                                <button
                                    className="btn-cancel-modern"
                                    onClick={() => setShowContentModal(false)}
                                    style={{ padding: '1rem', fontSize: '1rem' }}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MODALS */}
            {/* TYPE SELECTION MODAL */}
            {
                showAddTypeModal && (
                    <div className="modal-overlay" onClick={() => setShowAddTypeModal(false)}>
                        <div
                            className="type-selection-content"
                            style={{
                                background: '#ffffff',
                                color: '#1f295a',
                                borderRadius: '24px',
                                border: '1px solid rgba(0, 0, 0, 0.1)',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                                padding: '2rem',
                                maxWidth: '500px',
                                width: '100%'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '0', background: 'transparent' }}>
                                <h2 style={{ color: '#1f295a', fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>¿Qué deseas agregar?</h2>
                            </div>
                            <div className="type-selection-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                                <button
                                    className="selection-card"
                                    style={{ background: '#1f295a', color: '#ffffff', border: 'none', borderRadius: '30px', padding: '1.5rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
                                    onClick={openGradeTypeModal}
                                >
                                    <span className="selection-icon" style={{ fontSize: '2rem', filter: 'none' }}>📚</span>
                                    <div>
                                        <div className="selection-title" style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>Grado</div>
                                        <div className="selection-desc" style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>Crear nuevo grado</div>
                                    </div>
                                </button>

                                <button
                                    className="selection-card"
                                    style={{ background: '#1f295a', color: '#ffffff', border: 'none', borderRadius: '30px', padding: '1.5rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
                                    onClick={() => {
                                        setShowAddTypeModal(false)
                                        setShowStudentModal(true)
                                    }}
                                >
                                    <span className="selection-icon" style={{ fontSize: '2rem', filter: 'none' }}>👨‍🎓</span>
                                    <div>
                                        <div className="selection-title" style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>Alumnos</div>
                                        <div className="selection-desc" style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>Gestionar estudiantes</div>
                                    </div>
                                </button>

                                <button
                                    className="selection-card"
                                    style={{ background: '#1f295a', color: '#ffffff', border: 'none', borderRadius: '30px', padding: '1.5rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
                                    onClick={() => {
                                        setShowAddTypeModal(false)
                                        setShowTeacherModal(true)
                                    }}
                                >
                                    <span className="selection-icon" style={{ fontSize: '2rem', filter: 'none' }}>👨‍🏫</span>
                                    <div>
                                        <div className="selection-title" style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>Profesores</div>
                                        <div className="selection-desc" style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>Gestionar docentes</div>
                                    </div>
                                </button>

                                <button
                                    className="selection-card"
                                    style={{ background: '#1f295a', color: '#ffffff', border: 'none', borderRadius: '30px', padding: '1.5rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', opacity: selectedGrade ? 1 : 0.6 }}
                                    onClick={openCourseTypeModal}
                                >
                                    <span className="selection-icon" style={{ fontSize: '2rem', filter: 'none' }}>📖</span>
                                    <div>
                                        <div className="selection-title" style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>Materia</div>
                                        <div className="selection-desc" style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>Agregar materia</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showCourseTypeModal && (
                    <div className="modal-overlay" onClick={() => setShowCourseTypeModal(false)}>
                        <div
                            className="school-modal-content"
                            style={{
                                background: '#ffffff',
                                borderRadius: '30px',
                                padding: '2rem',
                                maxWidth: '650px',
                                width: '100%',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <h2 style={{ color: '#1f295a', fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>
                                    Nueva materia
                                </h2>
                                <button
                                    className="btn-icon"
                                    onClick={() => setShowCourseTypeModal(false)}
                                    style={{ color: '#1f295a', fontSize: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                >
                                    ×
                                </button>
                            </div>

                            <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 0, marginBottom: '1.5rem' }}>
                                Selecciona cómo deseas agregar el contenido de la nueva materia al grado <strong>{selectedGrade?.name}</strong>:
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                                {/* Option 1: Crear curso desde cero */}
                                <button
                                    className="selection-card"
                                    style={{
                                        background: courseCreationMode === 'options' ? '#1f295a' : '#f8fafc',
                                        color: courseCreationMode === 'options' ? '#ffffff' : '#1f295a',
                                        border: courseCreationMode === 'options' ? '2px solid #1f295a' : '2px solid #cbd5e1',
                                        borderRadius: '24px',
                                        padding: '1.5rem',
                                        textAlign: 'left',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.25s ease',
                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                                    }}
                                    onClick={() => {
                                        setShowCourseTypeModal(false)
                                        if (selectedGrade && centerId) {
                                            navigate(`/admin/school/${centerId}/grade/${selectedGrade.id}/course/new`)
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '2rem' }}>📖</span>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Crear desde cero</div>
                                    </div>
                                    <div style={{ opacity: 0.85, fontSize: '0.875rem', lineHeight: '1.4' }}>
                                        Crear una nueva materia manualmente.
                                    </div>
                                </button>

                                {/* Option 2: Copiar curso preexistente */}
                                <button
                                    className="selection-card"
                                    style={{
                                        background: courseCreationMode === 'copy' ? '#1f295a' : '#f8fafc',
                                        color: courseCreationMode === 'copy' ? '#ffffff' : '#1f295a',
                                        border: courseCreationMode === 'copy' ? '2px solid #1f295a' : '2px solid #cbd5e1',
                                        borderRadius: '24px',
                                        padding: '1.5rem',
                                        textAlign: 'left',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.25s ease',
                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                                    }}
                                    onClick={() => setCourseCreationMode('copy')}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '2rem' }}>📋</span>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Copiar preexistente</div>
                                    </div>
                                    <div style={{ opacity: 0.85, fontSize: '0.875rem', lineHeight: '1.4' }}>
                                        Duplicar contenidos y estructura de una materia existente de cualquier centro.
                                    </div>
                                </button>
                            </div>

                            {/* Dropdowns section when Copy mode is active */}
                            {courseCreationMode === 'copy' && (
                                <div style={{
                                    background: '#f8fafc',
                                    padding: '1.5rem',
                                    borderRadius: '20px',
                                    border: '1px solid #e2e8f0',
                                    animation: 'fadeIn 0.2s ease-in-out'
                                }}>
                                    <h4 style={{ color: '#1f295a', margin: '0 0 1.25rem 0', fontSize: '1.05rem', fontWeight: 'bold' }}>
                                        Selecciona el curso origen:
                                    </h4>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {/* 1. Centro */}
                                        <div>
                                            <label style={{ display: 'block', color: '#1f295a', fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.4rem' }}>
                                                1. Centro Educativo origen
                                            </label>
                                            <select
                                                className="modern-input"
                                                style={{ width: '100%', background: '#ffffff', color: '#1f295a', border: '1px solid rgba(31, 41, 90, 0.2)' }}
                                                value={sourceCenterId}
                                                onChange={(e) => handleSourceCenterChange(e.target.value)}
                                            >
                                                <option value="">-- Selecciona un centro --</option>
                                                {allCenters.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* 2. Grado */}
                                        <div>
                                            <label style={{ display: 'block', color: '#1f295a', fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.4rem' }}>
                                                2. Grado origen
                                            </label>
                                            <select
                                                className="modern-input"
                                                style={{ width: '100%', background: '#ffffff', color: '#1f295a', border: '1px solid rgba(31, 41, 90, 0.2)' }}
                                                value={sourceGradeId}
                                                disabled={!sourceCenterId || loadingCopyData}
                                                onChange={(e) => handleSourceGradeChange(e.target.value)}
                                            >
                                                <option value="">
                                                    {sourceCenterId
                                                        ? (loadingCopyData ? 'Cargando grados...' : '-- Selecciona un grado --')
                                                        : 'Primero selecciona un centro'}
                                                </option>
                                                {sourceGrades.map(g => (
                                                    <option key={g.id} value={g.id}>{g.name} (Nivel {g.level})</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* 3. Materia */}
                                        <div>
                                            <label style={{ display: 'block', color: '#1f295a', fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.4rem' }}>
                                                3. Curso / Materia a copiar
                                            </label>
                                            <select
                                                className="modern-input"
                                                style={{ width: '100%', background: '#ffffff', color: '#1f295a', border: '1px solid rgba(31, 41, 90, 0.2)' }}
                                                value={sourceSubjectId}
                                                disabled={!sourceGradeId || loadingCopyData}
                                                onChange={(e) => setSourceSubjectId(e.target.value)}
                                            >
                                                <option value="">
                                                    {sourceGradeId
                                                        ? (loadingCopyData ? 'Cargando materias...' : '-- Selecciona una materia --')
                                                        : 'Primero selecciona un grado'}
                                                </option>
                                                {sourceSubjects.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                            <button
                                                className="btn-cancel-modern"
                                                onClick={() => setCourseCreationMode('options')}
                                            >
                                                Atrás
                                            </button>
                                            <button
                                                className="btn-save-modern"
                                                disabled={!sourceSubjectId || loadingCopyData}
                                                style={{
                                                    opacity: !sourceSubjectId || loadingCopyData ? 0.5 : 1,
                                                    cursor: !sourceSubjectId || loadingCopyData ? 'not-allowed' : 'pointer'
                                                }}
                                                onClick={handleCopySubject}
                                            >
                                                {loadingCopyData ? 'Copiando...' : 'Copiar Contenido'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {
                showGradeTypeModal && (
                    <div className="modal-overlay" onClick={() => setShowGradeTypeModal(false)}>
                        <div
                            className="school-modal-content"
                            style={{
                                background: '#ffffff',
                                borderRadius: '30px',
                                padding: '2rem',
                                maxWidth: '650px',
                                width: '100%',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <h2 style={{ color: '#1f295a', fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>
                                    Nuevo grado
                                </h2>
                                <button
                                    className="btn-icon"
                                    onClick={() => setShowGradeTypeModal(false)}
                                    style={{ color: '#1f295a', fontSize: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                >
                                    ×
                                </button>
                            </div>

                            <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 0, marginBottom: '1.5rem' }}>
                                Selecciona cómo deseas agregar el nuevo grado al centro <strong>{center?.name}</strong>:
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                                {/* Option 1: Crear grado desde cero */}
                                <button
                                    className="selection-card"
                                    style={{
                                        background: gradeCreationMode === 'options' ? '#1f295a' : '#f8fafc',
                                        color: gradeCreationMode === 'options' ? '#ffffff' : '#1f295a',
                                        border: gradeCreationMode === 'options' ? '2px solid #1f295a' : '2px solid #cbd5e1',
                                        borderRadius: '24px',
                                        padding: '1.5rem',
                                        textAlign: 'left',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.25s ease',
                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                                    }}
                                    onClick={() => {
                                        setShowGradeTypeModal(false)
                                        handleCreateGrade()
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '2rem' }}>📚</span>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Crear desde cero</div>
                                    </div>
                                    <div style={{ opacity: 0.85, fontSize: '0.875rem', lineHeight: '1.4' }}>
                                        Crear un nuevo grado manualmente seleccionando su nivel.
                                    </div>
                                </button>

                                {/* Option 2: Copiar grado preexistente */}
                                <button
                                    className="selection-card"
                                    style={{
                                        background: gradeCreationMode === 'copy' ? '#1f295a' : '#f8fafc',
                                        color: gradeCreationMode === 'copy' ? '#ffffff' : '#1f295a',
                                        border: gradeCreationMode === 'copy' ? '2px solid #1f295a' : '2px solid #cbd5e1',
                                        borderRadius: '24px',
                                        padding: '1.5rem',
                                        textAlign: 'left',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.25s ease',
                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                                    }}
                                    onClick={() => {
                                        setGradeCreationMode('copy')
                                        if (allCenters.length === 0) {
                                            getCenters()
                                                .then(data => setAllCenters(data))
                                                .catch(err => console.error('Error loading centers:', err))
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '2rem' }}>📋</span>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Copiar preexistente</div>
                                    </div>
                                    <div style={{ opacity: 0.85, fontSize: '0.875rem', lineHeight: '1.4' }}>
                                        Duplicar un grado completo con todas sus materias, módulos y contenidos.
                                    </div>
                                </button>
                            </div>

                            {/* Dropdowns section when Copy mode is active */}
                            {gradeCreationMode === 'copy' && (
                                <div style={{
                                    background: '#f8fafc',
                                    padding: '1.5rem',
                                    borderRadius: '20px',
                                    border: '1px solid #e2e8f0',
                                    animation: 'fadeIn 0.2s ease-in-out'
                                }}>
                                    <h4 style={{ color: '#1f295a', margin: '0 0 1.25rem 0', fontSize: '1.05rem', fontWeight: 'bold' }}>
                                        Selecciona el grado origen:
                                    </h4>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {/* 1. Centro */}
                                        <div>
                                            <label style={{ display: 'block', color: '#1f295a', fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.4rem' }}>
                                                1. Centro Educativo origen
                                            </label>
                                            <select
                                                className="modern-input"
                                                style={{ width: '100%', background: '#ffffff', color: '#1f295a', border: '1px solid rgba(31, 41, 90, 0.2)' }}
                                                value={sourceGradeCenterId}
                                                onChange={(e) => handleSourceGradeCenterChange(e.target.value)}
                                            >
                                                <option value="">-- Selecciona un centro --</option>
                                                {allCenters.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* 2. Grado */}
                                        <div>
                                            <label style={{ display: 'block', color: '#1f295a', fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.4rem' }}>
                                                2. Grado a copiar
                                            </label>
                                            <select
                                                className="modern-input"
                                                style={{ width: '100%', background: '#ffffff', color: '#1f295a', border: '1px solid rgba(31, 41, 90, 0.2)' }}
                                                value={sourceGradeSelectId}
                                                disabled={!sourceGradeCenterId || loadingGradeCopy}
                                                onChange={(e) => setSourceGradeSelectId(e.target.value)}
                                            >
                                                <option value="">
                                                    {sourceGradeCenterId
                                                        ? (loadingGradeCopy ? 'Cargando grados...' : '-- Selecciona un grado --')
                                                        : 'Primero selecciona un centro'}
                                                </option>
                                                {sourceCenterGrades.map(g => (
                                                    <option key={g.id} value={g.id}>{g.name} (Nivel {g.level})</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                            <button
                                                className="btn-cancel-modern"
                                                onClick={() => setGradeCreationMode('options')}
                                            >
                                                Atrás
                                            </button>
                                            <button
                                                className="btn-save-modern"
                                                disabled={!sourceGradeSelectId || loadingGradeCopy}
                                                style={{
                                                    opacity: !sourceGradeSelectId || loadingGradeCopy ? 0.5 : 1,
                                                    cursor: !sourceGradeSelectId || loadingGradeCopy ? 'not-allowed' : 'pointer'
                                                }}
                                                onClick={handleCopyGrade}
                                            >
                                                {loadingGradeCopy ? 'Copiando grado...' : 'Copiar Grado'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {
                showGradeModal && (
                    <div className="modal-overlay" onClick={() => setShowGradeModal(false)}>
                        <div className="school-modal-content" style={{ background: '#ffffff' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 0 1rem 0' }}>
                                <button className="btn-icon" onClick={() => setShowGradeModal(false)} style={{ color: '#1f295a', fontSize: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}>×</button>
                            </div>
                            <div style={{ textAlign: 'center', padding: '0 0 2rem 0' }}>
                                <h2 style={{ color: '#1f295a', margin: 0 }}>{editingGrade ? 'Editar Grado' : 'Nuevo Grado'}</h2>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label style={{ color: '#1f295a', fontWeight: 'bold' }}>Nivel*</label>
                                    <select
                                        value={gradeForm.name}
                                        onChange={(e) => setGradeForm({ ...gradeForm, name: e.target.value })}
                                        className="modern-input"
                                        style={{ background: '#f8fafc', color: '#1f295a', border: '1px solid rgba(31, 41, 90, 0.2)' }}
                                        autoFocus
                                    >
                                        <option value="">Seleccione un nivel...</option>
                                        <option value="Primaria">Primaria</option>
                                        <option value="Secundaria">Secundaria</option>
                                        <option value="Preparatoria">Preparatoria</option>
                                        <option value="Universidad">Universidad</option>
                                        {/* Fallback for existing data that doesn't match standard options */}
                                        {gradeForm.name && !['Primaria', 'Secundaria', 'Preparatoria', 'Universidad'].includes(gradeForm.name) && (
                                            <option value={gradeForm.name}>{gradeForm.name}</option>
                                        )}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label style={{ color: '#1f295a', fontWeight: 'bold' }}>{label}</label>
                                    <select
                                        value={gradeForm.level || ''}
                                        onChange={(e) => setGradeForm({ ...gradeForm, level: parseInt(e.target.value) })}
                                        className="modern-input"
                                        style={{ background: '#f8fafc', color: '#1f295a', border: '1px solid rgba(31, 41, 90, 0.2)' }}
                                    >
                                        <option value="">Seleccione un {label.toLowerCase()}...</option>
                                        {options.map(num => (
                                            <option key={num} value={num}>{num}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button className="btn-cancel-modern" style={{ color: '#1f295a', borderColor: '#1f295a' }} onClick={() => setShowGradeModal(false)}>
                                    Cancelar
                                </button>
                                <button
                                    className="btn-save-modern"
                                    onClick={handleSaveGrade}
                                    disabled={!gradeForm.name || loading}
                                    style={{ background: '#1f295a', color: '#ffffff' }}
                                >
                                    {loading ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showStudentModal && (
                    <div className="modal-overlay" onClick={() => setShowStudentModal(false)}>
                        <div
                            style={{
                                maxWidth: '700px',
                                width: '90%',
                                maxHeight: '90vh',
                                display: 'flex',
                                flexDirection: 'column',
                                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                                color: '#fff',
                                borderRadius: '24px',
                                border: '1px solid rgba(192,132,252,0.25)',
                                boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                                padding: '0'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header" style={{
                                background: 'transparent',
                                padding: '2rem',
                                borderBottom: '1px solid rgba(0,0,0,0.1)',
                                borderRadius: '24px 24px 0 0',
                                marginBottom: 0,
                                textAlign: 'center'
                            }}>
                                <h2 style={{ color: '#c084fc', fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>Gestión de Alumnos</h2>
                            </div>
                            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '2rem', background: 'transparent' }}>
                                <StudentManagement centerId={center?.id} centerName={center?.name} gradeId={selectedGrade?.id} />
                            </div>
                            <div className="modal-actions" style={{ padding: '0 2rem 2rem 2rem', marginTop: '0', display: 'flex', justifyContent: 'center' }}>
                                <button
                                    className="btn-cancel-modern"
                                    onClick={() => setShowStudentModal(false)}
                                    style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.9rem', width: '100%', maxWidth: '200px' }}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showTeacherModal && (
                    <div className="modal-overlay" onClick={() => setShowTeacherModal(false)}>
                        <div
                            style={{
                                maxWidth: '900px',
                                width: '90%',
                                maxHeight: '90vh',
                                display: 'flex',
                                flexDirection: 'column',
                                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                                color: '#fff',
                                borderRadius: '24px',
                                border: '1px solid rgba(192,132,252,0.25)',
                                boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(192,132,252,0.1)',
                                padding: '0'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header" style={{
                                background: 'transparent',
                                padding: '2rem',
                                borderBottom: '1px solid rgba(0,0,0,0.1)',
                                borderRadius: '24px 24px 0 0',
                                marginBottom: 0,
                                textAlign: 'center'
                            }}>
                                <h2 style={{ color: '#c084fc', fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>Gestión de Profesores</h2>
                            </div>
                            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '2rem', background: 'transparent' }}>
                                {centerId && <TeacherManagement centerId={centerId} centerName={center?.name} />}
                            </div>
                            <div className="modal-actions" style={{ padding: '0 2rem 2rem 2rem', marginTop: '0', display: 'flex', justifyContent: 'center' }}>
                                <button
                                    className="btn-cancel-modern"
                                    onClick={() => setShowTeacherModal(false)}
                                    style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.9rem', width: '100%', maxWidth: '200px' }}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


            {confirmDeleteGrade && (
                <ConfirmModal
                    message={`¿Seguro que quieres eliminar el grado ${selectedGrade?.name} y todos sus cursos?`}
                    confirmLabel="Sí, eliminar"
                    cancelLabel="Cancelar"
                    danger
                    onConfirm={() => {
                        handleDeleteGrade(confirmDeleteGrade.id)
                        setConfirmDeleteGrade(null)
                    }}
                    onCancel={() => setConfirmDeleteGrade(null)}
                />
            )}

            {confirmDeleteSubject && (
                <ConfirmModal
                    message={`¿Seguro que quieres eliminar la materia ${confirmDeleteSubject?.name} y todo su contenido?`}
                    confirmLabel="Sí, eliminar"
                    cancelLabel="Cancelar"
                    danger
                    onConfirm={() => {
                        handleDeleteSubject(confirmDeleteSubject.id)
                        setConfirmDeleteSubject(null)
                    }}
                    onCancel={() => setConfirmDeleteSubject(null)}
                />
            )}
        </div>
    )
}

export default SchoolDetailScreen

