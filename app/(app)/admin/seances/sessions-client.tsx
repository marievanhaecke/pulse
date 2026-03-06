'use client'

import { useState } from 'react'
import { Plus, Calendar, Clock, MapPin, Users, Trash2, Ban, CheckCircle, Loader2 } from 'lucide-react'
import { formatDate, formatTime, cn, STATUS_LABELS } from '@/lib/utils'
import type { Profile } from '@/types/database'
import SessionFormModal from '@/components/planning/SessionFormModal'
import { toast } from 'sonner'

interface SessionRow {
  id: string
  title: string
  date: string
  start_time: string
  end_time: string
  location: string | null
  color: string
  status: string
  session_coaches: { coach: Pick<Profile, 'id' | 'full_name'> }[]
  bookings: { count: number }[]
}

interface Props {
  sessions: SessionRow[]
  coaches: Pick<Profile, 'id' | 'full_name' | 'role'>[]
}

export default function SessionsAdminClient({ sessions: initial, coaches }: Props) {
  const [sessions, setSessions] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleStatusChange(id: string, status: 'scheduled' | 'cancelled' | 'completed') {
    setLoadingId(id)
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, status } : s))
      toast.success('Statut mis à jour')
    } else {
      toast.error('Erreur')
    }
    setLoadingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette séance et toutes ses réservations ?')) return
    setLoadingId(id)
    const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSessions(prev => prev.filter(s => s.id !== id))
      toast.success('Séance supprimée')
    } else {
      toast.error('Erreur lors de la suppression')
    }
    setLoadingId(null)
  }

  function refreshSessions() {
    window.location.reload()
  }

  const statusBadge = (status: string) => {
    if (status === 'scheduled') return <span className="badge-blue">{STATUS_LABELS[status]}</span>
    if (status === 'cancelled') return <span className="badge-red">{STATUS_LABELS[status]}</span>
    return <span className="badge-green">{STATUS_LABELS[status]}</span>
  }

  // Group by date
  const grouped: Record<string, SessionRow[]> = {}
  sessions.forEach(s => {
    if (!grouped[s.date]) grouped[s.date] = []
    grouped[s.date].push(s)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Séances</h1>
          <p className="text-slate-500 mt-1">{sessions.length} séance(s) à venir</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Nouvelle séance
        </button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="card-padding text-center py-16">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400">Aucune séance à venir</p>
          <button onClick={() => setShowForm(true)} className="btn-primary btn-sm mt-4">
            Créer une séance
          </button>
        </div>
      ) : (
        Object.entries(grouped).map(([date, daySessions]) => (
          <div key={date}>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              {formatDate(date, 'EEEE d MMMM yyyy')}
            </h3>
            <div className="space-y-2">
              {daySessions.map(session => (
                <div key={session.id} className={cn(
                  'card flex items-center gap-4 px-5 py-4',
                  session.status === 'cancelled' && 'opacity-60'
                )}>
                  <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: session.color }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-900">{session.title}</p>
                      {statusBadge(session.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(session.start_time)} – {formatTime(session.end_time)}
                      </span>
                      {session.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {session.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {session.bookings?.[0]?.count ?? 0} inscrit(s)
                      </span>
                    </div>
                    {session.session_coaches?.length > 0 && (
                      <div className="flex gap-1.5 mt-1.5">
                        {session.session_coaches.map(sc => (
                          <span key={sc.coach.id} className="badge-blue text-xs">
                            {sc.coach.full_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {session.status === 'scheduled' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(session.id, 'completed')}
                          disabled={loadingId === session.id}
                          className="btn-secondary btn-sm"
                          title="Marquer terminée"
                        >
                          {loadingId === session.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <CheckCircle className="w-3.5 h-3.5" />
                          }
                        </button>
                        <button
                          onClick={() => handleStatusChange(session.id, 'cancelled')}
                          disabled={loadingId === session.id}
                          className="btn-secondary btn-sm"
                          title="Annuler la séance"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {session.status === 'cancelled' && (
                      <button
                        onClick={() => handleStatusChange(session.id, 'scheduled')}
                        disabled={loadingId === session.id}
                        className="btn-secondary btn-sm"
                      >
                        Reprogrammer
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(session.id)}
                      disabled={loadingId === session.id}
                      className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showForm && (
        <SessionFormModal
          coaches={coaches}
          onClose={() => setShowForm(false)}
          onRefresh={refreshSessions}
        />
      )}
    </div>
  )
}
