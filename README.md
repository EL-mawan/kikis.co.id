# KIKIS — Style Made Simple.

Platform manajemen ritel fashion untuk UMKM Indonesia: **toko online publik**, **dashboard admin**, dan **kasir (POS)** dalam satu aplikasi Next.js dengan satu database bersama.

- **Brand**: KIKIS
- **Tagline**: Style Made Simple.
- **Bahasa UI**: Indonesia
- **Mata uang**: Rupiah (Rp / IDR)
- **Zona waktu**: Asia/Jakarta

---

## Fitur Utama

### 1. Toko Online (publik)
- Beranda editorial: hero, kategori (Kaos, Kemeja, Celana, Jeans, Jaket, Dress, Aksesoris), produk unggulan & terbaru
- Katalog dengan pencarian, filter kategori & harga, urutkan, paginasi
- Detail produk: galeri gambar, pilih varian (warna + ukuran), indikator stok
- Keranjang (persist di localStorage), checkout dengan validasi stok & harga sisi server
- Voucher (contoh seed: `WELCOME10K`, `KIKISLOVE`, `GRATISONGKIR`)
- Metode pembayaran: Transfer Bank, QRIS (arsitektur siap gateway), COD
- Registrasi/masuk pelanggan, akun, riwayat & lacak pesanan (`/pesanan/<nomor>`)

### 2. Dashboard Admin (`/admin`)
- Ringkasan: 8 KPI (penjualan bersih, POS, online, laba kotor, jumlah transaksi, pesanan online, pelanggan baru, rata-rata/transaksi) + filter tanggal (Hari Ini/Kemarin/7 Hari/30 Hari/Kustom)
- 5 grafik (Recharts): tren penjualan POS vs Online, penjualan per kategori, produk terlaris, penjualan per jam, metode pembayaran
- Kelola Produk (CRUD + varian + gambar), Kategori, Varian Produk, Barcode (Code 128 + cetak label 58mm/80mm), Inventaris (7 tipe pergerakan stok, stok opname, barang rusak), Pesanan Online (7 status), Transaksi POS, Pelanggan, Voucher, Laporan (10 jenis + ekspor CSV + cetak), Pengguna (RBAC, khusus Super Admin), Pengaturan Toko

### 3. Kasir / POS (`/pos`)
- Input pemindai barcode (USB keyboard-wedge): fokus otomatis, Enter langsung menambah produk
- Pencarian cepat (nama/SKU/barcode), grid produk per kategori
- Keranjang cepat: ubah jumlah, diskon transaksi (Fixed/Persentase), metode bayar (Tunai/QRIS/Debit)
- Pembayaran tunai: tombol uang cepat, kembalian otomatis
- Struk termal 58mm/80mm siap cetak (window.print)
- Setiap transaksi: nomor unik, snapshot harga & modal, pengurangan stok atomik, record StockMovement

### 4. Peran (RBAC)
| Peran | Akses |
|---|---|
| SUPER_ADMIN | Semua + manajemen pengguna |
| ADMIN | Semua modul admin |
| CASHIER | POS + baca pengaturan |
| CUSTOMER | Toko online & akun |

---

## Teknologi

- **Next.js 16 (App Router)** + TypeScript 5
- **Tailwind CSS 4** + shadcn/ui (New York) + Lucide Icons
- **Prisma ORM** + SQLite (siap dipindah ke PostgreSQL)
- **Recharts** (grafik), **JsBarcode** (Code 128), **Zustand** (keranjang), **bcryptjs** (hash kata sandi), **Sonner** (notifikasi)
- Sesi: cookie httpOnly bertanda tangan HMAC-SHA256 (`AUTH_SECRET`)

> Catatan desain: nilai uang disimpan sebagai **Int (rupiah utuh)** — IDR praktis tanpa sen; tipe `enum`/`Decimal` tidak didukung Prisma+SQLite sehingga status/tipe memakai `String` divalidasi di lapisan aplikasi.

---

## Menjalankan Proyek

```bash
# 1. Instal dependensi
bun install

# 2. Salin environment
cp .env.example .env
# (isi DATABASE_URL; ganti AUTH_SECRET untuk produksi)

# 3. Sinkronkan skema database
bun run db:push

# 4. Isi data awal (produk, kategori, pengguna, voucher, pengaturan)
bun prisma/seed.ts

# 5. Jalankan development
bun run dev
```

Buka `http://localhost:3000`.

### Akun Demo (hasil seed)
| Peran | Email | Kata Sandi |
|---|---|---|
| Super Admin | superadmin@kikis.id | password123 |
| Admin | admin@kikis.id | password123 |
| Kasir | kasir@kikis.id | password123 |
| Pelanggan | budi@example.com | password123 |

---

## Skrip

| Perintah | Fungsi |
|---|---|
| `bun run dev` | Jalankan server development (port 3000) |
| `bun run lint` | ESLint |
| `bun run db:push` | Dorong skema Prisma ke database |
| `bun prisma/seed.ts` | Seed data awal |

## Struktur Penting

```
prisma/schema.prisma      # 21 model (User, Customer, Product, ProductVariant, Inventory,
                          #  StockMovement, Order, Transaction, Voucher, dll.)
prisma/seed.ts            # data awal: 14 produk, 7 kategori, varian + stok
src/lib/                  # auth (sesi & RBAC), pricing (mesin harga server),
                          # inventory (stok atomik + StockMovement), format (IDR/tanggal)
src/app/api/              # REST API: auth, products, cart, orders, pos, admin/*
src/app/(halaman)         # / toko, /admin, /pos
src/store/cart.ts         # keranjang pelanggan (zustand + persist)
```

## Aturan Bisnis yang Diterapkan

1. **Harga selalu dari database** — input klien (subtotal/diskon/total) tidak pernah dipercaya; `/api/cart/validate`, `/api/pos/checkout`, dan `/api/orders` menghitung ulang semuanya di server.
2. **Varian = unit stok & barcode** — `ProductVariant` memegang SKU + barcode unik; inventaris per varian, dipakai bersama POS & online.
3. **Stok atomik, anti-oversell** — semua perubahan stok dalam `$transaction` dengan guard stok negatif; setiap perubahan membuat `StockMovement` (PURCHASE, POS_SALE, ONLINE_SALE, CUSTOMER_RETURN, STOCK_ADJUSTMENT, DAMAGED, STOCK_OPNAME).
4. **Snapshot harga & modal** — `TransactionItem`/`OrderItem` menyimpan `unitPrice` & `unitCost` saat transaksi; laba kotor = penjualan bersih − HPP.
5. **Pesanan online** — stok dicadangkan saat pesanan dibuat (mencegah oversell), dikembalikan saat pesanan `CANCELLED`.
6. **Barcode** — Code 128; validasi unik di server; label berisi KIKIS, nama produk, ukuran, warna, SKU, harga, barcode.
7. **Keamanan** — bcrypt untuk kata sandi, cookie httpOnly bertanda tangan, guard peran di layout & API, AuditLog tersedia di skema.

## Integrasi Eksternal (siap, belum aktif)

Aplikasi ini **tidak mengklaim** integrasi aktif dengan layanan berbayar. Slot konfigurasi disiapkan di `.env.example`:
- **Cloudinary** (penyimpanan gambar) — `CLOUDINARY_*`
- **Payment Gateway** (QRIS/VA, contoh Midtrans/Xendit) — `PAYMENT_GATEWAY_*`
- Metode QRIS di aplikasi saat ini dicatat sebagai pilihan pembayaran manual/arsitektur-siap.

## Produksi

1. Ganti `AUTH_SECRET` dengan string acak panjang.
2. Migrasi ke PostgreSQL: ubah `provider` di `prisma/schema.prisma` menjadi `"postgresql"`, sesuaikan `DATABASE_URL`, jalankan `bun run db:push`, lalu seed ulang bila perlu.
3. `bun run build` && `bun run start`.
4. Sediakan printer termal 58mm/80mm untuk struk POS (mencetak via dialog browser).
# kikis.co.id
