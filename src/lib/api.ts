/** API route helpers — consistent JSON responses and error handling */
import { NextResponse } from 'next/server'

export function ok<T>(data: T, init?: number) {
  return NextResponse.json(data as object, { status: init ?? 200 })
}

export function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

export function unauthorized(message = 'Anda harus login terlebih dahulu') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'Anda tidak memiliki akses untuk operasi ini') {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function fail(e: unknown) {
  console.error('[API Error]', e)
  const message = e instanceof Error ? e.message : 'Terjadi kesalahan pada server'
  return NextResponse.json({ error: message }, { status: 500 })
}
