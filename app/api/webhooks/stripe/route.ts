import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { addMonths, addYears, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  switch (event.type) {
    // ----------------------------------------------------------------
    // Paiement one-time réussi (séance à l'unité)
    // ----------------------------------------------------------------
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.supabase_user_id
      const membershipType = session.metadata?.membership_type

      if (!userId || !membershipType) break

      if (session.mode === 'payment') {
        // À la séance : activer le membership
        const today = new Date()
        await supabase
          .from('memberships')
          .update({
            status: 'active',
            start_date: format(today, 'yyyy-MM-dd'),
            sessions_remaining: 1,
          })
          .eq('stripe_checkout_session_id', session.id)
          .eq('user_id', userId)

        // Enregistrer le paiement
        await supabase.from('payments').insert({
          user_id: userId,
          amount_cents: session.amount_total,
          currency: session.currency,
          stripe_checkout_session_id: session.id,
          status: 'succeeded',
          description: 'Adhésion à la séance',
        })
      } else if (session.mode === 'subscription') {
        // Pour les abonnements, on attend l'event invoice.payment_succeeded
        // Mais on enregistre l'ID de subscription
        await supabase
          .from('memberships')
          .update({
            stripe_subscription_id: session.subscription as string,
          })
          .eq('stripe_checkout_session_id', session.id)
          .eq('user_id', userId)
      }
      break
    }

    // ----------------------------------------------------------------
    // Facture payée (abonnement mensuel/annuel)
    // ----------------------------------------------------------------
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = invoice.subscription as string
      if (!subscriptionId) break

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const userId = subscription.metadata?.supabase_user_id
        || (await getUserIdByCustomer(supabase, subscription.customer as string))

      if (!userId) break

      const today = new Date()
      const membershipType = subscription.metadata?.type || 'monthly'

      const endDate = membershipType === 'yearly'
        ? addYears(today, 1)
        : addMonths(today, 1)

      // Mettre à jour ou créer le membership
      const { data: existing } = await supabase
        .from('memberships')
        .select('id')
        .eq('stripe_subscription_id', subscriptionId)
        .limit(1)
        .single()

      if (existing) {
        await supabase
          .from('memberships')
          .update({
            status: 'active',
            start_date: format(today, 'yyyy-MM-dd'),
            end_date: format(endDate, 'yyyy-MM-dd'),
          })
          .eq('id', existing.id)
      } else {
        await supabase.from('memberships').insert({
          user_id: userId,
          type: membershipType,
          status: 'active',
          stripe_subscription_id: subscriptionId,
          start_date: format(today, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          amount_cents: invoice.amount_paid,
          currency: invoice.currency,
        })
      }

      // Enregistrer le paiement
      await supabase.from('payments').insert({
        user_id: userId,
        amount_cents: invoice.amount_paid,
        currency: invoice.currency,
        stripe_invoice_id: invoice.id,
        status: 'succeeded',
        description: `Adhésion ${membershipType === 'monthly' ? 'mensuelle' : 'annuelle'}`,
      })
      break
    }

    // ----------------------------------------------------------------
    // Paiement échoué
    // ----------------------------------------------------------------
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = invoice.subscription as string
      if (!subscriptionId) break

      await supabase
        .from('memberships')
        .update({ status: 'past_due' })
        .eq('stripe_subscription_id', subscriptionId)
      break
    }

    // ----------------------------------------------------------------
    // Abonnement annulé
    // ----------------------------------------------------------------
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase
        .from('memberships')
        .update({ status: 'cancelled' })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    default:
      console.log(`Unhandled event: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

async function getUserIdByCustomer(
  supabase: ReturnType<typeof createAdminClient>,
  customerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()
  return data?.id || null
}
