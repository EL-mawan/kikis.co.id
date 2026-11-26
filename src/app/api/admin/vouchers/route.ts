import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { bad, unauthorized, fail } from '@/lib/api'

// GET /api/admin/vouchers
export async function GET() {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const vouchers = await db.voucher.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ vouchers })
  } catch (e) {
    return fail(e)
  }
}

// POST /api/admin/vouchers { code, name, type, value, minPurchase, maxDiscount, quota, startDate, endDate }
export async function POST(req: NextRequest) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const body = await req.json()
    const { code, name, type, value, minPurchase, maxDiscount, quota, startDate, endDate } = body
    if (!code?.trim()) return bad('Kode voucher wajib diisi')
    if (!name?.trim()) return bad('Nama voucher wajib diisi')
    if (!['FIXED', 'PERCENT'].includes(type)) return bad('Tipe voucher tidak valid')
    if (!value || value <= 0) return bad('Nilai voucher harus lebih dari 0')
    if (type === 'PERCENT' && value > 100) return bad('Persentase maksimal 100')

    const exists = await db.voucher.findUnique({ where: { code: code.trim().toUpperCase() } })
    if (exists) return bad('Kode voucher sudah digunakan', 409)

    const voucher = await db.voucher.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        type,
        value: Math.round(Number(value)),
        minPurchase: Math.round(Number(minPurchase ?? 0)),
        maxDiscount: maxDiscount ? Math.round(Number(maxDiscount)) : null,
        quota: Number(quota ?? 100),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    })
    return NextResponse.json({ voucher, message: 'Voucher berhasil dibuat' }, { status: 201 })
  } catch (e) {
    return fail(e)
  }
}
