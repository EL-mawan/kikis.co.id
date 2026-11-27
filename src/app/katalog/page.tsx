'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, PackageSearch, SlidersHorizontal, X } from 'lucide-react'
import { StoreShell } from '@/components/store/StoreShell'
import { ProductCard, ProductCardSkeleton, type StoreProduct } from '@/components/store/ProductCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface StoreCategory {
  id: string
  name: string
  slug: string
  description?: string | null
}

interface CatalogData {
  products: StoreProduct[]
  total: number
  pages: number
}

interface CatalogResult extends CatalogData {
  key: string
}

const PAGE_SIZE = 12

const PRICE_PRESETS = [
  { key: 'all', label: 'Semua Harga', min: '', max: '' },
  { key: 'lt100', label: '< Rp 100rb', min: '', max: '99999' },
  { key: '100-250', label: 'Rp 100rb - 250rb', min: '100000', max: '250000' },
  { key: 'gt250', label: '> Rp 250rb', min: '250001', max: '' },
]

function currentPricePreset(min: string, max: string): string {
  const found = PRICE_PRESETS.find((p) => p.min === min && p.max === max)
  return found ? found.key : ''
}

function CatalogSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <Skeleton className="h-10 w-48 rounded-none bg-secondary" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        <Skeleton className="hidden h-96 rounded-none bg-secondary lg:block" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

function FilterPanel({
  categories,
  searchInput,
  onSearchChange,
  onSearchSubmit,
  category,
  onCategoryChange,
  pricePreset,
  onPriceChange,
}: {
  categories: StoreCategory[]
  searchInput: string
  onSearchChange: (v: string) => void
  onSearchSubmit: () => void
  category: string
  onCategoryChange: (slug: string) => void
  pricePreset: string
  onPriceChange: (key: string) => void
}) {
  return (
    <div className="space-y-6">
      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSearchSubmit()
        }}
      >
        <div className="mb-3 font-display text-xs font-semibold tracking-widest text-muted-foreground">CARI</div>
        <div className="relative">
          <Input
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Nama produk..."
            className="h-11 pr-9 text-sm"
            aria-label="Cari produk"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                onSearchChange('')
                onSearchSubmit()
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Hapus pencarian"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </form>

      {/* Category */}
      <div>
        <div className="mb-3 font-display text-xs font-semibold tracking-widest text-muted-foreground">KATEGORI</div>
        <div className="flex flex-col gap-1" role="radiogroup" aria-label="Filter kategori">
          <button
            type="button"
            onClick={() => onCategoryChange('')}
            className={cn(
              'flex h-11 items-center px-3 text-left text-sm transition-colors hover:text-accent',
              category === '' ? 'bg-primary font-medium text-white hover:text-white' : 'text-foreground',
            )}
          >
            Semua Kategori
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onCategoryChange(c.slug)}
              className={cn(
                'flex h-11 items-center px-3 text-left text-sm transition-colors hover:text-accent',
                category === c.slug ? 'bg-primary font-medium text-white hover:text-white' : 'text-foreground',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <div className="mb-3 font-display text-xs font-semibold tracking-widest text-muted-foreground">HARGA</div>
        <div className="flex flex-col gap-1" role="radiogroup" aria-label="Filter harga">
          {PRICE_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onPriceChange(p.key)}
              className={cn(
                'flex h-11 items-center px-3 text-left text-sm transition-colors hover:text-accent',
                pricePreset === p.key ? 'bg-primary font-medium text-white hover:text-white' : 'text-foreground',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function CatalogContent() {
  const router = useRouter()
  const sp = useSearchParams()
  const search = sp.get('search') ?? ''
  const category = sp.get('category') ?? ''
  const minPrice = sp.get('minPrice') ?? ''
  const maxPrice = sp.get('maxPrice') ?? ''
  const sort = sp.get('sort') ?? 'newest'
  const page = Math.max(1, Number(sp.get('page') ?? 1) || 1)

  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [data, setData] = useState<CatalogResult | null>(null)
  const [localSearch, setLocalSearch] = useState<{ url: string; value: string } | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

  const pricePreset = currentPricePreset(minPrice, maxPrice)
  const queryKey = [search, category, minPrice, maxPrice, sort, page].join('|')

  // Local search input follows the URL value unless the user typed for the current URL value
  const searchInput = localSearch && localSearch.url === search ? localSearch.value : search
  const setSearchInputValue = (v: string) => setLocalSearch({ url: search, value: v })

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const qs = new URLSearchParams()
    if (search) qs.set('search', search)
    if (category) qs.set('category', category)
    if (minPrice) qs.set('minPrice', minPrice)
    if (maxPrice) qs.set('maxPrice', maxPrice)
    qs.set('sort', sort)
    qs.set('page', String(page))
    qs.set('limit', String(PAGE_SIZE))
    fetch(`/api/products?${qs.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) =>
        setData({ key: queryKey, products: d.products ?? [], total: d.total ?? 0, pages: d.pages ?? 1 }),
      )
      .catch(() => {})
    return () => controller.abort()
  }, [queryKey])

  const activeData = data && data.key === queryKey ? data : null
  const loading = !activeData

  const updateParams = (patch: Record<string, string | null>, resetPage = true) => {
    const qs = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') qs.delete(k)
      else qs.set(k, v)
    }
    if (resetPage) qs.delete('page')
    router.replace(`/katalog?${qs.toString()}`)
  }

  const activeFilterCount =
    (search ? 1 : 0) + (category ? 1 : 0) + (minPrice || maxPrice ? 1 : 0)

  const activeCategoryName = categories.find((c) => c.slug === category)?.name

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-10">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-border pb-6">
        <h1 className="font-display text-3xl font-semibold tracking-widest md:text-4xl">KATALOG</h1>
        <p className="text-sm text-muted-foreground">
          {loading ? 'Memuat...' : `${activeData?.total ?? 0} produk ditemukan`}
          {activeCategoryName ? ` dalam kategori ${activeCategoryName}` : ''}
          {search ? ` untuk "${search}"` : ''}
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block">
          <FilterPanel
            categories={categories}
            searchInput={searchInput}
            onSearchChange={setSearchInputValue}
            onSearchSubmit={() => updateParams({ search: searchInput.trim() || null })}
            category={category}
            onCategoryChange={(slug) => updateParams({ category: slug || null })}
            pricePreset={pricePreset}
            onPriceChange={(key) => {
              const p = PRICE_PRESETS.find((x) => x.key === key)
              if (!p) return
              updateParams({ minPrice: p.min || null, maxPrice: p.max || null })
            }}
          />
        </aside>

        {/* Main */}
        <div>
          {/* Toolbar */}
          <div className="mb-5 flex items-center justify-between gap-3">
            {/* Mobile filter button */}
            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-11 border-primary lg:hidden">
                  <SlidersHorizontal className="size-4" /> Filter
                  {activeFilterCount > 0 && (
                    <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="font-display text-base tracking-widest">FILTER</SheetTitle>
                  <SheetDescription className="sr-only">Filter produk katalog</SheetDescription>
                </SheetHeader>
                <FilterPanel
                  categories={categories}
                  searchInput={searchInput}
                  onSearchChange={setSearchInputValue}
                  onSearchSubmit={() => {
                    setFilterOpen(false)
                    updateParams({ search: searchInput.trim() || null })
                  }}
                  category={category}
                  onCategoryChange={(slug) => {
                    updateParams({ category: slug || null })
                  }}
                  pricePreset={pricePreset}
                  onPriceChange={(key) => {
                    const p = PRICE_PRESETS.find((x) => x.key === key)
                    if (!p) return
                    updateParams({ minPrice: p.min || null, maxPrice: p.max || null })
                  }}
                />
                <div className="mt-6">
                  <Button
                    variant="outline"
                    className="h-11 w-full border-primary"
                    onClick={() => {
                      setFilterOpen(false)
                      router.replace('/katalog')
                    }}
                  >
                    Reset Semua Filter
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Sort */}
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:inline">Urutkan</span>
              <Select
                value={sort}
                onValueChange={(v) => updateParams({ sort: v })}
              >
                <SelectTrigger className="h-11 w-[150px] sm:w-[180px] text-sm" aria-label="Urutkan produk">
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Terbaru</SelectItem>
                  <SelectItem value="price_asc">Harga Terendah</SelectItem>
                  <SelectItem value="price_desc">Harga Tertinggi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : activeData && activeData.products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {activeData.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center border border-border py-20 text-center">
              <PackageSearch className="size-10 text-muted-foreground/50" aria-hidden="true" />
              <p className="mt-4 font-display text-sm font-medium tracking-widest">TIDAK ADA PRODUK DITEMUKAN</p>
              <p className="mt-1 text-sm text-muted-foreground">Coba ubah kata kunci atau filter pencarian.</p>
              <Button variant="outline" className="mt-5 h-11 border-primary" onClick={() => router.replace('/katalog')}>
                Reset Filter
              </Button>
            </div>
          )}

          {/* Pagination */}
          {activeData && activeData.pages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-11 border-primary"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) }, false)}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-4 text-sm">
                Halaman <span className="font-medium">{page}</span> dari {activeData.pages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-11 border-primary"
                disabled={page >= activeData.pages}
                onClick={() => updateParams({ page: String(page + 1) }, false)}
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}

          <p className="mt-10 text-center text-xs text-muted-foreground">
            Butuh bantuan? Email kami di hello@kikis.id atau telepon 021-7280-1122
          </p>
        </div>
      </div>
    </div>
  )
}

export default function KatalogPage() {
  return (
    <StoreShell>
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogContent />
      </Suspense>
    </StoreShell>
  )
}
