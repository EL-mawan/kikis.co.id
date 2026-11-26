'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Loader2, LogOut, MapPin, Package, ScanBarcode } from 'lucide-react'
import { toast } from 'sonner'
import { StoreShell } from '@/components/store/StoreShell'
import { useSession } from '@/hooks/use-session'
import { formatDateTime, formatIDR, ORDER_STATUS_COLOR, ORDER_STATUS_LABEL, ROLE_LABEL } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface OrderItem {
  productName: string
  variantName: string
  quantity: number
}

interface OrderHistory {
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
  items: OrderItem[]
}

export default function AccountPage() {
  const router = useRouter()
  const { user, loading, refresh } = useSession()
  const [orders, setOrders] = useState<OrderHistory[] | null>(null)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  const isCustomer = !!user && user.role === 'CUSTOMER'

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/masuk?next=/akun')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!isCustomer) return
    fetch('/api/orders')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) {
          setOrdersError(d.error ?? 'Gagal memuat riwayat pesanan')
          setOrders([])
        } else {
          setOrders(d.orders ?? [])
        }
      })
      .catch(() => setOrdersError('Gagal memuat riwayat pesanan'))
  }, [isCustomer])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.success('Berhasil keluar')
      await refresh()
      router.replace('/')
    } catch {
      toast.error('Gagal keluar, coba lagi')
    } finally {
      setLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <StoreShell>
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <Skeleton className="h-10 w-48 rounded-none bg-secondary" />
          <div className="mt-8 grid gap-6 md:grid-cols-[300px_1fr]">
            <Skeleton className="h-72 rounded-none bg-secondary" />
            <Skeleton className="h-72 rounded-none bg-secondary" />
          </div>
        </div>
      </StoreShell>
    )
  }

  if (!user) {
    return (
      <StoreShell>
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-24 text-center sm:px-6">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Mengalihkan ke halaman masuk...</p>
        </div>
      </StoreShell>
    )
  }

  return (
    <StoreShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:py-10">
        <h1 className="border-b border-border pb-6 font-display text-3xl font-semibold tracking-widest md:text-4xl">
          AKUN SAYA
        </h1>

        <div className="mt-8 grid gap-6 md:grid-cols-[300px_1fr]">
          {/* ===== Profile ===== */}
          <div className="h-fit space-y-6">
            <div className="border border-border p-5">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary text-xl font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{user.name}</div>
                  <div className="truncate text-sm text-muted-foreground">{user.email}</div>
                  <div className="mt-1 inline-block bg-secondary px-2 py-0.5 text-[11px] uppercase tracking-wide text-accent">
                    {ROLE_LABEL[user.role] ?? user.role}
                  </div>
                </div>
              </div>
              {user.phone && (
                <div className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                  Telepon: <span className="text-foreground">{user.phone}</span>
                </div>
              )}
            </div>

            {/* Saved addresses */}
            {isCustomer && (user.addresses?.length ?? 0) > 0 && (
              <div className="border border-border p-5">
                <div className="font-display text-sm font-semibold tracking-widest">ALAMAT TERSIMPAN</div>
                <div className="mt-3 space-y-3">
                  {user.addresses!.map((a) => (
                    <div key={a.id} className="flex gap-2 border-b border-border pb-3 text-sm last:border-0 last:pb-0">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
                      <div>
                        <div className="font-medium">
                          {a.label} {a.isDefault && <span className="text-xs text-accent">(Utama)</span>}
                        </div>
                        <div className="text-muted-foreground">
                          {a.street}, {a.city}, {a.province} {a.postalCode}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleLogout}
              disabled={loggingOut}
              variant="outline"
              className="h-11 w-full border-primary text-red-700 hover:bg-red-50 hover:text-red-800"
            >
              {loggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />} Keluar
            </Button>
          </div>

          {/* ===== Orders ===== */}
          <div>
            <h2 className="font-display text-lg font-semibold tracking-widest">RIWAYAT PESANAN</h2>

            {!isCustomer ? (
              <div className="mt-4 flex flex-col items-center border border-border py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  Kamu masuk sebagai staf ({ROLE_LABEL[user.role] ?? user.role}).
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Riwayat pesanan hanya tersedia untuk pelanggan.</p>
                <div className="mt-5 flex gap-3">
                  <Button asChild className="h-11 bg-primary text-white">
                    <Link href="/admin">
                      <LayoutDashboard className="size-4" /> Dasbor Admin
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 border-primary">
                    <Link href="/pos">
                      <ScanBarcode className="size-4" /> Kasir POS
                    </Link>
                  </Button>
                </div>
              </div>
            ) : ordersError ? (
              <div className="mt-4 border border-border p-6 text-sm text-red-700">{ordersError}</div>
            ) : orders === null ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-none bg-secondary" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="mt-4 flex flex-col items-center border border-border py-16 text-center">
                <Package className="size-10 text-muted-foreground/40" aria-hidden="true" />
                <p className="mt-4 text-sm text-muted-foreground">Belum ada pesanan. Yuk mulai belanja!</p>
                <Button asChild className="mt-5 h-11 bg-primary px-8 text-white">
                  <Link href="/katalog">Belanja Sekarang</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {orders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/pesanan/${o.orderNumber}`}
                    className="block border border-border p-4 transition-colors hover:border-accent"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-mono text-sm font-medium">{o.orderNumber}</div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</div>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium ${ORDER_STATUS_COLOR[o.status] ?? 'bg-secondary text-foreground'}`}>
                        {ORDER_STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                      <div className="min-w-0 text-sm text-muted-foreground">
                        {o.items.length > 0 && (
                          <>
                            <span className="truncate">{o.items[0].productName}</span>
                            {o.items.length > 1 && <span> +{o.items.length - 1} produk lainnya</span>}
                          </>
                        )}
                      </div>
                      <div className="text-sm font-semibold">{formatIDR(o.total)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </StoreShell>
  )
}
