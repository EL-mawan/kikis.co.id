import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { unauthorized, fail } from '@/lib/api'

// GET /api/admin/customers?search=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const sp = req.nextUrl.searchParams
    const search = sp.get('search')?.trim() ?? ''
    const page = Math.max(1, Number(sp.get('page') ?? 1) || 1)
    const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 20) || 20))

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [{ name: { contains: search } }, { email: { contains: search } }, { phone: { contains: search } }]
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        include: { _count: { select: { orders: true } }, orders: { orderBy: { createdAt: 'desc' }, take: 1, select: { total: true, createdAt: true, orderNumber: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.customer.count({ where }),
    ])

    return NextResponse.json({
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        isActive: c.isActive,
        createdAt: c.createdAt,
        orderCount: c._count.orders,
        lastOrder: c.orders[0] ?? null,
      })),
      total, page, limit, pages: Math.ceil(total / limit),
    })
  } catch (e) {
    return fail(e)
  }
}
