'use client'

import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TableBody, TableCell, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

/** Generic empty state row for tables */
export function EmptyState({ colSpan, message = 'Belum ada data' }: { colSpan: number; message?: string }) {
  return (
    <TableBody>
      <TableRow>
        <TableCell colSpan={colSpan} className="h-32 text-center">
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Inbox className="h-8 w-8 stroke-1" aria-hidden="true" />
            <span className="text-sm">{message}</span>
          </div>
        </TableCell>
      </TableRow>
    </TableBody>
  )
}

/** Skeleton rows while a table is loading */
export function TableSkeleton({ colSpan, rows = 5 }: { colSpan: number; rows?: number }) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={colSpan}>
            <Skeleton className="h-4 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  )
}

/** Minimal pagination control */
export function Pager({
  page,
  pages,
  onPage,
}: {
  page: number
  pages: number
  onPage: (p: number) => void
}) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-4 px-1 py-3">
      <span className="text-xs text-muted-foreground">
        Halaman {page} dari {pages}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" /> Sebelumnya
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Berikutnya <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
