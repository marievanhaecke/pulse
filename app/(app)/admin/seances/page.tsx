import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SessionsAdminClient from './sessions-client'

export default async function AdminSessionsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/tableau-de-bord')

  const today = new Date().toISOString().split('T')[0]

  const [sessionsRes, coachesRes] = await Promise.all([
    supabase
      .from('sessions')
      .select(`
        *,
        session_coaches(coach:profiles(id, full_name)),
        bookings(count)
      `)
      .gte('date', today)
      .order('date')
      .order('start_time')
      .limit(100),
    supabase.from('profiles').select('id, full_name, role').eq('role', 'coach'),
  ])

  return (
    <SessionsAdminClient
      sessions={sessionsRes.data || []}
      coaches={coachesRes.data || []}
    />
  )
}
