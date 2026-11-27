'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Printer, RefreshCcw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { formatIDR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { apiGet, apiSend, useDebouncedValue } from '@/components/admin/api'
import { PageHeader } from '@/components/admin/PageHeader'
import {
  BarcodeLabelSheet,
  BarcodeVariant,
} from '@/components/admin/BarcodeLabel'
import { EmptyState, TableSkeleton } from '@/components/admin/table-bits'
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
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface VariantsMeta {
  sizes: { id: string; name: string }[]
  colors: { id: string; name: string; hexCode: string }[]
}

export default function AdminBarcodePage() {
  const [variants, setVariants] = useState<BarcodeVariant[]>([])
  const [meta, setMeta] = useState<VariantsMeta>({ sizes: [], colors: [] })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [printOpen, setPrintOpen] = useState(false)
  const [labelMode, setLabelMode] = useState<'58mm' | '80mm'>('58mm')
  const [regenTarget, setRegenTarget] = useState<BarcodeVariant | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  const debouncedSearch = useDebouncedValue(search)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      const d = await apiGet<{ variants: BarcodeVariant[] }>(`/api/admin/barcodes?${params.toString()}`)
      setVariants(d.variants)
      // keep only existing rows in the selection
      setSelected((prev) => new Set([...prev].filter((id) => d.variants.some((v) => v.id === id))))
    } catch (e) {
      toast.error('Gagal memuat barcode', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data-fetch / sync pattern
    load()
  }, [load])

  useEffect(() => {
    apiGet<VariantsMeta>('/api/admin/variants-meta')
      .then(setMeta)
      .catch(() => {
        // color dots are decorative — silent fail
      })
  }, [])

  const getColorHex = useCallback(
    (v: BarcodeVariant): string | null => {
      const firstPart = v.variantName.split(' - ')[0]
      if (!firstPart) return null
      return meta.colors.find((c) => c.name === firstPart)?.hexCode ?? null
    },
    [meta.colors]
  )

  const allSelected = useMemo(
    () => variants.length > 0 && variants.every((v) => selected.has(v.id)),
    [variants, selected]
  )

  const selectedVariants = useMemo(
    () => variants.filter((v) => selected.has(v.id)),
    [variants, selected]
  )

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(variants.map((v) => v.id)))
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const confirmRegenerate = async () => {
    if (!regenTarget) return
    setRegenerating(true)
    try {
      const d = await apiSend<{ message: string }>('/api/admin/barcodes', 'POST', { variantId: regenTarget.id })
      toast.success(d.message || 'Barcode berhasil diperbarui')
      setRegenTarget(null)
      load()
    } catch (e) {
      toast.error('Gagal regenerasi barcode', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setRegenerating(false)
    }
  }

  const printLabels = (list: BarcodeVariant[]) => {
    if (!list.length) return
    setSelected(new Set(list.map((v) => v.id)))
    setPrintOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Barcode"
        description="Kelola barcode varian dan cetak label harga untuk kebutuhan display toko."
        actions={
          <Button
            className="h-10 gap-2 rounded-none"
            disabled={selectedVariants.length === 0}
            onClick={() => setPrintOpen(true)}
          >
            <Printer className="h-4 w-4" /> Cetak Label ({selectedVariants.length})
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari barcode, SKU, produk..."
            className="h-10 rounded-none pl-9"
            aria-label="Cari barcode"
          />
        </div>
        {!loading ? (
          <p className="text-xs uppercase tracking-widest text-muted-foreground sm:ml-auto">{variants.length} varian</p>
        ) : null}
      </div>

      <Card className="rounded-none p-6 shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Pilih semua varian"
                      className="translate-y-[2px]"
                    />
                  </TableHead>
                  <TableHead className="w-14">Foto</TableHead>
                  <TableHead className="min-w-40">Produk</TableHead>
                  <TableHead>Varian</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead className="text-center">Stok</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              {loading ? (
                <TableSkeleton colSpan={9} rows={6} />
              ) : variants.length === 0 ? (
                <EmptyState colSpan={9} />
              ) : (
                <TableBody>
                  {variants.map((v) => (
                    <TableRow key={v.id} data-state={selected.has(v.id) ? 'selected' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(v.id)}
                          onCheckedChange={() => toggleOne(v.id)}
                          aria-label={`Pilih varian ${v.productName} ${v.variantName}`}
                          className="translate-y-[2px]"
                        />
                      </TableCell>
                      <TableCell>
                        {v.image ? (
                          <img
                            src={v.image}
                            alt={`Foto produk ${v.productName}`}
                            className="h-10 w-10 border border-border object-cover"
                          />
                        ) : (
                          <div aria-hidden="true" className="h-10 w-10 border border-border bg-muted" />
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{v.productName}</p>
                        {!v.productActive ? (
                          <Badge variant="outline" className="mt-1 border-transparent bg-muted text-muted-foreground">
                            Produk Nonaktif
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{v.variantName || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{v.sku}</TableCell>
                      <TableCell className="font-mono text-xs">{v.barcode}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatIDR(v.price)}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            'inline-flex min-w-8 justify-center px-2 py-0.5 text-xs font-semibold',
                            v.stock === 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          )}
                        >
                          {v.stock}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5 rounded-none"
                            onClick={() => printLabels([v])}
                          >
                            <Printer className="h-4 w-4" /> Cetak Label
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => setRegenTarget(v)}
                            aria-label={`Regenerasi barcode ${v.sku}`}
                          >
                            <RefreshCcw className="h-4 w-4" />
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

      {/* Print dialog with live label preview */}
      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto custom-scrollbar sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-widest">Cetak Label</DialogTitle>
            <DialogDescription>
              {selectedVariants.length} label akan dicetak. Pilih ukuran label sesuai printer thermal Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="w-40 space-y-1.5">
              <Label htmlFor="label-size">Ukuran Label</Label>
              <Select value={labelMode} onValueChange={(v) => setLabelMode(v as '58mm' | '80mm')}>
                <SelectTrigger id="label-size" className="w-full rounded-none" aria-label="Ukuran label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58 mm (2 kolom)</SelectItem>
                  <SelectItem value="80mm">80 mm (1 kolom)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {selectedVariants.length > 0 ? (
                <div className="flex -space-x-2">
                  {selectedVariants.slice(0, 4).map((v) =>
                    v.image ? (
                      <img
                        key={v.id}
                        src={v.image}
                        alt={`Foto ${v.productName}`}
                        className="h-8 w-8 border border-border object-cover"
                      />
                    ) : (
                      <div key={v.id} aria-hidden="true" className="h-8 w-8 border border-border bg-muted" />
                    )
                  )}
                </div>
              ) : null}
              <span>{selectedVariants.length} varian terpilih</span>
            </div>
          </div>
          <div className="flex justify-center overflow-x-auto bg-muted p-4">
            {selectedVariants.length === 0 ? (
              <p className="py-8 text-sm text-muted-foreground">Pilih varian terlebih dahulu.</p>
            ) : (
              <BarcodeLabelSheet variants={selectedVariants} mode={labelMode} getColorHex={getColorHex} />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-none" onClick={() => setPrintOpen(false)}>
              Tutup
            </Button>
            <Button
              className="gap-2 rounded-none"
              onClick={() => window.print()}
              disabled={selectedVariants.length === 0}
            >
              <Printer className="h-4 w-4" /> Cetak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden print area — visible only when printing via .print-receipt CSS */}
      <div
        aria-hidden="true"
        className="print-receipt fixed left-[-9999px] top-0 bg-white p-[3mm]"
        style={{ maxWidth: labelMode === '58mm' ? '126mm' : '86mm' }}
      >
        <BarcodeLabelSheet variants={selectedVariants} mode={labelMode} getColorHex={getColorHex} />
      </div>

      <AlertDialog open={Boolean(regenTarget)} onOpenChange={(v) => !v && setRegenTarget(null)}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerasi barcode?</AlertDialogTitle>
            <AlertDialogDescription>
              Barcode baru akan dibuat untuk{' '}
              <span className="font-semibold">
                {regenTarget?.productName} {regenTarget?.variantName}
              </span>{' '}
              (SKU {regenTarget?.sku}). Label lama yang sudah dicetak tidak lagi berlaku.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none"
              disabled={regenerating}
              onClick={(e) => {
                e.preventDefault()
                confirmRegenerate()
              }}
            >
              {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Regenerasi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
