'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { StoreShell } from '@/components/store/StoreShell'
import { useCart, cartTotal } from '@/store/cart'
import { formatIDR } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

const emptySubscribe = () => () => {}

export default function CartPage() {
  const items = useCart((s) => s.items)
  const setQuantity = useCart((s) => s.setQuantity)
  const removeItem = useCart((s) => s.removeItem)
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  const subtotal = cartTotal(items)

  if (!mounted) {
    return (
      <StoreShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
          <Skeleton className="h-10 w-56 rounded-none bg-secondary" />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-none bg-secondary" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-none bg-secondary" />
          </div>
        </div>
      </StoreShell>
    )
  }

  return (
    <StoreShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-10">
        <h1 className="border-b border-border pb-6 font-display text-3xl font-semibold tracking-widest md:text-4xl">
          KERANJANG
        </h1>

        {items.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center border border-border py-24 text-center">
            <ShoppingBag className="size-12 text-muted-foreground/40" aria-hidden="true" />
            <p className="mt-5 font-display text-lg font-semibold tracking-widest">
              KERANJANG KAMU MASIH KOSONG
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Yuk jelajahi koleksi KIKIS dan temukan gaya favoritmu.
            </p>
            <Button asChild className="mt-7 h-11 bg-primary px-8 text-white">
              <Link href="/katalog">Mulai Belanja</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* Items */}
            <div className="divide-y divide-border border border-border">
              {items.map((item) => (
                <div key={item.variantId} className="flex gap-4 p-4">
                  <Link
                    href={item.slug ? `/produk/${item.slug}` : '/katalog'}
                    className="size-24 shrink-0 overflow-hidden border border-border bg-secondary sm:size-28"
                  >
                    {item.image ? (
                      <img src={item.image} alt={item.productName} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                        Tanpa Gambar
                      </div>
                    )}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={item.slug ? `/produk/${item.slug}` : '/katalog'}
                          className="block truncate text-sm font-medium uppercase tracking-wide hover:text-accent"
                        >
                          {item.productName}
                        </Link>
                        <div className="mt-0.5 text-xs text-muted-foreground">{item.variantName}</div>
                        <div className="mt-1 text-sm">{formatIDR(item.price)}</div>
                      </div>
                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-red-700"
                        aria-label={`Hapus ${item.productName} dari keranjang`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      {/* Qty stepper */}
                      <div className="flex items-center">
                        <button
                          onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="flex size-9 items-center justify-center border border-border hover:border-accent disabled:opacity-40"
                          aria-label="Kurangi jumlah"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="flex h-9 w-12 items-center justify-center border-y border-border text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          className="flex size-9 items-center justify-center border border-border hover:border-accent disabled:opacity-40"
                          aria-label="Tambah jumlah"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Subtotal</div>
                        <div className="text-sm font-medium">{formatIDR(item.price * item.quantity)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="h-fit border border-border p-6 lg:sticky lg:top-24">
              <h2 className="font-display text-base font-semibold tracking-widest">RINGKASAN</h2>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatIDR(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ongkir</span>
                  <span className="text-muted-foreground">Dihitung saat checkout</span>
                </div>
              </div>
              <Separator className="my-5" />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatIDR(subtotal)}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Ongkir dihitung saat checkout berdasarkan metode pengiriman.
              </p>
              <Button asChild className="mt-6 h-12 w-full bg-primary text-white hover:bg-primary/90">
                <Link href="/checkout">Lanjut ke Checkout</Link>
              </Button>
              <Button asChild variant="outline" className="mt-3 h-11 w-full border-primary">
                <Link href="/katalog">Lanjut Belanja</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </StoreShell>
  )
}
