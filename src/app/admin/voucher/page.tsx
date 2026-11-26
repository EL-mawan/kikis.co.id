'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatIDR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { apiGet, apiSend } from '@/components/admin/api'
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

interface VoucherRow {
  id: string
  code: string
  name: string
  type: 'FIXED' | 'PERCENT' | string
  value: number
  minPurchase: number
  maxDiscount: number | null
  quota: number
  usedCount: number
  startDate: string | null
  endDate: string | null
  isActive: boolean
}

function voucherValue(v: VoucherRow): string {
  return v.type === 'PERCENT' ? `${v.value}%` : formatIDR(v.value)
}

function dateInputValue(d: string | null): string {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10)
}

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<VoucherRow[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<VoucherRow | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState('FIXED')
  const [value, setValue] = useState('')
  const [minPurchase, setMinPurchase] = useState('0')
  const [maxDiscount, setMaxDiscount] = useState('')
  const [quota, setQuota] = useState('100')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<VoucherRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await apiGet<{ vouchers: VoucherRow[] }>('/api/admin/vouchers')
      setVouchers(d.vouchers)
    } catch (e) {
      toast.error('Gagal memuat voucher', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setCode('')
    setName('')
    setType('FIXED')
    setValue('')
    setMinPurchase('0')
    setMaxDiscount('')
    setQuota('100')
    setStartDate('')
    setEndDate('')
    setDialogOpen(true)
  }

  const openEdit = (v: VoucherRow) => {
    setEditing(v)
    setCode(v.code)
    setName(v.name)
    setType(v.type)
    setValue(String(v.value))
    setMinPurchase(String(v.minPurchase))
    setMaxDiscount(v.maxDiscount ? String(v.maxDiscount) : '')
    setQuota(String(v.quota))
    setStartDate(dateInputValue(v.startDate))
    setEndDate(dateInputValue(v.endDate))
    setDialogOpen(true)
  }

  const submit = async () => {
    if (!editing && !code.trim()) return toast.error('Kode voucher wajib diisi')
    if (!name.trim()) return toast.error('Nama voucher wajib diisi')
    if (!value || Number(value) <= 0) return toast.error('Nilai voucher harus lebih dari 0')
    if (type === 'PERCENT' && Number(value) > 100) return toast.error('Persentase maksimal 100')
    setSaving(true)
    try {
      const payload = {
        name,
        type,
        value: Number(value),
        minPurchase: Number(minPurchase || 0),
        maxDiscount: type === 'PERCENT' && maxDiscount ? Number(maxDiscount) : undefined,
        quota: Number(quota || 100),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }
      if (editing) {
        const d = await apiSend<{ message: string }>(`/api/admin/vouchers/${editing.id}`, 'PUT', payload)
        toast.success(d.message || 'Voucher berhasil diperbarui')
      } else {
        const d = await apiSend<{ message: string }>('/api/admin/vouchers', 'POST', { ...payload, code })
        toast.success(d.message || 'Voucher berhasil dibuat')
      }
      setDialogOpen(false)
      load()
    } catch (e) {
      toast.error('Gagal menyimpan voucher', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (v: VoucherRow) => {
    setTogglingId(v.id)
    try {
      await apiSend(`/api/admin/vouchers/${v.id}`, 'PUT', { isActive: !v.isActive })
      toast.success(v.isActive ? 'Voucher dinonaktifkan' : 'Voucher diaktifkan')
      load()
    } catch (e) {
      toast.error('Gagal mengubah status voucher', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setTogglingId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const d = await apiSend<{ message: string }>(`/api/admin/vouchers/${deleteTarget.id}`, 'DELETE')
      toast.success(d.message || 'Voucher berhasil dihapus')
      setDeleteTarget(null)
      load()
    } catch (e) {
      toast.error('Gagal menghapus voucher', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voucher"
        description="Voucher diskon untuk pesanan toko online."
        actions={
          <Button className="h-10 gap-2 rounded-none" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Tambah Voucher
          </Button>
        }
      />

      <Card className="rounded-none p-6 shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead className="text-right">Min. Belanja</TableHead>
                  <TableHead className="text-center">Terpakai</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              {loading ? (
                <TableSkeleton colSpan={8} rows={5} />
              ) : vouchers.length === 0 ? (
                <EmptyState colSpan={8} />
              ) : (
                <TableBody>
                  {vouchers.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <Badge variant="outline" className="rounded-none border-border bg-secondary font-mono text-xs text-secondary-foreground">
                          {v.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{voucherValue(v)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {v.minPurchase > 0 ? formatIDR(v.minPurchase) : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(v.usedCount >= v.quota && 'text-destructive font-semibold')}>
                          {v.usedCount}/{v.quota}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {v.startDate ? formatDate(v.startDate) : '—'} s/d {v.endDate ? formatDate(v.endDate) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'border-transparent',
                              v.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {v.isActive ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-none px-2 text-xs"
                            disabled={togglingId === v.id}
                            onClick={() => toggleActive(v)}
                          >
                            {togglingId === v.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : v.isActive ? (
                              'Nonaktifkan'
                            ) : (
                              'Aktifkan'
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => openEdit(v)}
                            aria-label={`Ubah voucher ${v.code}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(v)}
                            aria-label={`Hapus voucher ${v.code}`}
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
        <DialogContent className="max-h-[92vh] overflow-y-auto custom-scrollbar rounded-none sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-widest">
              {editing ? 'Ubah Voucher' : 'Tambah Voucher'}
            </DialogTitle>
            <DialogDescription>
              {editing ? 'Kode voucher tidak dapat diubah setelah dibuat.' : 'Kode voucher akan dinormalisasi menjadi huruf kapital.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="voucher-code">
                  Kode <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="voucher-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="cth. KIKIS10"
                  disabled={Boolean(editing)}
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="voucher-name">
                  Nama <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="voucher-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="cth. Diskon Lebaran"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipe</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-full rounded-none" aria-label="Tipe voucher">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Nominal (Rp)</SelectItem>
                    <SelectItem value="PERCENT">Persentase (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="voucher-value">
                  {type === 'PERCENT' ? 'Nilai (%)' : 'Nilai (Rp)'} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="voucher-value"
                  type="number"
                  min={0}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="voucher-min">Min. Pembelian (Rp)</Label>
                <Input
                  id="voucher-min"
                  type="number"
                  min={0}
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(e.target.value)}
                />
              </div>
              {type === 'PERCENT' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="voucher-max">Maks. Diskon (Rp)</Label>
                  <Input
                    id="voucher-max"
                    type="number"
                    min={0}
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    placeholder="Tanpa batas"
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="voucher-quota">Kuota</Label>
                <Input
                  id="voucher-quota"
                  type="number"
                  min={1}
                  value={quota}
                  onChange={(e) => setQuota(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="voucher-start">Mulai</Label>
                <Input
                  id="voucher-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="voucher-end">Berakhir</Label>
                <Input
                  id="voucher-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
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
            <AlertDialogTitle>Hapus voucher?</AlertDialogTitle>
            <AlertDialogDescription>
              Voucher <span className="font-semibold">{deleteTarget?.code}</span> akan dihapus. Jika voucher pernah
              digunakan dalam pesanan, voucher hanya akan dinonaktifkan.
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
