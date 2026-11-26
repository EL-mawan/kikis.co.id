import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { bad, unauthorized, fail } from '@/lib/api'
import { priceCart, applyTransactionDiscount, type CartItemInput, DiscountType } from '@/lib/pricing'
import { adjustStockInTx } from '@/lib/inventory'
import { generateTransactionNumber } from '@/lib/format'

// POST /api/pos/checkout — POS transaction
// { items, discountType, discountValue, paidAmount, paymentMethod, customerName, note }
// Atomic: transaction + items + price/cost snapshots + stock deduction + movements
export async function POST(req: NextRequest) {
  try {
    const session = await requireStaff(['SUPER_ADMIN', 'ADMIN', 'CASHIER'])
    if (!session) return unauthorized()

    const body = await req.json()
    const { items, discountType, discountValue, paidAmount, paymentMethod, customerName, note } = body as {
      items?: CartItemInput[]
      discountType?: string
      discountValue?: number
      paidAmount?: number
      paymentMethod?: string
      customerName?: string
      note?: string
    }
    if (!items?.length) return bad('Keranjang kosong')

    // Server-side price recalculation (never trust client)
    const cart = await priceCart(items)
    const type: DiscountType = ['NONE', 'FIXED', 'PERCENT'].includes(discountType ?? '') ? (discountType as DiscountType) : 'NONE'
    const { discountAmount, total } = applyTransactionDiscount(cart.subtotal, {
      discountType: type,
      discountValue: Math.max(0, Math.round(Number(discountValue ?? 0))),
    })

    const method = ['CASH', 'QRIS', 'DEBIT'].includes(paymentMethod ?? '') ? paymentMethod! : 'CASH'
    const paid = Math.max(0, Math.round(Number(paidAmount ?? 0)))
    if (paid < total) return bad('Jumlah pembayaran kurang dari total')

    const transactionNumber = generateTransactionNumber()

    const transaction = await db.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          transactionNumber,
          cashierId: session.sub,
          cashierName: session.name,
          subtotal: cart.subtotal,
          discountType: type,
          discountValue: type === 'NONE' ? 0 : Math.round(Number(discountValue ?? 0)),
          discountAmount,
          total,
          paidAmount: paid,
          changeAmount: paid - total,
          paymentMethod: method,
          customerName: customerName?.trim() ?? null,
          note: note?.trim() ?? null,
          items: {
            create: cart.items.map((i) => ({
              variantId: i.variantId,
              productName: i.productName,
              variantName: i.variantName,
              sku: i.sku,
              barcode: i.barcode,
              unitPrice: i.unitPrice,
              unitCost: i.unitCost,
              quantity: i.quantity,
              subtotal: i.subtotal,
            })),
          },
        },
        include: { items: true },
      })

      // Atomic stock deduction — prevents overselling
      for (const i of cart.items) {
        await adjustStockInTx(tx, i.variantId, -i.quantity, {
          type: 'POS_SALE',
          reference: created.transactionNumber,
          userId: session.sub,
        }, { requirePositiveStock: true })
      }

      await tx.payment.create({
        data: {
          transactionId: created.id,
          method,
          amount: total,
          status: 'PAID',
          paidAt: new Date(),
        },
      })

      return created
    })

    return NextResponse.json({
      transaction: {
        id: transaction.id,
        transactionNumber: transaction.transactionNumber,
        cashierName: transaction.cashierName,
        subtotal: transaction.subtotal,
        discountType: transaction.discountType,
        discountValue: transaction.discountValue,
        discountAmount: transaction.discountAmount,
        total: transaction.total,
        paidAmount: transaction.paidAmount,
        changeAmount: transaction.changeAmount,
        paymentMethod: transaction.paymentMethod,
        customerName: transaction.customerName,
        createdAt: transaction.createdAt,
        items: transaction.items,
      },
      message: 'Transaksi berhasil',
    }, { status: 201 })
  } catch (e) {
    if (e instanceof Error) return bad(e.message)
    return fail(e)
  }
}
