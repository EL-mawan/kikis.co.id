'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, PackageSearch } from 'lucide-react'
import { toast } from 'sonner'
import { StoreShell } from '@/components/store/StoreShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function TrackOrderPage() {
  const router = useRouter()
  const [orderNumber, setOrderNumber] = useState('')
  const [loading, setLoading] = useState(false)

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    const nomor = orderNumber.trim()
    if (!nomor) {
      toast.error('Masukkan nomor pesanan terlebih dahulu')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(nomor)}`)
      if (!res.ok) {
        toast.error('Pesanan tidak ditemukan')
        return
      }
      router.replace(`/pesanan/${encodeURIComponent(nomor)}`)
    } catch {
      toast.error('Gagal mencari pesanan, periksa koneksi kamu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StoreShell>
      <div className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-14 md:py-24">
        <PackageSearch className="size-12 text-accent" aria-hidden="true" />
        <h1 className="mt-5 font-display text-2xl font-semibold tracking-widest md:text-3xl">LACAK PESANAN</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Masukkan nomor pesanan untuk melihat status pengiriman kamu.
        </p>

        <form onSubmit={handleTrack} className="mt-8 w-full border border-border bg-white p-6 sm:p-8">
          <label htmlFor="order-number" className="text-sm font-medium">
            Nomor Pesanan
          </label>
          <Input
            id="order-number"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
            className="mt-2 h-11 font-mono"
            placeholder="KIK-ONL-20251126-1234"
          />
          <Button
            type="submit"
            disabled={loading}
            className="mt-4 h-12 w-full bg-primary text-white hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Mencari...
              </>
            ) : (
              'Lacak Pesanan'
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Nomor pesanan dikirim setelah checkout. Contoh: KIK-ONL-20251126-1234
        </p>
        <Link href="/katalog" className="mt-4 text-sm text-accent hover:underline">
          Kembali ke katalog
        </Link>
      </div>
    </StoreShell>
  )
}
