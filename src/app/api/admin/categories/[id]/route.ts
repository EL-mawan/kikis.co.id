import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { bad, unauthorized, fail } from '@/lib/api'

// PUT /api/admin/categories/[id]
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const { id } = await ctx.params
    const { name, description, sortOrder, isActive } = await req.json()
    const data: Record<string, unknown> = {}
    if (name?.trim()) data.name = name.trim()
    if (description !== undefined) data.description = description?.trim() ?? null
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder)
    if (isActive !== undefined) data.isActive = Boolean(isActive)
    const category = await db.category.update({ where: { id }, data })
    return NextResponse.json({ category, message: 'Kategori berhasil diperbarui' })
  } catch (e) {
    return fail(e)
  }
}

// DELETE /api/admin/categories/[id]
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const { id } = await ctx.params
    const count = await db.product.count({ where: { categoryId: id } })
    if (count > 0) return bad(`Kategori masih memiliki ${count} produk, tidak dapat dihapus`)
    await db.category.delete({ where: { id } })
    return NextResponse.json({ message: 'Kategori berhasil dihapus' })
  } catch (e) {
    return fail(e)
  }
}
