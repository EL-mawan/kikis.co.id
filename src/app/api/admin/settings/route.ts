import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { unauthorized, fail } from '@/lib/api'

// GET /api/admin/settings — store settings (admin + cashier for receipt footer)
export async function GET() {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN', 'CASHIER'])
    if (!session) return unauthorized()
    let settings = await db.storeSetting.findUnique({ where: { id: 'main' } })
    if (!settings) {
      settings = await db.storeSetting.create({ data: { id: 'main' } })
    }
    return NextResponse.json({ settings })
  } catch (e) {
    return fail(e)
  }
}

// PUT /api/admin/settings — SUPER_ADMIN/ADMIN { storeName, tagline, address, phone, email, receiptFooter }
export async function PUT(req: NextRequest) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const body = await req.json()
    const data: Record<string, unknown> = {}
    for (const key of ['storeName', 'tagline', 'address', 'phone', 'email', 'receiptFooter', 'logoUrl']) {
      if (body[key] !== undefined) data[key] = body[key]
    }
    const settings = await db.storeSetting.upsert({
      where: { id: 'main' },
      update: data,
      create: { id: 'main', ...data },
    })
    return NextResponse.json({ settings, message: 'Pengaturan berhasil disimpan' })
  } catch (e) {
    return fail(e)
  }
}
