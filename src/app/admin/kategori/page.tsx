'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiGet, apiSend } from '@/components/admin/api'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/admin/PageHeader'
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
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

interface AdminCategory {
  id: string
  name: string
  slug: string
  description: string | null
  isActive: boolean
  sortOrder: number
  productCount: number
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminCategory | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await apiGet<{ categories: AdminCategory[] }>('/api/admin/categories')
      setCategories(d.categories)
    } catch (e) {
      toast.error('Gagal memuat kategori', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data-fetch / sync pattern
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setName('')
    setDescription('')
    setSortOrder('0')
    setIsActive(true)
    setDialogOpen(true)
  }

  const openEdit = (c: AdminCategory) => {
    setEditing(c)
    setName(c.name)
    setDescription(c.description ?? '')
    setSortOrder(String(c.sortOrder))
    setIsActive(c.isActive)
    setDialogOpen(true)
  }

  const submit = async () => {
    if (!name.trim()) return toast.error('Nama kategori wajib diisi')
    setSaving(true)
    try {
      if (editing) {
        const data = await apiSend<{ message: string }>(`/api/admin/categories/${editing.id}`, 'PUT', {
          name,
          description,
          sortOrder: Number(sortOrder || 0),
          isActive,
        })
        toast.success(data.message || 'Kategori berhasil diperbarui')
      } else {
        const data = await apiSend<{ message: string }>('/api/admin/categories', 'POST', {
          name,
          description,
          sortOrder: Number(sortOrder || 0),
        })
        toast.success(data.message || 'Kategori berhasil dibuat')
      }
      setDialogOpen(false)
      load()
    } catch (e) {
      toast.error('Gagal menyimpan kategori', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const data = await apiSend<{ message: string }>(`/api/admin/categories/${deleteTarget.id}`, 'DELETE')
      toast.success(data.message || 'Kategori berhasil dihapus')
      setDeleteTarget(null)
      load()
    } catch (e) {
      toast.error('Gagal menghapus kategori', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kategori"
        description="Kelompok produk yang tampil di katalog toko online."
        actions={
          <Button className="h-10 gap-2 rounded-none" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Tambah Kategori
          </Button>
        }
      />

      <Card className="rounded-none p-6 shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-center">Produk</TableHead>
                  <TableHead className="text-center">Urutan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              {loading ? (
                <TableSkeleton colSpan={7} rows={5} />
              ) : categories.length === 0 ? (
                <EmptyState colSpan={7} />
              ) : (
                <TableBody>
                  {categories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">/{c.slug}</TableCell>
                      <TableCell className="max-w-64 truncate text-muted-foreground">
                        {c.description || '-'}
                      </TableCell>
                      <TableCell className="text-center">{c.productCount}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{c.sortOrder}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'border-transparent',
                            c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {c.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => openEdit(c)}
                            aria-label={`Ubah kategori ${c.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(c)}
                            aria-label={`Hapus kategori ${c.name}`}
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
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-widest">
              {editing ? 'Ubah Kategori' : 'Tambah Kategori'}
            </DialogTitle>
            <DialogDescription>
              Nama kategori menentukan slug URL katalog secara otomatis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">
                Nama Kategori <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="cth. Kemeja, Dress, Aksesoris"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Deskripsi</Label>
              <Textarea
                id="cat-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Deskripsi singkat kategori"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="w-32 space-y-1.5">
                <Label htmlFor="cat-sort">Urutan</Label>
                <Input
                  id="cat-sort"
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
              </div>
              {editing ? (
                <div className="flex items-center gap-2 pt-5">
                  <Switch id="cat-active" checked={isActive} onCheckedChange={setIsActive} />
                  <Label htmlFor="cat-active" className="cursor-pointer">
                    Aktif
                  </Label>
                </div>
              ) : null}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-none" onClick={() => setDialogOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button className="rounded-none" onClick={submit} disabled={saving}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kategori?</AlertDialogTitle>
            <AlertDialogDescription>
              Kategori <span className="font-semibold">{deleteTarget?.name}</span> akan dihapus. Kategori yang masih
              memiliki produk tidak dapat dihapus.
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
