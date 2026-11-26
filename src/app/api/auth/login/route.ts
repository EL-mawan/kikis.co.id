import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { createToken, SESSION_COOKIE, sessionCookieOptions, type Role } from '@/lib/auth'
import { bad, fail } from '@/lib/api'

// POST /api/auth/login  { email, password, portal: 'staff' | 'customer' }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, portal } = body as { email?: string; password?: string; portal?: string }
    if (!email || !password) return bad('Email dan kata sandi wajib diisi')

    if (portal === 'customer') {
      const customer = await db.customer.findUnique({ where: { email: email.toLowerCase().trim() } })
      if (!customer || !customer.isActive) return bad('Email atau kata sandi salah', 401)
      const valid = await bcrypt.compare(password, customer.passwordHash)
      if (!valid) return bad('Email atau kata sandi salah', 401)
      const token = createToken({
        sub: customer.id, name: customer.name, email: customer.email,
        role: 'CUSTOMER' as Role, type: 'customer',
      })
      const res = NextResponse.json({
        user: { id: customer.id, name: customer.name, email: customer.email, role: 'CUSTOMER' },
      })
      res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
      return res
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user || !user.isActive) return bad('Email atau kata sandi salah', 401)
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return bad('Email atau kata sandi salah', 401)
    const token = createToken({
      sub: user.id, name: user.name, email: user.email,
      role: user.role as Role, type: 'staff',
    })
    const res = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
    return res
  } catch (e) {
    return fail(e)
  }
}
