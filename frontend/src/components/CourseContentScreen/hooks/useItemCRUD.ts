import { useState } from 'react'
import {
    createModuleItem,
    uploadModuleItem,
    deleteModuleItem,
    updateModuleItem,
    toggleItemVisibility,
    toggleItemVisibilityProfessor,
    type ModuleItem,
} from '../../../lib/adminApi'

type ItemType = 'pdf' | 'video' | 'link'

interface ItemForm {
    type: ItemType
    title: string
    description: string
    content_url: string
    image_url: string
    is_editable: boolean
}

interface EditItemForm {
    title: string
    description: string
    content_url: string
    image_url: string
    is_editable: boolean
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
            is_editable: true,
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
                    is_editable: itemForm.is_editable,
                })
            } else {
                await createModuleItem(activeModuleId, {
                    ...itemForm,
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
            is_editable: !!item.is_editable,
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
                is_editable: editItemForm.is_editable,
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

    const toggleStudentVisibility = async (item: ModuleItem) => {
        try {
            setVisibilityLoading(item.id)
            await toggleItemVisibility(item.id, !item.show_student)
            await onSuccess()
        } catch (err: any) {
            alert(err.message || 'Error al cambiar visibilidad para estudiantes')
        } finally {
            setVisibilityLoading(null)
        }
    }

    const toggleProfessorVisibility = async (item: ModuleItem) => {
        try {
            setVisibilityLoading(item.id)
            await toggleItemVisibilityProfessor(item.id, !item.show_teacher)
            await onSuccess()
        } catch (err: any) {
            alert(err.message || 'Error al cambiar visibilidad para profesores')
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