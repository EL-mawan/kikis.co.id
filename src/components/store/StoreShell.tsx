'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Menu, Phone, Search, ShoppingBag, User } from 'lucide-react'
import { toast } from 'sonner'
import { cartCount, useCart } from '@/store/cart'
import { useSession } from '@/hooks/use-session'
import { ROLE_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

interface StoreCategory {
  id: string
  name: string
  slug: string
  description?: string | null
}

const NAV_LINKS = [
  { href: '/', label: 'Beranda' },
  { href: '/katalog', label: 'Katalog' },
]

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'CASHIER']

const emptySubscribe = () => () => {}

export function StoreShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const cartItems = useCart((s) => s.items)
  const { user, refresh } = useSession()
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [search, setSearch] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d.categories) ? d.categories : []))
      .catch(() => setCategories([]))
  }, [])

  const count = mounted ? cartCount(cartItems) : 0
  const isStaff = !!user && STAFF_ROLES.includes(user.role)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = search.trim()
    if (!q) return
    setMobileOpen(false)
    router.push(`/katalog?search=${encodeURIComponent(q)}`)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.success('Berhasil keluar')
      await refresh()
      router.push('/')
    } catch {
      toast.error('Gagal keluar, coba lagi')
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* ===== Navbar ===== */}
      <header className="sticky top-0 z-40 border-b border-border bg-white">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-4 sm:px-6">
          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                className="inline-flex size-11 items-center justify-center rounded-md hover:bg-secondary md:hidden"
                aria-label="Buka menu navigasi"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetTitle className="font-display text-lg font-semibold tracking-brand">KIKIS</SheetTitle>
              <SheetDescription className="sr-only">Menu navigasi toko</SheetDescription>
              <div className="mt-2 flex flex-col">
                <form onSubmit={handleSearch} className="relative mb-4">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari produk..."
                    className="h-11 pr-10"
                    aria-label="Cari produk"
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1 inline-flex size-9 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label="Cari"
                  >
                    <Search className="size-4" />
                  </button>
                </form>
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="border-b border-border py-3 font-display text-sm tracking-widest hover:text-accent"
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  href="/keranjang"
                  onClick={() => setMobileOpen(false)}
                  className="border-b border-border py-3 font-display text-sm tracking-widest hover:text-accent"
                >
                  Keranjang ({count})
                </Link>
                {user ? (
                  <>
                    {!isStaff && (
                      <>
                        <Link
                          href="/akun"
                          onClick={() => setMobileOpen(false)}
                          className="border-b border-border py-3 font-display text-sm tracking-widest hover:text-accent"
                        >
                          Akun Saya
                        </Link>
                        <Link
                          href="/pesanan"
                          onClick={() => setMobileOpen(false)}
                          className="border-b border-border py-3 font-display text-sm tracking-widest hover:text-accent"
                        >
                          Riwayat Pesanan
                        </Link>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setMobileOpen(false)
                        handleLogout()
                      }}
                      className="py-3 text-left font-display text-sm tracking-widest text-red-700 hover:text-red-800"
                    >
                      Keluar
                    </button>
                  </>
                ) : (
                  <Link
                    href="/masuk"
                    onClick={() => setMobileOpen(false)}
                    className="py-3 font-display text-sm tracking-widest hover:text-accent"
                  >
                    Masuk / Daftar
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Brand */}
          <Link href="/" className="font-display text-lg font-semibold tracking-brand text-primary">
            KIKIS
          </Link>

          {/* Center links (desktop) */}
          <nav className="ml-8 hidden items-center gap-7 md:flex" aria-label="Navigasi utama">
            {NAV_LINKS.map((l) => {
              const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    'font-display text-[13px] tracking-widest transition-colors hover:text-accent',
                    active ? 'text-foreground underline underline-offset-8 decoration-accent' : 'text-muted-foreground',
                  )}
                >
                  {l.label}
                </Link>
              )
            })}
          </nav>

          {/* Search (desktop) */}
          <form onSubmit={handleSearch} className="relative ml-auto hidden w-56 lg:block xl:w-72">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="h-10 pr-10 text-sm"
              aria-label="Cari produk"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Cari"
            >
              <Search className="size-4" />
            </button>
          </form>

          {/* Right icons */}
          <div className="flex items-center gap-1 lg:ml-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="inline-flex size-11 items-center justify-center rounded-md hover:bg-secondary"
                    aria-label="Menu akun"
                  >
                    <User className="size-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="text-sm font-medium">{user.name}</div>
                    <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-wide text-accent">{ROLE_LABEL[user.role] ?? user.role}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isStaff ? (
                    <>
                      <DropdownMenuItem onClick={() => router.push('/admin')}>Dasbor Admin</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/loginkasir/pos')}>Kasir POS</DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => router.push('/akun')}>Akun Saya</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/pesanan')}>Riwayat Pesanan</DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-700">
                    <LogOut className="size-4" /> Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href="/masuk"
                className="inline-flex size-11 items-center justify-center rounded-md hover:bg-secondary"
                aria-label="Masuk ke akun"
              >
                <User className="size-5" />
              </Link>
            )}
            <Link
              href="/keranjang"
              className="relative inline-flex size-11 items-center justify-center rounded-md hover:bg-secondary"
              aria-label={`Keranjang belanja, ${count} item`}
            >
              <ShoppingBag className="size-5" />
              {mounted && count > 0 && (
                <span className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-white">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ===== Page content ===== */}
      <main className="flex-1">{children}</main>

      {/* ===== Footer ===== */}
      <footer className="mt-auto bg-primary text-primary-foreground">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
          {/* Brand + tagline */}
          <div>
            <div className="font-display text-xl font-semibold tracking-brand">KIKIS</div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-primary-foreground/70">
              Style Made Simple. Koleksi fashion premium untuk gaya hidup modern — kualitas terbaik, harga jujur.
            </p>
          </div>
          {/* Kategori */}
          <nav aria-label="Kategori">
            <div className="font-display text-sm font-semibold tracking-widest text-accent">KATEGORI</div>
            <ul className="mt-3 space-y-2 text-sm">
              {categories.slice(0, 7).map((c) => (
                <li key={c.id}>
                  <Link href={`/katalog?category=${c.slug}`} className="text-primary-foreground/80 hover:text-accent">
                    {c.name}
                  </Link>
                </li>
              ))}
              {categories.length === 0 && (
                <li>
                  <Link href="/katalog" className="text-primary-foreground/80 hover:text-accent">
                    Semua Produk
                  </Link>
                </li>
              )}
            </ul>
          </nav>
          {/* Kontak */}
          <div>
            <div className="font-display text-sm font-semibold tracking-widest text-accent">KONTAK</div>
            <ul className="mt-3 space-y-2 text-sm text-primary-foreground/80">
              <li>Jl. Kemang Raya No. 12, Jakarta Selatan</li>
              <li className="flex items-center gap-2">
                <Phone className="size-3.5" /> 021-7280-1122
              </li>
              <li>
                <a href="mailto:hello@kikis.id" className="hover:text-accent">
                  hello@kikis.id
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/15">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-primary-foreground/60 sm:flex-row sm:px-6">
            <div>© 2025 KIKIS. Style Made Simple.</div>
            <div className="flex items-center gap-5">
              <Link href="/admin" className="hover:text-accent">
                Dasbor Admin
              </Link>
              <Link href="/loginkasir/pos" className="hover:text-accent">
                Kasir
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
