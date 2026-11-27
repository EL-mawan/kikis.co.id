'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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

function StaffLoginContent() {
  const router = useRouter()
  const sp = useSearchParams()
  const nextParam = sp.get('next')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeSession, setActiveSession] = useState<{ name: string; role: string } | null>(null)
  const [alertLogoutOpen, setAlertLogoutOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [alertMustLoginOpen, setAlertMustLoginOpen] = useState(false)

  // Invalidate any active session upon entering login page to enforce re-login
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user && (data.user.role === 'ADMIN' || data.user.role === 'SUPER_ADMIN' || data.user.role === 'CASHIER')) {
          setActiveSession(data.user)
          setAlertLogoutOpen(true)
          // Invalidate session cookie immediately so user cannot navigate back/forward into admin without logging in
          fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  // Trap back/undo buttons: if user tries to undo/go back to previous admin or POS page, block and show alert
  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href)
      setAlertMustLoginOpen(true)
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setActiveSession(null)
      setAlertLogoutOpen(false)
      toast.info('Sesi sebelumnya telah ditutup. Silakan login kembali.')
    } catch {
      toast.error('Gagal memproses sesi')
    } finally {
      setLoggingOut(false)
    }
  }

  const handleReturnToPanel = () => {
    setAlertLogoutOpen(false)
    if (activeSession?.role === 'CASHIER') {
      router.push('/loginkasir/pos')
    } else {
      router.push('/admin')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Email dan kata sandi wajib diisi')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, portal: 'staff' }),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(d.error ?? 'Gagal masuk')
        return
      }
      toast.success(`Selamat datang, ${d.user?.name ?? ''}!`)
      const dest = nextParam || (d.user?.role === 'CASHIER' ? '/loginkasir/pos' : '/admin')
      router.replace(dest)
    } catch {
      toast.error('Gagal masuk, periksa koneksi kamu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1a1a] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#B99B79] text-white mb-4">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-[0.2em] text-white">KIKIS</h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-white/50">Portal Staf</p>
        </div>

        {/* Form card */}
        <div className="rounded-none border border-white/10 bg-[#252525] p-8">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-widest text-white">
            Masuk sebagai Staf
          </h2>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label htmlFor="staff-email" className="text-xs uppercase tracking-widest text-white/60">
                Email
              </Label>
              <Input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-11 border-white/20 bg-white/5 text-white placeholder:text-white/30 focus:border-[#B99B79]"
                placeholder="staff@kikis.id"
                autoComplete="email"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="staff-password" className="text-xs uppercase tracking-widest text-white/60">
                Kata Sandi
              </Label>
              <div className="relative mt-2">
                <Input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 border-white/20 bg-white/5 pr-11 text-white placeholder:text-white/30 focus:border-[#B99B79]"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center text-white/40 hover:text-white/80"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-12 w-full rounded-none bg-[#B99B79] text-sm font-semibold uppercase tracking-widest text-white hover:bg-[#a8896a]"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-white/30">
            Kasir diarahkan ke kasir POS · Admin ke dasbor
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] text-white/20">
          Halaman ini hanya untuk staf KIKIS yang berwenang.
        </p>
      </div>

      {/* Alert when staff navigates to login while previously having an active session */}
      <AlertDialog open={alertLogoutOpen} onOpenChange={setAlertLogoutOpen}>
        <AlertDialogContent className="border-white/10 bg-[#252525] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Sesi Berakhir / Wajib Login Ulang</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Anda telah kembali ke halaman login. Untuk alasan keamanan, sesi staf sebelumnya (<strong className="text-white">{activeSession?.name}</strong>) telah dikunci dan ditutup.
              Jika Anda ingin kembali ke panel admin atau kasir, Anda wajib memasukkan kredensial login terlebih dahulu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full bg-[#B99B79] text-white hover:bg-[#a8896a]"
            >
              Saya Mengerti & Siap Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert when user presses browser Back/Undo while on login page to return to admin/pos */}
      <AlertDialog open={alertMustLoginOpen} onOpenChange={setAlertMustLoginOpen}>
        <AlertDialogContent className="border-white/10 bg-[#252525] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Akses Ditolak: Wajib Login</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Halaman panel admin dan kasir dilindungi. Anda wajib login terlebih dahulu menggunakan akun staf yang sah untuk dapat mengakses halaman tersebut.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setAlertMustLoginOpen(false)}
              className="w-full bg-[#B99B79] text-white hover:bg-[#a8896a]"
            >
              Mengerti, Silakan Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StaffLoginSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1a1a] px-4">
      <div className="w-full max-w-sm space-y-4">
        <Skeleton className="mx-auto h-14 w-14 rounded-full bg-white/10" />
        <Skeleton className="mx-auto h-8 w-32 bg-white/10" />
        <Skeleton className="h-64 w-full bg-white/10" />
      </div>
    </div>
  )
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={<StaffLoginSkeleton />}>
      <StaffLoginContent />
    </Suspense>
  )
}
