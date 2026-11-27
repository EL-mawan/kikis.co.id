'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Info, Pencil, Search } from 'lucide-react'
import { toast } from 'sonner'
import { formatIDR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { apiGet, apiSend } from '@/components/admin/api'
import { PageHeader } from '@/components/admin/PageHeader'
import { EmptyState, TableSkeleton } from '@/components/admin/table-bits'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AdminProduct } from '@/components/admin/ProductFormDialog'

interface FlatVariant {
  id: string
  productId: string
  productName: string
  variantName: string
  sku: string
  barcode: string
  price: number
  costPrice: number
  stock: number
  minStock: number
  isActive: boolean
}

export default function AdminVariantsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [editTarget, setEditTarget] = useState<FlatVariant | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editCost, setEditCost] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await apiGet<{ products: AdminProduct[] }>('/api/admin/products?limit=100')
      setProducts(d.products)
    } catch (e) {
      toast.error('Gagal memuat varian produk', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data-fetch / sync pattern
    load()
  }, [load])

  const variants = useMemo<FlatVariant[]>(
    () =>
      products.flatMap((p) =>
        p.variants.map((v) => ({
          id: v.id,
          productId: p.id,
          productName: p.name,
          variantName: [v.color, v.size].filter(Boolean).join(' / ') || 'Standar',
          sku: v.sku,
          barcode: v.barcode,
          price: v.price,
          costPrice: v.costPrice,
          stock: v.stock,
          minStock: v.minStock,
          isActive: v.isActive,
        }))
      ),
    [products]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return variants
    return variants.filter(
      (v) =>
        v.productName.toLowerCase().includes(q) ||
        v.variantName.toLowerCase().includes(q) ||
        v.sku.toLowerCase().includes(q) ||
        v.barcode.toLowerCase().includes(q)
    )
  }, [variants, search])

  const openEdit = (v: FlatVariant) => {
    setEditTarget(v)
    setEditPrice(String(v.price))
    setEditCost(String(v.costPrice))
  }

  const submitEdit = async () => {
    if (!editTarget) return
    if (!editPrice || Number(editPrice) <= 0) return toast.error('Harga jual wajib lebih dari 0')
    setSaving(true)
    try {
      const data = await apiSend<{ message?: string }>(`/api/admin/variants/${editTarget.id}`, 'PUT', {
        price: Number(editPrice),
        costPrice: Number(editCost || 0),
      })
      toast.success(data.message || 'Varian berhasil diperbarui')
      setEditTarget(null)
      load()
    } catch (e) {
      toast.error('Gagal memperbarui varian', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Varian Produk" description="Unit stok & barcode utama dari setiap produk." />

      <Alert className="rounded-none">
        <Info className="h-4 w-4" aria-hidden="true" />
        <AlertDescription>
          Varian adalah unit stok & barcode utama. Perubahan jumlah stok dilakukan lewat halaman{' '}
          <span className="font-medium">Inventaris</span>, cetak label lewat halaman <span className="font-medium">Barcode</span>.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk, SKU, barcode..."
            className="h-10 rounded-none pl-9"
            aria-label="Cari varian"
          />
        </div>
        {!loading ? (
          <p className="text-xs uppercase tracking-widest text-muted-foreground sm:ml-auto">
            {filtered.length} varian dari {products.length} produk
          </p>
        ) : null}
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
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead className="text-right">HPP</TableHead>
                  <TableHead className="text-center">Stok</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              {loading ? (
                <TableSkeleton colSpan={9} rows={8} />
              ) : filtered.length === 0 ? (
                <EmptyState colSpan={9} />
              ) : (
                <TableBody>
                  {filtered.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.productName}</TableCell>
                      <TableCell className="text-muted-foreground">{v.variantName}</TableCell>
                      <TableCell className="font-mono text-xs">{v.sku}</TableCell>
                      <TableCell className="font-mono text-xs">{v.barcode}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatIDR(v.price)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                        {formatIDR(v.costPrice)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            'inline-flex min-w-8 justify-center px-2 py-0.5 text-xs font-semibold',
                            v.stock <= v.minStock
                              ? 'bg-red-100 text-red-800'
                              : 'bg-emerald-100 text-emerald-800'
                          )}
                        >
                          {v.stock}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'border-transparent',
                            v.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {v.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => openEdit(v)}
                            aria-label={`Ubah varian ${v.sku}`}
                          >
                            <Pencil className="h-4 w-4" />
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

      <Dialog open={Boolean(editTarget)} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-widest">Ubah Varian</DialogTitle>
            <DialogDescription>
              {editTarget ? `${editTarget.productName} — ${editTarget.variantName}` : ''} · SKU {editTarget?.sku}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="variant-price">Harga Jual (Rp)</Label>
                <Input
                  id="variant-price"
                  type="number"
                  min={0}
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="variant-cost">Harga Pokok (Rp)</Label>
                <Input
                  id="variant-cost"
                  type="number"
                  min={0}
                  value={editCost}
                  onChange={(e) => setEditCost(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Stok berubah melalui halaman Inventaris (pembelian, penyesuaian, opname).
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-none" onClick={() => setEditTarget(null)} disabled={saving}>
              Batal
            </Button>
            <Button className="rounded-none" onClick={submitEdit} disabled={saving}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
