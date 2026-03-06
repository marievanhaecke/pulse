export type Role = 'admin' | 'coach' | 'adherent'
export type SessionStatus = 'scheduled' | 'cancelled' | 'completed'
export type BookingStatus = 'confirmed' | 'cancelled'
export type MembershipType = 'session' | 'monthly' | 'yearly'
export type MembershipStatus = 'active' | 'cancelled' | 'expired' | 'pending' | 'past_due'
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  phone: string | null
  avatar_url: string | null
  stripe_customer_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  name: string
  description: string | null
  location: string | null
  duration_minutes: number
  day_of_week: number | null  // 0=dim, 1=lun, ..., 6=sam
  time_of_day: string | null  // "HH:MM:SS"
  is_recurring: boolean
  color: string
  is_active: boolean
  created_at: string
}

export interface Session {
  id: string
  course_id: string | null
  title: string
  location: string | null
  date: string       // "YYYY-MM-DD"
  start_time: string // "HH:MM:SS"
  end_time: string   // "HH:MM:SS"
  color: string
  status: SessionStatus
  notes: string | null
  created_at: string
  // Relations
  course?: Course
  coaches?: Profile[]
  bookings?: Booking[]
  booking_count?: number
  my_booking?: Booking | null
}

export interface SessionCoach {
  session_id: string
  coach_id: string
  coach?: Profile
}

export interface Booking {
  id: string
  session_id: string
  user_id: string
  status: BookingStatus
  created_at: string
  // Relations
  session?: Session
  user?: Profile
}

export interface Membership {
  id: string
  user_id: string
  type: MembershipType
  status: MembershipStatus
  stripe_subscription_id: string | null
  stripe_checkout_session_id: string | null
  sessions_remaining: number | null
  start_date: string | null
  end_date: string | null
  amount_cents: number
  currency: string
  created_at: string
  updated_at: string
  // Relations
  user?: Profile
}

export interface Payment {
  id: string
  user_id: string | null
  membership_id: string | null
  amount_cents: number
  currency: string
  stripe_payment_intent_id: string | null
  stripe_invoice_id: string | null
  stripe_checkout_session_id: string | null
  status: PaymentStatus
  description: string | null
  created_at: string
  // Relations
  user?: Profile
  membership?: Membership
}

export interface Setting {
  key: string
  value: string
}

// Vue enrichie pour le planning
export interface SessionWithDetails extends Session {
  coaches: Profile[]
  booking_count: number
  my_booking: Booking | null
  is_booked: boolean
}

// Jours de la semaine
export const DAYS_OF_WEEK = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
] as const

export const DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] as const
