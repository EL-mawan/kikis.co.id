'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { StoreShell } from '@/components/store/StoreShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password) {
      toast.error('Nama, email, dan kata sandi wajib diisi')
      return
    }
    if (password.length < 6) {
      toast.error('Kata sandi minimal 6 karakter')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, password }),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(d.error ?? 'Pendaftaran gagal')
        return
      }
      toast.success(`Selamat datang di KIKIS, ${d.user?.name ?? name}!`)
      router.replace('/akun')
    } catch {
      toast.error('Pendaftaran gagal, periksa koneksi kamu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StoreShell>
      <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-14 md:py-20">
        <Link href="/" className="font-display text-2xl font-semibold tracking-brand text-primary">
          KIKIS
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">Buat akun baru untuk berbelanja</p>

        <div className="mt-8 w-full border border-border bg-white p-6 sm:p-8">
          <h1 className="font-display text-lg font-semibold tracking-widest">DAFTAR AKUN</h1>
          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="reg-name">Nama Lengkap</Label>
              <Input
                id="reg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 h-11"
                placeholder="Nama kamu"
                autoComplete="name"
              />
            </div>
            <div>
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 h-11"
                placeholder="nama@email.com"
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="reg-phone">No. Telepon</Label>
              <Input
                id="reg-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 h-11"
                placeholder="08xxxxxxxxxx (opsional)"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
            <div>
              <Label htmlFor="reg-password">Kata Sandi</Label>
              <div className="relative mt-1.5">
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-11"
                  placeholder="Minimal 6 karakter"
                  autoComplete="new-password"
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
                  <Loader2 className="size-4 animate-spin" /> Mendaftarkan...
                </>
              ) : (
                'Daftar'
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Sudah punya akun?{' '}
          <Link href="/masuk" className="text-accent hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </StoreShell>
  )
}
