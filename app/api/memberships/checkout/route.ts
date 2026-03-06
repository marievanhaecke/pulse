import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, PRICES, getOrCreateStripeCustomer } from '@/lib/stripe'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'adherent') {
    return NextResponse.json({ error: 'Réservé aux adhérents' }, { status: 403 })
  }

  const { type } = await req.json()
  if (!['session', 'monthly', 'yearly'].includes(type)) {
    return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
  }

  const customerId = await getOrCreateStripeCustomer(
    user.id,
    user.email!,
    profile.full_name || user.email!
  )

  let checkoutSession

  if (type === 'session') {
    // Paiement unique "à la séance" — achat d'un crédit de séance
    checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Adhésion MLK Sport — À la séance',
            description: '1 séance de sport',
          },
          unit_amount: PRICES.session,
        },
        quantity: 1,
      }],
      success_url: `${APP_URL}/adhesion/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/adhesion`,
      metadata: {
        supabase_user_id: user.id,
        membership_type: 'session',
      },
    })
  } else {
    // Abonnement mensuel ou annuel
    const priceId = type === 'monthly'
      ? process.env.STRIPE_PRICE_MONTHLY
      : process.env.STRIPE_PRICE_YEARLY

    if (!priceId) {
      // Fallback: créer un price dynamiquement (dev/test)
      const price = await stripe.prices.create({
        currency: 'eur',
        unit_amount: type === 'monthly' ? PRICES.monthly : PRICES.yearly,
        recurring: {
          interval: type === 'monthly' ? 'month' : 'year',
        },
        product_data: {
          name: `Adhésion MLK Sport — ${type === 'monthly' ? 'Mensuelle' : 'Annuelle'}`,
        },
      })

      checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: price.id, quantity: 1 }],
        success_url: `${APP_URL}/adhesion/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/adhesion`,
        metadata: {
          supabase_user_id: user.id,
          membership_type: type,
        },
      })
    } else {
      checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${APP_URL}/adhesion/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/adhesion`,
        metadata: {
          supabase_user_id: user.id,
          membership_type: type,
        },
      })
    }
  }

  // Crée l'entrée membership en statut 'pending'
  await supabase.from('memberships').insert({
    user_id: user.id,
    type,
    status: 'pending',
    stripe_checkout_session_id: checkoutSession.id,
    amount_cents: PRICES[type as keyof typeof PRICES],
    currency: 'eur',
  })

  return NextResponse.json({ url: checkoutSession.url })
}
