'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react'
import {
  addWeeks, subWeeks, format, addDays, startOfWeek, isSameDay, parseISO, isToday,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { formatTime, formatWeekRange, cn } from '@/lib/utils'
import BookingModal from '@/components/planning/BookingModal'
import SessionFormModal from '@/components/planning/SessionFormModal'
import type { Profile, Membership, SessionWithDetails } from '@/types/database'
import { toast } from 'sonner'

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6h → 21h

interface Props {
  profile: Profile
  coaches: Pick<Profile, 'id' | 'full_name' | 'role'>[]
  activeMembership: Membership | null
}

export default function PlanningClient({ profile, coaches, activeMembership }: Props) {
  const supabase = createClient()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [sessions, setSessions] = useState<SessionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<SessionWithDetails | null>(null)
  const [showSessionForm, setShowSessionForm] = useState(false)

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    const weekEnd = addDays(weekStart, 6)
    const from = format(weekStart, 'yyyy-MM-dd')
    const to = format(weekEnd, 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        session_coaches(
          coach:profiles(id, full_name)
        ),
        bookings(id, user_id, status)
      `)
      .gte('date', from)
      .lte('date', to)
      .neq('status', 'cancelled')
      .order('date')
      .order('start_time')

    if (error) { toast.error('Erreur de chargement'); setLoading(false); return }

    const enriched: SessionWithDetails[] = (data || []).map(s => ({
      ...s,
      coaches: s.session_coaches?.map((sc: { coach: Profile }) => sc.coach).filter(Boolean) || [],
      booking_count: s.bookings?.filter((b: { status: string }) => b.status === 'confirmed').length || 0,
      my_booking: s.bookings?.find((b: { user_id: string; status: string }) => b.user_id === profile.id && b.status === 'confirmed') || null,
      is_booked: s.bookings?.some((b: { user_id: string; status: string }) => b.user_id === profile.id && b.status === 'confirmed') || false,
    }))

    setSessions(enriched)
    setLoading(false)
  }, [weekStart, profile.id, supabase])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  function getSessionsForDay(day: Date): SessionWithDetails[] {
    const dateStr = format(day, 'yyyy-MM-dd')
    return sessions.filter(s => s.date === dateStr)
  }

  function getSessionTop(startTime: string): number {
    const [h, m] = startTime.split(':').map(Number)
    return ((h - 6) * 60 + m) * (60 / 60) // pixels per minute
  }

  function getSessionHeight(startTime: string, endTime: string): number {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    return ((eh - sh) * 60 + (em - sm))
  }

  const canCreate = profile.role === 'admin' || profile.role === 'coach'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Planning</h1>
          <p className="text-slate-500 text-sm mt-0.5">{formatWeekRange(currentWeek)}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-white">
            <button
              onClick={() => setCurrentWeek(w => subWeeks(w, 1))}
              className="p-1.5 rounded hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentWeek(new Date())}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
            >
              Aujourd&apos;hui
            </button>
            <button
              onClick={() => setCurrentWeek(w => addWeeks(w, 1))}
              className="p-1.5 rounded hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowSessionForm(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              Nouvelle séance
            </button>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="card overflow-hidden">
        {/* Days header */}
        <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
          <div className="h-14" />
          {weekDays.map(day => (
            <div
              key={day.toISOString()}
              className={cn(
                'h-14 flex flex-col items-center justify-center border-l border-slate-100 text-sm',
                isToday(day) && 'bg-primary-50'
              )}
            >
              <span className="text-slate-400 text-xs">
                {format(day, 'EEE', { locale: fr })}
              </span>
              <span className={cn(
                'font-semibold mt-0.5',
                isToday(day)
                  ? 'w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs'
                  : 'text-slate-800'
              )}>
                {format(day, 'd')}
              </span>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="overflow-y-auto max-h-[calc(100vh-260px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="relative" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
              {/* Hour rows */}
              {HOURS.map(hour => (
                <div
                  key={hour}
                  className="grid border-b border-slate-100"
                  style={{ gridTemplateColumns: '56px repeat(7, 1fr)', minHeight: '60px' }}
                >
                  <div className="text-right pr-2 pt-1 text-xs text-slate-400 font-medium">
                    {hour}h
                  </div>
                  {weekDays.map(day => (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'border-l border-slate-100 relative',
                        isToday(day) && 'bg-primary-50/40'
                      )}
                    />
                  ))}
                </div>
              ))}

              {/* Sessions overlay */}
              <div
                className="absolute inset-0 grid pointer-events-none"
                style={{ gridTemplateColumns: '56px repeat(7, 1fr)', top: 0 }}
              >
                <div /> {/* spacer for time column */}
                {weekDays.map((day, dayIdx) => {
                  const daySessions = getSessionsForDay(day)
                  return (
                    <div key={dayIdx} className="relative">
                      {daySessions.map(session => {
                        const top = getSessionTop(session.start_time)
                        const height = Math.max(getSessionHeight(session.start_time, session.end_time), 30)

                        return (
                          <button
                            key={session.id}
                            className="absolute left-1 right-1 rounded-lg text-left overflow-hidden shadow-sm hover:shadow-md transition-shadow pointer-events-auto border border-white/20"
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                              backgroundColor: session.color + 'dd',
                            }}
                            onClick={() => setSelectedSession(session)}
                          >
                            <div className="px-2 py-1">
                              <p className="text-white text-xs font-semibold truncate leading-tight">
                                {session.title}
                              </p>
                              <p className="text-white/80 text-xs truncate">
                                {formatTime(session.start_time)}
                              </p>
                              {session.is_booked && (
                                <div className="w-2 h-2 bg-white rounded-full mt-0.5" />
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!loading && sessions.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p>Aucune séance cette semaine</p>
        </div>
      )}

      {/* Booking Modal */}
      {selectedSession && (
        <BookingModal
          session={selectedSession}
          profile={profile}
          activeMembership={activeMembership}
          onClose={() => setSelectedSession(null)}
          onRefresh={fetchSessions}
        />
      )}

      {/* Session Form Modal */}
      {showSessionForm && (
        <SessionFormModal
          coaches={coaches}
          onClose={() => setShowSessionForm(false)}
          onRefresh={fetchSessions}
        />
      )}
    </div>
  )
}
