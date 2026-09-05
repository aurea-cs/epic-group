import { useState, useCallback } from 'react'
import {
    getSubjectById,
    getCourseModules,
    getSubjectProfessors,
    getModuleVrCode,
    type Subject,
    type CourseModule,
    type VrCodeEntry,
} from '../../../lib/adminApi'

export function useCourseContent(courseId: string | undefined) {
    const [subject, setSubject] = useState<Subject | null>(null)
    const [modules, setModules] = useState<CourseModule[]>([])
    const [subjectProfessors, setSubjectProfessors] = useState<any[]>([])
    const [vrEntriesByModule, setVrEntriesByModule] = useState<Record<string, VrCodeEntry[]>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        if (!courseId) return
        try {
            setLoading(true)
            const [subjectData, modulesData, professorsData] = await Promise.all([
                getSubjectById(courseId),
                getCourseModules(courseId),
                getSubjectProfessors(courseId),
            ])
            setSubject(subjectData)
            setModules(modulesData)
            setSubjectProfessors(professorsData)

            const vrMap: Record<string, VrCodeEntry[]> = {}
            await Promise.all(
                modulesData.map(async (m) => {
                    vrMap[m.id] = await getModuleVrCode(m.id)
                })
            )
            setVrEntriesByModule(vrMap)
        } catch (err: any) {
            setError(err.message || 'Error al cargar datos del curso')
        } finally {
            setLoading(false)
        }
    }, [courseId])

    const reloadProfessors = useCallback(async () => {
        if (!courseId) return
        const updated = await getSubjectProfessors(courseId)
        setSubjectProfessors(updated)
    }, [courseId])

    return {
        subject,
        modules,
        subjectProfessors,
        setSubjectProfessors,
        vrEntriesByModule,
        setVrEntriesByModule,
        loading,
        error,
        load,
        reloadProfessors,
    }
}