import { useState } from 'react'
import {
    getCenterProfessors,
    assignSubjectProfessor,
    unassignSubjectProfessor,
    getSubjectProfessors,
} from '../../../lib/adminApi'

export function useProfessorAssignment(
    centerId: string | undefined,
    courseId: string | undefined,
    subjectProfessors: any[],
    setSubjectProfessors: (profs: any[]) => void
) {
    const [showModal, setShowModal] = useState(false)
    const [centerProfessors, setCenterProfessors] = useState<any[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [loading, setLoading] = useState(false)

    const openModal = async () => {
        setSelectedIds([])
        if (!centerId) return
        try {
            setLoading(true)
            const data = await getCenterProfessors(centerId)
            setCenterProfessors(data)
        } catch (err: any) {
            console.error('Error loading center professors:', err)
        } finally {
            setLoading(false)
        }
        setShowModal(true)
    }

    const toggleSelect = (profId: string) => {
        setSelectedIds(prev =>
            prev.includes(profId) ? prev.filter(id => id !== profId) : [...prev, profId]
        )
    }

    const toggleSelectAll = (availableProfs: any[]) => {
        if (selectedIds.length === availableProfs.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(availableProfs.map(p => p.id))
        }
    }

    const assign = async (userIds?: string | string[]) => {
        if (!courseId) return
        const idsToAssign = userIds
            ? Array.isArray(userIds) ? userIds : [userIds]
            : selectedIds

        if (idsToAssign.length === 0) return

        try {
            setLoading(true)
            await assignSubjectProfessor(courseId, idsToAssign)
            const updated = await getSubjectProfessors(courseId)
            setSubjectProfessors(updated)
            setSelectedIds([])
            setShowModal(false)
        } catch (err: any) {
            alert(err.message || 'Error al asignar profesor(es)')
        } finally {
            setLoading(false)
        }
    }

    const unassign = async (userId: string) => {
        if (!courseId || !confirm('¿Desasignar este profesor de la materia?')) return
        try {
            setLoading(true)
            await unassignSubjectProfessor(courseId, userId)
            const updated = await getSubjectProfessors(courseId)
            setSubjectProfessors(updated)
        } catch (err: any) {
            alert(err.message || 'Error al desasignar profesor')
        } finally {
            setLoading(false)
        }
    }

    const availableProfessors = centerProfessors.filter(
        p => !subjectProfessors.some(sp => sp.id === p.id)
    )

    return {
        showModal,
        setShowModal,
        centerProfessors,
        availableProfessors,
        selectedIds,
        setSelectedIds,
        loading,
        openModal,
        toggleSelect,
        toggleSelectAll,
        assign,
        unassign,
    }
}