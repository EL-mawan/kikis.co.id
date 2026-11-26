'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ImageOff, Minus, Plus, ShoppingBag, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { StoreShell } from '@/components/store/StoreShell'
import { ProductCard, ProductCardSkeleton, type StoreProduct } from '@/components/store/ProductCard'
import { useCart } from '@/store/cart'
import { formatIDR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface Variant {
  id: string
  sku: string
  size: string | null
  color: string | null
  colorHex: string | null
  price: number
  stock: number
  label: string
}

interface ProductDetail {
  id: string
  name: string
  slug: string
  description: string | null
  categoryName: string
  categorySlug: string
  images: { url: string; alt: string | null }[]
  price: number
  maxPrice: number
  isFeatured: boolean
  variants: Variant[]
}

/** First available size (in stock preferred) for a given color */
function defaultSize(product: ProductDetail, color: string | null): string | null {
  const inStock = product.variants.find((v) => v.color === color && v.stock > 0)
  const any = product.variants.find((v) => v.color === color)
  return inStock?.size ?? any?.size ?? null
}

function ProductView({ product }: { product: ProductDetail }) {
  const router = useRouter()
  const addItem = useCart((s) => s.addItem)

  const [imgIndex, setImgIndex] = useState(0)
  const firstColor = product.variants.find((v) => v.color)?.color ?? null
  const [color, setColor] = useState<string | null>(firstColor)
  const [size, setSize] = useState<string | null>(() => defaultSize(product, firstColor))
  const [qtyState, setQtyState] = useState<{ vid: string; qty: number }>({ vid: '', qty: 1 })

  const colors = useMemo(() => {
    const list: { name: string; hex: string | null }[] = []
    for (const v of product.variants) {
      if (v.color && !list.some((c) => c.name === v.color)) {
        list.push({ name: v.color, hex: v.colorHex })
      }
    }
    return list
  }, [product])

  const sizesForColor = useMemo(() => {
    const sizes: string[] = []
    for (const v of product.variants) {
      if (v.color === color && v.size && !sizes.includes(v.size)) sizes.push(v.size)
    }
    return sizes
  }, [product, color])

  const selectedVariant = useMemo(() => {
    return (
      product.variants.find((v) => v.color === color && v.size === size) ??
      product.variants.find((v) => v.color === color) ??
      null
    )
  }, [product, color, size])

  const stock = selectedVariant?.stock ?? 0
  const outOfStock = !!selectedVariant && stock === 0
  const showPriceRange = product.maxPrice > product.price

  // Derived quantity: resets to 1 whenever the selected variant changes (no effect needed)
  const selectedVariantId = selectedVariant?.id ?? ''
  const qty = qtyState.vid === selectedVariantId ? qtyState.qty : 1
  const setQty = (n: number) => setQtyState({ vid: selectedVariantId, qty: n })

  const pickColor = (name: string) => {
    setColor(name)
    setSize(defaultSize(product, name))
  }

  const buildCartLine = () => {
    if (!selectedVariant) return null
    return {
      variantId: selectedVariant.id,
      productId: product.id,
      slug: product.slug,
      productName: product.name,
      variantName: selectedVariant.label,
      image: product.images[0]?.url ?? null,
      price: selectedVariant.price,
      quantity: qty,
      maxStock: selectedVariant.stock,
    }
  }

  const handleAdd = (buyNow = false) => {
    const line = buildCartLine()
    if (!line || line.maxStock === 0) return
    addItem(line)
    if (buyNow) {
      router.push('/keranjang')
      return
    }
    toast.success(`${product.name} (${line.variantName}) ditambahkan ke keranjang`)
  }

  const nextImage = () => setImgIndex((i) => (i + 1) % Math.max(product.images.length, 1))
  const prevImage = () => setImgIndex((i) => (i - 1 + product.images.length) % Math.max(product.images.length, 1))

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* ===== Images ===== */}
      <div>
        <div className="relative aspect-[3/4] overflow-hidden border border-border bg-secondary">
          {product.images.length > 0 ? (
            <img
              src={product.images[imgIndex]?.url}
              alt={product.images[imgIndex]?.alt ?? product.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImageOff className="size-8" />
            </div>
          )}
          {product.images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 hover:bg-white"
                aria-label="Gambar sebelumnya"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 hover:bg-white"
                aria-label="Gambar berikutnya"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
        </div>
        {product.images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto custom-scrollbar">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setImgIndex(i)}
                className={cn(
                  'size-20 shrink-0 overflow-hidden border bg-secondary transition-colors',
                  i === imgIndex ? 'border-primary' : 'border-border hover:border-accent',
                )}
                aria-label={`Lihat gambar ${i + 1}`}
              >
                <img src={img.url} alt={img.alt ?? `${product.name} ${i + 1}`} className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ===== Info ===== */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{product.categoryName}</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-wide md:text-3xl">{product.name}</h1>
        <div className="mt-3 text-xl font-medium">
          {showPriceRange
            ? `${formatIDR(product.price)} - ${formatIDR(product.maxPrice)}`
            : formatIDR(selectedVariant?.price ?? product.price)}
        </div>

        {product.description && (
          <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        )}

        {/* Colors */}
        {colors.length > 0 && (
          <div className="mt-7">
            <div className="text-sm">
              Warna: <span className="font-medium">{color ?? '-'}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {colors.map((c) => (
                <button
                  key={c.name}
                  onClick={() => pickColor(c.name)}
                  className={cn(
                    'flex size-11 items-center justify-center rounded-full transition-all',
                    color === c.name ? 'ring-2 ring-primary ring-offset-2' : 'ring-1 ring-border hover:ring-accent',
                  )}
                  style={{ backgroundColor: c.hex ?? '#DDDDDD' }}
                  title={c.name}
                  aria-label={`Pilih warna ${c.name}`}
                  aria-pressed={color === c.name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sizes */}
        {sizesForColor.length > 0 && (
          <div className="mt-6">
            <div className="text-sm">
              Ukuran: <span className="font-medium">{size ?? '-'}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {sizesForColor.map((s) => {
                const v = product.variants.find((x) => x.color === color && x.size === s)
                const disabled = !v || v.stock === 0
                return (
                  <button
                    key={s}
                    disabled={disabled}
                    onClick={() => setSize(s)}
                    className={cn(
                      'flex h-11 min-w-11 items-center justify-center border px-3 text-sm transition-colors',
                      size === s ? 'border-primary bg-primary text-white' : 'border-border bg-white hover:border-accent',
                      disabled && 'cursor-not-allowed line-through opacity-40 hover:border-border',
                    )}
                    aria-pressed={size === s}
                    aria-label={`Pilih ukuran ${s}${disabled ? ' (stok habis)' : ''}`}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* SKU + stock */}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {selectedVariant && (
            <span className="text-muted-foreground">
              SKU: <span className="font-mono text-foreground">{selectedVariant.sku}</span>
            </span>
          )}
          {selectedVariant && stock > 0 && stock <= 5 && (
            <span className="font-medium text-amber-600">Tersisa {stock}</span>
          )}
          {selectedVariant && stock > 5 && <span className="text-emerald-700">Stok tersedia</span>}
          {outOfStock && <span className="font-medium text-red-700">Stok habis</span>}
        </div>

        {/* Qty */}
        <div className="mt-7">
          <div className="text-sm">Jumlah</div>
          <div className="mt-2 flex items-center">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={qty <= 1}
              className="flex size-11 items-center justify-center border border-border hover:border-accent disabled:opacity-40"
              aria-label="Kurangi jumlah"
            >
              <Minus className="size-4" />
            </button>
            <span className="flex h-11 w-16 items-center justify-center border-y border-border text-sm font-medium">
              {qty}
            </span>
            <button
              onClick={() => setQty(Math.min(stock || 1, qty + 1))}
              disabled={qty >= (stock || 1)}
              className="flex size-11 items-center justify-center border border-border hover:border-accent disabled:opacity-40"
              aria-label="Tambah jumlah"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => handleAdd(false)}
            disabled={outOfStock || !selectedVariant}
            className="h-12 flex-1 bg-primary text-white hover:bg-primary/90"
          >
            <ShoppingBag className="size-4" />
            Tambah ke Keranjang
          </Button>
          <Button
            onClick={() => handleAdd(true)}
            disabled={outOfStock || !selectedVariant}
            variant="outline"
            className="h-12 flex-1 border-primary hover:bg-accent hover:text-white"
          >
            <Zap className="size-4" /> Beli Sekarang
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()

  const [result, setResult] = useState<{ slug: string; product: ProductDetail } | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [related, setRelated] = useState<{ slug: string; items: StoreProduct[] } | null>(null)

  const active = result && result.slug === slug ? result.product : null
  const fetching = !active && !notFound

  useEffect(() => {
    let cancelled = false
    fetch(`/api/products/${slug}`)
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          setNotFound(true)
          return
        }
        const d = await res.json()
        setResult({ slug, product: d.product })
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  // Related products
  useEffect(() => {
    if (!active?.categorySlug) return
    let cancelled = false
    fetch(`/api/products?category=${active.categorySlug}&limit=5`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const list: StoreProduct[] = d.products ?? []
        setRelated({ slug: active.slug, items: list.filter((p) => p.slug !== active.slug).slice(0, 4) })
      })
      .catch(() => {
        if (!cancelled) setRelated({ slug: active.slug, items: [] })
      })
    return () => {
      cancelled = true
    }
  }, [active?.categorySlug, active?.slug])

  const activeRelated = related && active && related.slug === active.slug ? related.items : null

  return (
    <StoreShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-10">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/katalog" className="hover:text-accent">
            Katalog
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          {active ? (
            <>
              <Link href={`/katalog?category=${active.categorySlug}`} className="hover:text-accent">
                {active.categoryName}
              </Link>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <span className="text-foreground">{active.name}</span>
            </>
          ) : (
            <span className="text-foreground">Produk</span>
          )}
        </nav>

        {notFound ? (
          <div className="mt-16 flex flex-col items-center border border-border py-24 text-center">
            <p className="font-display text-lg font-semibold tracking-widest">PRODUK TIDAK DITEMUKAN</p>
            <p className="mt-2 text-sm text-muted-foreground">Produk mungkin telah dihapus atau tautan salah.</p>
            <Button asChild className="mt-6 h-11 bg-primary px-8 text-white">
              <Link href="/katalog">Kembali ke Katalog</Link>
            </Button>
          </div>
        ) : fetching || !active ? (
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <Skeleton className="aspect-[3/4] rounded-none bg-secondary" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-2/3 rounded-none bg-secondary" />
              <Skeleton className="h-6 w-1/3 rounded-none bg-secondary" />
              <Skeleton className="h-24 w-full rounded-none bg-secondary" />
              <Skeleton className="h-11 w-48 rounded-none bg-secondary" />
            </div>
          </div>
        ) : (
          <>
            <ProductView key={active.slug} product={active} />

            {/* ===== Related ===== */}
            <section className="mt-16 border-t border-border pt-10">
              <h2 className="mb-6 font-display text-xl font-semibold tracking-widest">PRODUK TERKAIT</h2>
              {activeRelated === null ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : activeRelated.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {activeRelated.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada produk terkait.</p>
              )}
            </section>
          </>
        )}
      </div>
    </StoreShell>
  )
}
