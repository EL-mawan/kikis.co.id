'use client'

import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import { formatIDR } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface BarcodeVariant {
  id: string
  sku: string
  barcode: string
  productName: string
  variantName: string
  price: number
  stock: number
  image: string | null
  productActive?: boolean
}

/**
 * One physical price label (KIKIS editorial style).
 * mode '58mm' → compact thermal label, mode '80mm' → wide thermal label.
 * Barcode rendered client-side with JsBarcode into an inline <svg>.
 */
export function BarcodeLabel({
  variant,
  mode = '58mm',
  colorHex,
  className,
}: {
  variant: BarcodeVariant
  mode?: '58mm' | '80mm'
  colorHex?: string | null
  className?: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !variant.barcode) return
    try {
      JsBarcode(svgRef.current, variant.barcode, {
        format: 'CODE128',
        width: 2,
        height: 40,
        displayValue: true,
        fontSize: 12,
        margin: 2,
      })
    } catch {
      // invalid barcode value — leave empty
    }
  }, [variant.barcode])

  // variantName from API is "Warna - Ukuran"
  const parts = variant.variantName.split(' - ')
  const color = parts.length >= 2 ? parts[0] : null
  const size = parts.length >= 2 ? parts[1] : parts.length === 1 && parts[0] ? parts[0] : null

  const compact = mode === '58mm'

  return (
    <div
      className={cn(
        'flex flex-col gap-1 border border-black bg-white p-2 text-black',
        className
      )}
      style={{ width: compact ? '58mm' : '80mm' }}
    >
      <div className="flex items-baseline justify-between">
        <p className="font-display text-xs font-bold tracking-brand">KIKIS</p>
        {compact ? null : <p className="text-[9px] uppercase tracking-widest text-neutral-500">Style Made Simple.</p>}
      </div>
      <p className={cn('font-semibold leading-tight', compact ? 'text-[11px]' : 'text-sm')}>
        {variant.productName}
      </p>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide">
        {color ? (
          <span className="inline-flex items-center gap-1">
            {colorHex ? (
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 border border-neutral-300"
                style={{ backgroundColor: colorHex }}
              />
            ) : null}
            {color}
          </span>
        ) : null}
        {size ? <span>Size: {size}</span> : null}
      </div>
      <p className="font-mono text-[10px] text-neutral-600">SKU: {variant.sku}</p>
      <p className={cn('font-bold', compact ? 'text-xs' : 'text-sm')}>{formatIDR(variant.price)}</p>
      <svg ref={svgRef} className="mx-auto max-w-full" role="img" aria-label={`Barcode ${variant.barcode}`} />
    </div>
  )
}

/** Sheet of labels for printing — wrap in .print-receipt when printing. */
export function BarcodeLabelSheet({
  variants,
  mode,
  getColorHex,
}: {
  variants: BarcodeVariant[]
  mode: '58mm' | '80mm'
  getColorHex?: (variant: BarcodeVariant) => string | null
}) {
  if (!variants.length) return null
  return (
    <div
      className={cn('grid', mode === '58mm' ? 'grid-cols-2 gap-[4mm]' : 'grid-cols-1 gap-[6mm]')}
      style={{ width: mode === '58mm' ? '120mm' : '80mm' }}
    >
      {variants.map((v) => (
        <BarcodeLabel key={v.id} variant={v} mode={mode} colorHex={getColorHex?.(v) ?? null} />
      ))}
    </div>
  )
}
