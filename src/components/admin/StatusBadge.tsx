'use client'

import { cn } from '@/lib/utils'
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from '@/lib/format'
import { Badge } from '@/components/ui/badge'

/** Order status badge using shared label + color maps */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn('border-transparent font-medium', ORDER_STATUS_COLOR[status] ?? 'bg-muted text-muted-foreground', className)}>
      {ORDER_STATUS_LABEL[status] ?? status}
    </Badge>
  )
}
