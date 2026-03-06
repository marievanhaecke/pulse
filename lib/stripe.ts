import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
})

export const PRICES = {
  session: parseInt(process.env.NEXT_PUBLIC_PRICE_SESSION || '1200'),   // 12€
  monthly: parseInt(process.env.NEXT_PUBLIC_PRICE_MONTHLY || '4500'),   // 45€
  yearly:  parseInt(process.env.NEXT_PUBLIC_PRICE_YEARLY  || '40000'),  // 400€
} as const

export type PlanType = keyof typeof PRICES

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name: string
): Promise<string> {
  const { createAdminClient } = await import('./supabase/server')
  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (profile?.stripe_customer_id) return profile.stripe_customer_id

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { supabase_user_id: userId },
  })

  await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)

  return customer.id
}

export function formatPrice(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(cents / 100)
}
