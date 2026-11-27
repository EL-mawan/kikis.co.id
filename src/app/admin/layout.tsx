import { getStaffSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getStaffSession()
  if (!session) redirect('/loginkasir?next=/admin')

  return (
    <AdminShell userName={session.name} userRole={session.role}>
      {children}
    </AdminShell>
  )
}
