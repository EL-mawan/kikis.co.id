'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Banknote,
  Check,
  Landmark,
  Loader2,
  QrCode,
  ShoppingBag,
  Tag,
} from 'lucide-react'
import { toast } from 'sonner'
import { StoreShell } from '@/components/store/StoreShell'
import { useCart, cartTotal } from '@/store/cart'
import { useSession } from '@/hooks/use-session'
import { formatIDR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

interface ValidatedItem {
  variantId: string
  productId: string
  productName: string
  variantName: string
  sku: string
  image?: string
  unitPrice: number
  quantity: number
  subtotal: number
}

interface AppliedVoucher {
  code: string
  name: string
  discount: number
}

const PAYMENT_OPTIONS = [
  {
    value: 'TRANSFER',
    label: 'Transfer Bank',
    desc: 'Verifikasi manual oleh admin',
    fee: 10000,
    icon: Landmark,
  },
  {
    value: 'QRIS',
    label: 'QRIS',
    desc: 'Scan & bayar instan',
    fee: 10000,
    icon: QrCode,
  },
  {
    value: 'COD',
    label: 'COD (Bayar di Tempat)',
    desc: 'Bayar saat paket tiba',
    fee: 20000,
    icon: Banknote,
  },
] as const

type PaymentValue = (typeof PAYMENT_OPTIONS)[number]['value']

const emptySubscribe = () => () => {}

interface SavedAddress {
  id: string
  label: string
  street: string
  city: string
  province: string
  postalCode: string
  isDefault: boolean
}

export default function CheckoutPage() {
  const router = useRouter()
  const items = useCart((s) => s.items)
  const clearCart = useCart((s) => s.clear)
  const { user } = useSession()

  const [validatedData, setValidatedData] = useState<{ sig: string; items: ValidatedItem[]; subtotal: number } | null>(null)
  const [validateErrorData, setValidateErrorData] = useState<{ sig: string; message: string } | null>(null)

  const [name, setName] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [postalCode, setPostalCode] = useState('')

  const [voucherInput, setVoucherInput] = useState('')
  const [voucher, setVoucher] = useState<AppliedVoucher | null>(null)
  const [applyingVoucher, setApplyingVoucher] = useState(false)

  const [paymentMethod, setPaymentMethod] = useState<PaymentValue>('TRANSFER')
  const [submitting, setSubmitting] = useState(false)

  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  // Prefill from customer profile (null = follow profile value, '' = explicitly cleared)
  const nameValue = name ?? user?.name ?? ''
  const phoneValue = phone ?? user?.phone ?? ''

  const cartItems = mounted ? items : []
  const itemsSignature = useMemo(
    () => cartItems.map((i) => `${i.variantId}:${i.quantity}`).join(','),
    [cartItems],
  )

  const validated = validatedData && validatedData.sig === itemsSignature ? validatedData : null
  const validateError = validateErrorData && validateErrorData.sig === itemsSignature ? validateErrorData.message : null
  const validating = !validated && !validateError

  // Server-side cart validation
  useEffect(() => {
    if (!mounted || cartItems.length === 0) return
    let cancelled = false
    fetch('/api/cart/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cartItems.map((i) => ({ variantId: i.variantId, quantity: i.quantity })) }),
    })
      .then(async (res) => {
        const d = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setValidateErrorData({ sig: itemsSignature, message: d.error ?? 'Gagal memvalidasi keranjang' })
        } else {
          setValidatedData({ sig: itemsSignature, items: d.items ?? [], subtotal: d.subtotal ?? 0 })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setValidateErrorData({ sig: itemsSignature, message: 'Gagal memvalidasi keranjang, periksa koneksi kamu' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [mounted, itemsSignature])

  // Re-validate voucher when subtotal changes
  useEffect(() => {
    if (!voucher || !validated) return
    let cancelled = false
    fetch('/api/vouchers/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: voucher.code, subtotal: validated.subtotal }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (!d.valid) {
          setVoucher(null)
          toast.error(`Voucher ${voucher.code} dibatalkan: ${d.message}`)
        } else if (typeof d.discount === 'number' && d.discount !== voucher.discount) {
          setVoucher((v) => (v ? { ...v, discount: d.discount } : v))
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [voucher?.code, voucher?.discount, validated?.subtotal])

  const shippingCost = PAYMENT_OPTIONS.find((p) => p.value === paymentMethod)?.fee ?? 10000
  const discount = voucher?.discount ?? 0
  const subtotal = validated?.subtotal ?? cartTotal(cartItems)
  const total = Math.max(0, subtotal - discount + shippingCost)

  const applyVoucher = async () => {
    const code = voucherInput.trim()
    if (!code) {
      toast.error('Masukkan kode voucher terlebih dahulu')
      return
    }
    if (!validated) {
      toast.error('Menunggu validasi keranjang, coba lagi sesaat')
      return
    }
    setApplyingVoucher(true)
    try {
      const res = await fetch('/api/vouchers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: validated.subtotal }),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(d.error ?? 'Voucher tidak valid')
        return
      }
      if (!d.valid) {
        toast.error(d.message ?? 'Voucher tidak valid')
        return
      }
      setVoucher({ code: d.voucher.code, name: d.voucher.name, discount: d.discount })
      toast.success(`${d.message} — Hemat ${formatIDR(d.discount)}`)
    } catch {
      toast.error('Gagal memvalidasi voucher, periksa koneksi kamu')
    } finally {
      setApplyingVoucher(false)
    }
  }

  const autofillAddress = (addrId: string) => {
    const list = user?.addresses ?? []
    const a = list.find((x: SavedAddress) => x.id === addrId)
    if (!a) return
    setAddress(a.street)
    setCity(a.city)
    setProvince(a.province)
    setPostalCode(a.postalCode)
    toast.success(`Alamat "${a.label}" berhasil diterapkan`)
  }

  const submitOrder = async () => {
    if (!nameValue.trim() || !phoneValue.trim() || !address.trim() || !city.trim() || !province.trim()) {
      toast.error('Nama, telepon, alamat, kota, dan provinsi wajib diisi')
      return
    }
    if (cartItems.length === 0 || !validated) {
      toast.error('Keranjang kosong atau belum tervalidasi')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          customerName: nameValue.trim(),
          customerPhone: phoneValue.trim(),
          shippingAddress: address.trim(),
          city: city.trim(),
          province: province.trim(),
          postalCode: postalCode.trim() || undefined,
          paymentMethod,
          voucherCode: voucher?.code || undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(d.error ?? 'Gagal membuat pesanan')
        return
      }
      clearCart()
      router.replace(`/pesanan/${d.order.orderNumber}?success=1`)
    } catch {
      toast.error('Gagal membuat pesanan, periksa koneksi kamu')
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) {
    return (
      <StoreShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
          <Skeleton className="h-10 w-56 rounded-none bg-secondary" />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
            <Skeleton className="h-96 rounded-none bg-secondary" />
            <Skeleton className="h-80 rounded-none bg-secondary" />
          </div>
        </div>
      </StoreShell>
    )
  }

  if (cartItems.length === 0) {
    return (
      <StoreShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-10">
          <h1 className="border-b border-border pb-6 font-display text-3xl font-semibold tracking-widest md:text-4xl">
            CHECKOUT
          </h1>
          <div className="mt-8 flex flex-col items-center justify-center border border-border py-24 text-center">
            <ShoppingBag className="size-12 text-muted-foreground/40" aria-hidden="true" />
            <p className="mt-5 font-display text-lg font-semibold tracking-widest">KERANJANG KOSONG</p>
            <p className="mt-2 text-sm text-muted-foreground">Tambahkan produk terlebih dahulu untuk checkout.</p>
            <Button asChild className="mt-7 h-11 bg-primary px-8 text-white">
              <Link href="/katalog">Belanja Sekarang</Link>
            </Button>
          </div>
        </div>
      </StoreShell>
    )
  }

  const savedAddresses = (user?.addresses ?? []) as SavedAddress[]

  return (
    <StoreShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-10">
        <h1 className="border-b border-border pb-6 font-display text-3xl font-semibold tracking-widest md:text-4xl">
          CHECKOUT
        </h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* ===== Left: form ===== */}
          <div className="space-y-8">
            {/* Cart validation error */}
            {validateError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Validasi Keranjang Gagal</AlertTitle>
                <AlertDescription>
                  {validateError}
                  <Link href="/keranjang" className="mt-2 block font-medium underline underline-offset-4">
                    Kembali ke keranjang untuk memperbaiki
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            {/* Shipping form */}
            <section className="border border-border p-5 sm:p-6">
              <h2 className="font-display text-base font-semibold tracking-widest">ALAMAT PENGIRIMAN</h2>

              {savedAddresses.length > 0 && (
                <div className="mt-4 rounded-md border border-border bg-secondary/60 p-4">
                  <div className="text-sm font-medium">Gunakan alamat tersimpan</div>
                  <Select onValueChange={autofillAddress}>
                    <SelectTrigger className="mt-2 h-11 w-full bg-white text-sm" aria-label="Pilih alamat tersimpan">
                      <SelectValue placeholder="Pilih alamat tersimpan untuk mengisi otomatis" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedAddresses.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.label} — {a.street}, {a.city} {a.isDefault ? '(Utama)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="name">Nama Lengkap *</Label>
                  <Input id="name" value={nameValue} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-11" placeholder="Nama penerima" />
                </div>
                <div>
                  <Label htmlFor="phone">No. Telepon *</Label>
                  <Input id="phone" value={phoneValue} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 h-11" placeholder="08xxxxxxxxxx" inputMode="tel" />
                </div>
                <div>
                  <Label htmlFor="postalCode">Kode Pos</Label>
                  <Input id="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="mt-1.5 h-11" placeholder="12730" inputMode="numeric" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address">Alamat Lengkap *</Label>
                  <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1.5 min-h-20" placeholder="Nama jalan, nomor rumah, kelurahan, kecamatan" />
                </div>
                <div>
                  <Label htmlFor="city">Kota *</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1.5 h-11" placeholder="Jakarta Selatan" />
                </div>
                <div>
                  <Label htmlFor="province">Provinsi *</Label>
                  <Input id="province" value={province} onChange={(e) => setProvince(e.target.value)} className="mt-1.5 h-11" placeholder="DKI Jakarta" />
                </div>
              </div>
            </section>

            {/* Payment method */}
            <section className="border border-border p-5 sm:p-6">
              <h2 className="font-display text-base font-semibold tracking-widest">METODE PEMBAYARAN</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Metode pembayaran">
                {PAYMENT_OPTIONS.map((p) => {
                  const Icon = p.icon
                  const selected = paymentMethod === p.value
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPaymentMethod(p.value)}
                      className={cn(
                        'relative flex flex-col items-start gap-2 border p-4 text-left transition-colors',
                        selected ? 'border-primary bg-secondary/60' : 'border-border bg-white hover:border-accent',
                      )}
                      role="radio"
                      aria-checked={selected}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <Icon className="size-4" /> {p.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{p.desc}</span>
                      <span className="text-xs font-medium">Ongkir {formatIDR(p.fee)}</span>
                      {selected && (
                        <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-white">
                          <Check className="size-3" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          </div>

          {/* ===== Right: summary ===== */}
          <div className="h-fit space-y-4 lg:sticky lg:top-24">
            <section className="border border-border p-5 sm:p-6">
              <h2 className="font-display text-base font-semibold tracking-widest">PESANAN KAMU</h2>

              {validating ? (
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-none bg-secondary" />
                  ))}
                </div>
              ) : (
                <div className="mt-4 max-h-72 space-y-3 overflow-y-auto custom-scrollbar">
                  {(validated?.items ?? []).map((item) => (
                    <div key={item.variantId} className="flex gap-3">
                      <div className="size-14 shrink-0 overflow-hidden border border-border bg-secondary">
                        {item.image ? (
                          <img src={item.image} alt={item.productName} className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-[8px] text-muted-foreground">-</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{item.productName}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.variantName} × {item.quantity}
                        </div>
                        <div className="text-xs font-medium">{formatIDR(item.subtotal)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Voucher */}
              <div className="mt-5 border-t border-border pt-4">
                <Label htmlFor="voucher" className="text-sm">Kode Voucher</Label>
                <div className="mt-1.5 flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="voucher"
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                      placeholder="WELCOME10K"
                      className="h-11 pl-9 uppercase"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={applyVoucher}
                    disabled={applyingVoucher || validating}
                    className="h-11 border-primary"
                  >
                    {applyingVoucher ? <Loader2 className="size-4 animate-spin" /> : 'Terapkan'}
                  </Button>
                </div>
                {voucher && (
                  <div className="mt-2 flex items-center justify-between rounded-md bg-secondary px-3 py-2 text-xs">
                    <span>
                      <span className="font-medium">{voucher.code}</span> — {voucher.name}
                    </span>
                    <button onClick={() => setVoucher(null)} className="text-red-700 hover:underline">
                      Hapus
                    </button>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="mt-5 space-y-2.5 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatIDR(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Diskon Voucher ({voucher?.code})</span>
                    <span className="font-medium">- {formatIDR(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Biaya Kirim ({PAYMENT_OPTIONS.find((p) => p.value === paymentMethod)?.label})</span>
                  <span className="font-medium">{formatIDR(shippingCost)}</span>
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between text-base font-bold">
                  <span>TOTAL</span>
                  <span>{formatIDR(total)}</span>
                </div>
              </div>

              <Button
                onClick={submitOrder}
                disabled={submitting || validating || !!validateError || !validated}
                className="mt-6 h-12 w-full bg-primary text-white hover:bg-primary/90"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Memproses...
                  </>
                ) : (
                  'Buat Pesanan'
                )}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Dengan membuat pesanan, kamu menyepakati syarat & ketentuan KIKIS.
              </p>
            </section>
          </div>
        </div>
      </div>
    </StoreShell>
  )
}
