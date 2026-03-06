import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Récupère la réservation
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, user_id, session_id, status')
    .eq('id', params.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })

  // Vérifie que c'est bien la réservation de l'utilisateur (ou admin)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (booking.user_id !== user.id && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
  }

  // Annuler (soft delete)
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
