import React, { useEffect, useRef } from 'react'
import { auth, supabase } from '../lib/supabase'
import { useLocation } from 'react-router-dom'

interface ActivityTrackerProps {
    role: string
}

const ActivityTracker: React.FC<ActivityTrackerProps> = ({ role }) => {
    // Medimos el tiempo para alumnos y profesores
    const isTrackedUser = role === 'student' || role === 'professor'
    
    // Guardamos el último momento en el que enviamos el latido
    const lastHeartbeat = useRef<number>(Date.now())
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const location = useLocation()

    const locationRef = useRef(location.pathname)
    useEffect(() => {
        locationRef.current = location.pathname
    }, [location.pathname])

    const sendHeartbeat = async () => {
        console.log('[ActivityTracker] sendHeartbeat triggered. Role:', role, 'isTracked:', isTrackedUser)
        if (!isTrackedUser) return
        
        // Si la página no está visible, no contamos el tiempo
        if (document.visibilityState !== 'visible') {
            console.log('[ActivityTracker] document hidden, resetting timer')
            lastHeartbeat.current = Date.now()
            return
        }

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const user = session?.user
            if (!user) {
                console.log('[ActivityTracker] No user found in session')
                return
            }

            const now = Date.now()
            const durationSeconds = Math.floor((now - lastHeartbeat.current) / 1000)
            console.log(`[ActivityTracker] duration: ${durationSeconds}s`)
            
            if (durationSeconds > 0) {
                const currentPath = locationRef.current
                // Si está en el perfil, no guardamos este lapso
                if (!currentPath.startsWith('/profile')) {
                    const { error } = await supabase
                        .from('activity_logs')
                        .insert({
                            user_id: user.id,
                            duration_seconds: durationSeconds,
                            path: currentPath
                        })
                    
                    if (error) {
                        console.error('[ActivityTracker] Insert Error:', error)
                    } else {
                        console.log('[ActivityTracker] Successfully inserted', durationSeconds, 'seconds for path', currentPath)
                    }
                } else {
                    console.log('[ActivityTracker] Ignored path', currentPath)
                }
            }
            
            lastHeartbeat.current = now
        } catch (error) {
            console.error('Error sending activity heartbeat:', error)
        }
    }

    useEffect(() => {
        if (!isTrackedUser) return

        // 1. Iniciar intervalo cada 10 segundos
        intervalRef.current = setInterval(sendHeartbeat, 10000)

        // 2. Escuchar cambios de visibilidad (cambio de pestaña)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // Enviamos un latido justo antes de ocultar
                sendHeartbeat()
            } else if (document.visibilityState === 'visible') {
                // Al volver, reseteamos el temporizador para contar a partir de ahora
                lastHeartbeat.current = Date.now()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [isTrackedUser])

    return null // Es un componente invisible
}

export default ActivityTracker
