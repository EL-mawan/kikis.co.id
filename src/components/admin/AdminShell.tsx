'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  AlertTriangle,
  BarChart3,
  Barcode,
  Boxes,
  LayoutDashboard,
  Layers,
  LogOut,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  Ticket,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { ROLE_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Utama',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/produk', label: 'Produk', icon: Package },
      { href: '/admin/kategori', label: 'Kategori', icon: Tags },
      { href: '/admin/varian', label: 'Varian Produk', icon: Layers },
      { href: '/admin/barcode', label: 'Barcode', icon: Barcode },
      { href: '/admin/inventaris', label: 'Inventaris', icon: Boxes },
    ],
  },
  {
    label: 'Penjualan',
    items: [
      { href: '/admin/pesanan', label: 'Pesanan Online', icon: ShoppingCart },
      { href: '/admin/transaksi', label: 'Transaksi POS', icon: Receipt },
      { href: '/admin/voucher', label: 'Voucher', icon: Ticket },
    ],
  },
  {
    label: 'Laporan',
    items: [{ href: '/admin/laporan', label: 'Laporan', icon: BarChart3 }],
  },
  {
    label: 'Orang',
    items: [
      { href: '/admin/pelanggan', label: 'Pelanggan', icon: Users },
      { href: '/admin/pengguna', label: 'Pengguna', icon: UserCog },
    ],
  },
  {
    label: 'Sistem',
    items: [{ href: '/admin/pengaturan', label: 'Pengaturan', icon: Settings }],
  },
]

function pageTitle(pathname: string): string {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)) {
        return item.label
      }
    }
  }
  return 'Panel Admin'
}

function NavContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Navigasi admin" className="flex-1 space-y-5 overflow-y-auto px-3 py-4 custom-scrollbar">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-3 text-xs uppercase tracking-widest text-white/50">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-10 items-center gap-3 rounded-none border-l-2 px-3 text-sm transition-colors',
                      active
                        ? 'border-[#B99B79] bg-white/10 font-medium text-white'
                        : 'border-transparent text-[#f4f1ec]/75 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function SidebarFooter({ userName, userRole, loggingOut, onLogout }: {
  userName: string
  userRole: string
  loggingOut: boolean
  onLogout: () => void
}) {
  return (
    <div className="border-t border-white/10 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#B99B79] text-sm font-bold uppercase text-white"
        >
          {userName.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{userName}</p>
          <p className="text-xs uppercase tracking-widest text-white/50">{ROLE_LABEL[userRole] ?? userRole}</p>
        </div>
      </div>
      {userRole === 'CASHIER' ? (
        <Button
          asChild
          variant="outline"
          className="mb-2 h-10 w-full justify-start gap-2 rounded-none border-white/20 bg-transparent text-sm text-[#f4f1ec] hover:bg-white/10 hover:text-white"
        >
          <Link href="/loginkasir/pos">
            <Store className="h-4 w-4" /> Ke Kasir
          </Link>
        </Button>
      ) : null}
      <Button
        variant="outline"
        disabled={loggingOut}
        onClick={onLogout}
        className="h-10 w-full justify-start gap-2 rounded-none border-white/20 bg-transparent text-sm text-[#f4f1ec] hover:bg-white/10 hover:text-white"
      >
        <LogOut className="h-4 w-4" /> {loggingOut ? 'Keluar...' : 'Keluar'}
      </Button>
    </div>
  )
}

export function AdminShell({
  userName,
  userRole,
  children,
}: {
  userName: string
  userRole: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  // Lock history: only prompt logout when user presses Back while on the main dashboard /admin.
  // On other pages (/admin/produk, /admin/kategori, etc.), normal browser back/undo is permitted.
  useEffect(() => {
    if (pathname !== '/admin') return

    window.history.pushState(null, '', window.location.href)
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href)
      setLogoutConfirmOpen(true)
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [pathname])

  const doLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore network errors — cookie will expire anyway
    } finally {
      router.push('/loginkasir')
    }
  }

  const logout = () => setLogoutConfirmOpen(true)

  const title = pageTitle(pathname)

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[#252525] text-[#f4f1ec] md:flex print:hidden"
        aria-label="Sidebar admin"
      >
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
          <div>
            <p className="font-display text-base font-bold tracking-brand text-white">KIKIS</p>
            <p className="text-[10px] uppercase tracking-widest text-white/50">Panel Admin</p>
          </div>
        </div>
        <NavContent pathname={pathname} />
        <SidebarFooter userName={userName} userRole={userRole} loggingOut={loggingOut} onLogout={logout} />
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur lg:px-8 print:hidden">
          <div className="flex items-center gap-2">
            <h2 className="font-display truncate text-sm font-semibold uppercase tracking-widest">{title}</h2>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B99B79] text-xs font-bold uppercase text-white">
              {userName.charAt(0)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-red-600"
              onClick={logout}
              disabled={loggingOut}
              aria-label="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 pb-24 md:pb-8 lg:p-8">{children}</main>

        {/* Mobile / Tablet Bottom Navigation Bar */}
        <nav
          aria-label="Navigasi bawah mobile"
          className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-[#252525] px-2 text-[#f4f1ec] md:hidden print:hidden"
        >
          {[
            { href: '/admin', label: 'Dasbor', icon: LayoutDashboard },
            { href: '/admin/produk', label: 'Produk', icon: Package },
            { href: '/admin/pesanan', label: 'Pesanan', icon: ShoppingCart },
            { href: '/admin/transaksi', label: 'POS', icon: Receipt },
            { href: '/admin/laporan', label: 'Laporan', icon: BarChart3 },
          ].map((item) => {
            const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-medium transition-colors',
                  active
                    ? 'text-[#B99B79] font-bold'
                    : 'text-white/60 hover:text-white'
                )}
              >
                <Icon className={cn('h-5 w-5 mb-0.5', active ? 'text-[#B99B79]' : 'text-white/60')} />
                <span className="truncate max-w-[60px]">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Logout confirmation dialog */}
      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Keluar</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin keluar dari Panel Admin? Anda harus masuk kembali untuk mengakses panel ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loggingOut}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={doLogout}
              disabled={loggingOut}
              className="bg-red-700 text-white hover:bg-red-800"
            >
              {loggingOut ? 'Keluar...' : 'Ya, Keluar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
