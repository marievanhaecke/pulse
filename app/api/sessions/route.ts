import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  let query = supabase
    .from('sessions')
    .select(`
      *,
      session_coaches(coach:profiles(id, full_name)),
      bookings(id, user_id, status)
    `)
    .order('date')
    .order('start_time')

  if (from) query = query.gte('date', from)
  if (to)   query = query.lte('date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'coach'].includes(profile.role)) {
    return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
  }

  const body = await req.json()
  const { coach_ids, ...sessionData } = body

  const { data: session, error } = await supabase
    .from('sessions')
    .insert(sessionData)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Assign coaches
  if (coach_ids?.length > 0) {
    await supabase.from('session_coaches').insert(
      coach_ids.map((id: string) => ({ session_id: session.id, coach_id: id }))
    )
  }

  return NextResponse.json(session, { status: 201 })
}
