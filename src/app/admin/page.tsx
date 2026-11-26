'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Calculator,
  Package,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Store,
  TrendingUp,
  UserPlus,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatIDR, formatNumber, PAYMENT_METHOD_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'
import { apiGet, isoDaysFromToday } from '@/components/admin/api'
import { PageHeader } from '@/components/admin/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const CHART_COLORS = ['#B99B79', '#252525', '#8B7355', '#D9CFC1', '#6B6560', '#A39D94', '#D9CFC1']

type Preset = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

interface StatsResponse {
  range: { label: string }
  kpis: {
    netSales: number
    posRevenue: number
    onlineRevenue: number
    grossProfit: number
    grossMargin: number
    transactionCount: number
    onlineOrderCount: number
    newCustomers: number
    avgTransaction: number
    inventoryValue: number
    revenueGrowth: number | null
  }
  lowStock: { variantId: string; productName: string; variantName: string; sku: string; quantity: number; minStock: number }[]
  charts: {
    salesTrend: { date: string; pos: number; online: number; total: number }[]
    byCategory: { name: string; value: number }[]
    topProducts: { name: string; qty: number; revenue: number }[]
    byPaymentMethod: { name: string; value: number }[]
    hourlySales: { hour: string; value: number }[]
  }
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Hari Ini' },
  { key: 'yesterday', label: 'Kemarin' },
  { key: 'week', label: '7 Hari' },
  { key: 'month', label: '30 Hari' },
  { key: 'custom', label: 'Kustom' },
]

function shortDate(d: string): string {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(`${d}T00:00:00`))
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  subTone = 'neutral',
}: {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  subTone?: 'up' | 'down' | 'neutral'
}) {
  return (
    <Card className="rounded-none gap-2 p-4 shadow-none">
      <CardContent className="space-y-2 p-0">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
        </div>
        <p className="text-xl font-semibold tracking-tight lg:text-2xl">{value}</p>
        {sub ? (
          <p
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium',
              subTone === 'up' && 'text-emerald-700',
              subTone === 'down' && 'text-destructive',
              subTone === 'neutral' && 'text-muted-foreground'
            )}
          >
            {subTone === 'up' ? <ArrowUpRight className="h-3.5 w-3.5" /> : null}
            {subTone === 'down' ? <ArrowDownRight className="h-3.5 w-3.5" /> : null}
            {sub}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ChartCard({
  title,
  children,
  action,
  empty,
  className,
}: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
  empty?: boolean
  className?: string
}) {
  return (
    <Card className={cn('rounded-none gap-4 p-6 shadow-none', className)}>
      <CardHeader className="p-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {title}
          </CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {empty ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            Belum ada data pada periode ini
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

const tooltipIDR = (value: number | string | (number | string)[]) => formatIDR(Number(value))

export default function AdminDashboardPage() {
  const [preset, setPreset] = useState<Preset>('today')
  // Dates set after mount to avoid SSR/client timezone mismatch (hydration error)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams({ range: preset })
      if (preset === 'custom') {
        params.set('from', from)
        params.set('to', to)
      }
      const d = await apiGet<StatsResponse>(`/api/admin/stats?${params.toString()}`)
      setData(d)
    } catch (e) {
      setError(true)
      toast.error('Gagal memuat statistik', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setLoading(false)
    }
  }, [preset, from, to])

  useEffect(() => {
    setFrom(isoDaysFromToday(-6))
    setTo(isoDaysFromToday(0))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const applyCustom = () => {
    if (!from || !to) return toast.error('Lengkapi tanggal mulai dan akhir')
    if (from > to) return toast.error('Tanggal mulai tidak boleh setelah tanggal akhir')
    setPreset('custom')
    load()
  }

  const kpis = data?.kpis
  const charts = data?.charts
  const growth = kpis?.revenueGrowth

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Ringkasan performa toko KIKIS secara real-time."
        actions={
          <Button variant="outline" className="h-10 gap-2 rounded-none" onClick={load} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Muat Ulang
          </Button>
        }
      />

      {/* Date range filter */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) =>
          p.key === 'custom' ? (
            <Popover key={p.key}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'h-10 gap-2 rounded-none text-sm',
                    preset === 'custom' && 'border-accent bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <CalendarDays className="h-4 w-4" /> Kustom
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 rounded-none" align="start">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="range-from">Dari Tanggal</Label>
                    <Input id="range-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="range-to">Sampai Tanggal</Label>
                    <Input id="range-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                  </div>
                  <Button className="h-10 w-full rounded-none" onClick={applyCustom}>
                    Terapkan
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Button
              key={p.key}
              variant="outline"
              className={cn(
                'h-10 rounded-none text-sm',
                preset === p.key && 'border-accent bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              onClick={() => setPreset(p.key)}
            >
              {p.label}
            </Button>
          )
        )}
        {data ? (
          <span className="ml-auto text-xs uppercase tracking-widest text-muted-foreground">
            Periode: {data.range.label}
          </span>
        ) : null}
      </div>

      {error ? (
        <Alert className="rounded-none">
          <AlertTitle>Gagal memuat data</AlertTitle>
          <AlertDescription>
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" variant="outline" className="rounded-none" onClick={load}>
                Coba Lagi
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {loading || !kpis
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-none" />)
          : [
              <KpiCard
                key="net"
                icon={Wallet}
                label="Penjualan Bersih"
                value={formatIDR(kpis.netSales)}
                sub={
                  growth === null || growth === undefined
                    ? 'Periode awal'
                    : `${Math.abs(growth)}% vs periode lalu`
                }
                subTone={growth !== null && growth !== undefined ? (growth >= 0 ? 'up' : 'down') : 'neutral'}
              />,
              <KpiCard key="pos" icon={Store} label="Penjualan POS" value={formatIDR(kpis.posRevenue)} />,
              <KpiCard key="online" icon={ShoppingCart} label="Penjualan Online" value={formatIDR(kpis.onlineRevenue)} />,
              <KpiCard
                key="profit"
                icon={TrendingUp}
                label="Laba Kotor"
                value={formatIDR(kpis.grossProfit)}
                sub={`Margin ${kpis.grossMargin}%`}
              />,
              <KpiCard key="tx" icon={Receipt} label="Transaksi POS" value={formatNumber(kpis.transactionCount)} />,
              <KpiCard key="orders" icon={Package} label="Pesanan Online" value={formatNumber(kpis.onlineOrderCount)} />,
              <KpiCard key="cust" icon={UserPlus} label="Pelanggan Baru" value={formatNumber(kpis.newCustomers)} />,
              <KpiCard key="avg" icon={Calculator} label="Rata-rata / Transaksi" value={formatIDR(kpis.avgTransaction)} />,
            ]}
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          title="Tren Penjualan"
          className="lg:col-span-2"
          empty={!loading && (charts?.salesTrend.length ?? 0) === 0}
        >
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={charts?.salesTrend ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E2DA" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#E7E2DA' }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={70}
                tickFormatter={(v: number) => (v >= 1000000 ? `${Math.round(v / 1000000)}jt` : v >= 1000 ? `${Math.round(v / 1000)}rb` : String(v))}
              />
              <Tooltip formatter={tooltipIDR} contentStyle={{ borderRadius: 0, borderColor: '#E7E2DA', fontSize: 12 }} />
              <Area type="monotone" dataKey="pos" name="POS" stroke="#B99B79" fill="#B99B79" fillOpacity={0.25} strokeWidth={2} />
              <Area type="monotone" dataKey="online" name="Online" stroke="#252525" fill="#252525" fillOpacity={0.15} strokeWidth={2} />
              <Line type="monotone" dataKey="total" name="Total" stroke="#8B7355" strokeWidth={2} dot={false} strokeDasharray="4 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Penjualan per Kategori" empty={!loading && (charts?.byCategory.length ?? 0) === 0}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={charts?.byCategory ?? []}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                strokeWidth={1}
              >
                {(charts?.byCategory ?? []).map((entry, i) => (
                  <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={tooltipIDR} contentStyle={{ borderRadius: 0, borderColor: '#E7E2DA', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {(charts?.byCategory ?? []).map((entry, i) => (
              <span key={entry.name} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                {entry.name}
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Produk Terlaris" empty={!loading && (charts?.topProducts.length ?? 0) === 0}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={charts?.topProducts ?? []}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E2DA" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#E7E2DA' }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(v: number | string | (number | string)[]) => `${formatNumber(Number(v))} pcs`}
                contentStyle={{ borderRadius: 0, borderColor: '#E7E2DA', fontSize: 12 }}
              />
              <Bar dataKey="qty" name="Terjual" fill="#B99B79" barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Penjualan per Jam (POS)" empty={!loading && (charts?.hourlySales ?? []).every((h) => h.value === 0)}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={charts?.hourlySales ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E2DA" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} tickLine={false} axisLine={{ stroke: '#E7E2DA' }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={70}
                tickFormatter={(v: number) => (v >= 1000000 ? `${Math.round(v / 1000000)}jt` : v >= 1000 ? `${Math.round(v / 1000)}rb` : String(v))}
              />
              <Tooltip formatter={tooltipIDR} contentStyle={{ borderRadius: 0, borderColor: '#E7E2DA', fontSize: 12 }} />
              <Area type="monotone" dataKey="value" name="Penjualan" stroke="#B99B79" fill="#B99B79" fillOpacity={0.25} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Payment methods + low stock + inventory value */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Metode Pembayaran POS" empty={!loading && (charts?.byPaymentMethod.length ?? 0) === 0}>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-none" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {(charts?.byPaymentMethod ?? []).map((m, i) => {
                const max = Math.max(...(charts?.byPaymentMethod ?? []).map((x) => x.value), 1)
                return (
                  <div key={m.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span>{PAYMENT_METHOD_LABEL[m.name] ?? m.name}</span>
                      <span className="font-medium">{formatIDR(m.value)}</span>
                    </div>
                    <div className="h-2 w-full bg-muted">
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.max(2, Math.round((m.value / max) * 100))}%`,
                          backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>

        <Card className="rounded-none gap-4 p-6 shadow-none lg:col-span-2">
          <CardHeader className="p-0">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Peringatan Stok Menipis
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs uppercase tracking-wider">
                <Link href="/admin/inventaris">Kelola Inventaris</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 rounded-none" />
                ))}
              </div>
            ) : (data?.lowStock.length ?? 0) === 0 ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                Stok aman — tidak ada varian menipis
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead>Varian</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Stok</TableHead>
                      <TableHead className="text-right">Min.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.lowStock.map((item) => (
                      <TableRow key={item.variantId}>
                        <TableCell className="max-w-48 truncate font-medium">{item.productName}</TableCell>
                        <TableCell className="text-muted-foreground">{item.variantName || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn('font-semibold', item.quantity === 0 ? 'text-destructive' : 'text-red-600')}>
                            {item.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{item.minStock}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inventory value strip */}
      <Card className="rounded-none p-6 shadow-none">
        <CardContent className="flex flex-col gap-2 p-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nilai Inventaris</p>
            <p className="mt-1 text-sm text-muted-foreground">Total nilai modal seluruh stok (harga pokok x stok)</p>
          </div>
          {loading || !kpis ? (
            <Skeleton className="h-8 w-48 rounded-none" />
          ) : (
            <p className="text-2xl font-semibold tracking-tight">{formatIDR(kpis.inventoryValue)}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
