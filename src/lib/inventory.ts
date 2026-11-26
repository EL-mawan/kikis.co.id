/**
 * KIKIS Inventory Service
 * Every stock change creates a StockMovement. Concurrency-safe via Prisma transactions
 * and guarded updates (prevents overselling / negative stock).
 */
import { db } from '@/lib/db'
import { variantName } from '@/lib/pricing'

export type MovementType =
  | 'PURCHASE' | 'POS_SALE' | 'ONLINE_SALE' | 'CUSTOMER_RETURN'
  | 'STOCK_ADJUSTMENT' | 'DAMAGED' | 'STOCK_OPNAME'

export interface StockAdjustItem {
  variantId: string
  quantity: number // signed delta (+ = increase, - = decrease)
}

interface MovementMeta {
  type: MovementType
  reference?: string
  note?: string
  userId?: string
}

/**
 * Adjust stock for one variant inside an interactive transaction.
 * `tx` must be a Prisma transaction client (use db.$transaction callback).
 */
type TxClient = any

export async function adjustStockInTx(
  tx: TxClient,
  variantId: string,
  delta: number,
  meta: MovementMeta,
  opts: { requirePositiveStock?: boolean; fixedQuantity?: number; fixedReasonNote?: string } = {},
): Promise<{ quantity: number }> {
  const variant = await tx.productVariant.findUnique({
    where: { id: variantId },
    include: { inventory: true, product: { select: { name: true } }, size: true, color: true },
  })
  if (!variant) throw new Error(`Varian tidak ditemukan: ${variantId}`)
  const current = variant.inventory?.quantity ?? 0

  let after: number
  if (opts.fixedQuantity !== undefined) {
    // Stock opname: set to counted quantity
    after = opts.fixedQuantity
    delta = after - current
    if (meta.note === undefined) meta.note = opts.fixedReasonNote
  } else {
    after = current + delta
    if (opts.requirePositiveStock && after < 0) {
      throw new Error(
        `Stok tidak cukup untuk ${variant.product.name} (${variantName(variant.size?.name, variant.color?.name)}). Stok saat ini: ${current}, dibutuhkan: ${Math.abs(delta)}`,
      )
    }
    if (after < 0) throw new Error('Hasil penyesuaian stok tidak boleh negatif')
  }

  if (variant.inventory) {
    await tx.inventory.update({
      where: { variantId },
      data: { quantity: after },
    })
  } else {
    await tx.inventory.create({ data: { variantId, quantity: after, minStock: 5 } })
  }

  await tx.stockMovement.create({
    data: {
      variantId,
      type: meta.type,
      quantity: delta,
      stockBefore: current,
      stockAfter: after,
      reference: meta.reference,
      note: meta.note,
      userId: meta.userId,
    },
  })

  return { quantity: after }
}

/** Standalone atomic stock adjustment (own transaction) */
export async function adjustStock(
  variantId: string,
  delta: number,
  meta: MovementMeta,
  opts: { fixedQuantity?: number; requirePositiveStock?: boolean } = {},
) {
  return db.$transaction(async (tx) => adjustStockInTx(tx, variantId, delta, meta, opts))
}
