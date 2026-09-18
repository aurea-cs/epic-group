import { useState } from 'react'
import {
    createCourseModule,
    updateCourseModule,
    deleteCourseModule,
    type CourseModule,
} from '../../../lib/adminApi'

export function useModuleCRUD(courseId: string | undefined, onSuccess: () => Promise<void>) {
    const [showModal, setShowModal] = useState(false)
    const [editingModule, setEditingModule] = useState<CourseModule | null>(null)
    const [moduleForm, setModuleForm] = useState<{ title: string; curriculum_module_id?: string | null }>({
        title: '',
        curriculum_module_id: null,
    })
    const [confirmDelete, setConfirmDelete] = useState<CourseModule | null>(null)

    const openCreate = (_currentCount: number) => {
        setEditingModule(null)
        setModuleForm({ title: '', curriculum_module_id: null })
        setShowModal(true)
    }

    const openEdit = (module: CourseModule) => {
        setEditingModule(module)
        setModuleForm({ title: module.title, curriculum_module_id: module.curriculum_module_id || null })
        setShowModal(true)
    }

    const save = async (currentModulesCount: number) => {
        if (!courseId) return
        try {
            if (editingModule) {
                const payload = {
                    title: moduleForm.title,
                    curriculum_module_id: moduleForm.curriculum_module_id || null,
                }
                console.log('[ModuleCRUD] Updating module', editingModule.id, 'with payload:', payload)
                await updateCourseModule(editingModule.id, payload)
            } else {
                const cmId = moduleForm.curriculum_module_id || null
                console.log('[ModuleCRUD] Creating module in course', courseId, 'curriculum_module_id:', cmId)
                await createCourseModule(
                    courseId,
                    moduleForm.title,
                    currentModulesCount,
                    cmId
                )
            }
            await onSuccess()
            setShowModal(false)
        } catch (err: any) {
            console.error('[ModuleCRUD] Save error:', err)
            alert(err.message || 'Error al guardar módulo')
        }
    }

    const remove = async (moduleId: string) => {
        try {
            await deleteCourseModule(moduleId)
            await onSuccess()
        } catch (err: any) {
            alert(err.message || 'Error al eliminar módulo')
        }
        setConfirmDelete(null)
    }

    return {
        showModal,
        setShowModal,
        editingModule,
        moduleForm,
        setModuleForm,
        confirmDelete,
        setConfirmDelete,
        openCreate,
        openEdit,
        save,
        remove,
    }
}