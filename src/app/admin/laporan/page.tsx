'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Printer, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatDateTime, formatIDR, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { apiGet, isoDaysFromToday } from '@/components/admin/api'
import { PageHeader } from '@/components/admin/PageHeader'
import { EmptyState, TableSkeleton } from '@/components/admin/table-bits'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type ReportType =
  | 'sales'
  | 'products'
  | 'inventory'
  | 'transactions'
  | 'orders'
  | 'customers'
  | 'profit'
  | 'lowstock'
  | 'movements'
  | 'cashier'

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'sales', label: 'Penjualan Harian' },
  { value: 'products', label: 'Produk Terlaris' },
  { value: 'inventory', label: 'Inventaris' },
  { value: 'transactions', label: 'Transaksi POS' },
  { value: 'orders', label: 'Pesanan Online' },
  { value: 'customers', label: 'Pelanggan' },
  { value: 'profit', label: 'Laba Kotor' },
  { value: 'lowstock', label: 'Stok Menipis' },
  { value: 'movements', label: 'Pergerakan Stok' },
  { value: 'cashier', label: 'Kinerja Kasir' },
]

// keys that hold rupiah values (exact 'Total' also money, 'Total Item' etc. are counts)
const MONEY_KEY = /pendapatan|penjualan|hpp|laba|harga|nilai|subtotal|ongkir|diskon|dibayar|kembalian|belanja|modal|rata/i
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/
const PLAIN_DATE = /^\d{4}-\d{2}-\d{2}$/

function isMoneyKey(key: string): boolean {
  return key === 'Total' || MONEY_KEY.test(key)
}

function formatCell(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  if (typeof value === 'number') {
    if (key.includes('(%)') || key === 'Margin (%)') return `${value}%`
    return isMoneyKey(key) ? formatIDR(value) : formatNumber(value)
  }
  const s = String(value)
  if (ISO_DATE.test(s)) return formatDateTime(s)
  if (PLAIN_DATE.test(s)) return formatDate(s)
  return s
}

function isNumericCell(key: string, value: unknown): boolean {
  return typeof value === 'number'
}

export default function AdminReportsPage() {
  const [type, setType] = useState<ReportType>('sales')
  // Dates set after mount to avoid SSR/client timezone mismatch (hydration error)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [ranType, setRanType] = useState<ReportType>('sales')

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type, from, to })
      const d = await apiGet<{ rows: Record<string, unknown>[] }>(`/api/admin/reports?${params.toString()}`)
      setRows(d.rows)
      setRanType(type)
    } catch (e) {
      toast.error('Gagal memuat laporan', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setLoading(false)
    }
  }, [type, from, to])

  // load initial report on mount only (refresh via "Tampilkan" button)
  useEffect(() => {
    setFrom(isoDaysFromToday(-29))
    setTo(isoDaysFromToday(0))
  }, [])

  const reportReady = Boolean(from && to)
  useEffect(() => {
    if (!reportReady) return
    fetchReport()
    // Intentionally runs once per ready state; later refreshes use the "Tampilkan" button.
  }, [reportReady])

  const columns = rows.length ? Object.keys(rows[0]) : []
  const ranLabel = REPORT_TYPES.find((r) => r.value === ranType)?.label ?? ''

  const exportCsv = () => {
    const params = new URLSearchParams({ type, from, to, format: 'csv' })
    window.open(`/api/admin/reports?${params.toString()}`, '_blank')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan" description="Laporan operasional lengkap dengan ekspor CSV dan cetak PDF." />

      {/* Filter bar */}
      <Card className="rounded-none p-6 shadow-none">
        <CardContent className="grid gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <div className="space-y-1.5">
            <Label>Jenis Laporan</Label>
            <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
              <SelectTrigger className="w-full rounded-none" aria-label="Jenis laporan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-from">Dari Tanggal</Label>
            <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-none" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-to">Sampai Tanggal</Label>
            <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-none" />
          </div>
          <div className="flex gap-2 sm:justify-end">
            <Button className="h-10 rounded-none" onClick={fetchReport} disabled={loading}>
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} /> Tampilkan
            </Button>
            <Button variant="outline" className="h-10 gap-2 rounded-none" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Ekspor CSV
            </Button>
            <Button variant="outline" className="h-10 gap-2 rounded-none" onClick={() => window.print()} disabled={rows.length === 0}>
              <Printer className="h-4 w-4" /> Cetak PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {rows.length} baris · {ranLabel} · {formatDate(from)} – {formatDate(to)}
      </p>

      {/* Print-friendly area */}
      <div className="print-receipt space-y-4" style={{ maxWidth: '210mm' }}>
        <div className="hidden print:block">
          <p className="font-display text-lg font-bold tracking-brand">KIKIS</p>
          <p className="text-sm font-semibold uppercase tracking-widest">Laporan {ranLabel}</p>
          <p className="text-xs text-muted-foreground">
            Periode: {formatDate(from)} – {formatDate(to)} · Dicetak {formatDateTime(new Date())}
          </p>
        </div>
        <Card className="rounded-none p-6 shadow-none">
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto custom-scrollbar print:max-h-none">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((c) => (
                        <TableHead key={c} className={cn(isNumericCell(c, rows[0]?.[c]) && 'text-right')}>
                          {c}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  {loading ? (
                    <TableSkeleton colSpan={Math.max(columns.length, 1)} rows={8} />
                  ) : rows.length === 0 ? (
                    <EmptyState colSpan={Math.max(columns.length, 1)} message="Belum ada data pada periode ini" />
                  ) : (
                    <TableBody>
                      {rows.map((row, i) => (
                        <TableRow key={i}>
                          {columns.map((c) => (
                            <TableCell
                              key={c}
                              className={cn(
                                'whitespace-nowrap',
                                isNumericCell(c, row[c]) && 'text-right tabular-nums'
                              )}
                            >
                              {formatCell(c, row[c])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  )}
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
