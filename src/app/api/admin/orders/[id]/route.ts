import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { bad, unauthorized, fail } from '@/lib/api'
import { adjustStockInTx } from '@/lib/inventory'

const VALID_STATUSES = ['PENDING_PAYMENT', 'WAITING_VERIFICATION', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED']

// PATCH /api/admin/orders/[id] — update status { status }
// CANCELLED restores reserved stock; PAID methods recorded via Payment table.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const { id } = await ctx.params
    const { status } = await req.json()
    if (!VALID_STATUSES.includes(status)) return bad('Status tidak valid')

    const order = await db.order.findUnique({ where: { id }, include: { items: true } })
    if (!order) return bad('Pesanan tidak ditemukan', 404)
    if (order.status === 'CANCELLED') return bad('Pesanan sudah dibatalkan')
    if (order.status === 'COMPLETED') return bad('Pesanan sudah selesai')

    const updated = await db.$transaction(async (tx) => {
      const o = await tx.order.update({ where: { id }, data: { status }, include: { items: true } })

      // On verification (WAITING_VERIFICATION entered from PENDING_PAYMENT), mark payment paid
      if (status === 'WAITING_VERIFICATION' || status === 'PROCESSING') {
        await tx.payment.updateMany({
          where: { orderId: id, status: 'PENDING' },
          data: { status: 'PAID', paidAt: new Date() },
        })
      }

      // Cancellation restores stock
      if (status === 'CANCELLED') {
        for (const item of order.items) {
          if (item.variantId) {
            await adjustStockInTx(tx, item.variantId, item.quantity, {
              type: 'STOCK_ADJUSTMENT',
              reference: order.orderNumber,
              note: 'Pesanan online dibatalkan, stok dikembalikan',
              userId: session.sub,
            })
          }
        }
        await tx.payment.updateMany({
          where: { orderId: id, status: { in: ['PENDING', 'PAID'] } },
          data: { status: 'REFUNDED' },
        })
      }
      return o
    })

    return NextResponse.json({ order: updated, message: `Status pesanan diperbarui menjadi ${status}` })
  } catch (e) {
    return fail(e)
  }
}
