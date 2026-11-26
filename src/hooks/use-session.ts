'use client'

import { useEffect, useState, useCallback } from 'react'

export interface SessionUser {
  id: string
  name: string
  email: string
  phone?: string | null
  role: string
  addresses?: {
    id: string; label: string; street: string; city: string
    province: string; postalCode: string; isDefault: boolean
  }[]
}

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setUser(data.user ?? null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { user, loading, refresh }
}
