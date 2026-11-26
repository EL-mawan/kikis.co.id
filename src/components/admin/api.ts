/** KIKIS Admin — shared fetch helpers & hooks (client-side only usage) */
import { useEffect, useState } from 'react'

/** GET JSON; throws Error with server message on failure */
export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Gagal memuat data')
  return data as T
}

/** Send JSON body (POST/PUT/PATCH/DELETE); throws Error with server message */
export async function apiSend<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Terjadi kesalahan')
  return data as T
}

/** Debounce a changing value (for search inputs) */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/** YYYY-MM-DD for <input type="date"> — offset days from today (Asia/Jakarta safe: uses local) */
export function isoDaysFromToday(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
