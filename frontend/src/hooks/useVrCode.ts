import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface UserCenterData {
  id?: string
  name?: string
  vr_code: string | null
}

/**
 * Fetches the VR code associated with the logged-in user's educational center.
 * Returns the vr_code string (or null if not set) and a helper to open it.
 */
export function useVrCode(user: User) {
  const [vrCode, setVrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return

    const fetchCenterVrCode = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/${user.id}/center`)
        if (res.ok) {
          const data: UserCenterData = await res.json()
          setVrCode(data.vr_code || null)
        }
      } catch (err) {
        console.error('Error fetching user center vr_code:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCenterVrCode()
  }, [user.id])

  const openVrCode = () => {
    if (vrCode) {
      window.open(vrCode, '_blank', 'noopener,noreferrer')
    }
  }

  return { vrCode, loading, openVrCode }
}
