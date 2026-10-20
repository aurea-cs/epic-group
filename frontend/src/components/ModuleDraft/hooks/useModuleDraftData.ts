import { useEffect, useState } from 'react'
import {
  getCourseModules,
  getModuleVrCode,
  getModuleExitTickets,
  getModuleQuizzes,
  getModuleThinkBlocks,
  getModuleAssignments,
  CourseModule,
  VrCodeEntry,
  ExitTicketTemplate,
  ModuleQuizAttachment,
  ThinkBlock,
  Assignment
} from '../../../lib/adminApi'

export const useModuleDraftData = (
  courseId: string | undefined,
  moduleId: string | undefined,
  userId: string | undefined,
  userRole?: string
) => {
  const [moduleData, setModuleData] = useState<CourseModule | null>(null)
  const [vrEntries, setVrEntries] = useState<VrCodeEntry[]>([])
  const [exitTickets, setExitTickets] = useState<ExitTicketTemplate[]>([])
  const [moduleQuizzes, setModuleQuizzes] = useState<ModuleQuizAttachment[]>([])
  const [thinkBlocks, setThinkBlocks] = useState<ThinkBlock[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId || !moduleId) return

    const load = async () => {
      try {
        setLoading(true)
        const [modules, vr, tickets, quizzes, thinking, assignList] = await Promise.all([
          getCourseModules(courseId),
          getModuleVrCode(moduleId),
          getModuleExitTickets(moduleId).catch(() => []),
          getModuleQuizzes(moduleId).catch(() => []),
          getModuleThinkBlocks(moduleId, userId).catch(() => []),
          getModuleAssignments(moduleId, userId, userRole).catch(() => [])
        ])

        const targetModule = modules.find(m => m.id === moduleId)
        if (!targetModule) throw new Error('Módulo no encontrado')

        setModuleData(targetModule)
        setVrEntries(vr)
        setExitTickets(tickets)
        setModuleQuizzes(quizzes)
        setThinkBlocks(thinking)
        setAssignments(assignList)
      } catch (err: any) {
        setError(err.message || 'Error al cargar los ítems del módulo')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [courseId, moduleId, userId, userRole])

  return { moduleData, vrEntries, exitTickets, moduleQuizzes, thinkBlocks, assignments, loading, error }
}