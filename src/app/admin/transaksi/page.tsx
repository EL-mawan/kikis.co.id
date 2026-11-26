'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Receipt, Search, Tag, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTime, formatIDR, PAYMENT_METHOD_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'
import { apiGet, useDebouncedValue } from '@/components/admin/api'
import { PageHeader } from '@/components/admin/PageHeader'
import { EmptyState, Pager, TableSkeleton } from '@/components/admin/table-bits'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface TxItem {
  id: string
  productName: string
  variantName: string
  sku: string
  barcode: string
  unitPrice: number
  quantity: number
  subtotal: number
}

interface PosTransaction {
  id: string
  transactionNumber: string
  cashierName: string
  customerName: string | null
  subtotal: number
  discountType: string
  discountValue: number
  discountAmount: number
  total: number
  paidAmount: number
  changeAmount: number
  paymentMethod: string
  note: string | null
  createdAt: string
  items: TxItem[]
}

interface TransactionsResponse {
  transactions: PosTransaction[]
  total: number
  page: number
  pages: number
  summary: { totalRevenue: number; totalDiscount: number; count: number }
}

function methodBadge(method: string): string {
  if (method === 'CASH') return 'bg-secondary text-secondary-foreground'
  if (method === 'QRIS') return 'bg-emerald-100 text-emerald-800'
  if (method === 'DEBIT') return 'bg-muted text-muted-foreground'
  return 'bg-muted text-muted-foreground'
}

export default function AdminTransactionsPage() {
  const [data, setData] = useState<TransactionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)

  const debouncedSearch = useDebouncedValue(search)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      const d = await apiGet<TransactionsResponse>(`/api/admin/transactions?${params.toString()}`)
      setData(d)
    } catch (e) {
      toast.error('Gagal memuat transaksi', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, page])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
    setExpanded(null)
  }, [debouncedSearch])

  const summary = data?.summary

  return (
    <div className="space-y-6">
      <PageHeader title="Transaksi POS" description="Seluruh transaksi penjualan langsung di kasir toko." />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="rounded-none p-6 shadow-none">
          <CardContent className="space-y-2 p-0">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Total Pendapatan</p>
              <Wallet className="h-4 w-4 text-accent" aria-hidden="true" />
            </div>
            {loading || !summary ? (
              <p className="text-2xl font-semibold">—</p>
            ) : (
              <p className="text-2xl font-semibold tracking-tight">{formatIDR(summary.totalRevenue)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-none p-6 shadow-none">
          <CardContent className="space-y-2 p-0">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Jumlah Transaksi</p>
              <Receipt className="h-4 w-4 text-accent" aria-hidden="true" />
            </div>
            {loading || !summary ? (
              <p className="text-2xl font-semibold">—</p>
            ) : (
              <p className="text-2xl font-semibold tracking-tight">{summary.count}</p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-none p-6 shadow-none">
          <CardContent className="space-y-2 p-0">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Total Diskon</p>
              <Tag className="h-4 w-4 text-accent" aria-hidden="true" />
            </div>
            {loading || !summary ? (
              <p className="text-2xl font-semibold">—</p>
            ) : (
              <p className="text-2xl font-semibold tracking-tight">{formatIDR(summary.totalDiscount)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no. transaksi / kasir / pelanggan..."
            className="h-10 rounded-none pl-9"
            aria-label="Cari transaksi"
          />
        </div>
        {data ? (
          <p className="text-xs uppercase tracking-widest text-muted-foreground sm:ml-auto">{data.total} transaksi</p>
        ) : null}
      </div>

      <Card className="rounded-none p-6 shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>No. Transaksi</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kasir</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead className="text-center">Item</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Diskon</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Metode</TableHead>
                </TableRow>
              </TableHeader>
              {loading ? (
                <TableSkeleton colSpan={10} rows={6} />
              ) : !data || data.transactions.length === 0 ? (
                <EmptyState colSpan={10} />
              ) : (
                <TableBody>
                  {data.transactions.map((t) => (
                    <Fragment key={t.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => setExpanded((prev) => (prev === t.id ? null : t.id))}
                      >
                        <TableCell>
                          {expanded === t.id ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-medium">{t.transactionNumber}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(t.createdAt)}</TableCell>
                        <TableCell>{t.cashierName}</TableCell>
                        <TableCell className="text-muted-foreground">{t.customerName || '-'}</TableCell>
                        <TableCell className="text-center">{t.items.length}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{formatIDR(t.subtotal)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {t.discountAmount > 0 ? (
                            <span className="text-destructive">-{formatIDR(t.discountAmount)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap font-semibold">{formatIDR(t.total)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('border-transparent', methodBadge(t.paymentMethod))}>
                            {PAYMENT_METHOD_LABEL[t.paymentMethod] ?? t.paymentMethod}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {expanded === t.id ? (
                        <TableRow className="hover:bg-muted/50">
                          <TableCell />
                          <TableCell colSpan={9}>
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                Detail Item
                              </p>
                              <div className="overflow-x-auto rounded-none border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Produk</TableHead>
                                      <TableHead>Varian</TableHead>
                                      <TableHead>SKU</TableHead>
                                      <TableHead className="text-center">Qty</TableHead>
                                      <TableHead className="text-right">Harga Satuan</TableHead>
                                      <TableHead className="text-right">Subtotal</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {t.items.map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.productName}</TableCell>
                                        <TableCell className="text-muted-foreground">{item.variantName || '-'}</TableCell>
                                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                        <TableCell className="text-right whitespace-nowrap">{formatIDR(item.unitPrice)}</TableCell>
                                        <TableCell className="text-right whitespace-nowrap">{formatIDR(item.subtotal)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                              <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 text-sm text-muted-foreground">
                                <span>
                                  Dibayar: <span className="font-medium text-foreground">{formatIDR(t.paidAmount)}</span>
                                </span>
                                <span>
                                  Kembalian: <span className="font-medium text-foreground">{formatIDR(t.changeAmount)}</span>
                                </span>
                                {t.note ? (
                                  <span>
                                    Catatan: <span className="font-medium text-foreground">{t.note}</span>
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  ))}
                </TableBody>
              )}
            </Table>
          </div>
          {data ? <Pager page={data.page} pages={data.pages} onPage={setPage} /> : null}
        </CardContent>
      </Card>
    </div>
  )
}
