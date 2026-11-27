'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatIDR } from '@/lib/format'
import { apiGet, apiSend } from '@/components/admin/api'
import { Button } from '@/components/ui/button'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

export interface AdminProductVariant {
  id: string
  sku: string
  barcode: string
  size: string | null
  color: string | null
  price: number
  costPrice: number
  stock: number
  minStock: number
  isActive: boolean
}

export interface AdminProduct {
  id: string
  name: string
  slug: string
  description: string | null
  categoryId: string
  categoryName: string
  basePrice: number
  costPrice: number
  isActive: boolean
  isFeatured: boolean
  image: string | null
  createdAt: string
  variants: AdminProductVariant[]
}

interface VariantsMeta {
  sizes: { id: string; name: string }[]
  colors: { id: string; name: string; hexCode: string }[]
}

interface VariantRow {
  sizeId: string
  colorId: string
  price: string
  costPrice: string
  stock: string
  sku: string
  barcode: string
}

function emptyVariant(): VariantRow {
  return { sizeId: '', colorId: '', price: '', costPrice: '', stock: '0', sku: '', barcode: '' }
}

interface FullProduct {
  id: string
  name: string
  description: string | null
  categoryId: string
  basePrice: number
  costPrice: number
  isActive: boolean
  isFeatured: boolean
  images: { url: string; altText?: string | null }[]
  variants: AdminProductVariant[]
}

/** Create/Edit product dialog — create mode also builds initial variants. */
export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  product: AdminProduct | null
  categories: { id: string; name: string }[]
  onSaved: () => void
}) {
  const isEdit = Boolean(product)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [images, setImages] = useState<string[]>([''])
  const [variantRows, setVariantRows] = useState<VariantRow[]>([emptyVariant()])
  const [meta, setMeta] = useState<VariantsMeta>({ sizes: [], colors: [] })
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load sizes/colors meta once
  useEffect(() => {
    if (!open) return
    apiGet<VariantsMeta>('/api/admin/variants-meta')
      .then(setMeta)
      .catch((e: Error) => toast.error('Gagal memuat ukuran/warna', { description: e.message }))
  }, [open])

  // Prefill for edit / reset for create
  useEffect(() => {
    if (!open) return
    if (product) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data-fetch / sync pattern
      setLoadingDetail(true)
      apiGet<{ product: FullProduct }>(`/api/admin/products/${product.id}`)
        .then(({ product: p }) => {
          setName(p.name)
          setDescription(p.description ?? '')
          setCategoryId(p.categoryId)
          setBasePrice(String(p.basePrice ?? ''))
          setCostPrice(String(p.costPrice ?? ''))
          setIsFeatured(p.isFeatured)
          setIsActive(p.isActive)
          setImages(p.images.length ? p.images.map((i) => i.url) : [''])
        })
        .catch((e: Error) => {
          toast.error('Gagal memuat detail produk', { description: e.message })
          setName(product.name)
          setCategoryId(product.categoryId)
        })
        .finally(() => setLoadingDetail(false))
    } else {
      setName('')
      setDescription('')
      setCategoryId('')
      setBasePrice('')
      setCostPrice('')
      setIsFeatured(false)
      setIsActive(true)
      setImages([''])
      setVariantRows([emptyVariant()])
    }
  }, [open, product])

  const updateRow = useCallback((idx: number, patch: Partial<VariantRow>) => {
    setVariantRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }, [])

  const submit = async () => {
    if (!name.trim()) return toast.error('Nama produk wajib diisi')
    if (!categoryId) return toast.error('Kategori wajib dipilih')

    const imageUrls = images.map((u) => u.trim()).filter(Boolean)
    setSaving(true)
    try {
      if (isEdit && product) {
        const data = await apiSend<{ message: string }>(`/api/admin/products/${product.id}`, 'PUT', {
          name,
          description,
          categoryId,
          basePrice: Number(basePrice || 0),
          costPrice: Number(costPrice || 0),
          isFeatured,
          isActive,
          images: imageUrls.map((url) => ({ url })),
        })
        toast.success(data.message || 'Produk berhasil diperbarui')
      } else {
        const cleanVariants = variantRows.map((v) => ({
          sizeId: v.sizeId || undefined,
          colorId: v.colorId || undefined,
          price: Number(v.price || 0),
          costPrice: v.costPrice ? Number(v.costPrice) : undefined,
          stock: v.stock ? Number(v.stock) : undefined,
          sku: v.sku.trim() || undefined,
          barcode: v.barcode.trim() || undefined,
        }))
        if (!cleanVariants.length) return toast.error('Minimal satu varian wajib ditambahkan')
        if (cleanVariants.some((v) => !v.price || v.price <= 0)) {
          return toast.error('Harga jual varian wajib lebih dari 0')
        }
        const data = await apiSend<{ message: string }>('/api/admin/products', 'POST', {
          name,
          description,
          categoryId,
          basePrice: Number(basePrice || 0),
          costPrice: Number(costPrice || 0),
          isFeatured,
          images: imageUrls.map((url) => ({ url })),
          variants: cleanVariants,
        })
        toast.success(data.message || 'Produk berhasil dibuat')
      }
      onSaved()
      onOpenChange(false)
    } catch (e) {
      toast.error('Gagal menyimpan produk', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto custom-scrollbar sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-widest">
            {isEdit ? 'Ubah Produk' : 'Tambah Produk'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Perbarui informasi produk. Varian dikelola di halaman Varian Produk.'
              : 'Lengkapi detail produk beserta varian dan stok awalnya.'}
          </DialogDescription>
        </DialogHeader>

        {loadingDetail ? (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat detail produk...
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="product-name">
                  Nama Produk <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="product-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="cth. Kemeja Linen Oversize"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="product-desc">Deskripsi</Label>
                <Textarea
                  id="product-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Bahan, potongan, detail jahitan..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Kategori <span className="text-destructive">*</span>
                </Label>
                <Select value={categoryId || undefined} onValueChange={setCategoryId}>
                  <SelectTrigger className="w-full" aria-label="Kategori produk">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-base-price">Harga Dasar (Rp)</Label>
                <Input
                  id="product-base-price"
                  type="number"
                  min={0}
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-cost-price">Harga Pokok (Rp)</Label>
                <Input
                  id="product-cost-price"
                  type="number"
                  min={0}
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center gap-6 pt-1 sm:col-span-2 sm:pt-0">
                <div className="flex items-center gap-2">
                  <Switch id="product-featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
                  <Label htmlFor="product-featured" className="cursor-pointer">
                    Produk Unggulan
                  </Label>
                </div>
                {isEdit ? (
                  <div className="flex items-center gap-2">
                    <Switch id="product-active" checked={isActive} onCheckedChange={setIsActive} />
                    <Label htmlFor="product-active" className="cursor-pointer">
                      Produk Aktif
                    </Label>
                  </div>
                ) : null}
              </div>
            </div>

            <Separator />

            {/* Images */}
            <div className="space-y-2">
              <Label>Gambar Produk (URL)</Label>
              <p className="text-xs text-muted-foreground">Gambar pertama menjadi gambar utama produk.</p>
              {images.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={url}
                    onChange={(e) => setImages((imgs) => imgs.map((u, i) => (i === idx ? e.target.value : u)))}
                    placeholder={idx === 0 ? 'https://... (utama)' : 'https://...'}
                    aria-label={`URL gambar ${idx + 1}`}
                  />
                  {images.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 text-destructive"
                      onClick={() => setImages((imgs) => imgs.filter((_, i) => i !== idx))}
                      aria-label="Hapus gambar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-none"
                onClick={() => setImages((imgs) => [...imgs, ''])}
              >
                <Plus className="h-4 w-4" /> Tambah Gambar
              </Button>
            </div>

            <Separator />

            {/* Variants */}
            {isEdit ? (
              <div className="space-y-2">
                <Label>Varian ({product?.variants.length ?? 0})</Label>
                <div className="max-h-44 overflow-y-auto custom-scrollbar rounded-none border">
                  {product?.variants.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between gap-3 border-b px-3 py-2 text-sm last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {[v.color, v.size].filter(Boolean).join(' / ') || 'Standar'}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">{v.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatIDR(v.price)}</p>
                        <p className="text-xs text-muted-foreground">Stok: {v.stock}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Varian bersifat baca-saja di sini — kelola varian di halaman Varian Produk.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>
                    Varian <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 rounded-none"
                    onClick={() => setVariantRows((rows) => [...rows, emptyVariant()])}
                  >
                    <Plus className="h-4 w-4" /> Tambah Varian
                  </Button>
                </div>
                <div className="space-y-3">
                  {variantRows.map((row, idx) => (
                    <div key={idx} className="space-y-3 rounded-none border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                          Varian #{idx + 1}
                        </p>
                        {variantRows.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setVariantRows((rows) => rows.filter((_, i) => i !== idx))}
                            aria-label="Hapus varian"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>Ukuran</Label>
                          <Select
                            value={row.sizeId || 'none'}
                            onValueChange={(v) => updateRow(idx, { sizeId: v === 'none' ? '' : v })}
                          >
                            <SelectTrigger className="w-full" aria-label="Ukuran varian">
                              <SelectValue placeholder="Pilih ukuran" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Tanpa ukuran</SelectItem>
                              {meta.sizes.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Warna</Label>
                          <Select
                            value={row.colorId || 'none'}
                            onValueChange={(v) => updateRow(idx, { colorId: v === 'none' ? '' : v })}
                          >
                            <SelectTrigger className="w-full" aria-label="Warna varian">
                              <SelectValue placeholder="Pilih warna" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Tanpa warna</SelectItem>
                              {meta.colors.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>
                            Harga Jual (Rp) <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={row.price}
                            onChange={(e) => updateRow(idx, { price: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Harga Pokok (Rp)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={row.costPrice}
                            onChange={(e) => updateRow(idx, { costPrice: e.target.value })}
                            placeholder="Default: harga pokok produk"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Stok Awal</Label>
                          <Input
                            type="number"
                            min={0}
                            value={row.stock}
                            onChange={(e) => updateRow(idx, { stock: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label htmlFor={`sku-${idx}`}>SKU</Label>
                            <Input
                              id={`sku-${idx}`}
                              value={row.sku}
                              onChange={(e) => updateRow(idx, { sku: e.target.value })}
                              placeholder="Otomatis jika kosong"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`barcode-${idx}`}>Barcode</Label>
                            <Input
                              id={`barcode-${idx}`}
                              value={row.barcode}
                              onChange={(e) => updateRow(idx, { barcode: e.target.value })}
                              placeholder="Otomatis jika kosong"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-none" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={submit} disabled={saving || loadingDetail} className="gap-2 rounded-none">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEdit ? 'Simpan Perubahan' : 'Simpan Produk'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
