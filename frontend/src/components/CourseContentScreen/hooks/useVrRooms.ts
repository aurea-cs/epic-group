import { useState } from 'react'
import {
    addModuleVrCode,
    updateModuleVrCode,
    deleteModuleVrCode,
    type VrCodeEntry,
} from '../../../lib/adminApi'

interface VrForm {
    code: string
    image_url: string
    title: string
    description: string
}

const emptyForm: VrForm = { code: '', image_url: '', title: '', description: '' }

export function useVrRooms(
    vrEntriesByModule: Record<string, VrCodeEntry[]>,
    setVrEntriesByModule: React.Dispatch<React.SetStateAction<Record<string, VrCodeEntry[]>>>
) {
    const [showModal, setShowModal] = useState(false)
    const [vrModuleId, setVrModuleId] = useState<string | null>(null)
    const [editingEntry, setEditingEntry] = useState<VrCodeEntry | null>(null)
    const [vrForm, setVrForm] = useState<VrForm>(emptyForm)
    const [vrLoading, setVrLoading] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState<VrCodeEntry | null>(null)

    const openAdd = (moduleId: string) => {
        setVrModuleId(moduleId)
        setEditingEntry(null)
        setVrForm(emptyForm)
        setShowModal(true)
    }

    const openEdit = (entry: VrCodeEntry) => {
        setVrModuleId(entry.module_id)
        setEditingEntry(entry)
        setVrForm({
            code: entry.code,
            image_url: entry.image_url || '',
            title: entry.title || '',
            description: entry.description || '',
        })
        setShowModal(true)
    }

    const closeModal = () => {
        if (vrLoading) return
        setShowModal(false)
        setEditingEntry(null)
        setVrForm(emptyForm)
    }

    const save = async () => {
        if (!vrModuleId) return
        try {
            setVrLoading(true)
            if (editingEntry) {
                const updated = await updateModuleVrCode(
                    editingEntry.id,
                    vrForm.code.trim(),
                    vrForm.image_url.trim() || undefined,
                    vrForm.title.trim() || undefined,
                    vrForm.description.trim() || undefined
                )
                setVrEntriesByModule(prev => ({
                    ...prev,
                    [vrModuleId]: (prev[vrModuleId] || []).map(e =>
                        e.id === updated.id ? updated : e
                    ),
                }))
            } else {
                const newEntry = await addModuleVrCode(
                    vrModuleId,
                    vrForm.code.trim(),
                    vrForm.image_url.trim() || undefined,
                    vrForm.title.trim() || undefined,
                    vrForm.description.trim() || undefined
                )
                setVrEntriesByModule(prev => ({
                    ...prev,
                    [vrModuleId]: [...(prev[vrModuleId] || []), newEntry],
                }))
            }
            closeModal()
        } catch (err: any) {
            alert(err.message || 'Error al guardar código VR')
        } finally {
            setVrLoading(false)
        }
    }

    const remove = async (entryId: string, moduleId: string) => {
        try {
            setVrLoading(true)
            await deleteModuleVrCode(entryId)
            setVrEntriesByModule(prev => ({
                ...prev,
                [moduleId]: (prev[moduleId] || []).filter(e => e.id !== entryId),
            }))
        } catch (err: any) {
            alert(err.message || 'Error al eliminar código VR')
        } finally {
            setVrLoading(false)
            setConfirmDelete(null)
        }
    }

    return {
        showModal,
        vrForm,
        setVrForm,
        vrLoading,
        editingEntry,
        confirmDelete,
        setConfirmDelete,
        openAdd,
        openEdit,
        closeModal,
        save,
        remove,
    }
}