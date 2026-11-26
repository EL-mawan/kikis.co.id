'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Pencil, Plus, ShieldAlert, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, ROLE_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'
import { apiGet, apiSend } from '@/components/admin/api'
import { useSession } from '@/hooks/use-session'
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
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
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  transactionCount: number
}

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'CASHIER']

function roleBadge(role: string): string {
  if (role === 'SUPER_ADMIN') return 'border-transparent bg-accent text-accent-foreground'
  if (role === 'ADMIN') return 'border-transparent bg-secondary text-secondary-foreground'
  return 'bg-muted text-muted-foreground'
}

export default function AdminUsersPage() {
  const { user } = useSession()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('CASHIER')
  const [saving, setSaving] = useState(false)

  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('CASHIER')
  const [editActive, setEditActive] = useState(true)
  const [editPassword, setEditPassword] = useState('')

  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await apiGet<{ users: AdminUser[] }>('/api/admin/users')
      setUsers(d.users)
    } catch (e) {
      toast.error('Gagal memuat pengguna', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const submitCreate = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      return toast.error('Nama, email, dan kata sandi wajib diisi')
    }
    if (newPassword.length < 6) return toast.error('Kata sandi minimal 6 karakter')
    setSaving(true)
    try {
      const d = await apiSend<{ message: string }>('/api/admin/users', 'POST', {
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
      })
      toast.success(d.message || 'Pengguna berhasil ditambahkan')
      setCreateOpen(false)
      setNewName('')
      setNewEmail('')
      setNewPassword('')
      setNewRole('CASHIER')
      load()
    } catch (e) {
      toast.error('Gagal menambah pengguna', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (u: AdminUser) => {
    setEditTarget(u)
    setEditName(u.name)
    setEditRole(u.role)
    setEditActive(u.isActive)
    setEditPassword('')
  }

  const submitEdit = async () => {
    if (!editTarget) return
    if (editPassword && editPassword.length < 6) return toast.error('Kata sandi minimal 6 karakter')
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: editName,
        role: editRole,
        isActive: editActive,
      }
      if (editPassword) payload.password = editPassword
      const d = await apiSend<{ message: string }>(`/api/admin/users/${editTarget.id}`, 'PUT', payload)
      toast.success(d.message || 'Pengguna berhasil diperbarui')
      setEditTarget(null)
      load()
    } catch (e) {
      toast.error('Gagal memperbarui pengguna', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return
    setDeactivating(true)
    try {
      const d = await apiSend<{ message: string }>(`/api/admin/users/${deactivateTarget.id}`, 'DELETE')
      toast.success(d.message || 'Pengguna dinonaktifkan')
      setDeactivateTarget(null)
      load()
    } catch (e) {
      toast.error('Gagal menonaktifkan pengguna', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengguna"
        description="Kelola akun staf — admin dan kasir yang mengoperasikan sistem."
        actions={
          isSuperAdmin ? (
            <Button className="h-10 gap-2 rounded-none" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Tambah Pengguna
            </Button>
          ) : null
        }
      />

      {!isSuperAdmin ? (
        <Alert className="rounded-none">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Akses terbatas</AlertTitle>
          <AlertDescription>Hanya Super Admin yang dapat mengelola pengguna.</AlertDescription>
        </Alert>
      ) : null}

      <Card className="rounded-none p-6 shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Transaksi</TableHead>
                  <TableHead>Terdaftar</TableHead>
                  {isSuperAdmin ? <TableHead className="text-right">Aksi</TableHead> : null}
                </TableRow>
              </TableHeader>
              {loading ? (
                <TableSkeleton colSpan={isSuperAdmin ? 7 : 6} rows={4} />
              ) : users.length === 0 ? (
                <EmptyState colSpan={isSuperAdmin ? 7 : 6} />
              ) : (
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('border-transparent', roleBadge(u.role))}>
                          {ROLE_LABEL[u.role] ?? u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'border-transparent',
                            u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {u.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{u.transactionCount}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                      {isSuperAdmin ? (
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => openEdit(u)}
                              aria-label={`Ubah pengguna ${u.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-destructive hover:text-destructive"
                              disabled={u.id === user?.id}
                              onClick={() => setDeactivateTarget(u)}
                              aria-label={`Nonaktifkan pengguna ${u.name}`}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-widest">Tambah Pengguna</DialogTitle>
            <DialogDescription>Buat akun staf baru untuk panel admin atau kasir POS.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="user-name">
                Nama <span className="text-destructive">*</span>
              </Label>
              <Input id="user-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama lengkap" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="user-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nama@kikis.co.id"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-password">
                Kata Sandi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="user-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="w-full rounded-none" aria-label="Role pengguna">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-none" onClick={() => setCreateOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button className="gap-2 rounded-none" onClick={submitCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-widest">Ubah Pengguna</DialogTitle>
            <DialogDescription>{editTarget?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-name">Nama</Label>
              <Input id="edit-user-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger className="w-full rounded-none" aria-label="Role pengguna">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="edit-user-active" checked={editActive} onCheckedChange={setEditActive} />
              <Label htmlFor="edit-user-active" className="cursor-pointer">
                Akun Aktif
              </Label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-password">Kata Sandi Baru (opsional)</Label>
              <Input
                id="edit-user-password"
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Kosongkan jika tidak diubah"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-none" onClick={() => setEditTarget(null)} disabled={saving}>
              Batal
            </Button>
            <Button className="gap-2 rounded-none" onClick={submitEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirm */}
      <AlertDialog open={Boolean(deactivateTarget)} onOpenChange={(v) => !v && setDeactivateTarget(null)}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan pengguna?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold">{deactivateTarget?.name}</span> ({deactivateTarget?.email}) tidak akan
              bisa masuk ke panel admin atau kasir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none bg-destructive text-white hover:bg-destructive/90"
              disabled={deactivating}
              onClick={(e) => {
                e.preventDefault()
                confirmDeactivate()
              }}
            >
              Nonaktifkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
