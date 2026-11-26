'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { AlertCircle, Check, CheckCircle2, Loader2, X } from 'lucide-react'
import { StoreShell } from '@/components/store/StoreShell'
import { formatDateTime, formatIDR, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface OrderItem {
  id?: string
  productName: string
  variantName: string
  sku: string
  unitPrice: number
  quantity: number
  subtotal: number
}

interface OrderPayment {
  id: string
  method: string
  amount: number
  status: string
}

interface OrderDetail {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  shippingAddress: string
  city: string
  province: string
  postalCode?: string | null
  status: string
  paymentMethod: string
  voucherCode?: string | null
  subtotal: number
  voucherDiscount: number
  shippingCost: number
  total: number
  note?: string | null
  createdAt: string
  items: OrderItem[]
  payments?: OrderPayment[]
}

const STEPS = [
  'PENDING_PAYMENT',
  'WAITING_VERIFICATION',
  'PROCESSING',
  'READY_TO_SHIP',
  'SHIPPED',
  'COMPLETED',
]

function StatusStepper({ status }: { status: string }) {
  const currentIndex = STEPS.indexOf(status)

  if (status === 'CANCELLED') {
    return (
      <Alert variant="destructive" className="border-red-300 bg-red-50 text-red-800 [&>svg]:text-red-700">
        <AlertCircle className="size-4" />
        <AlertTitle>Pesanan Dibatalkan</AlertTitle>
        <AlertDescription>
          Pesanan ini telah dibatalkan. Hubungi kami di 021-7280-1122 jika ada pertanyaan.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <div className="flex min-w-[560px] items-start">
        {STEPS.map((step, i) => {
          const done = i < currentIndex
          const current = i === currentIndex
          return (
            <div key={step} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div className={cn('h-0.5 flex-1', i === 0 ? 'bg-transparent' : done ? 'bg-accent' : 'bg-border')} />
                <div
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                    done && 'border-accent bg-accent text-white',
                    current && 'border-2 border-primary bg-white text-primary',
                    !done && !current && 'border-border bg-white text-muted-foreground',
                  )}
                  aria-current={current ? 'step' : undefined}
                >
                  {done ? <Check className="size-4" /> : i + 1}
                </div>
                <div className={cn('h-0.5 flex-1', i === STEPS.length - 1 ? 'bg-transparent' : done ? 'bg-accent' : 'bg-border')} />
              </div>
              <div
                className={cn(
                  'mt-2 px-1 text-center text-[10px] uppercase leading-tight tracking-wide sm:text-xs',
                  current ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
              >
                {ORDER_STATUS_LABEL[step] ?? step}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function OrderDetailContent() {
  const { nomor } = useParams<{ nomor: string }>()
  const sp = useSearchParams()
  const success = sp.get('success') === '1'

  const [result, setResult] = useState<{ nomor: string; order: OrderDetail | null } | null>(null)
  const notFound = result !== null && result.order === null && result.nomor === nomor

  useEffect(() => {
    let cancelled = false
    fetch(`/api/orders/${encodeURIComponent(nomor)}`)
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          setResult({ nomor, order: null })
          return
        }
        const d = await res.json()
        setResult({ nomor, order: d.order })
      })
      .catch(() => {
        if (!cancelled) setResult({ nomor, order: null })
      })
    return () => {
      cancelled = true
    }
  }, [nomor])

  const order = result && result.nomor === nomor ? result.order : null
  const loading = order === null && !result

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <Skeleton className="h-10 w-72 rounded-none bg-secondary" />
        <Skeleton className="mt-8 h-32 rounded-none bg-secondary" />
        <Skeleton className="mt-6 h-80 rounded-none bg-secondary" />
      </div>
    )
  }

  if (notFound || !order) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-24 text-center">
        <X className="size-12 text-muted-foreground/40" aria-hidden="true" />
        <h1 className="mt-5 font-display text-lg font-semibold tracking-widest">PESANAN TIDAK DITEMUKAN</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nomor pesanan tidak valid atau telah dihapus. Periksa kembali nomor pesanan kamu.
        </p>
        <Button asChild className="mt-6 h-11 bg-primary px-8 text-white">
          <Link href="/pesanan">Coba Nomor Lain</Link>
        </Button>
      </div>
    )
  }

  const paid = (order.payments ?? []).some((p) => p.status === 'PAID')

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:py-10">
      {success && (
        <Alert className="border-emerald-300 bg-emerald-50 text-emerald-800 [&>svg]:text-emerald-700">
          <CheckCircle2 className="size-4" />
          <AlertTitle>Pesanan berhasil dibuat!</AlertTitle>
          <AlertDescription>
            Simpan nomor pesanan untuk melacak: <span className="font-mono font-semibold">{order.orderNumber}</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="mt-6 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-widest md:text-3xl">DETAIL PESANAN</h1>
          <p className="mt-2 font-mono text-sm">{order.orderNumber}</p>
          <p className="text-xs text-muted-foreground">Dibuat {formatDateTime(order.createdAt)}</p>
        </div>
        <span className="bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
          {ORDER_STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      {/* Status stepper */}
      <div className="mt-8 border border-border p-5 sm:p-6">
        <StatusStepper status={order.status} />
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1 border-t border-border pt-4 text-sm text-muted-foreground">
          <span>
            Pembayaran: <span className="font-medium text-foreground">{PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}</span>
          </span>
          <span>
            Status pembayaran: <span className={cn('font-medium', paid ? 'text-emerald-700' : 'text-amber-600')}>{paid ? 'Lunas' : 'Belum dibayar'}</span>
          </span>
        </div>
      </div>

      {/* Info grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="border border-border p-5">
          <div className="font-display text-sm font-semibold tracking-widest">ALAMAT PENGIRIMAN</div>
          <div className="mt-3 space-y-1 text-sm">
            <div className="font-medium">{order.customerName}</div>
            <div className="text-muted-foreground">{order.customerPhone}</div>
            <div className="text-muted-foreground">{order.shippingAddress}</div>
            <div className="text-muted-foreground">
              {order.city}, {order.province} {order.postalCode ?? ''}
            </div>
          </div>
        </div>
        <div className="border border-border p-5">
          <div className="font-display text-sm font-semibold tracking-widest">INFO PESANAN</div>
          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Metode Pembayaran</span>
              <span className="text-right">{PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}</span>
            </div>
            {order.voucherCode && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Voucher</span>
                <span className="font-mono">{order.voucherCode}</span>
              </div>
            )}
            {order.note && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Catatan</span>
                <span className="text-right">{order.note}</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Status</span>
              <span>{ORDER_STATUS_LABEL[order.status] ?? order.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="mt-6 border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Produk</TableHead>
              <TableHead className="text-right">Harga</TableHead>
              <TableHead className="text-center">Qty</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item, idx) => (
              <TableRow key={item.id ?? idx} className="hover:bg-transparent">
                <TableCell>
                  <div className="font-medium">{item.productName}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.variantName} · {item.sku}
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatIDR(item.unitPrice)}</TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-right font-medium">{formatIDR(item.subtotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totals */}
      <div className="mt-4 ml-auto max-w-sm space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatIDR(order.subtotal)}</span>
        </div>
        {order.voucherDiscount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Diskon Voucher</span>
            <span className="font-medium">- {formatIDR(order.voucherDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Biaya Pengiriman</span>
          <span className="font-medium">{formatIDR(order.shippingCost)}</span>
        </div>
        <Separator className="my-3" />
        <div className="flex justify-between text-base font-bold">
          <span>TOTAL</span>
          <span>{formatIDR(order.total)}</span>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild variant="outline" className="h-11 border-primary">
          <Link href="/pesanan">Lacak Pesanan Lain</Link>
        </Button>
        <Button asChild variant="outline" className="h-11 border-primary">
          <Link href="/katalog">Lanjut Belanja</Link>
        </Button>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <Skeleton className="h-10 w-72 rounded-none bg-secondary" />
      <Skeleton className="mt-8 h-32 rounded-none bg-secondary" />
      <Skeleton className="mt-6 h-80 rounded-none bg-secondary" />
    </div>
  )
}

export default function OrderDetailPage() {
  return (
    <StoreShell>
      <Suspense fallback={<DetailSkeleton />}>
        <OrderDetailContent />
      </Suspense>
    </StoreShell>
  )
}
