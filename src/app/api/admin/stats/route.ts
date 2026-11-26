import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { unauthorized, fail } from '@/lib/api'

/**
 * GET /api/admin/stats?range=today|yesterday|week|month|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
 * All boundaries computed in Asia/Jakarta.
 */
function jakartaOffsetMs(): number {
  return 7 * 60 * 60 * 1000 // UTC+7
}

function jakartaDayStart(d: Date): Date {
  const shifted = new Date(d.getTime() + jakartaOffsetMs())
  shifted.setUTCHours(0, 0, 0, 0)
  return new Date(shifted.getTime() - jakartaOffsetMs())
}

function parseJakartaDate(s: string): Date {
  // 'YYYY-MM-DD' -> Jakarta midnight
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 17, 0, 0)) // 17:00 UTC prev day = 00:00 Jakarta
}

function getRange(sp: URLSearchParams): { start: Date; end: Date; label: string } {
  const now = new Date()
  const range = sp.get('range') ?? 'today'
  if (range === 'custom') {
    const from = sp.get('from')
    const to = sp.get('to')
    const start = from ? parseJakartaDate(from) : jakartaDayStart(now)
    const toD = to ? parseJakartaDate(to) : new Date(now.getTime() + jakartaOffsetMs())
    toD.setUTCHours(23, 59, 59, 999)
    const end = new Date(toD.getTime() - jakartaOffsetMs())
    return { start, end, label: 'Kustom' }
  }
  const start = jakartaDayStart(now)
  const end = new Date(now.getTime() + 60 * 1000)
  if (range === 'yesterday') {
    start.setUTCDate(start.getUTCDate() - 1)
    end.setTime(start.getTime() + 24 * 60 * 60 * 1000 - 60 * 1000)
    return { start, end, label: 'Kemarin' }
  }
  if (range === 'week') {
    start.setUTCDate(start.getUTCDate() - 6)
    return { start, end, label: '7 Hari Terakhir' }
  }
  if (range === 'month') {
    start.setUTCDate(start.getUTCDate() - 29)
    return { start, end, label: '30 Hari Terakhir' }
  }
  return { start, end, label: 'Hari Ini' }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const sp = req.nextUrl.searchParams
    const { start, end, label } = getRange(sp)
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)

    const [posTx, orders, orderItems, prevPos, prevOrders] = await Promise.all([
      db.transaction.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { items: true },
      }),
      db.order.findMany({
        where: { createdAt: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
        include: { items: true },
      }),
      db.orderItem.findMany({
        where: { order: { createdAt: { gte: start, lte: end }, status: { not: 'CANCELLED' } } },
        include: { variant: { include: { product: { include: { category: true } } } } },
      }),
      db.transaction.findMany({
        where: {
          createdAt: { gte: new Date(start.getTime() - (end.getTime() - start.getTime())), lt: start },
        },
      }),
      db.order.findMany({
        where: {
          createdAt: { gte: new Date(start.getTime() - (end.getTime() - start.getTime())), lt: start },
          status: { not: 'CANCELLED' },
        },
      }),
    ])

    const posRevenue = posTx.reduce((a, t) => a + t.total, 0)
    const onlineRevenue = orders.reduce((a, o) => a + o.total, 0)
    const netSales = posRevenue + onlineRevenue

    // COGS from snapshots
    const posCogs = posTx.reduce((a, t) => a + t.items.reduce((x, i) => x + i.unitCost * i.quantity, 0), 0)
    const onlineCogs = orderItems.reduce((a, i) => a + i.unitCost * i.quantity, 0)
    const grossProfit = netSales - posCogs - onlineCogs

    const newCustomers = await db.customer.count({ where: { createdAt: { gte: start, lte: end } } })
    const transactionCount = posTx.length
    const onlineOrderCount = orders.length
    const avgTransaction = transactionCount + onlineOrderCount > 0 ? Math.round(netSales / (transactionCount + onlineOrderCount)) : 0

    const lowStock = await db.inventory.findMany({
      where: { quantity: { lte: 5 } },
      include: { variant: { include: { product: { select: { name: true } }, size: true, color: true } } },
      orderBy: { quantity: 'asc' },
      take: 10,
    })

    const totalInventoryValue = await db.inventory.findMany({ include: { variant: true } })
    const inventoryValue = totalInventoryValue.reduce((a, i) => a + i.quantity * i.variant.costPrice, 0)

    // --- Charts ---
    // Sales trend per day
    const trendMap = new Map<string, { pos: number; online: number }>()
    for (let i = 0; i < days; i++) {
      const dayStart = new Date(start.getTime() + i * 86400000)
      const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(dayStart)
      trendMap.set(key, { pos: 0, online: 0 })
    }
    for (const t of posTx) {
      const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(t.createdAt)
      const cur = trendMap.get(key)
      if (cur) cur.pos += t.total
    }
    for (const o of orders) {
      const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(o.createdAt)
      const cur = trendMap.get(key)
      if (cur) cur.online += o.total
    }
    const salesTrend = [...trendMap.entries()].map(([date, v]) => ({
      date,
      pos: v.pos,
      online: v.online,
      total: v.pos + v.online,
    }))

    // Sales by category
    const catMap = new Map<string, number>()
    for (const t of posTx) {
      const txFull = t
      void txFull
    }
    const posItems = await db.transactionItem.findMany({
      where: { transaction: { createdAt: { gte: start, lte: end } } },
      include: { variant: { include: { product: { include: { category: true } } } } },
    })
    for (const i of posItems) {
      const cat = i.variant?.product?.category?.name ?? 'Lainnya'
      catMap.set(cat, (catMap.get(cat) ?? 0) + i.subtotal)
    }
    for (const i of orderItems) {
      const cat = i.variant?.product?.category?.name ?? 'Lainnya'
      catMap.set(cat, (catMap.get(cat) ?? 0) + i.subtotal)
    }
    const byCategory = [...catMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

    // Top products by qty
    const prodMap = new Map<string, { name: string; qty: number; revenue: number }>()
    for (const i of posItems) {
      const key = i.productName
      const cur = prodMap.get(key) ?? { name: key, qty: 0, revenue: 0 }
      cur.qty += i.quantity
      cur.revenue += i.subtotal
      prodMap.set(key, cur)
    }
    for (const i of orderItems) {
      const key = i.productName
      const cur = prodMap.get(key) ?? { name: key, qty: 0, revenue: 0 }
      cur.qty += i.quantity
      cur.revenue += i.subtotal
      prodMap.set(key, cur)
    }
    const topProducts = [...prodMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 8)

    // Payment methods (POS)
    const methodMap = new Map<string, number>()
    for (const t of posTx) methodMap.set(t.paymentMethod, (methodMap.get(t.paymentMethod) ?? 0) + t.total)
    const byPaymentMethod = [...methodMap.entries()].map(([name, value]) => ({ name, value }))

    // Hourly (today/yesterday) or per-day counts
    const hourMap = new Map<string, number>()
    for (let h = 0; h < 24; h++) hourMap.set(String(h).padStart(2, '0'), 0)
    for (const t of posTx) {
      const hour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }).format(t.createdAt)
      hourMap.set(hour, (hourMap.get(hour) ?? 0) + t.total)
    }
    const hourlySales = [...hourMap.entries()].map(([hour, value]) => ({ hour: `${hour}:00`, value }))

    // Growth vs previous period
    const prevRevenue = prevPos.reduce((a, t) => a + t.total, 0) + prevOrders.reduce((a, o) => a + o.total, 0)
    const revenueGrowth = prevRevenue > 0 ? Math.round(((netSales - prevRevenue) / prevRevenue) * 100) : null

    return NextResponse.json({
      range: { label, start, end },
      kpis: {
        netSales,
        posRevenue,
        onlineRevenue,
        grossProfit,
        grossMargin: netSales > 0 ? Math.round((grossProfit / netSales) * 100) : 0,
        transactionCount,
        onlineOrderCount,
        newCustomers,
        avgTransaction,
        inventoryValue,
        revenueGrowth,
      },
      lowStock: lowStock.map((i) => ({
        variantId: i.variantId,
        productName: i.variant.product.name,
        variantName: [i.variant.color?.name, i.variant.size?.name].filter(Boolean).join(' - '),
        sku: i.variant.sku,
        quantity: i.quantity,
        minStock: i.minStock,
      })),
      charts: { salesTrend, byCategory, topProducts, byPaymentMethod, hourlySales },
    })
  } catch (e) {
    return fail(e)
  }
}
