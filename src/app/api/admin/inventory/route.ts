import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { bad, unauthorized, fail } from '@/lib/api'
import { adjustStock } from '@/lib/inventory'
import { MOVEMENT_TYPE_LABEL } from '@/lib/format'

// GET /api/admin/inventory?search=&lowStock=1&variantId=
export async function GET(req: NextRequest) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const sp = req.nextUrl.searchParams
    const search = sp.get('search')?.trim() ?? ''
    const lowStock = sp.get('lowStock') === '1'

    const where: Record<string, unknown> = {}
    if (search) {
      where.variant = {
        OR: [
          { product: { name: { contains: search } } },
          { sku: { contains: search } },
          { barcode: { contains: search } },
        ],
      }
    }

    const inventories = await db.inventory.findMany({
      where,
      include: {
        variant: {
          include: {
            product: { select: { name: true, isActive: true } },
            size: true, color: true,
          },
        },
      },
      orderBy: [{ quantity: 'asc' }, { updatedAt: 'desc' }],
    })

    const mapped = inventories
      .filter((i) => i.variant.product.isActive)
      .filter((i) => (lowStock ? i.quantity <= i.minStock : true))
      .map((i) => ({
        variantId: i.variantId,
        productName: i.variant.product.name,
        variantName: [i.variant.color?.name, i.variant.size?.name].filter(Boolean).join(' - '),
        sku: i.variant.sku,
        barcode: i.variant.barcode,
        quantity: i.quantity,
        minStock: i.minStock,
        isLow: i.quantity <= i.minStock,
        updatedAt: i.updatedAt,
      }))

    // Recent stock movements (for the movement history tab)
    const movements = await db.stockMovement.findMany({
      include: {
        variant: { include: { product: { select: { name: true } }, size: true, color: true, inventory: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({
      inventories: mapped,
      lowStockCount: inventories.filter((i) => i.quantity <= i.minStock && i.variant.product.isActive).length,
      totalValue: inventories.reduce((a, i) => a + i.quantity * i.variant.costPrice, 0),
      movements: movements.map((m) => ({
        id: m.id,
        productName: m.variant.product.name,
        variantName: [m.variant.color?.name, m.variant.size?.name].filter(Boolean).join(' - '),
        sku: m.variant.sku,
        type: m.type,
        typeLabel: MOVEMENT_TYPE_LABEL[m.type] ?? m.type,
        quantity: m.quantity,
        stockBefore: m.stockBefore,
        stockAfter: m.stockAfter,
        reference: m.reference,
        note: m.note,
        userName: m.user?.name ?? null,
        createdAt: m.createdAt,
      })),
    })
  } catch (e) {
    return fail(e)
  }
}

// POST /api/admin/inventory — manual adjustment / opname / damaged / return
// { variantId, type, quantity (positive; direction from type), fixedQuantity (opname), note }
export async function POST(req: NextRequest) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN'])
    if (!session) return unauthorized()
    const { variantId, type, quantity, fixedQuantity, note } = await req.json()
    if (!variantId) return bad('Varian wajib dipilih')

    const validTypes = ['PURCHASE', 'CUSTOMER_RETURN', 'STOCK_ADJUSTMENT', 'DAMAGED', 'STOCK_OPNAME']
    if (!validTypes.includes(type)) return bad('Tipe pergerakan stok tidak valid')

    if (type === 'STOCK_OPNAME') {
      if (fixedQuantity === undefined || fixedQuantity === null || Number(fixedQuantity) < 0) {
        return bad('Jumlah hasil hitung fisik wajib diisi untuk stok opname')
      }
      await adjustStock(variantId, 0, {
        type: 'STOCK_OPNAME',
        userId: session.sub,
        note: note?.trim() ?? 'Penyesuaian stok opname',
      }, { fixedQuantity: Number(fixedQuantity) })
      return NextResponse.json({ message: 'Stok opname berhasil disimpan' })
    }

    const qty = Number(quantity ?? 0)
    if (!qty || qty <= 0) return bad('Jumlah harus lebih dari 0')

    // Determine direction by type
    const deltaMap: Record<string, number> = {
      PURCHASE: qty,
      CUSTOMER_RETURN: qty,
      STOCK_ADJUSTMENT: qty, // positive adjustments; use negative via DAMAGED
      DAMAGED: -qty,
    }
    await adjustStock(variantId, deltaMap[type], {
      type,
      userId: session.sub,
      note: note?.trim() ?? MOVEMENT_TYPE_LABEL[type],
    }, { requirePositiveStock: type === 'DAMAGED' })

    return NextResponse.json({ message: 'Stok berhasil diperbarui' })
  } catch (e) {
    if (e instanceof Error) return bad(e.message)
    return fail(e)
  }
}
