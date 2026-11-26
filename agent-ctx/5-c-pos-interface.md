# Task 5-c — POS (Kasir) Interface — Work Record

## Files Created (owned scope)
1. `src/app/pos/layout.tsx` — SERVER component. Calls `getStaffSession()` from `@/lib/auth`; redirects to `/masuk?next=/pos` when absent; passes `userName`/`userRole` into `<PosShell>`. Allows CASHIER/ADMIN/SUPER_ADMIN (any staff session).
2. `src/components/pos/PosShell.tsx` — 'use client'. Top bar `bg-[#252525] text-white h-14`: KIKIS POS brand (accent badge), "Kasir: {userName}" + ROLE_LABEL chip, right side: "Dasbor" link to /admin (only SUPER_ADMIN/ADMIN) and "Keluar" (POST /api/auth/logout → hard nav to /masuk). Below: `grid h-[calc(100vh-3.5rem)] min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_400px]` — children fill viewport height, right 400px column reserved for cart.
3. `src/app/pos/page.tsx` — 'use client' POS page. All cart state is POS-local (`useState`, keyed by variantId) — does NOT use the storefront `@/store/cart`.

## Keyboard Workflow Implemented
- Scan input auto-focused on mount (`autoFocus`), h-12, placeholder "Scan barcode / cari produk (F2 untuk fokus)".
- `F2` global keydown listener → preventDefault + focus/select the scan input.
- Enter (scanner sends Enter) → GET `/api/pos/lookup?code=`:
  - `exact=true` + results[0] → auto-add to cart, toast success `Ditambahkan: {productName} {variantName}` (plain text, no emoji), clear input + results.
  - `exact=false` → result rows grid (image, name, variantName, sku/barcode mono, price, stock badge, disabled when stock<=0, row click adds).
  - no results → toast error "Produk tidak ditemukan".
- Debounced as-you-type search (300ms) using a stable `runLookupRef` so cart state changes never re-trigger search; shows the same results grid.
- Payment dialog: paid-amount input autoFocus, Enter key confirms when sufficient.
- After receipt → "Transaksi Baru" resets cart/discount/note/customer/scan and refocuses scan input.

## Other Behaviors
- Category chips from `/api/categories`, horizontal scroll (custom-scrollbar), "Semua" + each; filters `/api/products?category=<slug>&limit=40` client-side refetch.
- Product grid cards (plain `<img>`, formatIDR price or price-range, "Stok: n" badge red when <=5, disabled when `inStock=false`); skeleton loading; empty state.
- Card click → "Pilih Varian" Dialog populated from `GET /api/products/[slug]` (`variants[{id,sku,label,price,stock}]`) — chosen instead of lookup-by-name because it returns the exact product's variants (no name-collision false positives); out-of-stock variants disabled.
- Cart: qty stepper (- input +, clamped to stock with warning toast), line subtotal, Trash2 remove, "Kosongkan" with AlertDialog confirm; empty state "Pindai atau pilih produk untuk memulai".
- Totals: Subtotal → discount Select (NONE/FIXED/PERCENT, Rp/% suffix, digits-only input) → `discountAmount` = FIXED min(value,subtotal), PERCENT floor(subtotal*pct/100) → big bold Total; payment Select Tunai/QRIS/Debit; optional customer name; h-14 bg-accent "Bayar" (disabled when empty).
- Payment Dialog: total banner, paid input (digits only), quick cash [Uang Pas, 50k, 100k, 150k, 200k], change green "Kembalian" / red "Kurang Rp x" with confirm disabled, note field. Confirm → POST `/api/pos/checkout` `{items:[{variantId,quantity}],discountType,discountValue,paidAmount,paymentMethod,customerName,note}`; on error toast server message, payment dialog closes, cart kept; on success cart is cleared immediately (double-charge guard) + toast `Transaksi {transactionNumber} berhasil` + products refetched for fresh stock.
- ReceiptDialog: `print-receipt` class, font-mono text-xs, inline `maxWidth` 58mm/80mm via Select, store header KIKIS/"Style Made Simple."/"Jl. Kemang Raya No. 12, Jakarta Selatan"/"Telp: 021-7280-1122" (from prisma seed store settings), transactionNumber/cashierName/formatDateTime, dashed separators, item lines (qty x name, variant+sku, @price, line total), Subtotal/Diskon/TOTAL/paid per PAYMENT_METHOD_LABEL/change, footer texts "Terima kasih telah berbelanja di KIKIS" + "Barang yang sudah dibeli tidak dapat ditukar". Buttons: "Cetak Struk" (window.print), "Transaksi Baru".
- Mobile: right cart panel `hidden lg:flex`; fixed floating cart button (badge = item count) opens right Sheet containing the same `CartPanelContent` (module-level component, shared via props to avoid remount/focus loss).
- Palette charcoal/tan/beige only, Bahasa Indonesia UI, sonner toasts, min 44px touch targets (chips h-11, Bayar h-14, quick cash h-11, stepper rows 36px inside dense cart but +/- buttons are size-9=36px... note: kept dense for POS speed).

## API Verification (live, seeded data)
- `GET /api/pos/lookup?code=8990000001045` → `exact:true` + results[0] ✓
- `POST /api/pos/checkout` with UI payload → 201 `{transaction:{transactionNumber, cashierName, subtotal, discountType, discountValue, discountAmount, total, paidAmount, changeAmount, paymentMethod, customerName, createdAt, items[]}}` — all fields consumed by ReceiptDialog ✓ (PERCENT 10% on 99000 → 9900 discount, matches client math).
- `GET /api/products/[slug]` variants shape `{id,sku,size,color,colorHex,price,stock,label}` ✓
- No API mismatches found.

## Lint / Compile Status
- `bun run lint`: ZERO errors in my 3 files. 4 remaining repo errors are in files owned by other agents (`src/app/produk/[slug]/page.tsx`, `src/components/store/StoreShell.tsx` — react-hooks/set-state-in-effect); NOT touched per task boundary.
- dev.log: `GET /pos 307` (no session → correct redirect to /masuk), and `HTTP 200` render with seeded cashier session (`kasir@kikis.id`); SSR HTML contains POS UI markers; no compile errors.
