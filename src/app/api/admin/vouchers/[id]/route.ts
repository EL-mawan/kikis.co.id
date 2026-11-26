import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { bad, unauthorized, fail } from '@/lib/api'

// PUT /api/admin/vouchers/[id]
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const { id } = await ctx.params
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (body.name?.trim()) data.name = body.name.trim()
    if (body.type) data.type = body.type
    if (body.value !== undefined) data.value = Math.round(Number(body.value))
    if (body.minPurchase !== undefined) data.minPurchase = Math.round(Number(body.minPurchase))
    if (body.maxDiscount !== undefined) data.maxDiscount = body.maxDiscount ? Math.round(Number(body.maxDiscount)) : null
    if (body.quota !== undefined) data.quota = Number(body.quota)
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null
    if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)
    const voucher = await db.voucher.update({ where: { id }, data })
    return NextResponse.json({ voucher, message: 'Voucher berhasil diperbarui' })
  } catch (e) {
    return fail(e)
  }
}

// DELETE /api/admin/vouchers/[id]
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const { id } = await ctx.params
    const used = await db.order.findFirst({ where: { voucherCode: (await db.voucher.findUnique({ where: { id } }))?.code ?? '' } })
    if (used) {
      await db.voucher.update({ where: { id }, data: { isActive: false } })
      return NextResponse.json({ message: 'Voucher pernah digunakan, dinonaktifkan' })
    }
    await db.voucher.delete({ where: { id } })
    return NextResponse.json({ message: 'Voucher berhasil dihapus' })
  } catch (e) {
    return bad('Gagal menghapus voucher', 500)
  }
}
