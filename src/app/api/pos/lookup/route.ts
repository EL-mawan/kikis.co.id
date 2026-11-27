import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fail } from '@/lib/api'
import { variantName } from '@/lib/pricing'

// GET /api/pos/lookup?code= — scan barcode / SKU / product name for POS
export async function GET(req: NextRequest) {
  try {
    const code = (req.nextUrl.searchParams.get('code') ?? '').trim()
    if (!code) return NextResponse.json({ results: [] })

    // 1. Exact barcode or SKU match (scanner path)
    const exact = await db.productVariant.findFirst({
      where: { isActive: true, product: { isActive: true }, OR: [{ barcode: code }, { sku: code }] },
      include: {
        product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } },
        size: true, color: true, inventory: true,
      },
    })
    if (exact) {
      return NextResponse.json({
        results: [{
          variantId: exact.id,
          productId: exact.productId,
          productName: exact.product.name,
          variantName: variantName(exact.size?.name, exact.color?.name),
          sku: exact.sku,
          barcode: exact.barcode,
          image: exact.product.images[0]?.url ?? null,
          price: exact.price,
          stock: exact.inventory?.quantity ?? 0,
        }],
        exact: true,
      })
    }

    // 2. Search fallback (name / sku contains)
    const variants = await db.productVariant.findMany({
      where: {
        isActive: true,
        product: { isActive: true },
        OR: [
          { product: { name: { contains: code } } },
          { sku: { contains: code } },
          { barcode: { contains: code } },
        ],
      },
      include: {
        product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } },
        size: true, color: true, inventory: true,
      },
      take: 20,
    })
    return NextResponse.json({
      results: variants.map((v) => ({
        variantId: v.id,
        productId: v.productId,
        productName: v.product.name,
        variantName: variantName(v.size?.name, v.color?.name),
        sku: v.sku,
        barcode: v.barcode,
        image: v.product.images[0]?.url ?? null,
        price: v.price,
        stock: v.inventory?.quantity ?? 0,
      })),
      exact: false,
    })
  } catch (e) {
    return fail(e)
  }
}
