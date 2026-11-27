import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { bad, unauthorized, fail } from '@/lib/api'

// GET /api/admin/products/[id]
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const { id } = await ctx.params
    const product = await db.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { include: { size: true, color: true, inventory: true }, orderBy: { createdAt: 'asc' } },
      },
    })
    if (!product) return bad('Produk tidak ditemukan', 404)
    return NextResponse.json({ product })
  } catch (e) {
    return fail(e)
  }
}

// PUT /api/admin/products/[id] — update product meta (variants managed via their own endpoints)
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const { id } = await ctx.params
    const body = await req.json()
    const { name, description, categoryId, basePrice, costPrice, isFeatured, isActive, images } = body

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) return bad('Produk tidak ditemukan', 404)
    if (categoryId) {
      const cat = await db.category.findUnique({ where: { id: categoryId } })
      if (!cat) return bad('Kategori tidak ditemukan', 400)
    }

    await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...(name?.trim() ? { name: name.trim() } : {}),
          ...(description !== undefined ? { description: description?.trim() ?? null } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(basePrice !== undefined ? { basePrice: Math.round(Number(basePrice)) } : {}),
          ...(costPrice !== undefined ? { costPrice: Math.round(Number(costPrice)) } : {}),
          ...(isFeatured !== undefined ? { isFeatured: Boolean(isFeatured) } : {}),
          ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        },
      })
      if (images !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } })
        for (const [idx, img] of ((images ?? []) as { url: string; altText?: string }[]).filter((i) => i.url?.trim()).entries()) {
          await tx.productImage.create({
            data: { productId: id, url: img.url.trim(), altText: img.altText ?? name ?? existing.name, sortOrder: idx, isPrimary: idx === 0 },
          })
        }
      }
    })

    return NextResponse.json({ message: 'Produk berhasil diperbarui' })
  } catch (e) {
    return fail(e)
  }
}

// DELETE /api/admin/products/[id] — soft delete (deactivate) or hard delete when unused
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const { id } = await ctx.params

    const used = await db.orderItem.findFirst({ where: { variant: { productId: id } } })
    const usedPos = await db.transactionItem.findFirst({ where: { variant: { productId: id } } })
    if (used || usedPos) {
      await db.product.update({ where: { id }, data: { isActive: false } })
      return NextResponse.json({ message: 'Produk memiliki riwayat transaksi, dinonaktifkan (soft delete)' })
    }
    await db.product.delete({ where: { id } })
    return NextResponse.json({ message: 'Produk berhasil dihapus' })
  } catch (e) {
    return fail(e)
  }
}
