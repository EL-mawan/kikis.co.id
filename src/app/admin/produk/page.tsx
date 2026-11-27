'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Layers, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatIDR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { apiGet, apiSend, useDebouncedValue } from '@/components/admin/api'
import { PageHeader } from '@/components/admin/PageHeader'
import {
  AdminProduct,
  ProductFormDialog,
} from '@/components/admin/ProductFormDialog'
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
import { Input } from '@/components/ui/input'
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

interface ProductsResponse {
  products: AdminProduct[]
  total: number
  page: number
  pages: number
}

interface CategoryOption {
  id: string
  name: string
}

function priceRange(p: AdminProduct): string {
  if (!p.variants.length) return formatIDR(p.basePrice)
  const prices = p.variants.map((v) => v.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max ? formatIDR(min) : `${formatIDR(min)} – ${formatIDR(max)}`
}

export default function AdminProductsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ProductsResponse | null>(null)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminProduct | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null)
  const [deleting, setDeleting] = useState(false)

  const debouncedSearch = useDebouncedValue(search)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      if (category !== 'all') params.set('category', category)
      const d = await apiGet<ProductsResponse>(`/api/admin/products?${params.toString()}`)
      setData(d)
    } catch (e) {
      toast.error('Gagal memuat produk', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, category, page])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data-fetch / sync pattern
    load()
  }, [load])

  useEffect(() => {
    apiGet<{ categories: CategoryOption[] }>('/api/admin/categories')
      .then((d) => setCategories(d.categories))
      .catch(() => {
        // filter select is optional — silent fail
      })
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data-fetch / sync pattern
    setPage(1)
  }, [debouncedSearch, category])

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const data = await apiSend<{ message: string }>(`/api/admin/products/${deleteTarget.id}`, 'DELETE')
      toast.success(data.message || 'Produk berhasil dihapus')
      setDeleteTarget(null)
      load()
    } catch (e) {
      toast.error('Gagal menghapus produk', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setDeleting(false)
    }
  }

  const totalStock = (p: AdminProduct) => p.variants.reduce((a, v) => a + v.stock, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produk"
        description="Kelola katalog produk KIKIS beserta gambar dan varian awalnya."
        actions={
          <Button
            className="h-10 gap-2 rounded-none"
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> Tambah Produk
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau slug produk..."
            className="h-10 rounded-none pl-9"
            aria-label="Cari produk"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-10 w-full rounded-none sm:w-56" aria-label="Filter kategori">
            <SelectValue placeholder="Semua kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data ? (
          <p className="text-xs uppercase tracking-widest text-muted-foreground sm:ml-auto">
            {data.total} produk
          </p>
        ) : null}
      </div>

      <Card className="rounded-none p-6 shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-56">Produk</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead className="text-center">Varian</TableHead>
                  <TableHead className="text-center">Total Stok</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              {loading ? (
                <TableSkeleton colSpan={7} rows={6} />
              ) : !data || data.products.length === 0 ? (
                <EmptyState colSpan={7} />
              ) : (
                <TableBody>
                  {data.products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={`Foto produk ${p.name}`}
                              className="h-11 w-11 shrink-0 border border-border object-cover"
                            />
                          ) : (
                            <div
                              aria-hidden="true"
                              className="flex h-11 w-11 shrink-0 items-center justify-center border border-border bg-muted text-[10px] uppercase tracking-widest text-muted-foreground"
                            >
                              Kikis
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium">{p.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.isFeatured ? 'Unggulan · ' : ''}/{p.slug}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.categoryName}</TableCell>
                      <TableCell className="whitespace-nowrap">{priceRange(p)}</TableCell>
                      <TableCell className="text-center">{p.variants.length}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn(totalStock(p) === 0 && 'text-destructive font-semibold')}>
                          {totalStock(p)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'border-transparent',
                            p.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {p.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => {
                              setEditing(p)
                              setDialogOpen(true)
                            }}
                            aria-label={`Ubah produk ${p.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            aria-label={`Kelola varian ${p.name}`}
                          >
                            <Link href="/admin/varian">
                              <Layers className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(p)}
                            aria-label={`Hapus produk ${p.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
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

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
        categories={categories}
        onSaved={load}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus produk?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk <span className="font-semibold">{deleteTarget?.name}</span> akan dihapus. Jika produk memiliki
              riwayat transaksi, produk hanya akan dinonaktifkan (soft delete).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none bg-destructive text-white hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
