'use client'

import { useCallback, useEffect, useState } from 'react'
import { Boxes, Loader2, Search, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTime, formatIDR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { apiGet, apiSend, useDebouncedValue } from '@/components/admin/api'
import { PageHeader } from '@/components/admin/PageHeader'
import { EmptyState, TableSkeleton } from '@/components/admin/table-bits'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

interface InventoryRow {
  variantId: string
  productName: string
  variantName: string
  sku: string
  barcode: string
  quantity: number
  minStock: number
  isLow: boolean
  updatedAt: string
}

interface MovementRow {
  id: string
  productName: string
  variantName: string
  sku: string
  type: string
  typeLabel: string
  quantity: number
  stockBefore: number
  stockAfter: number
  reference: string | null
  note: string | null
  userName: string | null
  createdAt: string
}

interface InventoryResponse {
  inventories: InventoryRow[]
  lowStockCount: number
  totalValue: number
  movements: MovementRow[]
}

const ADJUST_TYPES: { value: string; label: string }[] = [
  { value: 'PURCHASE', label: 'Pembelian (+)' },
  { value: 'CUSTOMER_RETURN', label: 'Retur Pelanggan (+)' },
  { value: 'STOCK_ADJUSTMENT', label: 'Penyesuaian (+)' },
  { value: 'DAMAGED', label: 'Barang Rusak (-)' },
  { value: 'STOCK_OPNAME', label: 'Stok Opname (set fisik)' },
]

function movementBadgeClass(type: string): string {
  if (type === 'PURCHASE' || type === 'CUSTOMER_RETURN') return 'bg-emerald-100 text-emerald-800'
  if (type === 'DAMAGED') return 'bg-red-100 text-red-800'
  if (type === 'POS_SALE' || type === 'ONLINE_SALE') return 'bg-secondary text-secondary-foreground'
  return 'bg-muted text-muted-foreground'
}

export default function AdminInventoryPage() {
  const [data, setData] = useState<InventoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [lowOnly, setLowOnly] = useState(false)

  const [tab, setTab] = useState('stock')
  const [adjustTarget, setAdjustTarget] = useState<InventoryRow | null>(null)
  const [adjustType, setAdjustType] = useState('PURCHASE')
  const [qty, setQty] = useState('')
  const [fixedQty, setFixedQty] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const debouncedSearch = useDebouncedValue(search)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      if (lowOnly) params.set('lowStock', '1')
      const d = await apiGet<InventoryResponse>(`/api/admin/inventory?${params.toString()}`)
      setData(d)
    } catch (e) {
      toast.error('Gagal memuat inventaris', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, lowOnly])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data-fetch / sync pattern
    load()
  }, [load])

  const openAdjust = (row: InventoryRow) => {
    setAdjustTarget(row)
    setAdjustType('PURCHASE')
    setQty('')
    setFixedQty('')
    setNote('')
  }

  const isOpname = adjustType === 'STOCK_OPNAME'
  const projected = (() => {
    if (!adjustTarget) return null
    if (isOpname) return fixedQty === '' ? null : Number(fixedQty)
    const q = Number(qty || 0)
    if (!q) return null
    return adjustTarget.quantity + (adjustType === 'DAMAGED' ? -q : q)
  })()

  const submitAdjust = async () => {
    if (!adjustTarget) return
    if (!isOpname && (!qty || Number(qty) <= 0)) return toast.error('Jumlah harus lebih dari 0')
    if (isOpname && (fixedQty === '' || Number(fixedQty) < 0)) return toast.error('Jumlah fisik wajib diisi')
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        variantId: adjustTarget.variantId,
        type: adjustType,
        note: note.trim() || undefined,
      }
      if (isOpname) payload.fixedQuantity = Number(fixedQty)
      else payload.quantity = Number(qty)
      const d = await apiSend<{ message: string }>('/api/admin/inventory', 'POST', payload)
      toast.success(d.message || 'Stok berhasil diperbarui')
      setAdjustTarget(null)
      load()
    } catch (e) {
      toast.error('Gagal memperbarui stok', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Inventaris" description="Pantau stok, nilai inventaris, dan seluruh pergerakan stok gudang." />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="rounded-none p-6 shadow-none">
          <CardContent className="space-y-2 p-0">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Nilai Inventaris</p>
              <Wallet className="h-4 w-4 text-accent" aria-hidden="true" />
            </div>
            {loading || !data ? (
              <p className="text-2xl font-semibold">—</p>
            ) : (
              <p className="text-2xl font-semibold tracking-tight">{formatIDR(data.totalValue)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-none p-6 shadow-none">
          <CardContent className="space-y-2 p-0">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Item Stok Menipis</p>
              <Boxes className="h-4 w-4 text-accent" aria-hidden="true" />
            </div>
            {loading || !data ? (
              <p className="text-2xl font-semibold">—</p>
            ) : (
              <p className={cn('text-2xl font-semibold tracking-tight', data.lowStockCount > 0 && 'text-destructive')}>
                {data.lowStockCount}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-none p-6 shadow-none">
          <CardContent className="space-y-2 p-0">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Pergerakan Terakhir</p>
              <Boxes className="h-4 w-4 text-accent" aria-hidden="true" />
            </div>
            {loading || !data ? (
              <p className="text-2xl font-semibold">—</p>
            ) : (
              <p className="text-2xl font-semibold tracking-tight">{data.movements.length} entri</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-10 justify-start gap-0 rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="stock"
            className="h-10 rounded-none px-4 text-sm data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Stok Saat Ini
          </TabsTrigger>
          <TabsTrigger
            value="movements"
            className="h-10 rounded-none px-4 text-sm data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Riwayat Pergerakan
          </TabsTrigger>
        </TabsList>

        {/* Tab 1 — current stock */}
        <TabsContent value="stock" className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari produk, SKU, barcode..."
                className="h-10 rounded-none pl-9"
                aria-label="Cari stok"
              />
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <Switch id="low-only" checked={lowOnly} onCheckedChange={setLowOnly} />
              <Label htmlFor="low-only" className="cursor-pointer text-sm">
                Hanya stok menipis
              </Label>
            </div>
          </div>

          <Card className="rounded-none p-6 shadow-none">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-44">Produk</TableHead>
                      <TableHead>Varian</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead className="text-center">Stok</TableHead>
                      <TableHead className="text-center">Min.</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  {loading ? (
                    <TableSkeleton colSpan={7} rows={8} />
                  ) : !data || data.inventories.length === 0 ? (
                    <EmptyState colSpan={7} />
                  ) : (
                    <TableBody>
                      {data.inventories.map((row) => (
                        <TableRow key={row.variantId}>
                          <TableCell className="font-medium">{row.productName}</TableCell>
                          <TableCell className="text-muted-foreground">{row.variantName || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                          <TableCell className="font-mono text-xs">{row.barcode}</TableCell>
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                'inline-flex min-w-10 justify-center px-2 py-0.5 text-xs font-semibold',
                                row.isLow ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                              )}
                            >
                              {row.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">{row.minStock}</TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-none"
                                onClick={() => openAdjust(row)}
                              >
                                Sesuaikan
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  )}
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2 — movements */}
        <TabsContent value="movements" className="mt-6">
          <Card className="rounded-none p-6 shadow-none">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead className="min-w-40">Produk</TableHead>
                      <TableHead>Varian</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-center">Stok</TableHead>
                      <TableHead>Referensi</TableHead>
                      <TableHead>Petugas</TableHead>
                    </TableRow>
                  </TableHeader>
                  {loading ? (
                    <TableSkeleton colSpan={8} rows={8} />
                  ) : !data || data.movements.length === 0 ? (
                    <EmptyState colSpan={8} message="Belum ada pergerakan stok" />
                  ) : (
                    <TableBody>
                      {data.movements.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(m.createdAt)}</TableCell>
                          <TableCell className="font-medium">{m.productName}</TableCell>
                          <TableCell className="text-muted-foreground">{m.variantName || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('border-transparent', movementBadgeClass(m.type))}>
                              {m.typeLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={cn('font-semibold', m.quantity >= 0 ? 'text-emerald-700' : 'text-destructive')}>
                              {m.quantity >= 0 ? `+${m.quantity}` : m.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {m.stockBefore} → <span className="font-medium text-foreground">{m.stockAfter}</span>
                          </TableCell>
                          <TableCell className="max-w-32 truncate font-mono text-xs text-muted-foreground">
                            {m.reference || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{m.userName || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  )}
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Adjust dialog */}
      <Dialog open={Boolean(adjustTarget)} onOpenChange={(v) => !v && setAdjustTarget(null)}>
        <DialogContent className="rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-widest">Sesuaikan Stok</DialogTitle>
            <DialogDescription>
              {adjustTarget ? `${adjustTarget.productName} — ${adjustTarget.variantName}` : ''} · SKU {adjustTarget?.sku}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tipe Pergerakan</Label>
              <Select value={adjustType} onValueChange={setAdjustType}>
                <SelectTrigger className="w-full rounded-none" aria-label="Tipe pergerakan stok">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADJUST_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              {isOpname ? (
                <>
                  <Label htmlFor="adj-fixed">Jumlah Fisik (hasil hitung)</Label>
                  <Input
                    id="adj-fixed"
                    type="number"
                    min={0}
                    value={fixedQty}
                    onChange={(e) => setFixedQty(e.target.value)}
                    placeholder="0"
                  />
                </>
              ) : (
                <>
                  <Label htmlFor="adj-qty">Jumlah</Label>
                  <Input
                    id="adj-qty"
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="0"
                  />
                </>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-note">Catatan</Label>
              <Textarea
                id="adj-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="cth. Pembelian dari supplier, nomor invoice..."
              />
            </div>
            <Alert className="rounded-none">
              <AlertDescription>
                <div className="flex items-center justify-between text-sm">
                  <span>Stok saat ini</span>
                  <span className="font-semibold">{adjustTarget?.quantity ?? 0}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span>Hasil setelah penyesuaian</span>
                  <span className={cn('font-semibold', projected !== null && projected !== adjustTarget?.quantity && 'text-accent')}>
                    {projected === null ? '—' : projected}
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-none" onClick={() => setAdjustTarget(null)} disabled={saving}>
              Batal
            </Button>
            <Button className="gap-2 rounded-none" onClick={submitAdjust} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
