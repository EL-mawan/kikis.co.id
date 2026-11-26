import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { bad, unauthorized, fail } from '@/lib/api'
import bcrypt from 'bcryptjs'

// GET /api/admin/users — staff list
export async function GET() {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const users = await db.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, _count: { select: { transactions: true } } },
    })
    return NextResponse.json({ users: users.map((u) => ({ ...u, transactionCount: u._count.transactions, _count: undefined })) })
  } catch (e) {
    return fail(e)
  }
}

// POST /api/admin/users { name, email, password, role } — SUPER_ADMIN only
export async function POST(req: NextRequest) {
  try {
    const session = await requireStaff(['SUPER_ADMIN'])
    if (!session) return unauthorized('Hanya Super Admin dapat menambah pengguna')
    const { name, email, password, role } = await req.json()
    if (!name?.trim() || !email?.trim() || !password) return bad('Nama, email, dan kata sandi wajib diisi')
    if (!['SUPER_ADMIN', 'ADMIN', 'CASHIER'].includes(role)) return bad('Role tidak valid')
    if (password.length < 6) return bad('Kata sandi minimal 6 karakter')
    const emailNorm = email.toLowerCase().trim()
    const exists = await db.user.findUnique({ where: { email: emailNorm } })
    if (exists) return bad('Email sudah digunakan', 409)
    const user = await db.user.create({
      data: { name: name.trim(), email: emailNorm, role, passwordHash: bcrypt.hashSync(password, 10) },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    })
    return NextResponse.json({ user, message: 'Pengguna berhasil ditambahkan' }, { status: 201 })
  } catch (e) {
    return fail(e)
  }
}
