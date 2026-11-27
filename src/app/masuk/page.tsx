'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { StoreShell } from '@/components/store/StoreShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

function LoginContent() {
  const router = useRouter()
  const sp = useSearchParams()
  const nextParam = sp.get('next')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

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
        body: JSON.stringify({ email: email.trim(), password, portal: 'customer' }),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(d.error ?? 'Gagal masuk')
        return
      }
      toast.success(`Selamat datang, ${d.user?.name ?? ''}!`)
      router.replace(nextParam || '/akun')
    } catch {
      toast.error('Gagal masuk, periksa koneksi kamu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-14 md:py-20">
      <Link href="/" className="font-display text-2xl font-semibold tracking-brand text-primary">
        KIKIS
      </Link>
      <p className="mt-2 text-sm text-muted-foreground">Masuk untuk melanjutkan belanja</p>

      <div className="mt-8 w-full border border-border bg-white p-6 sm:p-8">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="cust-email">Email</Label>
            <Input
              id="cust-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-11"
              placeholder="nama@email.com"
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="cust-password">Kata Sandi</Label>
            <div className="relative mt-1.5">
              <Input
                id="cust-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pr-11"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="h-12 w-full bg-primary text-white hover:bg-primary/90">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Memproses...
              </>
            ) : (
              'Masuk'
            )}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Belum punya akun?{' '}
          <Link href="/daftar" className="text-accent hover:underline">
            Daftar
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
        Demo: budi@example.com / password123
      </p>
    </div>
  )
}

function LoginSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-14 md:py-20">
      <Skeleton className="h-8 w-32 rounded-none bg-secondary" />
      <Skeleton className="mt-8 h-96 w-full rounded-none bg-secondary" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <StoreShell>
      <Suspense fallback={<LoginSkeleton />}>
        <LoginContent />
      </Suspense>
    </StoreShell>
  )
}
