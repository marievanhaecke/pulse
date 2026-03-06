import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UsersClient from './users-client'
import type { Profile, Membership } from '@/types/database'

export default async function AdminUsersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/tableau-de-bord')

  const { data: users } = await supabase
    .from('profiles')
    .select(`
      *,
      memberships(id, type, status, end_date, amount_cents)
    `)
    .order('created_at', { ascending: false })

  return <UsersClient users={(users || []) as (Profile & { memberships: Partial<Membership>[] })[]} />
}
