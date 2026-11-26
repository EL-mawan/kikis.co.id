import { NextRequest, NextResponse } from 'next/server'
import { bad, fail } from '@/lib/api'
import { validateVoucher } from '@/lib/pricing'

// POST /api/vouchers/validate  { code, subtotal }
export async function POST(req: NextRequest) {
  try {
    const { code, subtotal } = (await req.json()) as { code?: string; subtotal?: number }
    if (!code?.trim()) return bad('Kode voucher wajib diisi')
    const result = await validateVoucher(code.trim().toUpperCase(), Number(subtotal ?? 0))
    return NextResponse.json(result)
  } catch (e) {
    return fail(e)
  }
}
