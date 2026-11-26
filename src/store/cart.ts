'use client'

/**
 * KIKIS Cart Store (zustand + localStorage persist)
 * Client-side display data only — checkout re-validates prices & stock server-side.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartLine {
  variantId: string
  productId: string
  slug?: string
  productName: string
  variantName: string
  image?: string | null
  price: number
  quantity: number
  maxStock: number
}

interface CartState {
  items: CartLine[]
  addItem: (line: CartLine) => void
  removeItem: (variantId: string) => void
  setQuantity: (variantId: string, quantity: number) => void
  clear: () => void
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (line) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === line.variantId)
          if (existing) {
            const newQty = Math.min(existing.quantity + line.quantity, line.maxStock)
            return {
              items: state.items.map((i) =>
                i.variantId === line.variantId ? { ...i, quantity: newQty, price: line.price, maxStock: line.maxStock } : i,
              ),
            }
          }
          return { items: [...state.items, line] }
        }),
      removeItem: (variantId) => set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),
      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.variantId === variantId ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxStock)) } : i))
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: 'kikis-cart' },
  ),
)

export const cartTotal = (items: CartLine[]) => items.reduce((acc, i) => acc + i.price * i.quantity, 0)
export const cartCount = (items: CartLine[]) => items.reduce((acc, i) => acc + i.quantity, 0)
