import { NextRequest, NextResponse } from 'next/server'
import { bad, fail } from '@/lib/api'
import { priceCart, type CartItemInput } from '@/lib/pricing'

// POST /api/cart/validate  { items: [{variantId, quantity}] }
// Server-side price recalculation + stock check. Client totals are never trusted.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const items = (body?.items ?? []) as CartItemInput[]
    if (!Array.isArray(items) || items.length === 0) return bad('Keranjang kosong')
    const cart = await priceCart(items)
    return NextResponse.json(cart)
  } catch (e) {
    if (e instanceof Error) return bad(e.message)
    return fail(e)
  }
}
