import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/current-user'
import { CpuSetup } from '@/components/cpu/CpuSetup'

export default async function CpuPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return <CpuSetup />
}
