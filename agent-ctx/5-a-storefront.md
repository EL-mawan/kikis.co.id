# Task 5-a — Public Storefront (KIKIS)

## Files created/modified (all owned by this task)
1. `src/components/store/StoreShell.tsx` — client shell: sticky navbar (brand, Beranda/Katalog links, desktop search, account dropdown [Akun Saya / Riwayat Pesanan / Keluar for customers; Dasbor Admin / Kasir POS for staff], cart icon with badge from `useCart`, mobile hamburger Sheet with all links + search) and sticky footer (bg-primary, 3 columns: brand+tagline, kategori links fetched from `/api/categories`, kontak) with bottom row © 2025 + Dasbor Admin/Kasir links. `min-h-screen flex flex-col` + footer `mt-auto` (sticky footer). Cart badge gated on hydration via `useSyncExternalStore` (avoids zustand-persist hydration mismatch).
2. `src/components/store/ProductCard.tsx` — editorial card (aspect-[3/4] img with fade-in placeholder, "Habis" overlay when !inStock, uppercase name, category, formatIDR price with range when maxPrice>price, hover scale-105 + border-accent) + exported `ProductCardSkeleton` and `StoreProduct` type.
3. `src/app/page.tsx` — homepage ('use client'): hero bg-secondary "STYLE MADE SIMPLE." + 2 CTAs, promo strip bg-accent (GRATIS ONGKIR / WELCOME10K), KATEGORI KAMI grid (2/4/7 cols), PRODUK UNGGULAN (`/api/products?featured=1&limit=8`), TERBARU (`?limit=8&sort=newest`), skeletons everywhere.
4. `src/app/katalog/page.tsx` — 'use client', `useSearchParams` wrapped in `<Suspense>`; desktop sidebar + mobile filter Sheet; search (local-state stamp synced to URL), category radio-like list, price presets (All / <100rb / 100–250rb / >250rb), sort Select (Terbaru/Harga Terendah/Harga Tertinggi), pagination prev/next, empty state, result count; URL state via `router.replace`.
5. `src/app/produk/[slug]/page.tsx` — 'use client' (`useParams`); breadcrumb, gallery (main + thumbnails + prev/next), color swatches (ring-2 ring-primary), size buttons (disabled+line-through when combo out of stock), qty stepper (derived state resets to 1 on variant change — no setState-in-effect), stock indicator (amber "Tersisa X" ≤5), SKU display, Tambah ke Keranjang (`useCart().addItem` + toast) and Beli Sekarang (+ push /keranjang), related products (same category, exclude self), not-found state.
6. `src/app/keranjang/page.tsx` — cart list (image, variantName, qty stepper clamped to maxStock, subtotal, Trash2 remove), summary card (cartTotal + "Ongkir dihitung saat checkout" + Lanjut ke Checkout), empty state CTA.
7. `src/app/checkout/page.tsx` — full checkout: shipping form (Nama/Telepon/Alamat/Kota/Provinsi/Kode Pos), profile prefill + saved-address autofill Select, server cart validation via POST `/api/cart/validate` (stamp-based loading; destructive Alert with "kembali ke keranjang" link on stock error), voucher input → POST `/api/vouchers/validate` (auto re-validate when subtotal changes, removable chip), payment radio cards (TRANSFER/QRIS 10rb, COD 20rb), totals (subtotal, green voucher discount, shipping, bold TOTAL), Buat Pesanan → POST `/api/orders` → clear cart → `/pesanan/[orderNumber]?success=1`.
8. `src/app/masuk/page.tsx` — Tabs Pelanggan/Staf, portal-aware login → redirect (customer: ?next || /akun; staff: ?next || (CASHIER → /pos else /admin)), demo-accounts helper text, link /daftar, `useSearchParams` in Suspense.
9. `src/app/daftar/page.tsx` — register (name/email/phone/password ≥6, client validation) → auto-login redirect /akun.
10. `src/app/akun/page.tsx` — guard redirect /masuk?next=/akun when no session; profile card + saved addresses; order history from GET /api/orders (orderNumber, formatDateTime, status badge via ORDER_STATUS_LABEL/COLOR, first-item preview, total) linking to /pesanan/[orderNumber]; staff-mode variant (Dasbor Admin/Kasir POS links); logout button.
11. `src/app/pesanan/page.tsx` — track-order card: input + GET /api/orders/[nomor] probe → navigate, toast "Pesanan tidak ditemukan".
12. `src/app/pesanan/[nomor]/page.tsx` — order detail/tracking: 6-step horizontal status stepper (check icons for completed, accent connectors) or red CANCELLED banner, payment status (Lunas/Belum dibayar from `payments[].status==='PAID'`), shipping/info cards, items Table, totals incl. voucher discount, ?success=1 green alert (useSearchParams in Suspense), not-found state.

## Key implementation notes (useful for other agents)
- **Hydration-safe patterns**: `useSyncExternalStore(emptySubscribe, () => true, () => false)` for `mounted`; zustand cart badge/count gated on it. Avoided `setState` synchronously in effects everywhere (react-hooks/set-state-in-effect is an ERROR in this repo's lint): fetch results use a "key/sig stamp" (`result.slug === slug ? … : loading`), qty reset via derived state (`qtyState.vid === selectedVariantId ? qty : 1`), product view is an inner component keyed by slug so state resets on navigation.
- **Staff accounts in navbar** get Dasbor Admin/Kasir POS menu items instead of Akun Saya/Riwayat (staff have no customer record/order history).
- Voucher validate returns HTTP 200 with `{valid:false,message}` for invalid codes (not a 4xx) — handled both ways.

## API verification done (live smoke tests, all shapes match FRONTEND-CONTRACT.md)
- GET /api/categories → `{categories:[{id,name,slug,description}]}` ✓
- GET /api/products?featured=1 / sort / filters → mapped product shape incl. `image`, `price`, `maxPrice`, `inStock`, `sizes`, `colors` ✓
- GET /api/products/[slug] → product with `images[{url,alt}]`, variants `{id,sku,size,color,colorHex,price,stock,label}` ✓
- POST /api/cart/validate → `{items:[...unitPrice,quantity,subtotal],subtotal}` ✓
- POST /api/vouchers/validate → `{valid,message,discount,voucher}` ✓
- POST /api/orders → 201 `{order:{orderNumber,status,total,subtotal,voucherDiscount,shippingCost,paymentMethod},message}`; voucher min-purchase rejection returns `{error}` correctly handled ✓
- GET /api/orders/[orderNumber] → `{order}` incl. items+payments ✓
- **No API mismatches found.** Only note: POST /api/orders rejects voucher below min purchase with `{error:'Minimal pembelian Rp 100.000'}` — surfaced via toast.

## Verification status
- `bun run lint`: **0 errors, 0 warnings in all files owned by 5-a**. Remaining repo-wide: 1 warning in `src/app/admin/laporan/page.tsx` (owned by task 5-b) — untouched per instructions.
- All routes return 200 and compile in dev.log: `/`, `/katalog` (+filters), `/produk/kikis-basic-tee-hitam`, `/keranjang`, `/checkout`, `/masuk`, `/daftar`, `/akun`, `/pesanan`, `/pesanan/KIK-ONL-...`. No compile errors in dev.log.
- End-to-end order created via API (KIK-ONL-20261126-4310) and rendered through the detail page.
