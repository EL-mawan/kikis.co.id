/** KIKIS formatting helpers — IDR currency, Asia/Jakarta timezone */

export function formatIDR(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'Rp 0'
  return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(value))}`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}

/** Format date to Asia/Jakarta locale string */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(d)
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' }).format(d)
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Menunggu Pembayaran',
  WAITING_VERIFICATION: 'Menunggu Verifikasi',
  PROCESSING: 'Diproses',
  READY_TO_SHIP: 'Siap Dikirim',
  SHIPPED: 'Dikirim',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
}

export const ORDER_STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'bg-amber-100 text-amber-800',
  WAITING_VERIFICATION: 'bg-orange-100 text-orange-800',
  PROCESSING: 'bg-purple-100 text-purple-800',
  READY_TO_SHIP: 'bg-teal-100 text-teal-800',
  SHIPPED: 'bg-cyan-100 text-cyan-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

export const MOVEMENT_TYPE_LABEL: Record<string, string> = {
  PURCHASE: 'Pembelian',
  POS_SALE: 'Penjualan POS',
  ONLINE_SALE: 'Penjualan Online',
  CUSTOMER_RETURN: 'Retur Pelanggan',
  STOCK_ADJUSTMENT: 'Penyesuaian Stok',
  DAMAGED: 'Barang Rusak',
  STOCK_OPNAME: 'Stok Opname',
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  TRANSFER: 'Transfer Bank',
  COD: 'Bayar di Tempat (COD)',
  QRIS: 'QRIS',
  CASH: 'Tunai',
  DEBIT: 'Kartu Debit',
}

export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  CASHIER: 'Kasir',
  CUSTOMER: 'Pelanggan',
}

/** Generate unique document numbers — Asia/Jakarta based */
function jakartaParts(d: Date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
  const parts: Record<string, string> = {}
  for (const p of fmt.formatToParts(d)) parts[p.type] = p.value
  return parts
}

export function generateOrderNumber(): string {
  const p = jakartaParts()
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `KIK-ONL-${p.year}${p.month}${p.day}-${rand}`
}

export function generateTransactionNumber(): string {
  const p = jakartaParts()
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `KIK-POS-${p.year}${p.month}${p.day}-${rand}`
}
