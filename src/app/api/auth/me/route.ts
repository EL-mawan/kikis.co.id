import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/auth/me — current session info
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ user: null })
  if (session.type === 'customer') {
    const customer = await db.customer.findUnique({
      where: { id: session.sub },
      include: { addresses: { orderBy: { isDefault: 'desc' } } },
    })
    if (!customer) return NextResponse.json({ user: null })
    return NextResponse.json({
      user: {
        id: customer.id, name: customer.name, email: customer.email,
        phone: customer.phone, role: 'CUSTOMER',
        addresses: customer.addresses,
      },
    })
  }
  const user = await db.user.findUnique({ where: { id: session.sub } })
  if (!user || !user.isActive) return NextResponse.json({ user: null })
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  })
}
