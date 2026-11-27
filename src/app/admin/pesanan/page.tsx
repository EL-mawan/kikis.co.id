'use client'

import { useCallback, useEffect, useState } from 'react'
import { Eye, Search } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTime, formatIDR, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'
import { apiGet, apiSend, useDebouncedValue } from '@/components/admin/api'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { EmptyState, Pager, TableSkeleton } from '@/components/admin/table-bits'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface OrderItem {
  id: string
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
  reference: string | null
  paidAt: string | null
}

interface AdminOrder {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  shippingAddress: string
  city: string
  province: string
  postalCode: string | null
  status: string
  paymentMethod: string
  voucherCode: string | null
  subtotal: number
  voucherDiscount: number
  shippingCost: number
  total: number
  note: string | null
  createdAt: string
  items: OrderItem[]
  payments: OrderPayment[]
  customer: { name: string; email: string } | null
}

interface OrdersResponse {
  orders: AdminOrder[]
  total: number
  page: number
  pages: number
  statusCounts: Record<string, number>
}

const STATUS_ORDER = [
  'PENDING_PAYMENT',
  'WAITING_VERIFICATION',
  'PROCESSING',
  'READY_TO_SHIP',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
]

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Menunggu',
  PAID: 'Dibayar',
  FAILED: 'Gagal',
  REFUNDED: 'Dikembalikan',
}

function paymentStatusClass(s: string): string {
  if (s === 'PAID') return 'bg-emerald-100 text-emerald-800'
  if (s === 'FAILED') return 'bg-red-100 text-red-800'
  if (s === 'REFUNDED') return 'bg-secondary text-secondary-foreground'
  return 'bg-muted text-muted-foreground'
}

export default function AdminOrdersPage() {
  const [data, setData] = useState<OrdersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<AdminOrder | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const debouncedSearch = useDebouncedValue(search)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (status !== 'all') params.set('status', status)
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      const d = await apiGet<OrdersResponse>(`/api/admin/orders?${params.toString()}`)
      setData(d)
    } catch (e) {
      toast.error('Gagal memuat pesanan', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setLoading(false)
    }
  }, [status, debouncedSearch, page])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data-fetch / sync pattern
    load()
  }, [load])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data-fetch / sync pattern
    setPage(1)
  }, [status, debouncedSearch])

  const allCount = data
    ? STATUS_ORDER.reduce((a, s) => a + (data.statusCounts[s] ?? 0), 0)
    : 0

  const changeStatus = async (order: AdminOrder, next: string) => {
    if (next === order.status) return
    if (next === 'CANCELLED') {
      setPendingStatus(next)
      setConfirmCancel(true)
      return
    }
    await patchStatus(order, next)
  }

  const patchStatus = async (order: AdminOrder, next: string) => {
    setUpdating(true)
    try {
      const d = await apiSend<{ message: string }>(`/api/admin/orders/${order.id}`, 'PATCH', { status: next })
      toast.success(d.message || 'Status pesanan diperbarui')
      setConfirmCancel(false)
      setPendingStatus(null)
      setDetail(null)
      load()
    } catch (e) {
      toast.error('Gagal memperbarui status', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Pesanan Online" description="Kelola pesanan dari toko online KIKIS — verifikasi, proses, dan kirim." />

      {/* Status filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        <Button
          variant="outline"
          className={cn('h-10 shrink-0 rounded-none text-sm', status === 'all' && 'border-accent bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground')}
          onClick={() => setStatus('all')}
        >
          Semua ({allCount})
        </Button>
        {STATUS_ORDER.map((s) => (
          <Button
            key={s}
            variant="outline"
            className={cn(
              'h-10 shrink-0 rounded-none whitespace-nowrap text-sm',
              status === s && 'border-accent bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground'
            )}
            onClick={() => setStatus(s)}
          >
            {ORDER_STATUS_LABEL[s]} ({data?.statusCounts[s] ?? 0})
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no. pesanan / pelanggan / telepon..."
            className="h-10 rounded-none pl-9"
            aria-label="Cari pesanan"
          />
        </div>
        {data ? (
          <p className="text-xs uppercase tracking-widest text-muted-foreground sm:ml-auto">{data.total} pesanan</p>
        ) : null}
      </div>

      <Card className="rounded-none p-6 shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Pesanan</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-center">Item</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              {loading ? (
                <TableSkeleton colSpan={7} rows={6} />
              ) : !data || data.orders.length === 0 ? (
                <EmptyState colSpan={7} />
              ) : (
                <TableBody>
                  {data.orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs font-medium">{o.orderNumber}</TableCell>
                      <TableCell>
                        <p className="font-medium">{o.customerName}</p>
                        <p className="text-xs text-muted-foreground">{o.customerPhone}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(o.createdAt)}</TableCell>
                      <TableCell className="text-center">{o.items.length}</TableCell>
                      <TableCell className="text-right whitespace-nowrap font-medium">{formatIDR(o.total)}</TableCell>
                      <TableCell>
                        <StatusBadge status={o.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5 rounded-none"
                            onClick={() => setDetail(o)}
                          >
                            <Eye className="h-4 w-4" /> Detail
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </div>
          {data ? <Pager page={data.page} pages={data.pages} onPage={setPage} /> : null}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={Boolean(detail)} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto custom-scrollbar sm:max-w-2xl">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm">{detail.orderNumber}</span>
                  <StatusBadge status={detail.status} />
                </DialogTitle>
                <DialogDescription>Dibuat {formatDateTime(detail.createdAt)}</DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1 rounded-none border p-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pelanggan</p>
                    <p className="text-sm font-medium">{detail.customerName}</p>
                    <p className="text-sm text-muted-foreground">{detail.customerPhone}</p>
                    <p className="text-sm text-muted-foreground">{detail.customer?.email ?? detail.customerEmail ?? '-'}</p>
                    {detail.customer ? (
                      <Badge variant="outline" className="border-transparent bg-secondary text-secondary-foreground">
                        Pelanggan Terdaftar
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">
                        Tamu
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1 rounded-none border p-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Alamat Pengiriman</p>
                    <p className="text-sm">{detail.shippingAddress}</p>
                    <p className="text-sm text-muted-foreground">
                      {detail.city}, {detail.province} {detail.postalCode ?? ''}
                    </p>
                  </div>
                </div>

                {detail.note ? (
                  <div className="rounded-none border border-dashed p-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Catatan: </span>
                    {detail.note}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Item Pesanan</p>
                  <div className="overflow-x-auto rounded-none border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produk</TableHead>
                          <TableHead>Varian</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell className="text-muted-foreground">{item.variantName || '-'}</TableCell>
                            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">{formatIDR(item.subtotal)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatIDR(detail.subtotal)}</span>
                  </div>
                  {detail.voucherDiscount > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Voucher {detail.voucherCode ? `(${detail.voucherCode})` : ''}
                      </span>
                      <span className="text-emerald-700">-{formatIDR(detail.voucherDiscount)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ongkos Kirim</span>
                    <span>{formatIDR(detail.shippingCost)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatIDR(detail.total)}</span>
                  </div>
                  <p className="pt-1 text-xs text-muted-foreground">
                    Metode pembayaran: {PAYMENT_METHOD_LABEL[detail.paymentMethod] ?? detail.paymentMethod}
                  </p>
                </div>

                {detail.payments.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Riwayat Pembayaran</p>
                    {detail.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 rounded-none border px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium">{PAYMENT_METHOD_LABEL[p.method] ?? p.method}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.paidAt ? `Dibayar ${formatDateTime(p.paidAt)}` : 'Belum dibayar'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatIDR(p.amount)}</span>
                          <Badge variant="outline" className={cn('border-transparent', paymentStatusClass(p.status))}>
                            {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <Label>Ubah Status Pesanan</Label>
                  <Select
                    value={detail.status}
                    onValueChange={(v) => changeStatus(detail, v)}
                    disabled={detail.status === 'CANCELLED' || detail.status === 'COMPLETED' || updating}
                  >
                    <SelectTrigger className="w-full rounded-none" aria-label="Ubah status pesanan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>
                          {ORDER_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Pembatalan pesanan akan mengembalikan stok produk yang dipesan.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" className="rounded-none" onClick={() => setDetail(null)}>
                  Tutup
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <AlertDialog open={confirmCancel} onOpenChange={(v) => !v && setConfirmCancel(false)}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan pesanan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Pesanan {detail?.orderNumber} akan dibatalkan. Stok akan dikembalikan ke gudang dan pembayaran akan
              ditandai dikembalikan (refund). Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Tidak, kembali</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none bg-destructive text-white hover:bg-destructive/90"
              disabled={updating}
              onClick={(e) => {
                e.preventDefault()
                if (detail && pendingStatus) patchStatus(detail, pendingStatus)
              }}
            >
              Ya, Batalkan Pesanan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
