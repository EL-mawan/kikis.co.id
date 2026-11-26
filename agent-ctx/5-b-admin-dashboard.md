# Task 5-b: Admin Dashboard — Work Record (DONE)

Agent: 5-b (Admin dashboard subagent). All work complete; lint clean; all /admin routes compile & return 200.

## Files created (all verified)
Shared components (`src/components/admin/`):
- `AdminShell.tsx` — dark charcoal sidebar (#252525, w-64, fixed desktop + Sheet drawer mobile), grouped nav UTAMA/PENJUALAN/LAPORAN/ORANG/SISTEM with lucide icons, active = bg-white/10 + left border #B99B79, top bar with page title + "Lihat Toko" + logout, sidebar footer user info + Keluar (POST /api/auth/logout → /masuk) + "Ke Kasir" only for CASHIER.
- `PageHeader.tsx`, `StatusBadge.tsx` (ORDER_STATUS_LABEL/COLOR), `api.ts` (apiGet/apiSend parse `{error}`, useDebouncedValue, isoDaysFromToday), `table-bits.tsx` (EmptyState, TableSkeleton, Pager).
- `ProductFormDialog.tsx` — create mode with repeatable image URLs + variant rows (size/color from `/api/admin/variants-meta`, price/costPrice/stok awal/SKU/barcode "Otomatis jika kosong"); edit mode fetches GET /api/admin/products/[id], variants read-only with note; client validation (name, category, >=1 variant price>0).
- `BarcodeLabel.tsx` — JsBarcode CODE128 into <svg> (width 2, height 40, displayValue, fontSize 12), 58mm/80mm modes, label = KIKIS brand/product/size/color/SKU/price; `BarcodeLabelSheet` grid (2-col 58mm, 1-col 80mm).

Pages (`src/app/admin/`):
- `layout.tsx` — server component, getStaffSession → redirect('/masuk?next=/admin'), renders AdminShell.
- `page.tsx` — Dashboard: presets Hari Ini/Kemarin/7/30/Kustom (Popover date inputs) → /api/admin/stats; 8 KPI cards (netSales + revenueGrowth ▲/▼ badge, posRevenue, onlineRevenue, grossProfit+margin, transactionCount, onlineOrderCount, newCustomers, avgTransaction); charts: Tren Penjualan (ComposedChart: Area pos tan + Area online charcoal + dashed total line), Kategori (Pie + custom legend), Produk Terlaris (vertical BarChart), per Jam (AreaChart), Metode Pembayaran (proportional bars, PAYMENT_METHOD_LABEL); Peringatan Stok Menipis table + Nilai Inventaris card. Colors #B99B79/#252525/#8B7355/#D9CFC1/#6B6560 only.
- `produk/` — debounced search + category filter + table (thumb, price range, stock, status) + ProductFormDialog + AlertDialog delete (server soft/hard message toasted).
- `kategori/` — table + create/edit dialog (name/desc/sortOrder/isActive) + delete with server guard error toast.
- `varian/` — flattened variant table across products (client-side search), stock red badge <=minStock, inline price/costPrice edit dialog (see mismatch #1), note about Inventaris.
- `barcode/` — checkbox table (select all), per-row Cetak Label + toolbar Cetak Label (n), Regenerasi with AlertDialog → POST /api/admin/barcodes; print dialog: preview sheet + 58/80mm select + window.print(); hidden off-screen `.print-receipt` sheet with inline maxWidth override (58mm→126mm, 80mm→86mm) — overrides globals.css max-width 80mm via inline style (unlayered media rule loses to inline).
- `inventaris/` — summary cards (totalValue, lowStockCount, movements count), Tabs Stok Saat Ini / Riwayat Pergerakan; search + "Hanya stok menipis" Switch; Adjust dialog with 5 types, opname swaps qty→"Jumlah Fisik" (fixedQuantity), projected stock preview; movements table with +/- colored qty and before→after.
- `pesanan/` — status tabs with counts from statusCounts + search; table + Detail dialog (customer, address, items, totals, voucher, payments, note); status Select → PATCH /api/admin/orders/[id]; CANCELLED gated by AlertDialog warning "Stok akan dikembalikan".
- `transaksi/` — summary cards (totalRevenue/count/totalDiscount); expandable rows (Fragment with key) showing items detail + paid/change/note.
- `pelanggan/` — search + table (last order number/total/date, registered, active badge).
- `voucher/` — table (mono code badge, FIXED→formatIDR / PERCENT→%, usedCount/quota, period, active) + create/edit dialog (code locked in edit, maxDiscount only PERCENT) + activate/deactivate toggle + delete (server may deactivate instead — message toasted).
- `laporan/` — 10 report types, from/to dates, "Tampilkan" → generic auto-column table (money keys via regex + exact 'Total' → formatIDR; ISO strings → formatDateTime; 'Margin (%)' → %), Ekspor CSV via window.open(format=csv), Cetak PDF via .print-receipt wrapper with hidden print:block header, "X baris" summary.
- `pengguna/` — useSession role gate (non-SUPER_ADMIN → Alert + read-only table); create/edit dialogs, deactivate with self-disable, transactionCount column.
- `pengaturan/` — settings form → PUT /api/admin/settings + env integration info alert.

## Verification
- `bun run lint` → 0 errors, 0 warnings.
- `bunx tsc --noEmit` → 0 errors in admin files (remaining project errors are in other agents' files: api/admin/inventory route, api/admin/products route, pesanan/[nomor], examples/* — NOT 5-b scope).
- All 13 /admin routes curl → 200; dev.log shows clean compile for each; API shapes spot-checked live (stats/orders/vouchers/users/inventory/barcodes/reports/variants-meta all match UI).

## API contract mismatches found
1. **PUT /api/admin/variants/[id] does not exist** (404 verified live). My varian page edit dialog calls it with {price, costPrice} per spec. Needs task-4/main agent to add it (schema has price/costPrice on ProductVariant — trivial update). Until then the dialog shows a graceful error toast.
2. Note: `GET /api/admin/categories` requires ADMIN+ (used by product filter) — OK, but CASHIER-role staff hitting /admin get 401 on data endpoints; acceptable since admin pages are ADMIN+ by design (POS page handles cashier).
3. globals.css `.print-receipt` hard-codes max-width 80mm; worked around via inline `maxWidth` style (no globals.css edits needed — file not owned by 5-b).

## Data notes
- Voucher quota usage uses `usedCount/quota` (both in Prisma model, returned by GET).
- variantName format from API is "Warna - Ukuran" — barcode labels parse color/size from it; color dot hex resolved from /api/admin/variants-meta.
- Test creds used for verification (from seed): admin@kikis.id / password123.
