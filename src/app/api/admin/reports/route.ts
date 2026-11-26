import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { bad, unauthorized, fail } from '@/lib/api'
import { MOVEMENT_TYPE_LABEL } from '@/lib/format'

const REPORT_TYPES = ['sales', 'products', 'inventory', 'transactions', 'orders', 'customers', 'profit', 'lowstock', 'movements', 'cashier'] as const
type ReportType = (typeof REPORT_TYPES)[number]

function csv(rows: Record<string, unknown>[], headers?: string[]): string {
  if (!rows.length) return ''
  const keys = headers ?? Object.keys(rows[0])
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [keys.map(esc).join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n')
}

function csvResponse(filename: string, rows: Record<string, unknown>[]) {
  const content = csv(rows)
  return new NextResponse(`\uFEFF${content}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

// GET /api/admin/reports?type=sales&from=2025-01-01&to=2025-01-31&format=json|csv
export async function GET(req: NextRequest) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const sp = req.nextUrl.searchParams
    const type = (sp.get('type') ?? 'sales') as ReportType
    if (!REPORT_TYPES.includes(type)) return bad('Tipe laporan tidak valid')
    const format = sp.get('format') ?? 'json'

    const from = sp.get('from') ? new Date(`${sp.get('from')}T00:00:00`) : new Date(Date.now() - 30 * 86400000)
    const to = sp.get('to') ? new Date(`${sp.get('to')}T23:59:59`) : new Date()

    let rows: Record<string, unknown>[] = []

    if (type === 'sales') {
      const txs = await db.transaction.findMany({ where: { createdAt: { gte: from, lte: to } } })
      const orders = await db.order.findMany({ where: { createdAt: { gte: from, lte: to }, status: { not: 'CANCELLED' } } })
      const map = new Map<string, { pos: number; online: number }>()
      for (const t of txs) {
        const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(t.createdAt)
        const cur = map.get(key) ?? { pos: 0, online: 0 }
        cur.pos += t.total
        map.set(key, cur)
      }
      for (const o of orders) {
        const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(o.createdAt)
        const cur = map.get(key) ?? { pos: 0, online: 0 }
        cur.online += o.total
        map.set(key, cur)
      }
      rows = [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({
        Tanggal: date, 'Penjualan POS': v.pos, 'Penjualan Online': v.online, Total: v.pos + v.online,
      }))
    } else if (type === 'products') {
      const items = await db.transactionItem.findMany({
        where: { transaction: { createdAt: { gte: from, lte: to } } },
        include: { variant: { include: { product: { include: { category: true } } } } },
      })
      const oItems = await db.orderItem.findMany({
        where: { order: { createdAt: { gte: from, lte: to }, status: { not: 'CANCELLED' } } },
        include: { variant: { include: { product: { include: { category: true } } } } },
      })
      const map = new Map<string, { name: string; cat: string; sku: string; qty: number; revenue: number; cost: number }>()
      for (const i of [...items, ...oItems]) {
        const key = `${i.productName}||${i.variantName}`
        const cur = map.get(key) ?? { name: i.productName, cat: i.variant?.product?.category?.name ?? '-', sku: i.sku, qty: 0, revenue: 0, cost: 0 }
        cur.qty += i.quantity
        cur.revenue += i.subtotal
        cur.cost += i.unitCost * i.quantity
        map.set(key, cur)
      }
      rows = [...map.values()].sort((a, b) => b.qty - a.qty).map((r) => ({
        Produk: r.name, Kategori: r.cat, SKU: r.sku, Jumlah: r.qty,
        Pendapatan: r.revenue, HPP: r.cost, Laba: r.revenue - r.cost,
      }))
    } else if (type === 'inventory') {
      const inv = await db.inventory.findMany({
        include: { variant: { include: { product: { include: { category: true } }, size: true, color: true } } },
      })
      rows = inv.filter((i) => i.variant.product.isActive).map((i) => ({
        Produk: i.variant.product.name,
        Varian: [i.variant.color?.name, i.variant.size?.name].filter(Boolean).join(' - '),
        SKU: i.variant.sku,
        Barcode: i.variant.barcode,
        Stok: i.quantity,
        'Stok Minimum': i.minStock,
        'Nilai Modal': i.quantity * i.variant.costPrice,
        Kategori: i.variant.product.category.name,
      }))
    } else if (type === 'transactions') {
      const txs = await db.transaction.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      })
      rows = txs.map((t) => ({
        'No Transaksi': t.transactionNumber, Tanggal: t.createdAt.toISOString(),
        Kasir: t.cashierName, Pelanggan: t.customerName ?? '-',
        Subtotal: t.subtotal, Diskon: t.discountAmount, Total: t.total,
        Dibayar: t.paidAmount, Kembalian: t.changeAmount,
        Metode: t.paymentMethod, 'Jumlah Item': t.items.length,
      }))
    } else if (type === 'orders') {
      const orders = await db.order.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      })
      rows = orders.map((o) => ({
        'No Pesanan': o.orderNumber, Tanggal: o.createdAt.toISOString(),
        Pelanggan: o.customerName, Status: o.status,
        Metode: o.paymentMethod, Subtotal: o.subtotal,
        'Diskon Voucher': o.voucherDiscount, Ongkir: o.shippingCost, Total: o.total,
        'Jumlah Item': o.items.length,
      }))
    } else if (type === 'customers') {
      const customers = await db.customer.findMany({
        include: { orders: { where: { status: { not: 'CANCELLED' } } } },
        orderBy: { createdAt: 'desc' },
      })
      rows = customers.map((c) => ({
        Nama: c.name, Email: c.email, Telepon: c.phone ?? '-',
        'Tgl Daftar': c.createdAt.toISOString(),
        'Jumlah Pesanan': c.orders.length,
        'Total Belanja': c.orders.reduce((a, o) => a + o.total, 0),
      }))
    } else if (type === 'profit') {
      const txs = await db.transaction.findMany({ where: { createdAt: { gte: from, lte: to } }, include: { items: true } })
      const oItems = await db.orderItem.findMany({ where: { order: { createdAt: { gte: from, lte: to }, status: { not: 'CANCELLED' } } } })
      const revenue = txs.reduce((a, t) => a + t.total, 0) + oItems.reduce((a, i) => a + i.subtotal, 0)
      const cogs = txs.reduce((a, t) => a + t.items.reduce((x, i) => x + i.unitCost * i.quantity, 0), 0) + oItems.reduce((a, i) => a + i.unitCost * i.quantity, 0)
      const discounts = txs.reduce((a, t) => a + t.discountAmount, 0) + oItems.reduce((a, i) => { void i; return a }, 0)
      rows = [{
        'Penjualan Kotor': revenue, Diskon: discounts, 'Penjualan Bersih': revenue - discounts,
        'Harga Pokok Penjualan (HPP)': cogs, 'Laba Kotor': revenue - discounts - cogs,
        'Margin (%)': revenue - discounts > 0 ? Math.round(((revenue - discounts - cogs) / (revenue - discounts)) * 100) : 0,
      }]
    } else if (type === 'lowstock') {
      const inv = await db.inventory.findMany({
        include: { variant: { include: { product: { select: { name: true, category: true } }, size: true, color: true } } },
        orderBy: { quantity: 'asc' },
      })
      rows = inv.filter((i) => i.quantity <= i.minStock && i.variant.product.name).map((i) => ({
        Produk: i.variant.product.name,
        Varian: [i.variant.color?.name, i.variant.size?.name].filter(Boolean).join(' - '),
        SKU: i.variant.sku, Stok: i.quantity, 'Stok Minimum': i.minStock,
        Kategori: i.variant.product.category.name,
        Status: i.quantity === 0 ? 'HABIS' : 'MENIPIS',
      }))
    } else if (type === 'movements') {
      const moves = await db.stockMovement.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: { variant: { include: { product: { select: { name: true } }, size: true, color: true } }, user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      })
      rows = moves.map((m) => ({
        Tanggal: m.createdAt.toISOString(), Produk: m.variant.product.name,
        Varian: [m.variant.color?.name, m.variant.size?.name].filter(Boolean).join(' - '),
        SKU: m.variant.sku, Tipe: MOVEMENT_TYPE_LABEL[m.type] ?? m.type,
        'Perubahan': m.quantity, 'Stok Awal': m.stockBefore, 'Stok Akhir': m.stockAfter,
        Referensi: m.reference ?? '-', Petugas: m.user?.name ?? '-',
      }))
    } else if (type === 'cashier') {
      const txs = await db.transaction.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: { items: true },
      })
      const map = new Map<string, { name: string; count: number; revenue: number; items: number; discount: number }>()
      for (const t of txs) {
        const cur = map.get(t.cashierId) ?? { name: t.cashierName, count: 0, revenue: 0, items: 0, discount: 0 }
        cur.count += 1
        cur.revenue += t.total
        cur.items += t.items.reduce((a, i) => a + i.quantity, 0)
        cur.discount += t.discountAmount
        map.set(t.cashierId, cur)
      }
      rows = [...map.values()].sort((a, b) => b.revenue - a.revenue).map((r) => ({
        Kasir: r.name, 'Jumlah Transaksi': r.count, 'Total Item': r.items,
        Pendapatan: r.revenue, 'Total Diskon': r.discount,
        'Rata-rata/Transaksi': r.count ? Math.round(r.revenue / r.count) : 0,
      }))
    }

    if (format === 'csv') {
      return csvResponse(`kikis-laporan-${type}-${new Date().toISOString().slice(0, 10)}.csv`, rows)
    }
    return NextResponse.json({ type, from, to, rows })
  } catch (e) {
    return fail(e)
  }
}
