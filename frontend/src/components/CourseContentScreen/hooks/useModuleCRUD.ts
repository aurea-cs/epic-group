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
    const [moduleForm, setModuleForm] = useState({ title: '' })
    const [confirmDelete, setConfirmDelete] = useState<CourseModule | null>(null)

    const openCreate = (_currentCount: number) => {
        setEditingModule(null)
        setModuleForm({ title: '' })
        setShowModal(true)
    }

    const openEdit = (module: CourseModule) => {
        setEditingModule(module)
        setModuleForm({ title: module.title })
        setShowModal(true)
    }

    const save = async (currentModulesCount: number) => {
        if (!courseId) return
        try {
            if (editingModule) {
                await updateCourseModule(editingModule.id, { title: moduleForm.title })
            } else {
                await createCourseModule(courseId, moduleForm.title, currentModulesCount)
            }
            await onSuccess()
            setShowModal(false)
        } catch (err: any) {
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