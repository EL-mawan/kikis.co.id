/**
 * KIKIS Authentication & RBAC
 * Signed-cookie session (HMAC-SHA256) — no external dependency.
 * Roles: SUPER_ADMIN | ADMIN | CASHIER (staff users), CUSTOMER (portal customers)
 */
import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

const SECRET = process.env.AUTH_SECRET ?? 'kikis-dev-secret-change-in-production'
export const SESSION_COOKIE = 'kikis_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'CASHIER' | 'CUSTOMER'

export interface SessionPayload {
  sub: string
  name: string
  email: string
  role: Role
  type: 'staff' | 'customer'
  exp: number
}

function b64url(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function sign(data: string) {
  return createHmac('sha256', SECRET).update(data).digest('base64url')
}

export function createToken(payload: Omit<SessionPayload, 'exp'>): string {
  const full: SessionPayload = { ...payload, exp: Date.now() + MAX_AGE * 1000 }
  const body = b64url(JSON.stringify(full))
  return `${body}.${sign(body)}`
}

export function verifyToken(token: string | undefined): SessionPayload | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  const expected = sign(body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

/** Read current session from request cookies (server components & route handlers) */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  return verifyToken(store.get(SESSION_COOKIE)?.value)
}

/** Staff-only session */
export async function getStaffSession(): Promise<SessionPayload | null> {
  const s = await getSession()
  if (!s || s.type !== 'staff') return null
  return s
}

export const ROLE_RANK: Record<string, number> = {
  SUPER_ADMIN: 3,
  ADMIN: 2,
  CASHIER: 1,
  CUSTOMER: 0,
}

export function hasRole(session: SessionPayload | null, minRoles: Role[]): boolean {
  if (!session) return false
  return minRoles.includes(session.role)
}

/** Assert staff session with allowed roles; returns session or null */
export async function requireStaff(roles: Role[] = ['SUPER_ADMIN', 'ADMIN', 'CASHIER']): Promise<SessionPayload | null> {
  const s = await getStaffSession()
  if (!s) return null
  if (!roles.includes(s.role)) return null
  return s
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  }
}
