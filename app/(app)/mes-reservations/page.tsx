import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BookingsClient from './bookings-client'

export default async function MesReservationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'adherent') redirect('/tableau-de-bord')

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      session:sessions(
        id, title, date, start_time, end_time, location, color, status,
        session_coaches(coach:profiles(full_name))
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <BookingsClient bookings={bookings || []} />
}
