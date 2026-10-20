import { useState } from 'react'
import {
    createModuleItem,
    uploadModuleItem,
    deleteModuleItem,
    updateModuleItem,
    setItemAudience,
    type ModuleItem,
} from '../../../lib/adminApi'

type ItemType = 'pdf' | 'video' | 'link'
type AudienceType = 'student' | 'teacher'

interface ItemForm {
    type: ItemType
    title: string
    description: string
    content_url: string
    image_url: string
    is_editable: boolean
    audience: AudienceType
}

interface EditItemForm {
    title: string
    description: string
    content_url: string
    image_url: string
    is_editable: boolean
    audience: AudienceType
}

export function useItemCRUD(onSuccess: () => Promise<void>) {
    // Add item state
    const [showAddModal, setShowAddModal] = useState(false)
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
    const [itemForm, setItemForm] = useState<ItemForm>({
        type: 'pdf',
        title: '',
        description: '',
        content_url: '',
        image_url: '',
        is_editable: false,
        audience: 'student',
    })
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [saving, setSaving] = useState(false)

    // Edit item state
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingItem, setEditingItem] = useState<ModuleItem | null>(null)
    const [editItemForm, setEditItemForm] = useState<EditItemForm>({
        title: '',
        description: '',
        content_url: '',
        image_url: '',
        is_editable: false,
        audience: 'student',
    })

    // Delete confirm state
    const [confirmDelete, setConfirmDelete] = useState<ModuleItem | null>(null)

    // Visibility loading state
    const [visibilityLoading, setVisibilityLoading] = useState<string | null>(null)

    const openAdd = (moduleId: string) => {
        setActiveModuleId(moduleId)
        setItemForm({
            type: 'pdf',
            title: '',
            description: '',
            content_url: '',
            image_url: '',
            is_editable: false,
            audience: 'student',
        })
        setSelectedFile(null)
        setShowAddModal(true)
    }

    const saveNew = async () => {
        if (!activeModuleId) return
        setSaving(true)
        try {
            if (itemForm.type === 'pdf' && selectedFile) {
                await uploadModuleItem(activeModuleId, selectedFile, {
                    title: itemForm.title,
                    description: itemForm.description,
                    order_index: 999,
                    is_editable: false,
                    audience: itemForm.audience,
                })
            } else {
                await createModuleItem(activeModuleId, {
                    ...itemForm,
                    is_editable: false,
                    image_url: itemForm.image_url || undefined,
                    order_index: 999,
                })
            }
            await onSuccess()
            setShowAddModal(false)
        } catch (err: any) {
            alert(err.message || 'Error al guardar ítem')
        } finally {
            setSaving(false)
        }
    }

    const openEdit = (item: ModuleItem) => {
        setEditingItem(item)
        setEditItemForm({
            title: item.title,
            description: item.description || '',
            content_url: item.content_url || '',
            image_url: item.image_url || '',
            is_editable: false,
            audience: item.show_teacher && !item.show_student ? 'teacher' : 'student',
        })
        setShowEditModal(true)
    }

    const saveEdit = async () => {
        if (!editingItem) return
        setSaving(true)
        try {
            await updateModuleItem(editingItem.id, {
                title: editItemForm.title,
                description: editItemForm.description,
                content_url: editItemForm.content_url,
                image_url: editItemForm.image_url || undefined,
                is_editable: false,
                audience: editItemForm.audience,
            })
            await onSuccess()
            setShowEditModal(false)
            setEditingItem(null)
        } catch (err: any) {
            alert(err.message || 'Error al guardar cambios')
        } finally {
            setSaving(false)
        }
    }

    const remove = async (itemId: string) => {
        try {
            await deleteModuleItem(itemId)
            await onSuccess()
        } catch (err: any) {
            alert(err.message || 'Error al eliminar elemento')
        }
        setConfirmDelete(null)
    }

    /** Flip the item's audience: if currently student → teacher, otherwise → student. */
    const toggleStudentVisibility = async (item: ModuleItem) => {
        const next = item.show_student ? 'teacher' : 'student'
        try {
            setVisibilityLoading(item.id)
            await setItemAudience(item.id, next)
            await onSuccess()
        } catch (err: any) {
            alert(err.message || 'Error al cambiar audiencia del elemento')
        } finally {
            setVisibilityLoading(null)
        }
    }

    /** Flip the item's audience: if currently teacher → student, otherwise → teacher. */
    const toggleProfessorVisibility = async (item: ModuleItem) => {
        const next = item.show_teacher ? 'student' : 'teacher'
        try {
            setVisibilityLoading(item.id)
            await setItemAudience(item.id, next)
            await onSuccess()
        } catch (err: any) {
            alert(err.message || 'Error al cambiar audiencia del elemento')
        } finally {
            setVisibilityLoading(null)
        }
    }

    return {
        // Add
        showAddModal,
        setShowAddModal,
        activeModuleId,
        itemForm,
        setItemForm,
        selectedFile,
        setSelectedFile,
        saving,
        openAdd,
        saveNew,
        // Edit
        showEditModal,
        setShowEditModal,
        editingItem,
        setEditingItem,
        editItemForm,
        setEditItemForm,
        saveEdit,
        openEdit,
        // Delete
        confirmDelete,
        setConfirmDelete,
        remove,
        // Visibility
        visibilityLoading,
        toggleStudentVisibility,
        toggleProfessorVisibility,
    }
}