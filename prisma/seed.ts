/**
 * KIKIS Seed Script
 * Seeds: users, customer, categories, sizes, colors, products + variants + images,
 * inventory, stock movements, vouchers, store settings.
 *
 * Run: bun prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

const IMAGES = {
  kaos: [
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/8f3579e21fec.png',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/14f86d8aaf02.jpg',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/03e48316f477.jpg',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3710e2100b6e.jpg',
  ],
  kemeja: [
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3c6b4dbcbba0.jpg',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/83a1b4c02abd.jpg',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/dc502f7bdc11.jpg',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/830e84712023.jpg',
  ],
  celana: [
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/4a2268e14b6c.jpg',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/31df900169f6.jpg',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/c492a74891dd.png',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/5adac6e35e91.jpg',
  ],
  jeans: [
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/cf982ee8abae.jpg',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/90b35fd46c65.jpg',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/4196833668a4.jpg',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/98d504f632f1.jpg',
  ],
  jaket: [
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/e9ff9fff38ad.jpg',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/6b1ffcae8991.jpg',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/139b611b17f9.jpg',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/18e6c274e4c7.jpg',
  ],
  dress: [
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/a27cbb738ca8.jpg',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/5629ef6c2f27.jpg',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/c78fd7df9ff4.jpg',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/ad16d2c5e8e5.png',
  ],
  aksesoris: [
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/a4f5398eb280.jpg',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/5d227609d1ac.png',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/98d6e41d120f.jpg',
    'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3fee3d6d7070.jpeg',
  ],
}

const COLORS = [
  { name: 'Hitam', hex: '#111111' },
  { name: 'Putih', hex: '#FFFFFF' },
  { name: 'Krem', hex: '#E8DCC8' },
  { name: 'Khaki', hex: '#C3B091' },
  { name: 'Coklat', hex: '#6F4E37' },
  { name: 'Terracotta', hex: '#C8735C' },
  { name: 'Navy', hex: '#2C3E50' },
  { name: 'Abu Muda', hex: '#B8B8B8' },
]

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

let barcodeSeq = 1000
function nextBarcode() {
  barcodeSeq += 1
  return `899${String(barcodeSeq).padStart(10, '0')}`
}

interface SeedProduct {
  name: string
  category: string
  desc: string
  basePrice: number
  costPrice: number
  featured?: boolean
  images: string[]
  variants: { size: string; color: string; price: number; qty: number }[]
}

const PRODUCTS: SeedProduct[] = [
  {
    name: 'KIKIS Basic Tee Hitam', category: 'Kaos',
    desc: 'Kaos polos bahan cotton combed 30s premium. Nyaman dipakai harian, tidak mudah melar. Wajib punya di lemari.',
    basePrice: 89000, costPrice: 45000, featured: true,
    images: [IMAGES.kaos[0], IMAGES.kaos[1]],
    variants: [
      { size: 'S', color: 'Hitam', price: 89000, qty: 24 },
      { size: 'M', color: 'Hitam', price: 89000, qty: 32 },
      { size: 'L', color: 'Hitam', price: 89000, qty: 28 },
      { size: 'XL', color: 'Hitam', price: 94000, qty: 15 },
      { size: 'M', color: 'Putih', price: 89000, qty: 20 },
      { size: 'L', color: 'Putih', price: 89000, qty: 3 },
    ],
  },
  {
    name: 'KIKIS Graphic Tee Putih', category: 'Kaos',
    desc: 'Kaos dengan sablon graphic eksklusif KIKIS. Bahan cotton combed 24s lembut dan breathable.',
    basePrice: 109000, costPrice: 55000,
    images: [IMAGES.kaos[2], IMAGES.kaos[3]],
    variants: [
      { size: 'M', color: 'Putih', price: 109000, qty: 18 },
      { size: 'L', color: 'Putih', price: 109000, qty: 22 },
      { size: 'XL', color: 'Putih', price: 114000, qty: 10 },
    ],
  },
  {
    name: 'KIKIS Linen Shirt Krem', category: 'Kemeja',
    desc: 'Kemeja linen premium dengan potongan relaxed fit. Cocok untuk kasual maupun semi-formal.',
    basePrice: 189000, costPrice: 92000, featured: true,
    images: [IMAGES.kemeja[0], IMAGES.kemeja[1]],
    variants: [
      { size: 'S', color: 'Krem', price: 189000, qty: 12 },
      { size: 'M', color: 'Krem', price: 189000, qty: 16 },
      { size: 'L', color: 'Krem', price: 189000, qty: 14 },
      { size: 'XL', color: 'Krem', price: 199000, qty: 8 },
    ],
  },
  {
    name: 'KIKIS Oxford Shirt Navy', category: 'Kemeja',
    desc: 'Kemeja oxford bahan katun tebal dengan tekstur halus. Klasik dan tahan lama.',
    basePrice: 179000, costPrice: 88000,
    images: [IMAGES.kemeja[2], IMAGES.kemeja[3]],
    variants: [
      { size: 'M', color: 'Navy', price: 179000, qty: 11 },
      { size: 'L', color: 'Navy', price: 179000, qty: 13 },
      { size: 'XL', color: 'Navy', price: 189000, qty: 6 },
    ],
  },
  {
    name: 'KIKIS Chino Pants Khaki', category: 'Celana',
    desc: 'Celana chino dengan bahan twill stretch. Potongan slim fit modern, nyaman untuk aktivitas seharian.',
    basePrice: 169000, costPrice: 82000, featured: true,
    images: [IMAGES.celana[0], IMAGES.celana[1]],
    variants: [
      { size: '28', color: 'Khaki', price: 169000, qty: 10 },
      { size: '30', color: 'Khaki', price: 169000, qty: 14 },
      { size: '32', color: 'Khaki', price: 169000, qty: 12 },
      { size: '34', color: 'Khaki', price: 169000, qty: 9 },
    ],
  },
  {
    name: 'KIKIS Wide Pants Hitam', category: 'Celana',
    desc: 'Celana wide leg trendy dengan bahan wool blend. Siluet longgar yang elegan.',
    basePrice: 199000, costPrice: 95000,
    images: [IMAGES.celana[2], IMAGES.celana[3]],
    variants: [
      { size: '28', color: 'Hitam', price: 199000, qty: 8 },
      { size: '30', color: 'Hitam', price: 199000, qty: 10 },
      { size: '32', color: 'Hitam', price: 199000, qty: 7 },
    ],
  },
  {
    name: 'KIKIS Slim Fit Jeans Biru Tua', category: 'Jeans',
    desc: 'Jeans denim 12oz dengan potongan slim fit. Warna biru tua klasik, cocok untuk semua gaya.',
    basePrice: 249000, costPrice: 120000, featured: true,
    images: [IMAGES.jeans[0], IMAGES.jeans[1]],
    variants: [
      { size: '28', color: 'Navy', price: 249000, qty: 9 },
      { size: '30', color: 'Navy', price: 249000, qty: 12 },
      { size: '32', color: 'Navy', price: 249000, qty: 11 },
      { size: '34', color: 'Navy', price: 249000, qty: 4 },
    ],
  },
  {
    name: 'KIKIS Straight Jeans Washed', category: 'Jeans',
    desc: 'Jeans straight cut dengan efek washed vintage. Bahan denim tebal berkualitas tinggi.',
    basePrice: 239000, costPrice: 115000,
    images: [IMAGES.jeans[2], IMAGES.jeans[3]],
    variants: [
      { size: '30', color: 'Abu Muda', price: 239000, qty: 7 },
      { size: '32', color: 'Abu Muda', price: 239000, qty: 9 },
      { size: '34', color: 'Abu Muda', price: 239000, qty: 8 },
    ],
  },
  {
    name: 'KIKIS Denim Jacket Classic', category: 'Jaket',
    desc: 'Jaket denim klasik dengan wash ringan. Layering sempurna untuk cuaca dingin.',
    basePrice: 299000, costPrice: 150000, featured: true,
    images: [IMAGES.jaket[0], IMAGES.jaket[1]],
    variants: [
      { size: 'M', color: 'Navy', price: 299000, qty: 6 },
      { size: 'L', color: 'Navy', price: 299000, qty: 8 },
      { size: 'XL', color: 'Navy', price: 315000, qty: 4 },
    ],
  },
  {
    name: 'KIKIS Bomber Jacket Hitam', category: 'Jaket',
    desc: 'Bomber jacket dengan bahan twill water-resistant. Fitting modern dengan rib collar.',
    basePrice: 279000, costPrice: 140000,
    images: [IMAGES.jaket[2], IMAGES.jaket[3]],
    variants: [
      { size: 'M', color: 'Hitam', price: 279000, qty: 5 },
      { size: 'L', color: 'Hitam', price: 279000, qty: 7 },
    ],
  },
  {
    name: 'KIKIS Midi Dress Terracotta', category: 'Dress',
    desc: 'Midi dress dengan bahan rayon premium yang flowy. Warna terracotta hangat khas KIKIS.',
    basePrice: 219000, costPrice: 105000, featured: true,
    images: [IMAGES.dress[0], IMAGES.dress[1]],
    variants: [
      { size: 'S', color: 'Terracotta', price: 219000, qty: 8 },
      { size: 'M', color: 'Terracotta', price: 219000, qty: 10 },
      { size: 'L', color: 'Terracotta', price: 219000, qty: 6 },
    ],
  },
  {
    name: 'KIKIS Summer Dress Putih', category: 'Dress',
    desc: 'Summer dress ringan dengan detail ruffle. Perfect untuk hangout dan liburan.',
    basePrice: 199000, costPrice: 95000,
    images: [IMAGES.dress[2], IMAGES.dress[3]],
    variants: [
      { size: 'S', color: 'Putih', price: 199000, qty: 7 },
      { size: 'M', color: 'Putih', price: 199000, qty: 9 },
      { size: 'L', color: 'Putih', price: 199000, qty: 2 },
    ],
  },
  {
    name: 'KIKIS Leather Belt Coklat', category: 'Aksesoris',
    desc: 'Ikat pinggang kulit asli dengan buckle anti karat. Finishing matte elegan.',
    basePrice: 129000, costPrice: 60000,
    images: [IMAGES.aksesoris[0], IMAGES.aksesoris[1]],
    variants: [
      { size: '90', color: 'Coklat', price: 129000, qty: 10 },
      { size: '100', color: 'Coklat', price: 129000, qty: 12 },
      { size: '110', color: 'Coklat', price: 129000, qty: 8 },
    ],
  },
  {
    name: 'KIKIS Canvas Tote Bag', category: 'Aksesoris',
    desc: 'Tote bag canvas 12oz dengan lining dalam. Muat laptop 14 inci, kokoh dan stylish.',
    basePrice: 99000, costPrice: 42000, featured: true,
    images: [IMAGES.aksesoris[2], IMAGES.aksesoris[3]],
    variants: [
      { size: 'All Size', color: 'Krem', price: 99000, qty: 15 },
      { size: 'All Size', color: 'Hitam', price: 99000, qty: 14 },
    ],
  },
]

const CATEGORIES = [
  { name: 'Kaos', description: 'Kaos polos & graphic tee premium' },
  { name: 'Kemeja', description: 'Kemeja linen, oxford & flanel' },
  { name: 'Celana', description: 'Chino, wide pants & more' },
  { name: 'Jeans', description: 'Denim jeans slim & straight fit' },
  { name: 'Jaket', description: 'Denim jacket, bomber & hoodie' },
  { name: 'Dress', description: 'Midi dress & summer dress' },
  { name: 'Aksesoris', description: 'Ikat pinggang, tote bag & lainnya' },
]

const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '90', '100', '110', 'All Size']

async function main() {
  console.log('Seeding KIKIS database...')

  // Reset
  await db.stockMovement.deleteMany()
  await db.transactionItem.deleteMany()
  await db.orderItem.deleteMany()
  await db.payment.deleteMany()
  await db.transaction.deleteMany()
  await db.order.deleteMany()
  await db.purchaseItem.deleteMany()
  await db.purchase.deleteMany()
  await db.inventory.deleteMany()
  await db.productVariant.deleteMany()
  await db.productImage.deleteMany()
  await db.discount.deleteMany()
  await db.product.deleteMany()
  await db.category.deleteMany()
  await db.size.deleteMany()
  await db.color.deleteMany()
  await db.supplier.deleteMany()
  await db.voucher.deleteMany()
  await db.address.deleteMany()
  await db.customer.deleteMany()
  await db.cashierShift.deleteMany()
  await db.auditLog.deleteMany()
  await db.storeSetting.deleteMany()
  await db.user.deleteMany()

  const pwHash = bcrypt.hashSync('password123', 10)

  // Users
  const superAdmin = await db.user.create({ data: { name: 'Super Admin', email: 'superadmin@kikis.id', passwordHash: pwHash, role: 'SUPER_ADMIN' } })
  await db.user.create({ data: { name: 'Admin KIKIS', email: 'admin@kikis.id', passwordHash: pwHash, role: 'ADMIN' } })
  const kasir = await db.user.create({ data: { name: 'Kasir 01', email: 'kasir@kikis.id', passwordHash: pwHash, role: 'CASHIER' } })

  // Customer
  const customer = await db.customer.create({
    data: {
      name: 'Budi Santoso', email: 'budi@example.com', phone: '081234567890', passwordHash: pwHash,
      addresses: {
        create: { label: 'Rumah', street: 'Jl. Sudirman No. 10', city: 'Jakarta Selatan', province: 'DKI Jakarta', postalCode: '12190', isDefault: true },
      },
    },
  })

  // Categories
  const catMap = new Map<string, string>()
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = await db.category.create({ data: { ...CATEGORIES[i], slug: slugify(CATEGORIES[i].name), sortOrder: i } })
    catMap.set(c.name, c.id)
  }

  // Sizes & Colors
  const sizeMap = new Map<string, string>()
  for (let i = 0; i < SIZES.length; i++) {
    const s = await db.size.create({ data: { name: SIZES[i], sortOrder: i } })
    sizeMap.set(s.name, s.id)
  }
  const colorMap = new Map<string, string>()
  for (const col of COLORS) {
    const c = await db.color.create({ data: { name: col.name, hexCode: col.hex } })
    colorMap.set(c.name, c.id)
  }

  // Products + Variants + Inventory
  const catPrefix: Record<string, string> = {
    'Kaos': 'KAO', 'Kemeja': 'KEM', 'Celana': 'CEL', 'Jeans': 'JEA',
    'Jaket': 'JAK', 'Dress': 'DRE', 'Aksesoris': 'AKS',
  }
  const catCounter: Record<string, number> = {}

  for (const p of PRODUCTS) {
    catCounter[p.category] = (catCounter[p.category] ?? 0) + 1
    const num = String(catCounter[p.category]).padStart(3, '0')
    const prefix = catPrefix[p.category]
    const product = await db.product.create({
      data: {
        name: p.name,
        slug: slugify(p.name),
        description: p.desc,
        categoryId: catMap.get(p.category)!,
        basePrice: p.basePrice,
        costPrice: p.costPrice,
        isFeatured: p.featured ?? false,
        images: { create: p.images.map((url, idx) => ({ url, altText: p.name, sortOrder: idx, isPrimary: idx === 0 })) },
      },
    })

    for (const v of p.variants) {
      const sizeCode = v.size === 'All Size' ? 'OS' : v.size
      const colorCode = v.color.toUpperCase().replace(/\s+/g, '').slice(0, 6)
      const sku = `KIK-${prefix}-${num}-${sizeCode}-${colorCode}`
      const variant = await db.productVariant.create({
        data: {
          productId: product.id,
          sizeId: sizeMap.get(v.size) ?? null,
          colorId: colorMap.get(v.color) ?? null,
          sku,
          barcode: nextBarcode(),
          price: v.price,
          costPrice: p.costPrice,
        },
      })
      await db.inventory.create({ data: { variantId: variant.id, quantity: v.qty, minStock: 5 } })
      await db.stockMovement.create({
        data: {
          variantId: variant.id, type: 'PURCHASE', quantity: v.qty,
          stockBefore: 0, stockAfter: v.qty, reference: 'SEED-INIT', note: 'Stok awal', userId: superAdmin.id,
        },
      })
    }
  }

  // Supplier
  await db.supplier.create({ data: { name: 'PT Konveksi Nusantara', phone: '0215551234', email: 'sales@konveksinusantara.co.id', address: 'Jl. Cikini Raya No. 45, Jakarta Pusat' } })
  await db.supplier.create({ data: { name: 'CV Denim Makmur', phone: '081234567800', email: 'order@denimmakmur.id', address: 'Jl. Ahmad Yani No. 88, Bandung' } })

  // Vouchers
  await db.voucher.create({ data: { code: 'WELCOME10K', name: 'Diskon Pembeli Baru', type: 'FIXED', value: 10000, minPurchase: 100000, quota: 500, usedCount: 12, startDate: new Date('2025-01-01'), endDate: new Date('2027-12-31') } })
  await db.voucher.create({ data: { code: 'KIKISLOVE', name: 'Diskon 10% KIKIS', type: 'PERCENT', value: 10, minPurchase: 200000, maxDiscount: 50000, quota: 300, usedCount: 45, startDate: new Date('2025-01-01'), endDate: new Date('2027-12-31') } })
  await db.voucher.create({ data: { code: 'GRATISONGKIR', name: 'Voucher Gratis Ongkir Setengah', type: 'FIXED', value: 15000, minPurchase: 150000, quota: 200, usedCount: 30, startDate: new Date('2025-01-01'), endDate: new Date('2027-12-31') } })

  // Store settings
  await db.storeSetting.create({
    data: {
      id: 'main',
      storeName: 'KIKIS',
      tagline: 'Style Made Simple.',
      address: 'Jl. Kemang Raya No. 12, Jakarta Selatan',
      phone: '021-7280-1122',
      email: 'hello@kikis.id',
      receiptFooter: 'Terima kasih telah berbelanja di KIKIS. Barang yang sudah dibeli tidak dapat ditukar.',
    },
  })

  console.log('Seed completed.')
  console.log('Users: superadmin@kikis.id / admin@kikis.id / kasir@kikis.id (password123)')
  console.log('Customer: budi@example.com (password123)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
