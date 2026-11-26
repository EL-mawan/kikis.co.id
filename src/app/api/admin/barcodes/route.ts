import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { bad, unauthorized, fail } from '@/lib/api'

// GET /api/admin/barcodes?search= — all variants with barcode info
export async function GET(req: NextRequest) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const search = (req.nextUrl.searchParams.get('search') ?? '').trim()
    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { barcode: { contains: search } },
        { sku: { contains: search } },
        { product: { name: { contains: search } } },
      ]
    }
    const variants = await db.productVariant.findMany({
      where,
      include: {
        product: { select: { name: true, isActive: true, images: { orderBy: { sortOrder: 'asc' }, take: 1 } } },
        size: true, color: true, inventory: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({
      variants: variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode,
        productName: v.product.name,
        variantName: [v.color?.name, v.size?.name].filter(Boolean).join(' - '),
        price: v.price,
        stock: v.inventory?.quantity ?? 0,
        isActive: v.isActive,
        productActive: v.product.isActive,
        image: v.product.images[0]?.url ?? null,
      })),
    })
  } catch (e) {
    return fail(e)
  }
}

// POST /api/admin/barcodes — regenerate barcode for a variant { variantId }
export async function POST(req: NextRequest) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const { variantId } = await req.json()
    if (!variantId) return bad('Varian wajib dipilih')
    // Generate unique barcode
    let barcode: string
    for (let i = 0; i < 50; i++) {
      const candidate = `899${String(Math.floor(Math.random() * 9000000000) + 1000000000).slice(0, 10)}`
      const exists = await db.productVariant.findUnique({ where: { barcode: candidate } })
      if (!exists) { barcode = candidate; break }
    }
    if (!barcode!) return bad('Gagal membuat barcode unik, coba lagi')
    const variant = await db.productVariant.update({ where: { id: variantId }, data: { barcode } })
    return NextResponse.json({ variant, message: 'Barcode berhasil diperbarui' })
  } catch (e) {
    return fail(e)
  }
}
