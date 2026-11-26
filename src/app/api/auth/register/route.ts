import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { createToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth'
import { bad, fail } from '@/lib/api'

// POST /api/auth/register — customer registration { name, email, phone, password }
export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password } = (await req.json()) as {
      name?: string; email?: string; phone?: string; password?: string
    }
    if (!name?.trim() || !email?.trim() || !password) return bad('Nama, email, dan kata sandi wajib diisi')
    if (password.length < 6) return bad('Kata sandi minimal 6 karakter')
    const emailNorm = email.toLowerCase().trim()
    const existing = await db.customer.findUnique({ where: { email: emailNorm } })
    if (existing) return bad('Email sudah terdaftar, silakan masuk', 409)
    const customer = await db.customer.create({
      data: { name: name.trim(), email: emailNorm, phone: phone?.trim(), passwordHash: bcrypt.hashSync(password, 10) },
    })
    const token = createToken({ sub: customer.id, name: customer.name, email: customer.email, role: 'CUSTOMER', type: 'customer' })
    const res = NextResponse.json({ user: { id: customer.id, name: customer.name, email: customer.email, role: 'CUSTOMER' } })
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
    return res
  } catch (e) {
    return fail(e)
  }
}
