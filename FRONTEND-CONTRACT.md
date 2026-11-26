# KIKIS Frontend API Contract & Design Guide
(Copy for subagents — read fully before writing code)

## Project
KIKIS — Style Made Simple. Indonesian fashion retail platform. Next.js 16 App Router + TypeScript + Tailwind 4 + shadcn/ui (New York). Dev server already runs on port 3000 (do NOT run dev/build; lint is `bun run lint`).

## Design System (already applied in globals.css)
- Use shadcn/ui components from `@/components/ui` (all exist). Icons: lucide-react.
- Palette via semantic tokens: `bg-primary` (#252525 charcoal), `bg-secondary` (#F4F1EC warm beige), `text-accent`/`bg-accent` (#B99B79 tan), `bg-background` white, `text-foreground` #242424, `border-border` #E7E2DA.
- Editorial minimalist style (Zara/Uniqlo): uppercase headings with `tracking-widest` or `.font-display`, generous whitespace, thin borders, subtle hover states. NO indigo/blue. No heavy gradients/shadows.
- Currency: `formatIDR` from `@/lib/format`. Language: Bahasa Indonesia everywhere.
- Layout: root pages must use `min-h-screen flex flex-col` and `footer` with `mt-auto` (sticky footer). Responsive mobile-first (`sm:` `md:` `lg:`).
- Use `sonner` toast (`import { toast } from 'sonner'`) for feedback.
- Long lists: `max-h-96 overflow-y-auto custom-scrollbar`.

## Formatting helpers — `import { ... } from '@/lib/format'`
`formatIDR(n)`, `formatNumber(n)`, `formatDateTime(d)`, `formatDate(d)`,
`ORDER_STATUS_LABEL` (map status→Indonesian label), `ORDER_STATUS_COLOR` (map→tailwind classes),
`MOVEMENT_TYPE_LABEL`, `PAYMENT_METHOD_LABEL`, `ROLE_LABEL`.

## Cart store — `import { useCart, cartTotal, cartCount } from '@/store/cart'`
`useCart()` state: `items: CartLine[]` ({variantId, productId, slug, productName, variantName, image, price, quantity, maxStock}), actions `addItem(CartLine)`, `removeItem(variantId)`, `setQuantity(variantId, qty)`, `clear()`. Persisted to localStorage.

## Session hook — `import { useSession } from '@/hooks/use-session'`
Returns `{ user: SessionUser|null, loading, refresh }`. user: {id,name,email,phone?,role,addresses?}. role: 'SUPER_ADMIN'|'ADMIN'|'CASHIER'|'CUSTOMER'.

## API — all return `{error: string}` with 4xx/5xx on failure. Next 16: route `params` are Promises; wrap `useSearchParams` usage in `<Suspense>`.

### Auth
- `POST /api/auth/login` `{email, password, portal: 'staff'|'customer'}` → `{user:{id,name,email,role}}`
- `POST /api/auth/logout` → `{success:true}`
- `POST /api/auth/register` `{name,email,phone?,password}` → `{user}` (customer, auto-login)
- `GET /api/auth/me` → `{user}` or `{user:null}`

### Public catalog
- `GET /api/categories` → `{categories:[{id,name,slug,description}]}`
- `GET /api/products?search=&category=<slug>&minPrice=&maxPrice=&sort=newest|price_asc|price_desc&featured=1&page=&limit=`
  → `{products:[{id,name,slug,description,categoryName,categorySlug,image,price,maxPrice,stock,inStock,isFeatured,sizes:string[],colors:string[]}], total,page,limit,pages}`
- `GET /api/products/[slug]` → `{product:{id,name,slug,description,categoryName,categorySlug,images:[{url,alt}],price,maxPrice,isFeatured,variants:[{id,sku,size,color,colorHex,price,stock,label}]}}`
- `POST /api/cart/validate` `{items:[{variantId,quantity}]}` → `{items:[{variantId,productId,productName,variantName,sku,barcode,image,unitPrice,unitCost,quantity,subtotal}],subtotal}` — use in checkout to recompute; error if stock insufficient.
- `POST /api/vouchers/validate` `{code, subtotal}` → `{valid,message,discount,voucher?}`

### Orders (customer)
- `POST /api/orders` `{items:[{variantId,quantity}], customerName, customerPhone, shippingAddress, city, province, postalCode?, paymentMethod:'TRANSFER'|'COD'|'QRIS', voucherCode?, note?}` → 201 `{order:{orderNumber,status,total,subtotal,voucherDiscount,shippingCost,paymentMethod},message}`. shippingCost: TRANSFER/QRIS=10000, COD=20000.
- `GET /api/orders` → customer's own `{orders:[Order]}` (needs customer login) Order={id,orderNumber,customerName,shippingAddress,city,province,status,paymentMethod,subtotal,voucherDiscount,shippingCost,total,note,createdAt,items:[{productName,variantName,sku,unitPrice,quantity,subtotal}],payments:[...]}
- `GET /api/orders/[orderNumber]` → `{order}` public tracking.

### POS (staff login required)
- `GET /api/pos/lookup?code=<barcode|sku|name>` → `{exact:boolean, results:[{variantId,productName,variantName,sku,barcode,image,price,stock}]}` (exact match first)
- `POST /api/pos/checkout` `{items:[{variantId,quantity}], discountType:'NONE'|'FIXED'|'PERCENT', discountValue, paidAmount, paymentMethod:'CASH'|'QRIS'|'DEBIT', customerName?, note?}` → 201 `{transaction:{id,transactionNumber,cashierName,subtotal,discountType,discountValue,discountAmount,total,paidAmount,changeAmount,paymentMethod,createdAt,items:[{productName,variantName,sku,barcode,unitPrice,quantity,subtotal}]},message}`

### Admin (staff login: ADMIN/SUPER_ADMIN unless noted)
- `GET /api/admin/stats?range=today|yesterday|week|month|custom&from=&to=`
  → `{range:{label},kpis:{netSales,posRevenue,onlineRevenue,grossProfit,grossMargin,transactionCount,onlineOrderCount,newCustomers,avgTransaction,inventoryValue,revenueGrowth(number|null)},lowStock:[{variantId,productName,variantName,sku,quantity,minStock}],charts:{salesTrend:[{date,pos,online,total}],byCategory:[{name,value}],topProducts:[{name,qty,revenue}],byPaymentMethod:[{name,value}],hourlySales:[{hour,value}]}}`
- `GET /api/admin/products?search=&category=&page=&limit=` → `{products:[{id,name,slug,description,categoryId,categoryName,basePrice,costPrice,isActive,isFeatured,image,createdAt,variants:[{id,sku,barcode,size,color,price,costPrice,stock,minStock,isActive}]}],total,page,limit,pages}`
- `POST /api/admin/products` `{name,description,categoryId,basePrice,costPrice,isFeatured,images:[{url,altText?}],variants:[{sizeId?,colorId?,price,costPrice?,stock?,sku?,barcode?}]}` → 201
- `GET /api/admin/products/[id]` → `{product}` (full, with images[] and variants w/ inventory)
- `PUT /api/admin/products/[id]` `{name?,description?,categoryId?,basePrice?,costPrice?,isFeatured?,isActive?,images?}` → `{message}`
- `DELETE /api/admin/products/[id]` → soft/hard delete `{message}`
- `GET /api/admin/categories` → `{categories:[{id,name,slug,description,isActive,sortOrder,productCount}]}`
- `POST /api/admin/categories` `{name,description?,sortOrder?}`; `PUT /api/admin/categories/[id]` `{name?,description?,sortOrder?,isActive?}`; `DELETE /api/admin/categories/[id]`
- Sizes/colors for variant forms: `GET /api/categories` gives categories only — sizes/colors need no dedicated API: when creating variants the admin UI may send `sizeId`/`colorId` from `GET /api/admin/variants-meta` (NOT AVAILABLE — see below) → instead query nothing: use free-text? NO: schema requires sizeId/colorId IDs.
  → **There is a meta endpoint**: `GET /api/admin/variants-meta` returns `{sizes:[{id,name}],colors:[{id,name,hexCode}]}` (create it? NO — it already exists at /api/admin/variants-meta)
- `GET /api/admin/inventory?search=&lowStock=1` → `{inventories:[{variantId,productName,variantName,sku,barcode,quantity,minStock,isLow,updatedAt}],lowStockCount,totalValue,movements:[{id,productName,variantName,sku,type,typeLabel,quantity,stockBefore,stockAfter,reference,note,userName,createdAt}]}`
- `POST /api/admin/inventory` `{variantId, type:'PURCHASE'|'CUSTOMER_RETURN'|'STOCK_ADJUSTMENT'|'DAMAGED'|'STOCK_OPNAME', quantity?, fixedQuantity?, note?}` — opname uses `fixedQuantity`.
- `GET /api/admin/orders?status=&search=&page=` → `{orders, total, statusCounts:{PENDING_PAYMENT:n,...}}` (orders include items, payments, customer)
- `PATCH /api/admin/orders/[id]` `{status}` — valid: PENDING_PAYMENT|WAITING_VERIFICATION|PROCESSING|READY_TO_SHIP|SHIPPED|COMPLETED|CANCELLED
- `GET /api/admin/customers?search=&page=` → `{customers:[{id,name,email,phone,isActive,createdAt,orderCount,lastOrder:{total,createdAt,orderNumber}}]}`
- `GET /api/admin/vouchers` → `{vouchers:[...]}`; POST `{code,name,type:'FIXED'|'PERCENT',value,minPurchase?,maxDiscount?,quota?,startDate?,endDate?}`; `PUT /api/admin/vouchers/[id]`; `DELETE /api/admin/vouchers/[id]`
- `GET /api/admin/transactions?search=&page=` → `{transactions:[full incl. items], summary:{totalRevenue,totalDiscount,count}}`
- `GET /api/admin/users` → `{users:[{id,name,email,role,isActive,createdAt,transactionCount}]}`; POST `{name,email,password,role}` (SUPER_ADMIN only); `PUT/DELETE /api/admin/users/[id]`
- `GET /api/admin/settings` → `{settings:{storeName,tagline,address,phone,email,receiptFooter}}`; PUT same fields (ADMIN+)
- `GET /api/admin/barcodes?search=` → `{variants:[{id,sku,barcode,productName,variantName,price,stock,image,isActive,productActive}]}`; POST `{variantId}` regenerate
- `GET /api/admin/reports?type=sales|products|inventory|transactions|orders|customers|profit|lowstock|movements|cashier&from=YYYY-MM-DD&to=YYYY-MM-DD&format=json|csv` → json: `{rows:[...]}`; csv: file download (open `format=csv` via window.open)

## Route Guard (admin layout / POS layout)
Use server components as layouts calling `getStaffSession()` from `@/lib/auth` and `redirect('/masuk?next=/admin')` when absent. Admin pages: allowed roles SUPER_ADMIN/ADMIN; `/pos`: also CASHIER.

## Next 16 gotchas
- `params`/`searchParams` in pages are Promises — `await` them, or use client components with hooks.
- Client pages fetching data: use plain `useEffect` + `fetch` (TanStack Query optional).
- Keep all UI text in Bahasa Indonesia. Buttons min 44px touch target. `alt` text for images (use plain `<img>` for external URLs — next/image remote domains not configured; use `<img>` with object-cover).
