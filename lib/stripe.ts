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
