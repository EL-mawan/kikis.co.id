import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { bad, unauthorized, fail } from '@/lib/api'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function generateUniqueBarcode(tx: Parameters<Parameters<typeof db.$transaction>[0]>[0], used: Set<string>): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const candidate = `899${String(Math.floor(Math.random() * 9000000000) + 1000000000).slice(0, 10)}`
    if (used.has(candidate)) continue
    const exists = await tx.productVariant.findUnique({ where: { barcode: candidate } })
    if (!exists) {
      used.add(candidate)
      return candidate
    }
  }
  throw new Error('Gagal membuat barcode unik, coba lagi')
}

async function generateUniqueSku(tx: Parameters<Parameters<typeof db.$transaction>[0]>[0], slug: string, used: Set<string>): Promise<string> {
  const prefix = slug.toUpperCase().slice(0, 12) || 'PROD'
  for (let i = 0; i < 50; i++) {
    const candidate = `KIK-${prefix}-${Math.floor(Math.random() * 9000 + 1000)}`
    if (used.has(candidate)) continue
    const exists = await tx.productVariant.findUnique({ where: { sku: candidate } })
    if (!exists) {
      used.add(candidate)
      return candidate
    }
  }
  throw new Error('Gagal membuat SKU unik, coba lagi')
}

// GET /api/admin/products?search=&category=&isActive=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const sp = req.nextUrl.searchParams
    const search = sp.get('search')?.trim() ?? ''
    const category = sp.get('category') ?? ''
    const page = Math.max(1, Number(sp.get('page') ?? 1) || 1)
    const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 20) || 20))

    const where: Record<string, unknown> = {}
    if (search) where.OR = [{ name: { contains: search } }, { slug: { contains: search } }]
    if (category) where.categoryId = category

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          variants: { include: { size: true, color: true, inventory: true }, orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.product.count({ where }),
    ])

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        categoryId: p.categoryId,
        categoryName: p.category.name,
        basePrice: p.basePrice,
        costPrice: p.costPrice,
        isActive: p.isActive,
        isFeatured: p.isFeatured,
        image: p.images[0]?.url ?? null,
        createdAt: p.createdAt,
        variants: p.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          barcode: v.barcode,
          size: v.size?.name ?? null,
          color: v.color?.name ?? null,
          price: v.price,
          costPrice: v.costPrice,
          stock: v.inventory?.quantity ?? 0,
          minStock: v.inventory?.minStock ?? 5,
          isActive: v.isActive,
        })),
      })),
      total, page, limit, pages: Math.ceil(total / limit),
    })
  } catch (e) {
    return fail(e)
  }
}

// POST /api/admin/products — create product with variants
// { name, description, categoryId, basePrice, costPrice, isFeatured, images: [{url}], variants: [{sizeId?, colorId?, price, costPrice, stock, sku?, barcode?}] }
export async function POST(req: NextRequest) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const body = await req.json()
    const { name, description, categoryId, basePrice, costPrice, isFeatured, images, variants } = body
    if (!name?.trim()) return bad('Nama produk wajib diisi')
    if (!categoryId) return bad('Kategori wajib dipilih')
    const variantList = (variants ?? []) as { sizeId?: string; colorId?: string; price: number; costPrice?: number; stock?: number; sku?: string; barcode?: string }[]
    if (!variantList.length) return bad('Minimal satu varian wajib ditambahkan')

    for (const v of variantList) {
      if (!v.price || v.price <= 0) return bad('Harga jual varian wajib lebih dari 0')
    }

    const slugBase = slugify(name)
    let slug = slugBase
    let counter = 1
    while (await db.product.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${++counter}`
    }

    const cat = await db.category.findUnique({ where: { id: categoryId } })
    if (!cat) return bad('Kategori tidak ditemukan')

    // Check SKU/barcode uniqueness
    const skus = variantList.map((v) => v.sku?.trim()).filter((s): s is string => Boolean(s))
    const barcodes = variantList.map((v) => v.barcode?.trim()).filter((s): s is string => Boolean(s))
    if (skus.length) {
      const dup = await db.productVariant.findFirst({ where: { sku: { in: skus } } })
      if (dup) return bad(`SKU sudah digunakan: ${dup.sku}`, 409)
    }
    if (barcodes.length) {
      const dup = await db.productVariant.findFirst({ where: { barcode: { in: barcodes } } })
      if (dup) return bad(`Barcode sudah digunakan: ${dup.barcode}`, 409)
    }

    const product = await db.$transaction(async (tx) => {
      const usedBarcodes = new Set<string>()
      const usedSkus = new Set<string>()

      const created = await tx.product.create({
        data: {
          name: name.trim(),
          slug,
          description: description?.trim() ?? null,
          categoryId,
          basePrice: Math.round(Number(basePrice ?? variantList[0].price)),
          costPrice: Math.round(Number(costPrice ?? 0)),
          isFeatured: Boolean(isFeatured),
          images: {
            create: ((images ?? []) as { url: string; altText?: string }[])
              .filter((i) => i.url?.trim())
              .map((i, idx) => ({ url: i.url.trim(), altText: i.altText ?? name, sortOrder: idx, isPrimary: idx === 0 })),
          },
        },
      })

      for (const v of variantList) {
        const sku = v.sku?.trim() || await generateUniqueSku(tx, slug, usedSkus)
        const barcode = v.barcode?.trim() || await generateUniqueBarcode(tx, usedBarcodes)
        const variant = await tx.productVariant.create({
          data: {
            productId: created.id,
            sizeId: v.sizeId || null,
            colorId: v.colorId || null,
            sku,
            barcode,
            price: Math.round(v.price),
            costPrice: Math.round(v.costPrice ?? created.costPrice),
          },
        })
        if (v.stock && v.stock > 0) {
          await tx.inventory.create({ data: { variantId: variant.id, quantity: v.stock, minStock: 5 } })
        } else {
          await tx.inventory.create({ data: { variantId: variant.id, quantity: 0, minStock: 5 } })
        }
      }
      return created
    })

    return NextResponse.json({ product, message: 'Produk berhasil dibuat' }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.includes('Unique')) return bad('SKU atau barcode sudah digunakan', 409)
    return fail(e)
  }
}
