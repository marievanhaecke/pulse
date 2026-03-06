import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'adherent') {
    return NextResponse.json({ error: 'Seuls les adhérents peuvent réserver' }, { status: 403 })
  }

  // Vérifie l'adhésion active
  const { data: membership } = await supabase
    .from('memberships')
    .select('id, type, status, sessions_remaining')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Aucune adhésion active. Souscrivez une adhésion pour réserver.' }, { status: 403 })
  }

  const { session_id } = await req.json()
  if (!session_id) return NextResponse.json({ error: 'session_id requis' }, { status: 400 })

  // Vérifie que la séance existe et est à venir
  const { data: session } = await supabase
    .from('sessions')
    .select('id, date, status')
    .eq('id', session_id)
    .single()

  if (!session) return NextResponse.json({ error: 'Séance introuvable' }, { status: 404 })
  if (session.status !== 'scheduled') {
    return NextResponse.json({ error: 'Cette séance n\'est pas disponible' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]
  if (session.date < today) {
    return NextResponse.json({ error: 'Cette séance est passée' }, { status: 400 })
  }

  // Crée la réservation
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({ session_id, user_id: user.id, status: 'confirmed' })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Vous êtes déjà inscrit à cette séance' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Si abonnement à la séance : décrémenter
  if (membership.type === 'session' && membership.sessions_remaining != null) {
    await supabase
      .from('memberships')
      .update({ sessions_remaining: membership.sessions_remaining - 1 })
      .eq('id', membership.id)
  }

  return NextResponse.json(booking, { status: 201 })
}
