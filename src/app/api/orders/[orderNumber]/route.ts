import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fail } from '@/lib/api'

// GET /api/orders/[orderNumber] — public order tracking by order number
export async function GET(_req: NextRequest, ctx: { params: Promise<{ orderNumber: string }> }) {
  try {
    const { orderNumber } = await ctx.params
    const order = await db.order.findUnique({
      where: { orderNumber },
      include: { items: true, payments: true },
    })
    if (!order) return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    return NextResponse.json({ order })
  } catch (e) {
    return fail(e)
  }
}
