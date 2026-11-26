import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { bad, fail } from '@/lib/api'
import { priceCart, validateVoucher, type CartItemInput } from '@/lib/pricing'
import { adjustStockInTx } from '@/lib/inventory'
import { generateOrderNumber } from '@/lib/format'

// POST /api/orders — create online order (customer checkout)
// All totals recalculated server-side. Atomic stock deduction (reserve at order creation).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      items, customerName, customerPhone, customerEmail,
      shippingAddress, city, province, postalCode,
      paymentMethod, voucherCode, note, shippingCost: clientShipping,
    } = body as {
      items?: CartItemInput[]
      customerName?: string
      customerPhone?: string
      customerEmail?: string
      shippingAddress?: string
      city?: string
      province?: string
      postalCode?: string
      paymentMethod?: string
      voucherCode?: string
      note?: string
      shippingCost?: number
    }

    if (!items?.length) return bad('Keranjang kosong')
    if (!customerName?.trim() || !customerPhone?.trim() || !shippingAddress?.trim() || !city?.trim() || !province?.trim()) {
      return bad('Nama, telepon, alamat, kota, dan provinsi wajib diisi')
    }
    const method = ['TRANSFER', 'COD', 'QRIS'].includes(paymentMethod ?? '') ? paymentMethod! : 'TRANSFER'

    // 1. Recompute prices from DB (never trust client)
    const cart = await priceCart(items)

    // 2. Voucher (server-side validation)
    let voucherDiscount = 0
    let appliedCode: string | null = null
    if (voucherCode?.trim()) {
      const v = await validateVoucher(voucherCode.trim().toUpperCase(), cart.subtotal)
      if (!v.valid) return bad(v.message)
      voucherDiscount = v.discount
      appliedCode = v.voucher!.code
    }

    // 3. Shipping (server-defined; COD fee). Client value is NOT used.
    const shippingCost = method === 'COD' ? 20000 : 10000

    const subtotal = cart.subtotal
    const total = Math.max(0, subtotal - voucherDiscount + shippingCost)

    const session = await getSession()

    // 4. Atomic: create order + deduct stock
    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerId: session?.type === 'customer' ? session.sub : null,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail?.trim() ?? (session?.type === 'customer' ? session.email : null),
          shippingAddress: shippingAddress.trim(),
          city: city.trim(),
          province: province.trim(),
          postalCode: postalCode?.trim() ?? null,
          paymentMethod: method,
          voucherCode: appliedCode,
          subtotal,
          voucherDiscount,
          shippingCost,
          total,
          note: note?.trim() ?? null,
          status: method === 'TRANSFER' || method === 'QRIS' ? 'PENDING_PAYMENT' : 'WAITING_VERIFICATION',
          items: {
            create: cart.items.map((i) => ({
              variantId: i.variantId,
              productName: i.productName,
              variantName: i.variantName,
              sku: i.sku,
              unitPrice: i.unitPrice,
              unitCost: i.unitCost,
              quantity: i.quantity,
              subtotal: i.subtotal,
            })),
          },
        },
        include: { items: true },
      })

      for (const i of cart.items) {
        await adjustStockInTx(tx, i.variantId, -i.quantity, {
          type: 'ONLINE_SALE',
          reference: created.orderNumber,
          note: 'Pesanan online dibuat (stok dicadangkan)',
        }, { requirePositiveStock: true })
      }

      if (appliedCode) {
        await tx.voucher.update({
          where: { code: appliedCode },
          data: { usedCount: { increment: 1 } },
        })
      }

      return created
    })

    return NextResponse.json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        subtotal: order.subtotal,
        voucherDiscount: order.voucherDiscount,
        shippingCost: order.shippingCost,
        paymentMethod: order.paymentMethod,
      },
      message: 'Pesanan berhasil dibuat',
    }, { status: 201 })
  } catch (e) {
    if (e instanceof Error) return bad(e.message)
    return fail(e)
  }
}

// GET /api/orders — current customer's order history
export async function GET() {
  try {
    const session = await getSession()
    if (session?.type !== 'customer') return bad('Silakan login sebagai pelanggan', 401)
    const orders = await db.order.findMany({
      where: { customerId: session.sub },
      orderBy: { createdAt: 'desc' },
      include: { items: true, payments: true },
    })
    return NextResponse.json({ orders })
  } catch (e) {
    return fail(e)
  }
}
