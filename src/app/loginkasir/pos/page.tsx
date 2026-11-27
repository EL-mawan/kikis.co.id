'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Banknote,
  Camera,
  CreditCard,
  Loader2,
  Minus,
  PackageOpen,
  Plus,
  QrCode,
  ScanLine,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { sound } from '@/lib/sound'
import { CameraScanner } from '@/components/pos/CameraScanner'

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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatDateTime, formatIDR, PAYMENT_METHOD_LABEL } from '@/lib/format'

/* ---------------------------------- types --------------------------------- */

type DiscountType = 'NONE' | 'FIXED' | 'PERCENT'
type PaymentMethod = 'CASH' | 'QRIS' | 'DEBIT'

interface Category {
  id: string
  name: string
  slug: string
}

interface ProductListItem {
  id: string
  name: string
  slug: string
  image: string | null
  price: number
  maxPrice: number
  stock: number
  inStock: boolean
}

interface LookupVariant {
  variantId: string
  productName: string
  variantName: string
  sku: string
  barcode: string | null
  image: string | null
  price: number
  stock: number
}

interface ProductVariantOption {
  id: string
  sku: string
  size: string | null
  color: string | null
  colorHex: string | null
  price: number
  stock: number
  label: string
}

interface CartLine {
  variantId: string
  productName: string
  variantName: string
  sku: string
  price: number
  quantity: number
  stock: number
}

interface ReceiptTransaction {
  id: string
  transactionNumber: string
  cashierName: string
  subtotal: number
  discountType: string
  discountValue: number
  discountAmount: number
  total: number
  paidAmount: number
  changeAmount: number
  paymentMethod: string
  customerName: string | null
  createdAt: string
  items: {
    productName: string
    variantName: string
    sku: string
    barcode: string | null
    unitPrice: number
    quantity: number
    subtotal: number
  }[]
}

const STORE = {
  name: 'KIKIS',
  tagline: 'Style Made Simple.',
  address: 'Jl. Kemang Raya No. 12, Jakarta Selatan',
  phone: '021-7280-1122',
}

const QUICK_CASH = [50000, 100000, 150000, 200000]

const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = {
  NONE: 'Tanpa Diskon',
  FIXED: 'Potongan Tetap (Rp)',
  PERCENT: 'Potongan Persen (%)',
}

/* --------------------------------- page ----------------------------------- */

export default function PosPage() {
  // catalog
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState('')
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [productsLoading, setProductsLoading] = useState(true)

  // scan / search
  const [scanValue, setScanValue] = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [lookupResults, setLookupResults] = useState<LookupVariant[]>([])
  const [showCamera, setShowCamera] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // variant picker dialog
  const [variantDialogOpen, setVariantDialogOpen] = useState(false)
  const [variantProduct, setVariantProduct] = useState<ProductListItem | null>(null)
  const [variantOptions, setVariantOptions] = useState<ProductVariantOption[]>([])
  const [variantLoading, setVariantLoading] = useState(false)

  // cart (POS-local state — independent from storefront cart store)
  const [cart, setCart] = useState<CartLine[]>([])
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  // discount & payment
  const [discountType, setDiscountType] = useState<DiscountType>('NONE')
  const [discountValue, setDiscountValue] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [customerName, setCustomerName] = useState('')

  // payment dialog
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paidInput, setPaidInput] = useState('0')
  const [note, setNote] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)

  // receipt dialog
  const [receipt, setReceipt] = useState<ReceiptTransaction | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptSize, setReceiptSize] = useState<'58' | '80'>('80')

  // mobile cart sheet
  const [cartSheetOpen, setCartSheetOpen] = useState(false)

  /* ------------------------------ cart math ------------------------------- */

  const subtotal = useMemo(() => cart.reduce((sum, l) => sum + l.price * l.quantity, 0), [cart])
  const cartCount = useMemo(() => cart.reduce((sum, l) => sum + l.quantity, 0), [cart])

  const discountAmount = useMemo(() => {
    const v = Math.max(0, Math.round(Number(discountValue) || 0))
    if (discountType === 'FIXED') return Math.min(v, subtotal)
    if (discountType === 'PERCENT') return Math.floor((subtotal * Math.min(v, 100)) / 100)
    return 0
  }, [discountType, discountValue, subtotal])

  const total = Math.max(0, subtotal - discountAmount)

  const paid = Math.max(0, Math.round(Number(paidInput) || 0))
  const change = paid - total
  const insufficient = paid < total

  /* ------------------------------- cart ops ------------------------------- */

  const addToCart = useCallback(
    (item: Omit<CartLine, 'quantity'>): boolean => {
      const existing = cart.find((l) => l.variantId === item.variantId)
      const label = item.variantName || item.sku
      if (existing && existing.quantity >= item.stock) {
        sound.playError()
        toast.warning(`Stok ${item.productName} (${label}) tersisa ${item.stock}`)
        return false
      }
      if (!existing && item.stock <= 0) {
        sound.playError()
        toast.error(`Stok ${item.productName} (${label}) habis`)
        return false
      }
      setCart((prev) => {
        const idx = prev.findIndex((l) => l.variantId === item.variantId)
        if (idx === -1) return [...prev, { ...item, quantity: 1 }]
        if (prev[idx].quantity >= item.stock) return prev
        const next = [...prev]
        next[idx] = { ...prev[idx], quantity: prev[idx].quantity + 1 }
        return next
      })
      sound.playSuccess()
      return true
    },
    [cart],
  )

  const setQuantity = useCallback(
    (variantId: string, qty: number) => {
      const line = cart.find((l) => l.variantId === variantId)
      if (!line) return
      const next = Math.max(1, Math.round(Number(qty) || 1))
      if (next > line.stock) {
        toast.warning(`Stok ${line.productName} (${line.variantName}) tersisa ${line.stock}`)
        return
      }
      setCart((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, quantity: next } : l)))
    },
    [cart],
  )

  const removeLine = useCallback((variantId: string) => {
    setCart((prev) => prev.filter((l) => l.variantId !== variantId))
  }, [])

  /* ------------------------------ data loading ---------------------------- */

  const loadProducts = useCallback(async (category: string) => {
    setProductsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '40' })
      if (category) params.set('category', category)
      const res = await fetch(`/api/products?${params.toString()}`)
      const data = await res.json()
      setProducts(data.products ?? [])
    } catch {
      toast.error('Gagal memuat daftar produk')
    } finally {
      setProductsLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data-fetch / sync pattern
    loadProducts(activeCategory)
  }, [activeCategory, loadProducts])

  useEffect(() => {
    let alive = true
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => {
        if (alive) setCategories(d.categories ?? [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  /* --------------------------- scan / search flow -------------------------- */

  const runLookup = useCallback(
    async (code: string) => {
      const q = code.trim()
      if (!q) {
        setLookupResults([])
        return
      }
      setScanLoading(true)
      try {
        const res = await fetch(`/api/pos/lookup?code=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (!res.ok) {
          sound.playError()
          toast.error(data.error ?? 'Gagal mencari produk')
          return
        }
        const results: LookupVariant[] = data.results ?? []
        if (results.length === 0) {
          sound.playError()
        }
        if (data.exact && results.length > 0) {
          const r = results[0]
          const added = addToCart({
            variantId: r.variantId,
            productName: r.productName,
            variantName: r.variantName,
            sku: r.sku,
            price: r.price,
            stock: r.stock,
          })
          if (added) toast.success(`Ditambahkan: ${r.productName} ${r.variantName}`.trim())
          setScanValue('')
          setLookupResults([])
        } else if (results.length > 0) {
          setLookupResults(results)
        } else {
          setLookupResults([])
          toast.error('Produk tidak ditemukan')
        }
      } catch {
        toast.error('Gagal mencari produk')
      } finally {
        setScanLoading(false)
      }
    },
    [addToCart],
  )

  // keep a stable reference for the debounce effect (cart changes must not re-trigger search)
  const runLookupRef = useRef(runLookup)
  useEffect(() => {
    runLookupRef.current = runLookup
  })

  // debounced as-you-type search (300ms)
  useEffect(() => {
    const q = scanValue.trim()
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data-fetch / sync pattern
      setLookupResults([])
      return
    }
    const t = setTimeout(() => {
      runLookupRef.current(q)
    }, 300)
    return () => clearTimeout(t)
  }, [scanValue])

  // F2 focuses the scan input (keyboard-first POS)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Alert before leaving page if cart has items
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (cart.length > 0) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [cart.length])

  const addFromLookupResult = (r: LookupVariant) => {
    const added = addToCart({
      variantId: r.variantId,
      productName: r.productName,
      variantName: r.variantName,
      sku: r.sku,
      price: r.price,
      stock: r.stock,
    })
    if (added) {
      toast.success(`Ditambahkan: ${r.productName} ${r.variantName}`.trim())
      setScanValue('')
      setLookupResults([])
    }
  }

  /* --------------------------- variant picker ----------------------------- */

  const openVariantDialog = useCallback(async (product: ProductListItem) => {
    setVariantProduct(product)
    setVariantOptions([])
    setVariantDialogOpen(true)
    setVariantLoading(true)
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(product.slug)}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Gagal memuat varian produk')
        setVariantDialogOpen(false)
        return
      }
      setVariantOptions(data.product?.variants ?? [])
    } catch {
      toast.error('Gagal memuat varian produk')
      setVariantDialogOpen(false)
    } finally {
      setVariantLoading(false)
    }
  }, [])

  const pickVariant = (variant: ProductVariantOption) => {
    if (!variantProduct || variant.stock <= 0) return
    const added = addToCart({
      variantId: variant.id,
      productName: variantProduct.name,
      variantName: variant.label,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
    })
    if (added) {
      toast.success(`Ditambahkan: ${variantProduct.name} ${variant.label}`.trim())
      setVariantDialogOpen(false)
    }
  }

  /* ------------------------------- checkout ------------------------------- */

  const openPayment = () => {
    if (cart.length === 0) return
    setPaidInput(String(total))
    setPaymentOpen(true)
  }

  const handleCheckout = async () => {
    if (cart.length === 0 || insufficient || checkingOut) return
    setCheckingOut(true)
    try {
      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
          discountType,
          discountValue: discountType === 'NONE' ? 0 : Math.max(0, Math.round(Number(discountValue) || 0)),
          paidAmount: paid,
          paymentMethod,
          customerName: customerName.trim() || undefined,
          note: note.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Checkout gagal')
        setPaymentOpen(false)
        return
      }
      const tx: ReceiptTransaction = data.transaction
      setReceipt(tx)
      setReceiptOpen(true)
      setPaymentOpen(false)
      setCartSheetOpen(false)
      toast.success(`Transaksi ${tx.transactionNumber} berhasil`)
      // reset for the next customer immediately (prevents double charge)
      setCart([])
      setDiscountType('NONE')
      setDiscountValue('')
      setCustomerName('')
      setNote('')
      // refresh product stock badges
      loadProducts(activeCategory)
    } catch {
      toast.error('Checkout gagal, periksa koneksi Anda')
    } finally {
      setCheckingOut(false)
    }
  }

  const startNewTransaction = () => {
    setReceiptOpen(false)
    setReceipt(null)
    setCart([])
    setDiscountType('NONE')
    setDiscountValue('')
    setPaymentMethod('CASH')
    setCustomerName('')
    setNote('')
    setScanValue('')
    setLookupResults([])
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  const activeCategoryName = categories.find((c) => c.slug === activeCategory)?.name

  /* --------------------------------- render ------------------------------- */

  return (
    <>
      {/* LEFT: product selection panel */}
      <section className="flex h-full min-h-0 flex-col overflow-hidden bg-background" aria-label="Pilih produk">
        <div className="shrink-0 space-y-3 border-b border-border bg-white p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanLine className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                ref={searchRef}
                autoFocus
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    runLookup(scanValue)
                  }
                }}
                placeholder="Scan barcode / cari produk (F2 untuk fokus)"
                className="h-12 pl-10 pr-10 text-base"
                aria-label="Scan barcode atau cari produk"
              />
              {scanLoading && (
                <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
              )}
            </div>
            <Button
              type="button"
              variant={showCamera ? 'default' : 'outline'}
              className={cn(
                'h-12 px-3 sm:px-4 font-medium flex items-center gap-1.5 shrink-0',
                showCamera ? 'bg-[#B99B79] text-white hover:bg-[#a8896a]' : 'border-border'
              )}
              onClick={() => setShowCamera((prev) => !prev)}
              aria-label={showCamera ? 'Tutup kamera scanner' : 'Buka kamera scanner'}
            >
              <Camera className="size-5" />
              <span className="hidden sm:inline">{showCamera ? 'Tutup Kamera' : 'Scan Kamera'}</span>
            </Button>
          </div>

          {showCamera && (
            <div className="relative">
              <CameraScanner
                className="h-72 w-full"
                onClose={() => setShowCamera(false)}
                onDetect={(code) => {
                  toast.info(`Barcode terdeteksi: ${code}`)
                  setScanValue(code)
                  runLookup(code)
                }}
              />
            </div>
          )}
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar" role="tablist" aria-label="Kategori produk">
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === ''}
              onClick={() => setActiveCategory('')}
              className={cn(
                'h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition',
                activeCategory === ''
                  ? 'border-[#252525] bg-[#252525] text-white'
                  : 'border-border bg-white text-foreground hover:border-accent hover:text-accent',
              )}
            >
              Semua
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={activeCategory === c.slug}
                onClick={() => setActiveCategory(activeCategory === c.slug ? '' : c.slug)}
                className={cn(
                  'h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition',
                  activeCategory === c.slug
                    ? 'border-[#252525] bg-[#252525] text-white'
                    : 'border-border bg-white text-foreground hover:border-accent hover:text-accent',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 custom-scrollbar">
          {lookupResults.length > 0 ? (
            <section aria-label="Hasil pencarian">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Hasil Pencarian ({lookupResults.length})
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setLookupResults([])
                    setScanValue('')
                  }}
                >
                  <X className="size-4" />
                  Tutup
                </Button>
              </div>
              <div className="space-y-2">
                {lookupResults.map((r) => (
                  <button
                    key={r.variantId}
                    type="button"
                    disabled={r.stock <= 0}
                    onClick={() => addFromLookupResult(r)}
                    className="flex w-full min-h-[64px] items-center gap-3 rounded-lg border border-border bg-white px-3 py-2 text-left transition hover:border-accent hover:bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="size-12 shrink-0 overflow-hidden rounded-md bg-secondary">
                      {r.image ? (
                        <img src={r.image} alt={r.productName} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <PackageOpen className="size-4 text-muted-foreground/40" aria-hidden />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.productName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.variantName} <span className="font-mono">· {r.barcode || r.sku}</span>
                      </p>
                      <p className="text-sm font-bold text-accent">{formatIDR(r.price)}</p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]',
                        r.stock <= 0
                          ? 'bg-red-50 text-red-700'
                          : r.stock <= 5
                            ? 'bg-red-50 text-red-700'
                            : 'bg-secondary text-muted-foreground',
                      )}
                    >
                      {r.stock <= 0 ? 'Habis' : `Stok: ${r.stock}`}
                    </span>
                    <Plus className="size-4 shrink-0 text-accent" aria-hidden />
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section aria-label="Daftar produk">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {activeCategoryName ?? 'Semua Produk'}
                </h2>
                <span className="font-mono text-xs text-muted-foreground">{products.length} produk</span>
              </div>
              {productsLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-square w-full rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <PackageOpen className="size-10 text-muted-foreground/40" aria-hidden />
                  <p className="text-sm font-medium">Tidak ada produk pada kategori ini</p>
                  <p className="text-xs text-muted-foreground">Coba pilih kategori lain atau pindai barcode produk</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => openVariantDialog(p)}
                      disabled={!p.inStock}
                      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-white text-left transition hover:border-accent hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-secondary">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <PackageOpen className="size-8 text-muted-foreground/40" aria-hidden />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-1 p-2.5">
                        <p className="line-clamp-2 min-h-10 text-sm font-medium leading-tight">{p.name}</p>
                        <p className="text-sm font-bold text-accent">
                          {p.price === p.maxPrice ? formatIDR(p.price) : `${formatIDR(p.price)} – ${formatIDR(p.maxPrice)}`}
                        </p>
                        <span
                          className={cn(
                            'w-fit rounded px-1.5 py-0.5 font-mono text-[11px]',
                            p.stock <= 5 ? 'bg-red-50 text-red-700' : 'bg-secondary text-muted-foreground',
                          )}
                        >
                          Stok: {p.stock}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </section>

      {/* RIGHT: cart panel (desktop) */}
      <aside className="hidden h-full min-h-0 w-full flex-col border-l border-border bg-white lg:flex" aria-label="Keranjang belanja">
        <CartPanelContent
          cart={cart}
          cartCount={cartCount}
          subtotal={subtotal}
          discountType={discountType}
          onDiscountTypeChange={setDiscountType}
          discountValue={discountValue}
          onDiscountValueChange={setDiscountValue}
          discountAmount={discountAmount}
          total={total}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          onSetQuantity={setQuantity}
          onRemove={removeLine}
          onClearRequest={() => setClearConfirmOpen(true)}
          onCheckout={openPayment}
          checkingOut={checkingOut}
        />
      </aside>

      {/* mobile floating cart button */}
      <button
        type="button"
        onClick={() => setCartSheetOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2 rounded-full bg-[#252525] px-5 font-semibold text-white shadow-lg transition hover:bg-[#333] lg:hidden"
        aria-label={`Buka keranjang (${cartCount} item)`}
      >
        <ShoppingCart className="size-5" aria-hidden />
        Keranjang
        {cartCount > 0 && (
          <span className="flex size-6 items-center justify-center rounded-full bg-accent text-xs font-bold">{cartCount}</span>
        )}
      </button>

      {/* mobile cart sheet */}
      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[420px]">
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle>Keranjang</SheetTitle>
          </SheetHeader>
          <CartPanelContent
            cart={cart}
            cartCount={cartCount}
            subtotal={subtotal}
            discountType={discountType}
            onDiscountTypeChange={setDiscountType}
            discountValue={discountValue}
            onDiscountValueChange={setDiscountValue}
            discountAmount={discountAmount}
            total={total}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
            onSetQuantity={setQuantity}
            onRemove={removeLine}
            onClearRequest={() => setClearConfirmOpen(true)}
            onCheckout={openPayment}
            checkingOut={checkingOut}
          />
        </SheetContent>
      </Sheet>

      {/* variant picker dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pilih Varian</DialogTitle>
            <DialogDescription>
              {variantProduct?.name ?? ''} — pilih varian untuk ditambahkan ke keranjang.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 space-y-2 overflow-y-auto custom-scrollbar">
            {variantLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
            ) : variantOptions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada varian tersedia untuk produk ini.</p>
            ) : (
              variantOptions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  disabled={v.stock <= 0}
                  onClick={() => pickVariant(v)}
                  className="flex w-full min-h-[56px] items-center justify-between gap-3 rounded-lg border border-border px-4 py-2.5 text-left transition hover:border-accent hover:bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{v.label || 'Standar'}</p>
                    <p className="font-mono text-xs text-muted-foreground">{v.sku}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold">{formatIDR(v.price)}</p>
                    <p className={cn('font-mono text-xs', v.stock <= 0 ? 'text-red-700' : v.stock <= 5 ? 'text-red-700' : 'text-muted-foreground')}>
                      {v.stock <= 0 ? 'Habis' : `Stok: ${v.stock}`}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* payment dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pembayaran</DialogTitle>
            <DialogDescription>Periksa jumlah pembayaran sebelum menyelesaikan transaksi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md bg-secondary px-4 py-3">
              <span className="text-sm text-muted-foreground">Total Tagihan</span>
              <span className="text-xl font-bold">{formatIDR(total)}</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paid-amount">Jumlah Dibayar</Label>
              <Input
                id="paid-amount"
                autoFocus
                inputMode="numeric"
                value={paidInput}
                onChange={(e) => setPaidInput(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !insufficient) handleCheckout()
                }}
                className="h-12 text-lg font-semibold"
                placeholder="0"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              <Button
                type="button"
                variant="outline"
                className="h-11 font-semibold"
                onClick={() => setPaidInput(String(total))}
              >
                Uang Pas
              </Button>
              {QUICK_CASH.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant="outline"
                  className="h-11 font-mono text-sm"
                  onClick={() => setPaidInput(String(amount))}
                >
                  {new Intl.NumberFormat('id-ID').format(amount)}
                </Button>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
              {paid >= total ? (
                <>
                  <span className="text-sm text-muted-foreground">Kembalian</span>
                  <span className="text-base font-bold text-emerald-700">{formatIDR(change)}</span>
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">Pembayaran kurang</span>
                  <span className="text-base font-bold text-red-700">Kurang {formatIDR(total - paid)}</span>
                </>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-note">Catatan (opsional)</Label>
              <Input
                id="payment-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Catatan transaksi..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPaymentOpen(false)} disabled={checkingOut}>
              Batal
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={insufficient || checkingOut}
              className="h-12 flex-1 bg-accent text-base font-semibold text-white hover:bg-accent/90"
            >
              {checkingOut && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Konfirmasi Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* receipt dialog */}
      <Dialog open={receiptOpen} onOpenChange={(open) => { if (!open) startNewTransaction() }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md custom-scrollbar">
          <DialogHeader>
            <DialogTitle>Struk</DialogTitle>
            <DialogDescription>Transaksi selesai. Cetak struk atau mulai transaksi baru.</DialogDescription>
          </DialogHeader>
          {receipt && (
            <>
              <div className="flex justify-center rounded-md bg-secondary p-3">
                <div
                  className="print-receipt w-full bg-white font-mono text-xs leading-relaxed text-black"
                  style={{ maxWidth: receiptSize === '58' ? '58mm' : '80mm' }}
                >
                  <div className="text-center">
                    <div className="text-base font-bold tracking-[0.3em]">{STORE.name}</div>
                    <div>{STORE.tagline}</div>
                    <div>{STORE.address}</div>
                    <div>Telp: {STORE.phone}</div>
                  </div>
                  <div className="my-2 border-t border-dashed border-black" />
                  <div>No: {receipt.transactionNumber}</div>
                  <div>Kasir: {receipt.cashierName}</div>
                  <div>Tanggal: {formatDateTime(receipt.createdAt)}</div>
                  {receipt.customerName && <div>Pelanggan: {receipt.customerName}</div>}
                  <div className="my-2 border-t border-dashed border-black" />
                  {receipt.items.map((item, i) => (
                    <div key={i} className="py-1">
                      <div className="flex justify-between gap-2">
                        <span className="truncate">
                          {item.quantity} x {item.productName}
                        </span>
                        <span className="shrink-0">{formatIDR(item.subtotal)}</span>
                      </div>
                      <div className="flex justify-between gap-2 text-[10px] text-black/60">
                        <span className="truncate">
                          {item.variantName}
                          {item.variantName ? ' · ' : ''}
                          {item.sku}
                        </span>
                        <span className="shrink-0">@{formatIDR(item.unitPrice)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="my-2 border-t border-dashed border-black" />
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatIDR(receipt.subtotal)}</span>
                  </div>
                  {receipt.discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span>
                        Diskon
                        {receipt.discountType === 'PERCENT' ? ` (${receipt.discountValue}%)` : receipt.discountType === 'FIXED' ? ' (Rp)' : ''}
                      </span>
                      <span>-{formatIDR(receipt.discountAmount)}</span>
                    </div>
                  )}
                  <div className="mt-1 flex justify-between border-t border-black pt-1 text-sm font-bold">
                    <span>TOTAL</span>
                    <span>{formatIDR(receipt.total)}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span>{PAYMENT_METHOD_LABEL[receipt.paymentMethod] ?? receipt.paymentMethod}</span>
                    <span>{formatIDR(receipt.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kembalian</span>
                    <span>{formatIDR(receipt.changeAmount)}</span>
                  </div>
                  <div className="my-2 border-t border-dashed border-black" />
                  <div className="text-center text-[10px]">
                    <div>Terima kasih telah berbelanja di KIKIS</div>
                    <div>Barang yang sudah dibeli tidak dapat ditukar</div>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={receiptSize} onValueChange={(v) => setReceiptSize(v as '58' | '80')}>
                  <SelectTrigger className="h-11 w-full sm:w-28" aria-label="Ukuran struk">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80">80 mm</SelectItem>
                    <SelectItem value="58">58 mm</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-11" onClick={() => window.print()}>
                  Cetak Struk
                </Button>
                <Button
                  className="h-11 flex-1 bg-accent font-semibold text-white hover:bg-accent/90"
                  onClick={startNewTransaction}
                >
                  Transaksi Baru
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* clear cart confirmation */}
      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kosongkan keranjang?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua item pada keranjang akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-700 text-white hover:bg-red-800"
              onClick={() => setCart([])}
            >
              Kosongkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/* ----------------------------- cart panel --------------------------------- */

interface CartPanelContentProps {
  cart: CartLine[]
  cartCount: number
  subtotal: number
  discountType: DiscountType
  onDiscountTypeChange: (t: DiscountType) => void
  discountValue: string
  onDiscountValueChange: (v: string) => void
  discountAmount: number
  total: number
  paymentMethod: PaymentMethod
  onPaymentMethodChange: (m: PaymentMethod) => void
  customerName: string
  onCustomerNameChange: (v: string) => void
  onSetQuantity: (variantId: string, qty: number) => void
  onRemove: (variantId: string) => void
  onClearRequest: () => void
  onCheckout: () => void
  checkingOut: boolean
}

function CartPanelContent(props: CartPanelContentProps) {
  const {
    cart,
    cartCount,
    subtotal,
    discountType,
    onDiscountTypeChange,
    discountValue,
    onDiscountValueChange,
    discountAmount,
    total,
    paymentMethod,
    onPaymentMethodChange,
    customerName,
    onCustomerNameChange,
    onSetQuantity,
    onRemove,
    onClearRequest,
    onCheckout,
    checkingOut,
  } = props

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-widest">Keranjang</h2>
          <Badge variant="secondary" className="font-mono">{cartCount} item</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-xs text-red-700 hover:bg-red-50 hover:text-red-800"
          onClick={onClearRequest}
          disabled={cart.length === 0}
        >
          <Trash2 className="size-3.5" />
          Kosongkan
        </Button>
      </div>

      {/* lines */}
      {cart.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <ScanLine className="size-10 text-muted-foreground/30" aria-hidden />
          <p className="text-sm font-medium">Pindai atau pilih produk untuk memulai</p>
          <p className="text-xs text-muted-foreground">
            Scan barcode atau klik produk di panel kiri. Tekan F2 untuk fokus ke pencarian.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 custom-scrollbar">
          {cart.map((line) => (
            <div key={line.variantId} className="border-b border-border py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{line.productName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {line.variantName} <span className="font-mono">· {line.sku}</span>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:bg-red-50 hover:text-red-700"
                  onClick={() => onRemove(line.variantId)}
                  aria-label={`Hapus ${line.productName} ${line.variantName}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex h-9 items-center rounded-md border border-border">
                  <button
                    type="button"
                    className="flex size-9 items-center justify-center text-muted-foreground transition hover:text-foreground disabled:opacity-30"
                    onClick={() => onSetQuantity(line.variantId, line.quantity - 1)}
                    disabled={line.quantity <= 1}
                    aria-label="Kurangi jumlah"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <input
                    inputMode="numeric"
                    value={line.quantity}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^0-9]/g, ''))
                      onSetQuantity(line.variantId, Number.isNaN(n) || n < 1 ? 1 : n)
                    }}
                    className="h-full w-10 border-x border-border bg-transparent text-center font-mono text-sm font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label={`Jumlah ${line.productName}`}
                  />
                  <button
                    type="button"
                    className="flex size-9 items-center justify-center text-muted-foreground transition hover:text-foreground"
                    onClick={() => onSetQuantity(line.variantId, line.quantity + 1)}
                    aria-label="Tambah jumlah"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatIDR(line.price * line.quantity)}</p>
                  <p className="text-[11px] text-muted-foreground">@{formatIDR(line.price)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* totals + actions */}
      <div className="shrink-0 space-y-3 border-t border-border bg-white p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-semibold">{formatIDR(subtotal)}</span>
        </div>

        {/* discount controls */}
        <div className="flex items-center gap-2">
          <Select value={discountType} onValueChange={(v) => onDiscountTypeChange(v as DiscountType)}>
            <SelectTrigger className="h-9 w-[150px] shrink-0 text-xs" aria-label="Jenis diskon">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(DISCOUNT_TYPE_LABEL) as DiscountType[]).map((t) => (
                <SelectItem key={t} value={t}>{DISCOUNT_TYPE_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative min-w-0 flex-1">
            <Input
              inputMode="numeric"
              value={discountValue}
              onChange={(e) => onDiscountValueChange(e.target.value.replace(/[^0-9]/g, ''))}
              disabled={discountType === 'NONE'}
              placeholder="0"
              className="h-9 pr-8 text-right font-mono"
              aria-label="Nilai diskon"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {discountType === 'PERCENT' ? '%' : 'Rp'}
            </span>
          </div>
        </div>
        {discountAmount > 0 && (
          <div className="flex items-center justify-between text-sm text-emerald-700">
            <span>Diskon</span>
            <span className="font-semibold">-{formatIDR(discountAmount)}</span>
          </div>
        )}

        <Separator />

        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold uppercase tracking-wider">Total</span>
          <span className="text-2xl font-bold">{formatIDR(total)}</span>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Metode Pembayaran</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'CASH', label: 'Tunai', icon: Banknote },
              { id: 'QRIS', label: 'QRIS', icon: QrCode },
              { id: 'DEBIT', label: 'Debit', icon: CreditCard },
            ].map((m) => {
              const Icon = m.icon
              const selected = paymentMethod === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onPaymentMethodChange(m.id as PaymentMethod)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 rounded-md border p-2 text-xs font-semibold transition',
                    selected
                      ? 'border-[#B99B79] bg-[#B99B79]/10 text-[#B99B79]'
                      : 'border-border bg-white text-muted-foreground hover:border-[#B99B79]/50 hover:text-foreground'
                  )}
                >
                  <Icon className="size-4" />
                  <span>{m.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="customer-name" className="text-xs text-muted-foreground">Nama Pelanggan (opsional)</Label>
          <Input
            id="customer-name"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder="Nama pelanggan..."
            className="h-11"
          />
        </div>

        <Button
          onClick={onCheckout}
          disabled={cart.length === 0 || checkingOut}
          className="h-14 w-full bg-accent text-base font-bold text-white hover:bg-accent/90"
        >
          <ShoppingCart className="size-5" aria-hidden />
          Bayar {formatIDR(total)}
        </Button>
      </div>
    </div>
  )
}
