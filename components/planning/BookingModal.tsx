'use client'

import { useState } from 'react'
import { X, Calendar, Clock, MapPin, Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatTime, getInitials, MEMBERSHIP_LABELS } from '@/lib/utils'
import type { Profile, SessionWithDetails, Membership } from '@/types/database'
import { toast } from 'sonner'
import Link from 'next/link'

interface Props {
  session: SessionWithDetails
  profile: Profile
  activeMembership: Membership | null
  onClose: () => void
  onRefresh: () => void
}

export default function BookingModal({ session, profile, activeMembership, onClose, onRefresh }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const isAdherent = profile.role === 'adherent'
  const isBooked = session.is_booked
  const canBook = isAdherent && (activeMembership?.status === 'active')
  const isPast = new Date(`${session.date}T${session.end_time}`) < new Date()

  async function handleBook() {
    setLoading(true)
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Erreur lors de la réservation')
    } else {
      toast.success('Séance réservée !')
      onRefresh()
      onClose()
    }
    setLoading(false)
  }

  async function handleCancel() {
    if (!session.my_booking) return
    setLoading(true)
    const res = await fetch(`/api/bookings/${session.my_booking.id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      toast.error('Erreur lors de l\'annulation')
    } else {
      toast.success('Réservation annulée')
      onRefresh()
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Color header */}
        <div className="h-3 w-full" style={{ backgroundColor: session.color }} />

        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{session.title}</h2>
              {session.status !== 'scheduled' && (
                <span className="badge-red mt-1 inline-block">
                  {session.status === 'cancelled' ? 'Annulée' : 'Terminée'}
                </span>
              )}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Infos */}
          <div className="space-y-3 mb-6">
            <InfoRow icon={Calendar}>
              {formatDate(session.date, 'EEEE d MMMM yyyy')}
            </InfoRow>
            <InfoRow icon={Clock}>
              {formatTime(session.start_time)} – {formatTime(session.end_time)}
            </InfoRow>
            {session.location && (
              <InfoRow icon={MapPin}>{session.location}</InfoRow>
            )}
            {session.coaches && session.coaches.length > 0 && (
              <InfoRow icon={Users}>
                <div className="flex flex-wrap gap-2">
                  {session.coaches.map(coach => (
                    <span key={coach.id} className="inline-flex items-center gap-1.5 text-sm">
                      <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                        {getInitials(coach.full_name || '')}
                      </span>
                      {coach.full_name}
                    </span>
                  ))}
                </div>
              </InfoRow>
            )}
            <InfoRow icon={Users}>
              <span className="text-sm">
                {session.booking_count} participant{session.booking_count > 1 ? 's' : ''}
              </span>
            </InfoRow>
          </div>

          {/* Notes */}
          {session.notes && (
            <div className="bg-slate-50 rounded-xl p-3 mb-5">
              <p className="text-sm text-slate-600">{session.notes}</p>
            </div>
          )}

          {/* Actions adhérent */}
          {isAdherent && !isPast && session.status === 'scheduled' && (
            <div>
              {isBooked ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-xl p-3">
                    <CheckCircle className="w-5 h-5" />
                    <p className="font-medium text-sm">Vous êtes inscrit(e) à cette séance</p>
                  </div>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="btn-secondary w-full"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Annuler ma réservation'}
                  </button>
                </div>
              ) : canBook ? (
                <button onClick={handleBook} disabled={loading} className="btn-primary w-full py-2.5">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Réserver cette séance'}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-amber-600 bg-amber-50 rounded-xl p-3">
                    <AlertCircle className="w-5 h-5 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Adhésion requise</p>
                      <p className="text-xs mt-0.5">Souscrivez une adhésion pour réserver des séances.</p>
                    </div>
                  </div>
                  <Link href="/adhesion" className="btn-primary w-full py-2.5 text-center block" onClick={onClose}>
                    Voir les formules d&apos;adhésion
                  </Link>
                </div>
              )}
            </div>
          )}

          {isPast && <p className="text-sm text-center text-slate-400">Cette séance est terminée</p>}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  )
}
