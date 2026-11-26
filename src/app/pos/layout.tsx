import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getStaffSession } from '@/lib/auth'
import { PosShell } from '@/components/pos/PosShell'

export default async function PosLayout({ children }: { children: ReactNode }) {
  const session = await getStaffSession()
  if (!session) redirect('/masuk?next=/pos')

  return (
    <PosShell userName={session.name} userRole={session.role}>
      {children}
    </PosShell>
  )
}
