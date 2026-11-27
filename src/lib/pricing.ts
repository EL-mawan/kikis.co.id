/**
 * KIKIS Server-side Pricing Engine
 * ALL financial values are recalculated server-side — client totals are never trusted.
 */
import { db } from '@/lib/db'

export interface CartItemInput {
  variantId: string
  quantity: number
}

export interface PricedItem {
  variantId: string
  productId: string
  productName: string
  variantName: string
  sku: string
  barcode: string
  image?: string
  unitPrice: number
  unitCost: number
  quantity: number
  subtotal: number
}

export interface PricedCart {
  items: PricedItem[]
  subtotal: number
}

export function variantName(size?: string | null, color?: string | null): string {
  const parts: string[] = []
  if (color) parts.push(color)
  if (size) parts.push(size)
  return parts.join(' - ') || 'Standar'
}

/** Fetch variants from DB and recompute prices from database (never client input) */
export async function priceCart(items: CartItemInput[]): Promise<PricedCart> {
  const variantIds = [...new Set(items.map((i) => i.variantId))]
  const variants = await db.productVariant.findMany({
    where: { id: { in: variantIds }, isActive: true, product: { isActive: true } },
    include: {
      product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } },
      size: true,
      color: true,
      inventory: true,
    },
  })
  const vMap = new Map(variants.map((v) => [v.id, v]))

  // Aggregate total requested quantity per variant to prevent split-line overselling
  const qtyByVariant = new Map<string, number>()
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('Jumlah harus berupa bilangan bulat lebih dari 0')
    }
    qtyByVariant.set(item.variantId, (qtyByVariant.get(item.variantId) ?? 0) + item.quantity)
  }

  const priced: PricedItem[] = []
  for (const [variantId, totalQty] of qtyByVariant.entries()) {
    const v = vMap.get(variantId)
    if (!v) throw new Error(`Varian tidak ditemukan atau tidak aktif: ${variantId}`)
    const available = v.inventory?.quantity ?? 0
    if (totalQty > available) {
      throw new Error(`Stok tidak cukup untuk ${v.product.name} (${variantName(v.size?.name, v.color?.name)}). Tersedia: ${available}`)
    }
    priced.push({
      variantId: v.id,
      productId: v.productId,
      productName: v.product.name,
      variantName: variantName(v.size?.name, v.color?.name),
      sku: v.sku,
      barcode: v.barcode,
      image: v.product.images[0]?.url,
      unitPrice: v.price,
      unitCost: v.costPrice,
      quantity: totalQty,
      subtotal: v.price * totalQty,
    })
  }

  const subtotal = priced.reduce((acc, i) => acc + i.subtotal, 0)
  return { items: priced, subtotal }
}

export type DiscountType = 'NONE' | 'FIXED' | 'PERCENT'

export interface DiscountInput {
  discountType: DiscountType
  discountValue: number
}

/** POS transaction discount engine */
export function applyTransactionDiscount(subtotal: number, d: DiscountInput) {
  let discountAmount = 0
  if (d.discountType === 'FIXED') {
    discountAmount = Math.min(d.discountValue, subtotal)
  } else if (d.discountType === 'PERCENT') {
    discountAmount = Math.floor((subtotal * Math.min(d.discountValue, 100)) / 100)
  }
  const total = subtotal - discountAmount
  return { discountAmount, total }
}

export interface VoucherResult {
  valid: boolean
  message: string
  discount: number
  voucher?: {
    id: string
    code: string
    name: string
    type: string
    value: number
  }
}

/** Validate and compute voucher discount against a subtotal (server-side) */
export async function validateVoucher(code: string, subtotal: number): Promise<VoucherResult> {
  const voucher = await db.voucher.findUnique({ where: { code } })
  if (!voucher || !voucher.isActive) return { valid: false, message: 'Voucher tidak valid', discount: 0 }
  const now = new Date()
  if (voucher.startDate && now < voucher.startDate) return { valid: false, message: 'Voucher belum aktif', discount: 0 }
  if (voucher.endDate && now > voucher.endDate) return { valid: false, message: 'Voucher sudah kedaluwarsa', discount: 0 }
  if (voucher.usedCount >= voucher.quota) return { valid: false, message: 'Kuota voucher sudah habis', discount: 0 }
  if (subtotal < voucher.minPurchase) {
    return { valid: false, message: `Minimal pembelian Rp ${new Intl.NumberFormat('id-ID').format(voucher.minPurchase)}`, discount: 0 }
  }
  let discount = voucher.type === 'PERCENT' ? Math.floor((subtotal * voucher.value) / 100) : voucher.value
  if (voucher.maxDiscount) discount = Math.min(discount, voucher.maxDiscount)
  discount = Math.min(discount, subtotal)
  return {
    valid: true,
    message: 'Voucher berhasil diterapkan',
    discount,
    voucher: { id: voucher.id, code: voucher.code, name: voucher.name, type: voucher.type, value: voucher.value },
  }
}
