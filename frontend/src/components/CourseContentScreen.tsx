import React, { useState, useEffect, useRef, } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import {
    getSubjectById,
    getCourseModules,
    createCourseModule,
    updateCourseModule,
    deleteCourseModule,
    createModuleItem,
    uploadModuleItem,
    deleteModuleItem,
    getSubjectProfessors,
    assignSubjectProfessor,
    unassignSubjectProfessor,
    getCenterProfessors,
    toggleItemVisibility,
    toggleItemVisibilityProfessor,
    updateModuleItem,
    getModuleVrCode,
    addModuleVrCode,
    updateModuleVrCode,
    deleteModuleVrCode,
    type Subject,
    type CourseModule,
    type ModuleItem,
    type VrCodeEntry,
} from '../lib/adminApi'
import './HierarchyConfig.css'

interface CourseContentScreenProps {
    user: User
}

const Toggle = ({ on, color }: { on: boolean; color: string }) => (
    <span style={{ width: '30px', height: '16px', borderRadius: '999px', position: 'relative', display: 'inline-block', background: on ? color : 'rgba(31,41,90,0.2)', transition: 'background 0.15s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: '2px', left: on ? '16px' : '2px', width: '12px', height: '12px', borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
    </span>
)

const CourseContentScreen: React.FC<CourseContentScreenProps> = () => {
    const { centerId, gradeId, courseId } = useParams<{ centerId: string, gradeId: string, courseId: string }>()
    const navigate = useNavigate()

    const [subject, setSubject] = useState<Subject | null>(null)
    const [modules, setModules] = useState<CourseModule[]>([])
    const [loading, setLoading] = useState(true)
    const [, setError] = useState<string | null>(null)

    // Professor state
    const [subjectProfessors, setSubjectProfessors] = useState<any[]>([])
    const [centerProfessors, setCenterProfessors] = useState<any[]>([])
    const [showProfessorModal, setShowProfessorModal] = useState(false)
    const [professorLoading, setProfessorLoading] = useState(false)

    // Modals state
    const [showModuleModal, setShowModuleModal] = useState(false)
    const [showItemModal, setShowItemModal] = useState(false)
    const [editingModule, setEditingModule] = useState<CourseModule | null>(null)
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null)

    // Visibility state
    const [visibilityLoading, setVisibilityLoading] = useState<string | null>(null)
    const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null)

    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
    const kebabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

    const [showEditItemModal, setShowEditItemModal] = useState(false)
    const [editingItem, setEditingItem] = useState<ModuleItem | null>(null)

    // VR modal state
    const [showVrModal, setShowVrModal] = useState(false)
    const [vrModuleId, setVrModuleId] = useState<string | null>(null)
    const [vrEntriesByModule, setVrEntriesByModule] = useState<Record<string, VrCodeEntry[]>>({})
    const [vrEditingEntry, setVrEditingEntry] = useState<VrCodeEntry | null>(null) // null = adding new
    const [vrForm, setVrForm] = useState({ code: '', image_url: '', title: '', description: '' })
    const [vrLoading, setVrLoading] = useState(false)
    const [editItemForm, setEditItemForm] = useState<{
        title: string
        description: string
        content_url: string
        image_url: string
    }>({ title: '', description: '', content_url: '', image_url: '' })

    // Form states
    const [moduleForm, setModuleForm] = useState({ title: '' })
    const [itemForm, setItemForm] = useState<{
        type: 'pdf' | 'video' | 'link' | 'assignment',
        title: string,
        description: string,
        content_url: string,
        image_url: string
    }>({
        type: 'pdf',
        title: '',
        description: '',
        content_url: '',
        image_url: ''
    })

    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    const handleKebabClick = (_e: React.MouseEvent, itemId: string) => {
        if (openMenuItemId === itemId) {
            setOpenMenuItemId(null)
            setMenuPosition(null)
            return
        }
        const btn = kebabRefs.current[itemId]
        if (!btn) return
        const rect = btn.getBoundingClientRect()
        const menuWidth = 220
        const menuHeight = 160 // approximate
        const left = rect.right - menuWidth
        const spaceBelow = window.innerHeight - rect.bottom
        const top = spaceBelow < menuHeight
            ? rect.top - menuHeight - 4   // flip upward if too close to bottom
            : rect.bottom + 4
        setMenuPosition({ top, left })
        setOpenMenuItemId(itemId)
    }

    const handleOpenEditItem = (item: ModuleItem) => {
        setEditingItem(item)
        setEditItemForm({
            title: item.title,
            description: item.description || '',
            content_url: item.content_url || '',
            image_url: item.image_url || ''
        })
        setOpenMenuItemId(null)
        setMenuPosition(null)
        setShowEditItemModal(true)
    }

    const handleSaveEditItem = async () => {
        if (!editingItem) return
        try {
            await updateModuleItem(editingItem.id, {
                title: editItemForm.title,
                description: editItemForm.description,
                content_url: editItemForm.content_url,
                image_url: editItemForm.image_url || undefined
            })
            await loadData()
            setShowEditItemModal(false)
            setEditingItem(null)
        } catch (err: any) {
            alert(err.message || 'Error al guardar cambios')
        }
    }

    // ========== VR ROOM HANDLERS ==========

    const handleOpenAddVrModal = (moduleId: string) => {
        setVrModuleId(moduleId)
        setVrEditingEntry(null)
        setVrForm({ code: '', image_url: '', title: '', description: '' })
        setShowVrModal(true)
    }

    const handleOpenEditVrModal = (entry: VrCodeEntry) => {
        setVrModuleId(entry.module_id)
        setVrEditingEntry(entry)
        setVrForm({ code: entry.code, image_url: entry.image_url || '', title: entry.title || '', description: entry.description || '' })
        setShowVrModal(true)
    }

    const handleAddVrCode = async () => {
        if (!vrModuleId) return
        try {
            setVrLoading(true)
            const newEntry = await addModuleVrCode(vrModuleId, vrForm.code.trim(), vrForm.image_url.trim() || undefined, vrForm.title.trim() || undefined, vrForm.description.trim() || undefined)
            setVrEntriesByModule(prev => ({ ...prev, [vrModuleId]: [...(prev[vrModuleId] || []), newEntry] }))
            setShowVrModal(false)
            setVrForm({ code: '', image_url: '', title: '', description: '' })
        } catch (err: any) {
            alert(err.message || 'Error al agregar código VR')
        } finally {
            setVrLoading(false)
        }
    }

    const handleUpdateVrCode = async () => {
        if (!vrEditingEntry || !vrModuleId) return

        try {
            setVrLoading(true)
            const updated = await updateModuleVrCode(vrEditingEntry.id, vrForm.code.trim(), vrForm.image_url.trim() || undefined, vrForm.title.trim() || undefined, vrForm.description.trim() || undefined)
            setVrEntriesByModule(prev => ({ ...prev, [vrModuleId]: (prev[vrModuleId] || []).map(e => e.id === updated.id ? updated : e) }))
            setShowVrModal(false)
            setVrEditingEntry(null)
            setVrForm({ code: '', image_url: '', title: '', description: '' })
        } catch (err: any) {
            alert(err.message || 'Error al actualizar código VR')
        } finally {
            setVrLoading(false)
        }
    }

    const handleDeleteVrEntry = async (entryId: string, moduleId: string) => {
        if (!confirm('¿Eliminar esta Sala VR?')) return
        try {
            setVrLoading(true)
            await deleteModuleVrCode(entryId)
            setVrEntriesByModule(prev => ({ ...prev, [moduleId]: (prev[moduleId] || []).filter(e => e.id !== entryId) }))
        } catch (err: any) {
            alert(err.message || 'Error al eliminar código VR')
        } finally {
            setVrLoading(false)
        }
    }

    useEffect(() => {
        if (courseId) {
            loadData()
        }
    }, [courseId])

    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenuItemId(null)
                setMenuPosition(null)
            }
        }
        const closeOnScroll = () => { setOpenMenuItemId(null); setMenuPosition(null) }
        document.addEventListener('mousedown', close)
        window.addEventListener('scroll', closeOnScroll, true)
        window.addEventListener('resize', closeOnScroll)
        return () => {
            document.removeEventListener('mousedown', close)
            window.removeEventListener('scroll', closeOnScroll, true)
            window.removeEventListener('resize', closeOnScroll)
        }
    }, [])

    const loadData = async () => {
        if (!courseId) return
        try {
            setLoading(true)
            const [subjectData, modulesData, professorsData] = await Promise.all([
                getSubjectById(courseId),
                getCourseModules(courseId),
                getSubjectProfessors(courseId)
            ])
            setSubject(subjectData)
            setModules(modulesData)
            setSubjectProfessors(professorsData)
            // Load VR entries for all modules
            const vrMap: Record<string, VrCodeEntry[]> = {}
            await Promise.all(modulesData.map(async (m) => {
                const entries = await getModuleVrCode(m.id)
                vrMap[m.id] = entries
            }))
            setVrEntriesByModule(vrMap)
        } catch (err: any) {
            setError(err.message || 'Error al cargar datos del curso')
        } finally {
            setLoading(false)
        }
    }

    // ========== VISIBILITY HANDLERS ==========

    const handleToggleStudentVisibility = async (item: ModuleItem) => {
        try {
            setVisibilityLoading(item.id)
            await toggleItemVisibility(item.id, !item.show_student)
            await loadData()
        } catch (err: any) {
            alert(err.message || 'Error al cambiar visibilidad para estudiantes')
        } finally {
            setVisibilityLoading(null)
        }
    }

    const handleToggleProfessorVisibility = async (item: ModuleItem) => {
        try {
            setVisibilityLoading(item.id)
            await toggleItemVisibilityProfessor(item.id, !item.show_teacher)
            await loadData()
        } catch (err: any) {
            alert(err.message || 'Error al cambiar visibilidad para profesores')
        } finally {
            setVisibilityLoading(null)
        }
    }

    // ========== PROFESSOR HANDLERS ==========

    const loadCenterProfessors = async () => {
        if (!centerId) return
        try {
            setProfessorLoading(true)
            const data = await getCenterProfessors(centerId)
            setCenterProfessors(data)
        } catch (err: any) {
            console.error('Error loading center professors:', err)
        } finally {
            setProfessorLoading(false)
        }
    }

    const handleOpenProfessorModal = async () => {
        await loadCenterProfessors()
        setShowProfessorModal(true)
    }

    const handleAssignProfessor = async (userId: string) => {
        if (!courseId) return
        try {
            setProfessorLoading(true)
            await assignSubjectProfessor(courseId, userId)
            const updated = await getSubjectProfessors(courseId)
            setSubjectProfessors(updated)
            setShowProfessorModal(false)
        } catch (err: any) {
            alert(err.message || 'Error al asignar profesor')
        } finally {
            setProfessorLoading(false)
        }
    }

    const handleUnassignProfessor = async (userId: string) => {
        if (!courseId || !confirm('¿Desasignar este profesor de la materia?')) return
        try {
            setProfessorLoading(true)
            await unassignSubjectProfessor(courseId, userId)
            const updated = await getSubjectProfessors(courseId)
            setSubjectProfessors(updated)
        } catch (err: any) {
            alert(err.message || 'Error al desasignar profesor')
        } finally {
            setProfessorLoading(false)
        }
    }

    // ========== MODULE HANDLERS ==========

    const handleCreateModule = () => {
        setEditingModule(null)
        setModuleForm({ title: '' })
        setShowModuleModal(true)
    }

    const handleEditModule = (module: CourseModule) => {
        setEditingModule(module)
        setModuleForm({ title: module.title })
        setShowModuleModal(true)
    }

    const handleSaveModule = async () => {
        if (!courseId) return
        try {
            if (editingModule) {
                await updateCourseModule(editingModule.id, { title: moduleForm.title })
            } else {
                await createCourseModule(courseId, moduleForm.title, modules.length)
            }
            await loadData()
            setShowModuleModal(false)
        } catch (err: any) {
            alert(err.message || 'Error al guardar módulo')
        }
    }

    const handleDeleteModule = async (moduleId: string) => {
        if (!confirm('¿Estás seguro de eliminar este módulo y todo su contenido?')) return
        try {
            await deleteCourseModule(moduleId)
            await loadData()
        } catch (err: any) {
            alert(err.message || 'Error al eliminar módulo')
        }
    }

    // ========== ITEM HANDLERS ==========

    const handleAddItem = (moduleId: string) => {
        setActiveModuleId(moduleId)
        setItemForm({
            type: 'pdf',
            title: '',
            description: '',
            content_url: '',
            image_url: ''
        })
        setSelectedFile(null)
        setShowItemModal(true)
    }

    const handleSaveItem = async () => {
        if (!activeModuleId) return
        try {
            if (itemForm.type === 'pdf' && selectedFile) {
                await uploadModuleItem(activeModuleId, selectedFile, {
                    title: itemForm.title,
                    description: itemForm.description,
                    order_index: 999
                })
            } else {
                await createModuleItem(activeModuleId, {
                    ...itemForm,
                    image_url: itemForm.image_url || undefined,
                    order_index: 999
                })
            }
            await loadData()
            setShowItemModal(false)
        } catch (err: any) {
            alert(err.message || 'Error al guardar ítem')
        }
    }

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm('¿Eliminar este elemento?')) return
        try {
            await deleteModuleItem(itemId)
            await loadData()
        } catch (err: any) {
            alert(err.message || 'Error al eliminar elemento')
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
                                onClick={() => navigate(`/admin/school/${centerId}`)}
                            >
                                ← Volver
                            </button>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <h1 style={{ margin: 0, fontSize: '2rem', color: 'white' }}>
                                {subject?.name}
                            </h1>
                            <p style={{ color: 'white', marginTop: '0.5rem', opacity: 0.8 }}>Contenido del Curso</p>
                        </div>
                        <div className="header-action-right" style={{ width: '150px', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button
                                className="btn-icon"
                                onClick={() => navigate(`/admin/school/${centerId}/grade/${gradeId}/course/${courseId}/edit`)}
                                title="Configuración del Curso"
                                style={{ background: 'rgba(31, 41, 90, 0.1)', padding: '0.8rem' }}
                            >
                                ⚙️
                            </button>
                            <button
                                className="btn-add"
                                onClick={handleCreateModule}
                            >
                                + Módulo
                            </button>
                        </div>
                    </div>

                    {/* PROFESSORS PANEL */}
                    <div style={{
                        background: 'rgba(108, 92, 231, 0.1)',
                        border: '1px solid rgba(108, 92, 231, 0.3)',
                        borderRadius: '12px',
                        padding: '1.25rem 1.5rem',
                        marginBottom: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        flexWrap: 'wrap'
                    }}>
                        <span style={{ color: '#c084fc', fontWeight: '600', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>👨‍🏫 Profesores:</span>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
                            {subjectProfessors.length === 0 ? (
                                <span style={{ color: 'white', fontSize: '0.9rem', fontStyle: 'italic' }}>Sin profesores asignados</span>
                            ) : (
                                subjectProfessors.map(prof => (
                                    <div key={prof.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        background: 'rgba(108, 92, 231, 0.25)',
                                        border: '1px solid rgba(108, 92, 231, 0.5)',
                                        borderRadius: '20px',
                                        padding: '0.3rem 0.75rem 0.3rem 0.4rem'
                                    }}>
                                        <div style={{
                                            width: '24px', height: '24px', borderRadius: '50%',
                                            background: '#6c5ce7', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', color: '#fff'
                                        }}>
                                            {(prof.full_name || prof.email || 'P').substring(0, 2).toUpperCase()}
                                        </div>
                                        <span style={{ fontSize: '0.875rem', color: '#d0d7f4ff' }}>{prof.full_name || prof.email}</span>
                                        <button
                                            onClick={() => handleUnassignProfessor(prof.id)}
                                            disabled={professorLoading}
                                            style={{
                                                background: 'transparent', border: 'none', color: '#1f295a', opacity: 0.5,
                                                cursor: 'pointer', fontSize: '0.8rem', padding: '0', lineHeight: 1,
                                                display: 'flex', alignItems: 'center'
                                            }}
                                            title="Desasignar"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <button
                            onClick={handleOpenProfessorModal}
                            disabled={professorLoading}
                            style={{
                                background: 'rgba(108, 92, 231, 0.3)', border: '1px dashed rgba(108, 92, 231, 0.6)',
                                color: '#c084fc', borderRadius: '20px', padding: '0.4rem 1rem',
                                cursor: 'pointer', fontSize: '0.875rem', whiteSpace: 'nowrap',
                                transition: 'all 0.2s'
                            }}
                        >
                            + Asignar Profesor
                        </button>
                    </div>

                    {/* Modules List */}
                    <div className="modules-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {modules.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem', color: '#1f295a', border: '2px dashed rgba(31, 41, 90, 0.3)', borderRadius: '1rem' }}>
                                <p>No hay módulos creados. Comienza agregando uno.</p>
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
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => handleEditModule(module)} className="btn-icon" style={{ background: 'rgba(31, 41, 90, 0.1)', color: '#1f295a' }}>✏️</button>
                                            <button onClick={() => handleDeleteModule(module.id)} className="btn-icon" style={{ background: 'rgba(31, 41, 90, 0.1)', color: '#1f295a' }}>🗑️</button>
                                        </div>
                                    </div>

                                    {/* Items List */}
                                    <div style={{ padding: '1rem' }}>
                                        {(module.items && module.items.length > 0) || (vrEntriesByModule[module.id] && vrEntriesByModule[module.id].length > 0) ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

                                                
    {/* VR Room rows */}
    {(vrEntriesByModule[module.id] || []).map(entry => (
        <div key={entry.id} style={{
            padding: '1rem',
            background: 'linear-gradient(135deg, #2d1b69 0%, #1a1040 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            color: '#ffffff',
            position: 'relative',
            border: '1px solid rgba(108,92,231,0.35)'
        }}>
            <div style={{ fontSize: '1.5rem' }}>🚀</div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 'bold' }}>{entry.title || 'Sala VR'}</div>
                {entry.description && <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{entry.description}</div>}
                <a href={entry.code} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#c4b5fd', marginTop: '0.25rem', letterSpacing: '0.1em' }}>Link: {entry.code}</a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <a
                    href={entry.code}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        padding: '0.3rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(196,181,253,0.5)',
                        background: 'rgba(108,92,231,0.2)', color: '#c4b5fd', fontSize: '0.8rem',
                        textDecoration: 'none', fontWeight: '600', whiteSpace: 'nowrap'
                    }}
                >
                    Ver 🔗
                </a>
                <button
                    onClick={() => handleOpenEditVrModal(entry)}
                    title="Editar"
                    style={{
                        width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                        background: 'rgba(255,255,255,0.12)', color: '#fff',
                        cursor: 'pointer', fontSize: '0.85rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    ✏️
                </button>
                <button
                    onClick={() => handleDeleteVrEntry(entry.id, module.id)}
                    title="Eliminar"
                    style={{
                        width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                        background: 'rgba(220,38,38,0.15)', color: '#f87171',
                        cursor: 'pointer', fontSize: '0.85rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    🗑️
                </button>
            </div>
        </div>
    ))}
    {module.items && module.items.map(item => (
        <div key={item.id} style={{
            padding: '1rem',
            background: '#1f295a',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            color: '#ffffff',
            position: 'relative'
        }}>
            <div style={{ fontSize: '1.5rem' }}>
                {item.type === 'pdf' ? '📄' : item.type === 'video' ? '🎥' : item.type === 'assignment' ? '📝' : '🔗'}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 'bold' }}>{item.title}</div>
                {item.description && <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{item.description}</div>}

                {/* Subtle visibility indicator, always visible, no action needed to read it */}
                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.35rem' }}>
                    <span style={{ fontSize: '0.72rem', color: item.show_student ? '#6ee7a8' : 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.show_student ? '#6ee7a8' : 'rgba(255,255,255,0.3)', display: 'inline-block' }} />
                        Estudiantes
                    </span>
                    <span style={{ fontSize: '0.72rem', color: item.show_teacher ? '#c4b5fd' : 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.show_teacher ? '#c4b5fd' : 'rgba(255,255,255,0.3)', display: 'inline-block' }} />
                        Profesores
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                    onClick={() => handleOpenEditItem(item)}
                    title="Editar"
                    style={{
                        width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                        background: 'rgba(255,255,255,0.12)', color: '#fff',
                        cursor: 'pointer', fontSize: '0.85rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    ✏️
                </button>

                <button
                    ref={el => { kebabRefs.current[item.id] = el }}
                    onClick={(e) => handleKebabClick(e, item.id)}
                    title="Más opciones"
                    style={{
                        width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                        background: openMenuItemId === item.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                        color: '#fff', cursor: 'pointer', fontSize: '1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    ⋮
                </button>
            </div>
        </div>
    ))}

</div>
                                        ) : (
                                            <p style={{ color: 'rgba(31, 41, 90, 0.5)', fontStyle: 'italic', padding: '1rem' }}>Sin contenido</p>
                                        )}

                                        <div style={{ marginTop: '1rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => handleAddItem(module.id)}
                                                style={{
                                                    background: 'transparent',
                                                    border: '1px dashed rgba(31, 41, 90, 0.5)',
                                                    color: '#1f295a',
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                + Agregar contenido
                                            </button>
                                            <button
                                                onClick={() => handleOpenAddVrModal(module.id)}
                                                style={{
                                                    background: 'rgba(108,92,231,0.08)',
                                                    border: '1px dashed rgba(108,92,231,0.5)',
                                                    color: '#6c5ce7',
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🥽 Agregar sala
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>


            {/* MODULE MODAL */}
            {showModuleModal && (
                <div className="modal-overlay" onClick={() => setShowModuleModal(false)}>
                    <div className="school-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingModule ? 'Editar Módulo' : 'Nuevo Módulo'}</h2>
                        </div>
                        <div className="form-group">
                            <label>Nombre del Módulo (Ej: Tema 1)</label>
                            <input
                                type="text"
                                className="modern-input"
                                value={moduleForm.title}
                                onChange={e => setModuleForm({ ...moduleForm, title: e.target.value })}
                                autoFocus
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn-cancel-modern" onClick={() => setShowModuleModal(false)}>Cancelar</button>
                            <button className="btn-save-modern" onClick={handleSaveModule}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ITEM MODAL */}
            {showItemModal && (
                <div className="modal-overlay" onClick={() => setShowItemModal(false)}>
                    <div className="school-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Agregar Contenido</h2>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Tipo</label>
                                <select
                                    className="modern-input"
                                    value={itemForm.type}
                                    onChange={e => setItemForm({ ...itemForm, type: e.target.value as any })}
                                >
                                    <option value="pdf">Documento PDF</option>
                                    <option value="video">Video</option>
                                    <option value="link">Enlace</option>
                                    <option value="assignment">Tarea</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Título</label>
                                <input
                                    type="text"
                                    className="modern-input"
                                    value={itemForm.title}
                                    onChange={e => setItemForm({ ...itemForm, title: e.target.value })}
                                />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Descripción</label>
                                <textarea
                                    className="modern-input"
                                    value={itemForm.description}
                                    onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                                />
                            </div>
                            {itemForm.type === 'pdf' ? (
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label>Archivo PDF</label>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        className="modern-input"
                                        onChange={e => {
                                            if (e.target.files && e.target.files[0]) {
                                                setSelectedFile(e.target.files[0])
                                                // Auto-set title if empty
                                                if (!itemForm.title) {
                                                    setItemForm({ ...itemForm, title: e.target.files[0].name.replace('.pdf', '') })
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label>URL del Contenido</label>
                                    <input
                                        type="text"
                                        className="modern-input"
                                        value={itemForm.content_url}
                                        onChange={e => setItemForm({ ...itemForm, content_url: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                            )}
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>URL de Imagen <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional)</span></label>
                                <input
                                    type="text"
                                    className="modern-input"
                                    value={itemForm.image_url}
                                    onChange={e => setItemForm({ ...itemForm, image_url: e.target.value })}
                                    placeholder="https://... (imagen de portada)"
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-cancel-modern" onClick={() => setShowItemModal(false)}>Cancelar</button>
                            <button className="btn-save-modern" onClick={handleSaveItem}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {openMenuItemId && menuPosition && createPortal(
    <div
        ref={menuRef}
        style={{
            position: 'fixed',
            top: menuPosition.top,
            left: menuPosition.left,
            zIndex: 9999,
            background: '#ffffff',
            borderRadius: '8px',
            minWidth: '220px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.08)'
        }}
    >
        {/* find the open item to read its current state */}
        {(() => {
            const item = modules.flatMap(m => m.items ?? []).find(i => i.id === openMenuItemId)
            if (!item) return null
            return (
                <>
                    <button
                        onClick={() => { handleToggleStudentVisibility(item); setOpenMenuItemId(null); setMenuPosition(null) }}
                        disabled={visibilityLoading === item.id}
                        style={{ width: '100%', padding: '0.65rem 0.9rem', background: 'transparent', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: '#1f295a', fontSize: '0.875rem' }}
                        onMouseOver={e => (e.currentTarget.style.background = 'rgba(31,41,90,0.06)')}
                        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        <span>Visible para estudiantes</span>
                        <Toggle on={item.show_student!} color="#22c55e" />
                    </button>

                    <button
                        onClick={() => { handleToggleProfessorVisibility(item); setOpenMenuItemId(null); setMenuPosition(null) }}
                        disabled={visibilityLoading === item.id}
                        style={{ width: '100%', padding: '0.65rem 0.9rem', background: 'transparent', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: '#1f295a', fontSize: '0.875rem' }}
                        onMouseOver={e => (e.currentTarget.style.background = 'rgba(31,41,90,0.06)')}
                        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        <span>Visible para profesores</span>
                        <Toggle on={item.show_teacher!} color="#8b5cf6" />
                    </button>

                    {item.content_url && (
                        <>
                            <div style={{ height: '1px', background: 'rgba(31,41,90,0.1)' }} />
                            <a
                                href={item.content_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => { setOpenMenuItemId(null); setMenuPosition(null) }}
                                style={{ width: '100%', padding: '0.65rem 0.9rem', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#1f295a', fontSize: '0.875rem', textDecoration: 'none' }}
                            >
                                ⬇️ Descargar
                            </a>
                        </>
                    )}

                    <div style={{ height: '1px', background: 'rgba(31,41,90,0.1)' }} />

                    <button
                        onClick={() => { setOpenMenuItemId(null); setMenuPosition(null); handleDeleteItem(item.id) }}
                        style={{ width: '100%', padding: '0.65rem 0.9rem', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#dc2626', fontSize: '0.875rem' }}
                        onMouseOver={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.06)')}
                        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        🗑️ Eliminar
                    </button>
                </>
            )
        })()}
    </div>,
    document.body
)}

{showEditItemModal && editingItem && (
    <div className="modal-overlay" onClick={() => setShowEditItemModal(false)}>
        <div className="school-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <h2>Editar Contenido</h2>
            </div>
            <div className="form-grid">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Título</label>
                    <input
                        type="text"
                        className="modern-input"
                        value={editItemForm.title}
                        onChange={e => setEditItemForm({ ...editItemForm, title: e.target.value })}
                        autoFocus
                    />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Descripción</label>
                    <textarea
                        className="modern-input"
                        value={editItemForm.description}
                        onChange={e => setEditItemForm({ ...editItemForm, description: e.target.value })}
                    />
                </div>
                {editingItem.type !== 'pdf' && (
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label>URL del Contenido</label>
                        <input
                            type="text"
                            className="modern-input"
                            value={editItemForm.content_url}
                            onChange={e => setEditItemForm({ ...editItemForm, content_url: e.target.value })}
                            placeholder="https://..."
                        />
                    </div>
                )}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>URL de Imagen <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional)</span></label>
                    <input
                        type="text"
                        className="modern-input"
                        value={editItemForm.image_url}
                        onChange={e => setEditItemForm({ ...editItemForm, image_url: e.target.value })}
                        placeholder="https://... (imagen de portada)"
                    />
                </div>
            </div>
            <div className="modal-actions">
                <button className="btn-cancel-modern" onClick={() => setShowEditItemModal(false)}>Cancelar</button>
                <button className="btn-save-modern" onClick={handleSaveEditItem}>Guardar</button>
            </div>
        </div>
    </div>
)}

{showVrModal && (
    <div className="modal-overlay" onClick={() => { if (!vrLoading) { setShowVrModal(false) } }}>
        <div className="school-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>

            {/* Header */}
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🥽</span>
                <h2 style={{ margin: 0 }}>
                    {vrEditingEntry ? 'Editar Sala VR' : 'Nueva Sala VR'}
                </h2>
            </div>

            {vrLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6c5ce7' }}>
                    <div className="loading-spinner" />
                </div>
            ) : (
                <>
                    <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                        <div className="form-group">
                            <label>
                                Link de la Sala
                            </label>
                            <input
                                type="text"
                                className="modern-input"
                                value={vrForm.code}
                                onChange={e => setVrForm({ ...vrForm, code: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="form-group">
                            <label>Título <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional)</span></label>
                            <input
                                type="text"
                                className="modern-input"
                                value={vrForm.title}
                                onChange={e => setVrForm({ ...vrForm, title: e.target.value })}
                                placeholder="Ej: Sala de Exploración"
                            />
                        </div>
                        <div className="form-group">
                            <label>Descripción <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional)</span></label>
                            <textarea
                                className="modern-input"
                                value={vrForm.description}
                                onChange={e => setVrForm({ ...vrForm, description: e.target.value })}
                                placeholder="Descripción breve de la sala..."
                                style={{ minHeight: '80px' }}
                            />
                        </div>
                        <div className="form-group">
                            <label>
                                URL de Imagen
                                <span style={{ fontWeight: 400, opacity: 0.6, marginLeft: '0.4rem' }}>(opcional)</span>
                            </label>
                            <input
                                type="text"
                                className="modern-input"
                                value={vrForm.image_url}
                                onChange={e => setVrForm({ ...vrForm, image_url: e.target.value })}
                                placeholder="https://... (preview de la sala)"
                            />
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button
                            className="btn-cancel-modern"
                            onClick={() => { setShowVrModal(false); setVrEditingEntry(null); setVrForm({ code: '', image_url: '', title: '', description: '' }) }}
                            disabled={vrLoading}
                        >Cancelar</button>
                        <button
                            className="btn-save-modern"
                            onClick={vrEditingEntry ? handleUpdateVrCode : handleAddVrCode}
                            disabled={vrLoading}
                        >Guardar</button>
                    </div>
                </>
            )}
        </div>
    </div>
)}
            {/* PROFESSOR ASSIGNMENT MODAL */}
            {showProfessorModal && (
                <div className="modal-overlay" onClick={() => setShowProfessorModal(false)}>
                    <div className="school-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
                        <div className="modal-header">
                            <div className="modal-icon">👨‍🏫</div>
                            <h2>Asignar Profesor a la Materia</h2>
                        </div>
                        <div style={{ padding: '0 0 1rem 0' }}>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
                                Selecciona un profesor del centro para asignarlo a esta materia.
                            </p>
                            {professorLoading ? (
                                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '2rem' }}>Cargando...</p>
                            ) : centerProfessors.filter(p => !subjectProfessors.some(sp => sp.id === p.id)).length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '2rem', fontStyle: 'italic' }}>
                                    {centerProfessors.length === 0
                                        ? 'No hay profesores asignados al centro todavía.'
                                        : 'Todos los profesores del centro ya están asignados a esta materia.'}
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                                    {centerProfessors
                                        .filter(p => !subjectProfessors.some(sp => sp.id === p.id))
                                        .map(prof => (
                                            <div key={prof.id} style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.04)',
                                                borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{
                                                        width: '36px', height: '36px', borderRadius: '50%',
                                                        background: '#6c5ce7', display: 'flex', alignItems: 'center',
                                                        justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '0.85rem'
                                                    }}>
                                                        {(prof.full_name || prof.email || 'P').substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '500', color: '#fff' }}>{prof.full_name || 'Sin nombre'}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{prof.email}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAssignProfessor(prof.id)}
                                                    disabled={professorLoading}
                                                    style={{
                                                        background: '#6c5ce7', color: '#fff', border: 'none',
                                                        borderRadius: '6px', padding: '0.4rem 0.9rem',
                                                        cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500'
                                                    }}
                                                >
                                                    Asignar
                                                </button>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                        <div className="modal-actions">
                            <button className="btn-cancel-modern" onClick={() => setShowProfessorModal(false)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CourseContentScreen
