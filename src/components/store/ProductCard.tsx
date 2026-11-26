'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatIDR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export interface StoreProduct {
  id: string
  name: string
  slug: string
  description?: string | null
  categoryName: string
  categorySlug: string
  image: string | null
  price: number
  maxPrice: number
  stock: number
  inStock: boolean
  isFeatured?: boolean
  sizes?: string[]
  colors?: string[]
}

export function ProductCardSkeleton() {
  return (
    <div className="border border-border">
      <Skeleton className="aspect-[3/4] w-full rounded-none bg-secondary" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-3 w-1/3 rounded-none bg-secondary" />
        <Skeleton className="h-4 w-3/4 rounded-none bg-secondary" />
        <Skeleton className="h-4 w-1/2 rounded-none bg-secondary" />
      </div>
    </div>
  )
}

export function ProductCard({ product }: { product: StoreProduct }) {
  const [loaded, setLoaded] = useState(false)
  const showRange = product.maxPrice > product.price

  return (
    <Link
      href={`/produk/${product.slug}`}
      className="group block border border-border bg-white transition-colors hover:border-accent"
      aria-label={`Lihat detail ${product.name}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={cn(
              'size-full object-cover transition-all duration-500 group-hover:scale-105',
              loaded ? 'opacity-100' : 'opacity-0',
            )}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            Tanpa Gambar
          </div>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <span className="border border-primary bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest">
              Habis
            </span>
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <div className="text-xs text-muted-foreground">{product.categoryName}</div>
        <h3 className="mt-1 truncate text-sm font-medium uppercase tracking-wide">{product.name}</h3>
        <div className="mt-1.5 text-sm font-medium">
          {showRange ? `${formatIDR(product.price)} - ${formatIDR(product.maxPrice)}` : formatIDR(product.price)}
        </div>
      </div>
    </Link>
  )
}
