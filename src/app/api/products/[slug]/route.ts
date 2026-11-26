import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fail } from '@/lib/api'
import { variantName } from '@/lib/pricing'

// GET /api/products/[slug] — public product detail with variants
export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params
    const product = await db.product.findUnique({
      where: { slug },
      include: {
        category: { select: { name: true, slug: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        variants: {
          where: { isActive: true },
          include: { size: true, color: true, inventory: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }
    const prices = product.variants.length ? product.variants.map((v) => v.price) : [product.basePrice]
    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        categoryName: product.category.name,
        categorySlug: product.category.slug,
        images: product.images.map((i) => ({ url: i.url, alt: i.altText })),
        price: Math.min(...prices),
        maxPrice: Math.max(...prices),
        isFeatured: product.isFeatured,
        variants: product.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          size: v.size?.name ?? null,
          color: v.color?.name ?? null,
          colorHex: v.color?.hexCode ?? null,
          price: v.price,
          stock: v.inventory?.quantity ?? 0,
          label: variantName(v.size?.name, v.color?.name),
        })),
      },
    })
  } catch (e) {
    return fail(e)
  }
}
