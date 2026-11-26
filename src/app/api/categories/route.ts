import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fail } from '@/lib/api'

// GET /api/categories — public active categories
export async function GET(_req: NextRequest) {
  try {
    const categories = await db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, description: true },
    })
    return NextResponse.json({ categories })
  } catch (e) {
    return fail(e)
  }
}
