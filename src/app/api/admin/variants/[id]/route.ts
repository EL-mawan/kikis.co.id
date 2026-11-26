import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { bad, unauthorized, fail } from '@/lib/api'

// PUT /api/admin/variants/[id] — update variant price/cost/active (stock via /api/admin/inventory)
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const { id } = await ctx.params
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (body.price !== undefined) {
      const price = Number(body.price)
      if (!price || price <= 0) return bad('Harga jual wajib lebih dari 0')
      data.price = Math.round(price)
    }
    if (body.costPrice !== undefined) data.costPrice = Math.round(Number(body.costPrice))
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)
    if (body.sku !== undefined && body.sku?.trim()) {
      const exists = await db.productVariant.findFirst({ where: { sku: body.sku.trim(), id: { not: id } } })
      if (exists) return bad('SKU sudah digunakan varian lain', 409)
      data.sku = body.sku.trim()
    }
    const variant = await db.productVariant.update({
      where: { id },
      data,
      include: { size: true, color: true, inventory: true },
    })
    return NextResponse.json({ variant, message: 'Varian berhasil diperbarui' })
  } catch (e) {
    return fail(e)
  }
}

// DELETE /api/admin/variants/[id] — soft delete (deactivate) or hard delete when unused
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const { id } = await ctx.params
    const used = (await db.orderItem.findFirst({ where: { variantId: id } })) || (await db.transactionItem.findFirst({ where: { variantId: id } }))
    if (used) {
      await db.productVariant.update({ where: { id }, data: { isActive: false } })
      return NextResponse.json({ message: 'Varian memiliki riwayat transaksi, dinonaktifkan' })
    }
    await db.productVariant.delete({ where: { id } })
    return NextResponse.json({ message: 'Varian berhasil dihapus' })
  } catch (e) {
    return fail(e)
  }
}
