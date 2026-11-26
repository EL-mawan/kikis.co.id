'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ROLE_LABEL } from '@/lib/format'

interface PosShellProps {
  userName: string
  userRole: string
  children: React.ReactNode
}

export function PosShell({ userName, userRole, children }: PosShellProps) {
  const [loggingOut, setLoggingOut] = useState(false)

  const canViewAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN'

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore network errors — proceed to login page anyway
    }
    window.location.href = '/masuk'
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between bg-[#252525] px-3 text-white sm:px-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link href="/pos" className="flex shrink-0 items-baseline gap-1.5" aria-label="KIKIS POS">
            <span className="font-display text-lg font-bold tracking-widest">KIKIS</span>
            <span className="rounded-sm bg-accent px-1.5 py-0.5 text-xs font-bold tracking-widest text-white">POS</span>
          </Link>
          <span className="hidden text-xs text-white/50 xl:inline">Style Made Simple.</span>
          <span className="flex min-w-0 items-center gap-2 text-xs text-white/70">
            <span className="hidden text-white/25 sm:inline">|</span>
            <span className="truncate">Kasir: <span className="font-semibold text-white">{userName}</span></span>
            <span className="shrink-0 rounded-sm bg-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">
              {ROLE_LABEL[userRole] ?? userRole}
            </span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canViewAdmin && (
            <Button
              asChild
              variant="ghost"
              className="h-10 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <Link href="/admin">
                <LayoutDashboard className="size-4" />
                <span className="hidden sm:inline">Dasbor</span>
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleLogout}
            disabled={loggingOut}
            className="h-10 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" />
            {loggingOut ? 'Keluar...' : 'Keluar'}
          </Button>
        </div>
      </header>
      <div className="grid h-[calc(100vh-3.5rem)] min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_400px]">
        {children}
      </div>
    </div>
  )
}
