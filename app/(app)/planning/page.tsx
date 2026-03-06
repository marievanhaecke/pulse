import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PlanningClient from './planning-client'
import type { Profile, Membership } from '@/types/database'

export default async function PlanningPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, coachesRes, membershipRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('profiles').select('id, full_name, role').eq('role', 'coach'),
    supabase
      .from('memberships')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const profile = profileRes.data as Profile
  const coaches = coachesRes.data || []
  const activeMembership = (membershipRes.data?.[0] || null) as Membership | null

  return (
    <PlanningClient
      profile={profile}
      coaches={coaches}
      activeMembership={activeMembership}
    />
  )
}
