import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fail } from '@/lib/api'

// GET /api/products?search=&category=&minPrice=&maxPrice=&sort=&page=&limit=&featured=
// sort: newest | price_asc | price_desc | popular
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const search = sp.get('search')?.trim() ?? ''
    const category = sp.get('category') ?? ''
    const minPrice = Number(sp.get('minPrice') ?? 0) || 0
    const maxPrice = Number(sp.get('maxPrice') ?? 0) || 0
    const sort = sp.get('sort') ?? 'newest'
    const page = Math.max(1, Number(sp.get('page') ?? 1) || 1)
    const limit = Math.min(48, Math.max(1, Number(sp.get('limit') ?? 12) || 12))
    const featured = sp.get('featured') === '1'

    const where: Record<string, unknown> = { isActive: true }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ]
    }
    if (category) where.category = { slug: category }
    if (featured) where.isFeatured = true

    const hasPriceFilter = minPrice > 0 || maxPrice > 0

    const products = await db.product.findMany({
      where,
      include: {
        category: { select: { name: true, slug: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        variants: {
          where: { isActive: true },
          include: { size: true, color: true, inventory: true },
        },
      },
      orderBy: sort === 'price_asc' ? { basePrice: 'asc' } : sort === 'price_desc' ? { basePrice: 'desc' } : { createdAt: 'desc' },
      ...(hasPriceFilter ? {} : { skip: (page - 1) * limit, take: limit }),
    })

    const mappedAll = products
      .map((p) => {
        const activeVariants = p.variants.filter((v) => (v.inventory?.quantity ?? 0) > 0)
        const stock = p.variants.reduce((acc, v) => acc + (v.inventory?.quantity ?? 0), 0)
        // effective price range from variants (fallback base price)
        const prices = p.variants.length ? p.variants.map((v) => v.price) : [p.basePrice]
        const sizes = [...new Set(p.variants.map((v) => v.size?.name).filter(Boolean))] as string[]
        const colors = [...new Set(p.variants.map((v) => v.color?.name).filter(Boolean))] as string[]
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          categoryName: p.category.name,
          categorySlug: p.category.slug,
          image: p.images[0]?.url ?? null,
          price: Math.min(...prices),
          maxPrice: Math.max(...prices),
          stock,
          inStock: activeVariants.length > 0,
          isFeatured: p.isFeatured,
          sizes,
          colors,
        }
      })
      // price filtering applied on variant price range
      .filter((p) => (minPrice ? p.maxPrice >= minPrice : true))
      .filter((p) => (maxPrice ? p.price <= maxPrice : true))

    const total = hasPriceFilter ? mappedAll.length : await db.product.count({ where })
    const mapped = hasPriceFilter ? mappedAll.slice((page - 1) * limit, page * limit) : mappedAll

    return NextResponse.json({ products: mapped, total, page, limit, pages: Math.ceil(total / limit) })
  } catch (e) {
    return fail(e)
  }
}
