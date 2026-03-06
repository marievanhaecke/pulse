import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdhesionClient from './adhesion-client'
import type { Membership } from '@/types/database'

export default async function AdhesionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'adherent') redirect('/tableau-de-bord')

  // Memberships history
  const { data: memberships } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Payments history
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const activeMembership = memberships?.find(m => m.status === 'active') as Membership | undefined

  return (
    <AdhesionClient
      profile={profile}
      memberships={(memberships || []) as Membership[]}
      payments={payments || []}
      activeMembership={activeMembership || null}
    />
  )
}
