import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import {
    getSubjectById,
    getCourseModules,
    type Subject,
    type CourseModule,
} from '../lib/adminApi'
import { createAssignment } from '../lib/api'
import './HierarchyConfig.css'

interface ProfessorAssignmentContentScreenProps {
    user: User
}

const ProfessorAssignmentContentScreen: React.FC<ProfessorAssignmentContentScreenProps> = ({ user }) => {
    const { courseId } = useParams<{ courseId: string }>()
    const navigate = useNavigate()

    const [subject, setSubject] = useState<Subject | null>(null)
    const [modules, setModules] = useState<CourseModule[]>([])
    const [loading, setLoading] = useState(true)

    // Assignment Modal State
    const [showAssignmentModal, setShowAssignmentModal] = useState(false)
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [assignmentForm, setAssignmentForm] = useState({
        title: '',
        instructions_md: '',
        max_score: 100,
        due_at: '',
        available_from: '',
        allow_resubmission: true
    })
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    useEffect(() => {
        if (courseId) {
            loadData()
        }
    }, [courseId])

    const loadData = async () => {
        if (!courseId) return
        try {
            setLoading(true)
            const [subjectData, modulesData] = await Promise.all([
                getSubjectById(courseId),
                getCourseModules(courseId)
            ])
            setSubject(subjectData)
            setModules(modulesData)
        } catch (err: any) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleOpenAssignmentModal = (moduleId: string | null) => {
        setActiveModuleId(moduleId)
        setAssignmentForm({
            title: '',
            instructions_md: '',
            max_score: 100,
            due_at: '',
            available_from: '',
            allow_resubmission: true
        })
        setSelectedFile(null)
        setShowAssignmentModal(true)
    }

    const handleSaveAssignment = async () => {
        if (!courseId) return
        if (!assignmentForm.title) {
            alert("El título es obligatorio")
            return
        }

        try {
            setIsSaving(true)
            const formData = new FormData()
            formData.append('title', assignmentForm.title)
            formData.append('instructions_md', assignmentForm.instructions_md)
            formData.append('max_score', assignmentForm.max_score.toString())
            if (assignmentForm.due_at) formData.append('due_at', new Date(assignmentForm.due_at).toISOString())
            if (assignmentForm.available_from) formData.append('available_from', new Date(assignmentForm.available_from).toISOString())
            formData.append('allow_resubmission', assignmentForm.allow_resubmission.toString())
            
            if (activeModuleId) {
                formData.append('module_id', activeModuleId)
            }
            
            if (selectedFile) {
                formData.append('attachment', selectedFile)
            }

            await createAssignment(user.id, courseId, formData)
            setShowAssignmentModal(false)
            alert("Tarea creada exitosamente")
        } catch (err: any) {
            alert(err.message || 'Error al guardar tarea')
        } finally {
            setIsSaving(false)
        }
    }

    if (loading) {
        return <div className="loading-screen"><div className="loading-spinner"></div></div>
    }

    return (
        <div className="course-content-screen">
            <div className="hierarchy-config" style={{ padding: '2rem 4rem' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>

                    {/* Header */}
                    <div className="modern-header-row" style={{ marginBottom: '2rem' }}>
                        <div className="header-action-left" style={{ width: '150px' }}>
                            <button
                                className="btn-back"
                                onClick={() => navigate(`/professor/assignments/courses`)}
                            >
                                ← Volver
                            </button>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <h1 style={{ margin: 0, fontSize: '2rem', color: 'white' }}>
                                {subject?.name}
                            </h1>
                            <p style={{ color: 'white', marginTop: '0.5rem', opacity: 0.8 }}>Contenido del Curso (Solo lectura)</p>
                        </div>
                        <div className="header-action-right" style={{ width: '150px', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button
                                className="btn-add"
                                onClick={() => handleOpenAssignmentModal(null)}
                            >
                                + Tarea General
                            </button>
                        </div>
                    </div>

                    {/* Modules List */}
                    <div className="modules-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {modules.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem', color: '#1f295a', border: '2px dashed rgba(31, 41, 90, 0.3)', borderRadius: '1rem' }}>
                                <p>No hay módulos creados para esta materia.</p>
                            </div>
                        ) : (
                            modules.map(module => (
                                <div key={module.id} style={{
                                    background: '#ffffff',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(31, 41, 90, 0.2)',
                                    overflow: 'hidden'
                                }}>
                                    {/* Module Header */}
                                    <div style={{
                                        padding: '1.5rem',
                                        background: 'rgba(31, 41, 90, 0.05)',
                                        borderBottom: '1px solid rgba(31, 41, 90, 0.1)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <h3 style={{ margin: 0, color: '#1f295a' }}>{module.title}</h3>
                                        <button 
                                            className="btn-add" 
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}
                                            onClick={() => handleOpenAssignmentModal(module.id)}
                                        >
                                            + Tarea
                                        </button>
                                    </div>

                                    {/* Items List */}
                                    <div style={{ padding: '1rem' }}>
                                        {module.items && module.items.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {module.items.map(item => (
                                                    <div key={item.id} style={{
                                                        padding: '1rem',
                                                        background: '#1f295a',
                                                        borderRadius: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '1rem',
                                                        color: '#ffffff'
                                                    }}>
                                                        <div style={{ fontSize: '1.5rem' }}>
                                                            {item.type === 'pdf' ? '📄' : item.type === 'video' ? '🎥' : item.type === 'assignment' ? '📝' : '🔗'}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 'bold' }}>{item.title}</div>
                                                            {item.description && <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{item.description}</div>}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            {item.content_url && (
                                                                <a href={item.content_url} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                                                                    ⬇️ Ver Contenido
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p style={{ color: 'rgba(31, 41, 90, 0.5)', fontStyle: 'italic', padding: '1rem' }}>Sin contenido</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ASSIGNMENT MODAL */}
            {showAssignmentModal && (
                <div className="modal-overlay" onClick={() => setShowAssignmentModal(false)}>
                    <div className="school-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>Nueva Tarea</h2>
                        </div>
                        <div className="form-grid">
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Título de la tarea</label>
                                <input
                                    type="text"
                                    className="modern-input"
                                    value={assignmentForm.title}
                                    onChange={e => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                                />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Instrucciones (opcional)</label>
                                <textarea
                                    className="modern-input"
                                    style={{ minHeight: '100px' }}
                                    value={assignmentForm.instructions_md}
                                    onChange={e => setAssignmentForm({ ...assignmentForm, instructions_md: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Puntaje máximo</label>
                                <input
                                    type="number"
                                    className="modern-input"
                                    value={assignmentForm.max_score}
                                    onChange={e => setAssignmentForm({ ...assignmentForm, max_score: Number(e.target.value) })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Permitir reenvíos</label>
                                <select 
                                    className="modern-input"
                                    value={assignmentForm.allow_resubmission ? 'true' : 'false'}
                                    onChange={e => setAssignmentForm({ ...assignmentForm, allow_resubmission: e.target.value === 'true' })}
                                >
                                    <option value="true">Sí</option>
                                    <option value="false">No</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Disponible desde (opcional)</label>
                                <input
                                    type="datetime-local"
                                    className="modern-input"
                                    value={assignmentForm.available_from}
                                    onChange={e => setAssignmentForm({ ...assignmentForm, available_from: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Fecha de entrega (opcional)</label>
                                <input
                                    type="datetime-local"
                                    className="modern-input"
                                    value={assignmentForm.due_at}
                                    onChange={e => setAssignmentForm({ ...assignmentForm, due_at: e.target.value })}
                                />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Archivo adjunto (opcional)</label>
                                <input
                                    type="file"
                                    className="modern-input"
                                    onChange={e => {
                                        if (e.target.files && e.target.files[0]) {
                                            setSelectedFile(e.target.files[0])
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-cancel-modern" onClick={() => setShowAssignmentModal(false)} disabled={isSaving}>Cancelar</button>
                            <button className="btn-save-modern" onClick={handleSaveAssignment} disabled={isSaving}>
                                {isSaving ? 'Guardando...' : 'Guardar Tarea'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProfessorAssignmentContentScreen
