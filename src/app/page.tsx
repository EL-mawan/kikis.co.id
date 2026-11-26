'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Truck } from 'lucide-react'
import { StoreShell } from '@/components/store/StoreShell'
import { ProductCard, ProductCardSkeleton, type StoreProduct } from '@/components/store/ProductCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

interface StoreCategory {
  id: string
  name: string
  slug: string
  description?: string | null
}

const HERO_IMAGE = 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3c6b4dbcbba0.jpg'

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 text-center">
      <h2 className="font-display text-2xl font-semibold tracking-widest md:text-3xl">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mx-auto mt-4 h-px w-12 bg-accent" aria-hidden="true" />
    </div>
  )
}

function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-none bg-secondary" />
      ))}
    </div>
  )
}

function ProductGrid({ products }: { products: StoreProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export default function HomePage() {
  const [categories, setCategories] = useState<StoreCategory[] | null>(null)
  const [featured, setFeatured] = useState<StoreProduct[] | null>(null)
  const [latest, setLatest] = useState<StoreProduct[] | null>(null)

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => setCategories([]))
    fetch('/api/products?featured=1&limit=8')
      .then((r) => r.json())
      .then((d) => setFeatured(d.products ?? []))
      .catch(() => setFeatured([]))
    fetch('/api/products?limit=8&sort=newest')
      .then((r) => r.json())
      .then((d) => setLatest(d.products ?? []))
      .catch(() => setLatest([]))
  }, [])

  return (
    <StoreShell>
      {/* ===== Hero ===== */}
      <section className="bg-secondary">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
          <div className="order-2 md:order-1">
            <p className="font-display text-xs font-medium tracking-widest text-accent">KOLEKSI TERBARU 2025</p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-widest sm:text-5xl md:text-6xl">
              STYLE MADE SIMPLE.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              Koleksi fashion premium untuk gaya hidup modern. Kualitas terbaik, harga jujur.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11 bg-primary px-8 text-white hover:bg-primary/90">
                <Link href="/katalog">
                  Belanja Sekarang <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 border-primary px-8">
                <a href="#unggulan">Lihat Katalog</a>
              </Button>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div className="relative aspect-[4/3] overflow-hidden md:aspect-[3/4]">
              <img
                src={HERO_IMAGE}
                alt="Koleksi fashion premium KIKIS"
                className="size-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-white px-4 py-2">
                <span className="font-display text-xs font-semibold tracking-widest">NEW ARRIVALS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Promo strip ===== */}
      <div className="bg-accent text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-1 px-4 py-3 text-center text-sm sm:flex-row sm:gap-3 sm:px-6">
          <span className="flex items-center gap-2 font-semibold uppercase tracking-widest">
            <Truck className="size-4" /> GRATIS ONGKIR
          </span>
          <span className="text-white/90">
            — Gunakan voucher WELCOME10K untuk diskon Rp 10.000 pembeli baru
          </span>
        </div>
      </div>

      {/* ===== Kategori ===== */}
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-16">
        <SectionHeader title="KATEGORI KAMI" subtitle="Temukan gaya yang cocok untukmu" />
        {categories === null ? (
          <CategoryGridSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/katalog?category=${c.slug}`}
                className="group flex flex-col items-center justify-center border border-border p-5 text-center transition-colors hover:border-accent"
              >
                <span className="font-display text-sm font-medium tracking-wide group-hover:text-accent">
                  {c.name}
                </span>
                {c.description && (
                  <span className="mt-2 line-clamp-2 text-xs text-muted-foreground">{c.description}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ===== Produk Unggulan ===== */}
      <section id="unggulan" className="bg-secondary">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-16">
          <SectionHeader title="PRODUK UNGGULAN" subtitle="Pilihan terbaik dari KIKIS" />
          {featured === null ? <ProductGridSkeleton /> : featured.length > 0 ? <ProductGrid products={featured} /> : (
            <p className="text-center text-sm text-muted-foreground">Belum ada produk unggulan.</p>
          )}
          <div className="mt-8 text-center">
            <Button asChild variant="outline" className="h-11 border-primary px-8">
              <Link href="/katalog">
                Lihat Semua Produk <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ===== Terbaru ===== */}
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-16">
        <SectionHeader title="TERBARU" subtitle="Baru tiba di KIKIS" />
        {latest === null ? <ProductGridSkeleton /> : latest.length > 0 ? <ProductGrid products={latest} /> : (
          <p className="text-center text-sm text-muted-foreground">Belum ada produk.</p>
        )}
      </section>
    </StoreShell>
  )
}
