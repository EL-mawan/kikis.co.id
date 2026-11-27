'use client'

import { useCallback, useEffect, useState } from 'react'
import { Info, Loader2, Store } from 'lucide-react'
import { toast } from 'sonner'
import { apiGet, apiSend } from '@/components/admin/api'
import { PageHeader } from '@/components/admin/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface StoreSettings {
  storeName: string
  tagline: string
  address: string
  phone: string
  email: string
  receiptFooter: string
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>({
    storeName: '',
    tagline: '',
    address: '',
    phone: '',
    email: '',
    receiptFooter: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await apiGet<{ settings: StoreSettings }>('/api/admin/settings')
      setSettings({
        storeName: d.settings.storeName ?? '',
        tagline: d.settings.tagline ?? '',
        address: d.settings.address ?? '',
        phone: d.settings.phone ?? '',
        email: d.settings.email ?? '',
        receiptFooter: d.settings.receiptFooter ?? '',
      })
    } catch (e) {
      toast.error('Gagal memuat pengaturan', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data-fetch / sync pattern
    load()
  }, [load])

  const set = (key: keyof StoreSettings, value: string) =>
    setSettings((s) => ({ ...s, [key]: value }))

  const submit = async () => {
    if (!settings.storeName.trim()) return toast.error('Nama toko wajib diisi')
    setSaving(true)
    try {
      const d = await apiSend<{ message: string }>('/api/admin/settings', 'PUT', settings)
      toast.success(d.message || 'Pengaturan berhasil disimpan')
    } catch (e) {
      toast.error('Gagal menyimpan pengaturan', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan"
        description="Identitas toko yang tampil di katalog online dan struk kasir."
        actions={
          <Button className="h-10 gap-2 rounded-none" onClick={submit} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />} Simpan
          </Button>
        }
      />

      <Alert className="rounded-none">
        <Info className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Integrasi Siap Dikonfigurasi</AlertTitle>
        <AlertDescription>
          Integrasi pembayaran (QRIS/Payment Gateway) & Cloudinary siap dikonfigurasi via environment variables — lihat{' '}
          <span className="font-mono text-xs">.env.example</span>.
        </AlertDescription>
      </Alert>

      <Card className="rounded-none p-6 shadow-none">
        <CardContent className="space-y-5 p-0">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-none bg-muted" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="set-name">
                    Nama Toko <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="set-name"
                    value={settings.storeName}
                    onChange={(e) => set('storeName', e.target.value)}
                    placeholder="KIKIS"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="set-tagline">Tagline</Label>
                  <Input
                    id="set-tagline"
                    value={settings.tagline}
                    onChange={(e) => set('tagline', e.target.value)}
                    placeholder="Style Made Simple."
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-address">Alamat</Label>
                <Textarea
                  id="set-address"
                  rows={2}
                  value={settings.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="Jl. ... No. ..., Kota, Provinsi"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="set-phone">Telepon</Label>
                  <Input
                    id="set-phone"
                    value={settings.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="+62 ..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="set-email">Email</Label>
                  <Input
                    id="set-email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="hello@kikis.co.id"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-footer">Catatan Kaki Struk (Receipt Footer)</Label>
                <Textarea
                  id="set-footer"
                  rows={2}
                  value={settings.receiptFooter}
                  onChange={(e) => set('receiptFooter', e.target.value)}
                  placeholder="Teks singkat di bagian bawah struk kasir"
                />
                <p className="text-xs text-muted-foreground">
                  Tampil pada struk cetak 58/80mm di halaman Kasir (POS).
                </p>
              </div>
              <div className="flex justify-end">
                <Button className="h-10 gap-2 rounded-none" onClick={submit} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Simpan Pengaturan
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
