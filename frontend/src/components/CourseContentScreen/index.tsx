import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import ConfirmModal from '../general/ConfirmModal'
import '../HierarchyConfig.css'

// API
import { reorderModuleItems, reorderModuleVrCodes } from '../../lib/adminApi'

// Hooks
import { useCourseContent } from './hooks/useCourseContent'
import { useModuleCRUD } from './hooks/useModuleCRUD'
import { useItemCRUD } from './hooks/useItemCRUD'
import { useVrRooms } from './hooks/useVrRooms'
import { useProfessorAssignment } from './hooks/useProfessorAssignment'
import { useItemMenu } from './hooks/useItemMenu'

// Components
import ProfessorsPanel from './components/ProfessorsPanel'
import ModuleCard from './components/ModuleCard'
import ModuleModal from './components/ModuleModal'
import ItemModal from './components/ItemModal'
import EditItemModal from './components/EditItemModal'
import VrModal from './components/VrModal'
import ProfessorAssignModal from './components/ProfessorAssignModal'
import ItemActionsMenu from './components/ItemActionsMenu'

interface CourseContentScreenProps {
    user: User
}

const CourseContentScreen: React.FC<CourseContentScreenProps> = () => {
    const { centerId, gradeId, courseId } = useParams<{
        centerId: string
        gradeId: string
        courseId: string
    }>()
    const navigate = useNavigate()

    // ── Data & state ──────────────────────────────────────────────────────────
    const content = useCourseContent(courseId)

    const moduleCRUD = useModuleCRUD(courseId, content.load)

    const itemCRUD = useItemCRUD(content.load)

    const vr = useVrRooms(content.vrEntriesByModule, content.setVrEntriesByModule)

    const professors = useProfessorAssignment(
        centerId,
        courseId,
        content.subjectProfessors,
        content.setSubjectProfessors
    )

    const menu = useItemMenu()

    // ── Bootstrap ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (courseId) content.load()
    }, [courseId])

    // ── Loading guard ─────────────────────────────────────────────────────────
    if (content.loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
            </div>
        )
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="course-content-screen">
            <div className="hierarchy-config course-content-config" style={{ padding: '2rem 4rem' }}>
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
                                {content.subject?.name}
                            </h1>
                            <p style={{ color: 'white', marginTop: '0.5rem', opacity: 0.8 }}>
                                Contenido de la Materia
                            </p>
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
                        </div>
                    </div>

                    {/* Professors */}
                    <ProfessorsPanel
                        professors={content.subjectProfessors}
                        loading={professors.loading}
                        onOpenModal={professors.openModal}
                        onUnassign={professors.unassign}
                    />

                    {/* New module button */}
                    <button
                        className="btn-add"
                        onClick={() => moduleCRUD.openCreate(content.modules.length)}
                        style={{ marginBottom: '1rem', marginLeft: 'auto', display: 'block' }}
                    >
                        Nuevo Módulo
                    </button>

                    {/* Modules */}
                    <div className="modules-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {content.modules.length === 0 ? (
                            <div style={{
                                textAlign: 'center', padding: '4rem', color: '#fff',
                                border: '2px dashed rgba(31, 41, 90, 0.3)', borderRadius: '1rem',
                            }}>
                                <p>No hay módulos creados. Comienza agregando uno.</p>
                            </div>
                        ) : (
                            content.modules.map(module => (
                                <ModuleCard
                                    key={module.id}
                                    module={module}
                                    vrEntries={content.vrEntriesByModule[module.id] ?? []}
                                    openMenuItemId={menu.openMenuItemId}
                                    kebabRefs={menu.kebabRefs}
                                    onEditModule={moduleCRUD.openEdit}
                                    onDeleteModule={moduleCRUD.setConfirmDelete}
                                    onAddItem={itemCRUD.openAdd}
                                    onEditItem={item => { menu.closeMenu(); itemCRUD.openEdit(item) }}
                                    onKebabClick={menu.handleKebabClick}
                                    onAddVr={vr.openAdd}
                                    onEditVr={vr.openEdit}
                                    onDeleteVr={vr.setConfirmDelete}
                                    onReorderItems={reorderModuleItems}
                                    onReorderVr={reorderModuleVrCodes}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ── Modals ─────────────────────────────────────────────────────────── */}

            {moduleCRUD.showModal && (
                <ModuleModal
                    editingModule={moduleCRUD.editingModule}
                    moduleForm={moduleCRUD.moduleForm}
                    modulesCount={content.modules.length}
                    onFormChange={moduleCRUD.setModuleForm}
                    onSave={moduleCRUD.save}
                    onClose={() => moduleCRUD.setShowModal(false)}
                />
            )}

            {itemCRUD.showAddModal && (
                <ItemModal
                    itemForm={itemCRUD.itemForm}
                    saving={itemCRUD.saving}
                    onFormChange={itemCRUD.setItemForm}
                    onFileChange={itemCRUD.setSelectedFile}
                    onSave={itemCRUD.saveNew}
                    onClose={() => itemCRUD.setShowAddModal(false)}
                />
            )}

            {itemCRUD.showEditModal && itemCRUD.editingItem && (
                <EditItemModal
                    editingItem={itemCRUD.editingItem}
                    editItemForm={itemCRUD.editItemForm}
                    saving={itemCRUD.saving}
                    onFormChange={itemCRUD.setEditItemForm}
                    onSave={itemCRUD.saveEdit}
                    onClose={() => { itemCRUD.setShowEditModal(false); itemCRUD.setEditingItem(null) }}
                />
            )}

            {vr.showModal && (
                <VrModal
                    editingEntry={vr.editingEntry}
                    vrForm={vr.vrForm}
                    vrLoading={vr.vrLoading}
                    onFormChange={vr.setVrForm}
                    onSave={vr.save}
                    onClose={vr.closeModal}
                />
            )}

            {professors.showModal && (
                <ProfessorAssignModal
                    availableProfessors={professors.availableProfessors}
                    allCenterProfessors={professors.centerProfessors}
                    selectedIds={professors.selectedIds}
                    loading={professors.loading}
                    onToggleSelect={professors.toggleSelect}
                    onToggleSelectAll={professors.toggleSelectAll}
                    onAssign={professors.assign}
                    onClose={() => { professors.setShowModal(false); professors.setSelectedIds([]) }}
                />
            )}

            {/* Kebab portal menu */}
            <ItemActionsMenu
                openMenuItemId={menu.openMenuItemId}
                menuPosition={menu.menuPosition}
                menuRef={menu.menuRef}
                modules={content.modules}
                visibilityLoading={itemCRUD.visibilityLoading}
                onToggleStudent={itemCRUD.toggleStudentVisibility}
                onToggleProfessor={itemCRUD.toggleProfessorVisibility}
                onDelete={itemCRUD.setConfirmDelete}
                onClose={menu.closeMenu}
            />

            {/* ── Confirm dialogs ─────────────────────────────────────────────────── */}

            {moduleCRUD.confirmDelete && (
                <ConfirmModal
                    title="Eliminar módulo"
                    message={`¿Estás seguro de eliminar el módulo "${moduleCRUD.confirmDelete.title}"?`}
                    confirmLabel="Sí, eliminar"
                    cancelLabel="Cancelar"
                    danger
                    onConfirm={() => moduleCRUD.remove(moduleCRUD.confirmDelete!.id)}
                    onCancel={() => moduleCRUD.setConfirmDelete(null)}
                />
            )}

            {itemCRUD.confirmDelete && (
                <ConfirmModal
                    title="Eliminar elemento"
                    message={`¿Estás seguro de eliminar el elemento "${itemCRUD.confirmDelete.title}"?`}
                    confirmLabel="Sí, eliminar"
                    cancelLabel="Cancelar"
                    danger
                    onConfirm={() => itemCRUD.remove(itemCRUD.confirmDelete!.id)}
                    onCancel={() => itemCRUD.setConfirmDelete(null)}
                />
            )}

            {vr.confirmDelete && (
                <ConfirmModal
                    title="Eliminar Sala VR"
                    message={`¿Estás seguro de eliminar la Sala VR "${vr.confirmDelete.title}"?`}
                    confirmLabel="Sí, eliminar"
                    cancelLabel="Cancelar"
                    danger
                    onConfirm={() => vr.remove(vr.confirmDelete!.id, vr.confirmDelete!.module_id)}
                    onCancel={() => vr.setConfirmDelete(null)}
                />
            )}
        </div>
    )
}

export default CourseContentScreen