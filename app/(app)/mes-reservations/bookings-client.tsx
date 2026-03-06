'use client'

import { useState } from 'react'
import { Calendar, Clock, MapPin, Users, X, Loader2, CheckCircle } from 'lucide-react'
import { formatDate, formatTime, cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'

interface Booking {
  id: string
  status: string
  created_at: string
  session: {
    id: string
    title: string
    date: string
    start_time: string
    end_time: string
    location: string | null
    color: string
    status: string
    session_coaches: { coach: { full_name: string } }[]
  }
}

interface Props {
  bookings: Booking[]
}

export default function BookingsClient({ bookings: initial }: Props) {
  const [bookings, setBookings] = useState(initial)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('upcoming')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const filtered = bookings.filter(b => {
    if (filter === 'upcoming') return b.session?.date >= today && b.status === 'confirmed'
    if (filter === 'past')     return b.session?.date < today && b.status === 'confirmed'
    if (filter === 'cancelled') return b.status === 'cancelled'
    return true
  })

  async function handleCancel(bookingId: string) {
    if (!confirm('Annuler cette réservation ?')) return
    setLoadingId(bookingId)
    const res = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE' })
    if (res.ok) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b))
      toast.success('Réservation annulée')
    } else {
      toast.error('Erreur lors de l\'annulation')
    }
    setLoadingId(null)
  }

  const counts = {
    upcoming: bookings.filter(b => b.session?.date >= today && b.status === 'confirmed').length,
    past: bookings.filter(b => b.session?.date < today && b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Mes réservations</h1>
        <p className="text-slate-500 mt-1">{counts.upcoming} séance(s) à venir</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'upcoming', label: `À venir (${counts.upcoming})` },
          { key: 'past', label: `Passées (${counts.past})` },
          { key: 'cancelled', label: `Annulées (${counts.cancelled})` },
          { key: 'all', label: 'Toutes' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as typeof filter)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              filter === key
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bookings list */}
      {filtered.length === 0 ? (
        <div className="card-padding text-center py-16">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">Aucune réservation</p>
          {filter === 'upcoming' && (
            <Link href="/planning" className="btn-primary btn-sm mt-4 inline-flex">
              Réserver une séance
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(booking => {
            const isPast = booking.session?.date < today
            const isCancelled = booking.status === 'cancelled'
            const sessionCancelled = booking.session?.status === 'cancelled'

            return (
              <div
                key={booking.id}
                className={cn(
                  'card flex items-center gap-4 px-5 py-4',
                  (isCancelled || sessionCancelled) && 'opacity-60'
                )}
              >
                {/* Color bar */}
                <div
                  className="w-1 h-14 rounded-full flex-shrink-0"
                  style={{ backgroundColor: isCancelled ? '#94a3b8' : booking.session?.color }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="font-semibold text-slate-900 truncate">{booking.session?.title}</p>
                    {isCancelled && <span className="badge-red">Annulée</span>}
                    {sessionCancelled && !isCancelled && <span className="badge-red">Séance annulée</span>}
                    {!isCancelled && isPast && !sessionCancelled && (
                      <span className="badge-green flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Effectuée
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(booking.session?.date, 'EEEE d MMMM yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTime(booking.session?.start_time)} – {formatTime(booking.session?.end_time)}
                    </span>
                    {booking.session?.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {booking.session.location}
                      </span>
                    )}
                    {booking.session?.session_coaches?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {booking.session.session_coaches.map(sc => sc.coach.full_name).join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cancel btn */}
                {!isCancelled && !isPast && !sessionCancelled && (
                  <button
                    onClick={() => handleCancel(booking.id)}
                    disabled={loadingId === booking.id}
                    className="btn-secondary btn-sm flex-shrink-0 text-red-500 hover:bg-red-50 hover:border-red-200"
                  >
                    {loadingId === booking.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <><X className="w-3.5 h-3.5" /> Annuler</>
                    }
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
