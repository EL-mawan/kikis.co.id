import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { unauthorized, fail } from '@/lib/api'

// GET /api/admin/transactions?search=&page=&limit=&from=&to=
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
      where.OR = [{ transactionNumber: { contains: search } }, { cashierName: { contains: search } }, { customerName: { contains: search } }]
    }
    if (sp.get('from') || sp.get('to')) {
      const gte = sp.get('from') ? { gte: new Date(sp.get('from')!) } : undefined
      const lte = sp.get('to') ? { lte: new Date(sp.get('to')!) } : undefined
      where.createdAt = { ...gte, ...lte }
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.transaction.count({ where }),
    ])

    const totals = await db.transaction.aggregate({
      where,
      _sum: { total: true, subtotal: true, discountAmount: true },
      _count: true,
    })

    return NextResponse.json({
      transactions, total, page, limit, pages: Math.ceil(total / limit),
      summary: { totalRevenue: totals._sum.total ?? 0, totalDiscount: totals._sum.discountAmount ?? 0, count: totals._count },
    })
  } catch (e) {
    return fail(e)
  }
}
