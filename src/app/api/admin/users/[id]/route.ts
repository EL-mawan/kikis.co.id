import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { bad, unauthorized, fail } from '@/lib/api'
import bcrypt from 'bcryptjs'

// PUT /api/admin/users/[id] — SUPER_ADMIN only { name?, role?, isActive?, password? }
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff(['SUPER_ADMIN'])
    if (!session) return unauthorized('Hanya Super Admin dapat mengubah pengguna')
    const { id } = await ctx.params
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (body.name?.trim()) data.name = body.name.trim()
    if (body.role && ['SUPER_ADMIN', 'ADMIN', 'CASHIER'].includes(body.role)) data.role = body.role
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)
    if (body.password) {
      if (body.password.length < 6) return bad('Kata sandi minimal 6 karakter')
      data.passwordHash = bcrypt.hashSync(body.password, 10)
    }
    const user = await db.user.update({ where: { id }, data, select: { id: true, name: true, email: true, role: true, isActive: true } })
    return NextResponse.json({ user, message: 'Pengguna berhasil diperbarui' })
  } catch (e) {
    return fail(e)
  }
}

// DELETE /api/admin/users/[id] — soft deactivate, cannot self-delete
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff(['SUPER_ADMIN'])
    if (!session) return unauthorized('Hanya Super Admin dapat menghapus pengguna')
    const { id } = await ctx.params
    if (id === session.sub) return bad('Tidak dapat menonaktifkan akun sendiri')
    const user = await db.user.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ message: `Pengguna ${user.name} dinonaktifkan` })
  } catch (e) {
    return fail(e)
  }
}
