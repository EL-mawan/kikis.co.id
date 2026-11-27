'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatIDR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { apiGet, useDebouncedValue } from '@/components/admin/api'
import { PageHeader } from '@/components/admin/PageHeader'
import { EmptyState, Pager, TableSkeleton } from '@/components/admin/table-bits'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface CustomerRow {
  id: string
  name: string
  email: string
  phone: string | null
  isActive: boolean
  createdAt: string
  orderCount: number
  lastOrder: { total: number; createdAt: string; orderNumber: string } | null
}

interface CustomersResponse {
  customers: CustomerRow[]
  total: number
  page: number
  pages: number
}

export default function AdminCustomersPage() {
  const [data, setData] = useState<CustomersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebouncedValue(search)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      const d = await apiGet<CustomersResponse>(`/api/admin/customers?${params.toString()}`)
      setData(d)
    } catch (e) {
      toast.error('Gagal memuat pelanggan', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, page])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data-fetch / sync pattern
    load()
  }, [load])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data-fetch / sync pattern
    setPage(1)
  }, [debouncedSearch])

  return (
    <div className="space-y-6">
      <PageHeader title="Pelanggan" description="Akun pelanggan terdaftar beserta riwayat belanja online." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, telepon..."
            className="h-10 rounded-none pl-9"
            aria-label="Cari pelanggan"
          />
        </div>
        {data ? (
          <p className="text-xs uppercase tracking-widest text-muted-foreground sm:ml-auto">{data.total} pelanggan</p>
        ) : null}
      </div>

      <Card className="rounded-none p-6 shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead className="text-center">Pesanan</TableHead>
                  <TableHead>Pesanan Terakhir</TableHead>
                  <TableHead>Terdaftar</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              {loading ? (
                <TableSkeleton colSpan={7} rows={6} />
              ) : !data || data.customers.length === 0 ? (
                <EmptyState colSpan={7} />
              ) : (
                <TableBody>
                  {data.customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.email}</TableCell>
                      <TableCell className="text-muted-foreground">{c.phone || '-'}</TableCell>
                      <TableCell className="text-center">{c.orderCount}</TableCell>
                      <TableCell>
                        {c.lastOrder ? (
                          <div>
                            <p className="font-mono text-xs">{c.lastOrder.orderNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatIDR(c.lastOrder.total)} · {formatDate(c.lastOrder.createdAt)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Belum pernah belanja</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'border-transparent',
                            c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {c.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </div>
          {data ? <Pager page={data.page} pages={data.pages} onPage={setPage} /> : null}
        </CardContent>
      </Card>
    </div>
  )
}
