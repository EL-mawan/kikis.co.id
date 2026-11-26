import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { unauthorized, fail } from '@/lib/api'

// GET /api/admin/orders?status=&search=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const sp = req.nextUrl.searchParams
    const status = sp.get('status') ?? ''
    const search = sp.get('search')?.trim() ?? ''
    const page = Math.max(1, Number(sp.get('page') ?? 1) || 1)
    const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 20) || 20))

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
      ]
    }

    const [orders, total, statusCounts] = await Promise.all([
      db.order.findMany({
        where,
        include: { items: true, payments: true, customer: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.order.count({ where }),
      db.order.groupBy({ by: ['status'], _count: true }),
    ])

    return NextResponse.json({
      orders,
      total, page, limit, pages: Math.ceil(total / limit),
      statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
    })
  } catch (e) {
    return fail(e)
  }
}
