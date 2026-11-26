import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { bad, unauthorized, fail } from '@/lib/api'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// GET /api/admin/categories (includes inactive)
export async function GET() {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const categories = await db.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    })
    return NextResponse.json({ categories: categories.map((c) => ({ ...c, productCount: c._count.products })) })
  } catch (e) {
    return fail(e)
  }
}

// POST /api/admin/categories { name, description, sortOrder }
export async function POST(req: NextRequest) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const { name, description, sortOrder } = await req.json()
    if (!name?.trim()) return bad('Nama kategori wajib diisi')
    const slug = slugify(name)
    const exists = await db.category.findUnique({ where: { slug } })
    if (exists) return bad('Kategori dengan nama serupa sudah ada', 409)
    const category = await db.category.create({
      data: { name: name.trim(), slug, description: description?.trim() ?? null, sortOrder: Number(sortOrder ?? 0) },
    })
    return NextResponse.json({ category, message: 'Kategori berhasil dibuat' }, { status: 201 })
  } catch (e) {
    return fail(e)
  }
}
