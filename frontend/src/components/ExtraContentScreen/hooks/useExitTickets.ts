import { useCallback, useEffect, useState } from 'react'
import { getExitTickets, deleteExitTicket, type ExitTicketTemplate } from '../../../lib/adminApi'

/**
 * Owns the list of global exit ticket templates: loading, error state, and
 * mutation helpers that keep the list in sync after a delete.
 *
 * NOTE: this list comes from GET /exit-tickets, which returns each template
 * with only a question COUNT (not the actual questions). Don't rely on
 * `template.questions` from this hook — use ExitTicketViewModal /
 * ExitTicketFormModal, which fetch the full record via getExitTicket(id).
 */
export function useExitTickets() {
    const [exitTickets, setExitTickets] = useState<ExitTicketTemplate[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const reload = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getExitTickets()
            setExitTickets(data || [])
        } catch (err: any) {
            console.error('Error loading exit ticket templates:', err)
            setError(err.message || 'Error al cargar plantillas de Ticket de Salida')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        reload()
    }, [reload])

    const remove = useCallback(
        async (id: string) => {
            await deleteExitTicket(id)
            await reload()
        },
        [reload]
    )

    return { exitTickets, loading, error, reload, remove }
}