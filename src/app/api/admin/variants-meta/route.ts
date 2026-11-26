import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { unauthorized, fail } from '@/lib/api'

// GET /api/admin/variants-meta — sizes & colors for variant forms
export async function GET() {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN', 'CASHIER'])
    if (!session) return unauthorized()
    const [sizes, colors] = await Promise.all([
      db.size.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.color.findMany({ orderBy: { name: 'asc' } }),
    ])
    return NextResponse.json({ sizes, colors })
  } catch (e) {
    return fail(e)
  }
}
