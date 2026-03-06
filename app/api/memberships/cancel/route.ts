import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: membership } = await supabase
    .from('memberships')
    .select('id, stripe_subscription_id, type')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .not('stripe_subscription_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!membership?.stripe_subscription_id) {
    return NextResponse.json({ error: 'Aucun abonnement actif à annuler' }, { status: 400 })
  }

  // Annuler à la fin de la période en cours
  await stripe.subscriptions.update(membership.stripe_subscription_id, {
    cancel_at_period_end: true,
  })

  await supabase
    .from('memberships')
    .update({ status: 'cancelled' })
    .eq('id', membership.id)

  return NextResponse.json({ success: true })
}
