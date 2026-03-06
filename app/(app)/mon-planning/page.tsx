import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatTime } from '@/lib/utils'
import { Calendar, Clock, MapPin, Users } from 'lucide-react'

export default async function MonPlanningPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach' && profile?.role !== 'admin') redirect('/tableau-de-bord')

  const today = new Date().toISOString().split('T')[0]

  const { data: coachSessions } = await supabase
    .from('session_coaches')
    .select(`
      session:sessions(
        id, title, date, start_time, end_time, location, color, status, notes,
        bookings(id, status, user:profiles(full_name))
      )
    `)
    .eq('coach_id', user.id)
    .order('sessions(date)', { ascending: true })

  const upcoming = (coachSessions || [])
    .map(sc => sc.session)
    .filter(s => s && s.date >= today && s.status === 'scheduled')
    .sort((a, b) => a!.date.localeCompare(b!.date) || a!.start_time.localeCompare(b!.start_time))

  const past = (coachSessions || [])
    .map(sc => sc.session)
    .filter(s => s && (s.date < today || s.status !== 'scheduled'))
    .sort((a, b) => b!.date.localeCompare(a!.date))
    .slice(0, 20)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Mon planning</h1>
        <p className="text-slate-500 mt-1">{upcoming.length} séance(s) à animer</p>
      </div>

      {/* Upcoming */}
      <div>
        <h2 className="section-title mb-4">Séances à venir</h2>
        {upcoming.length === 0 ? (
          <div className="card-padding text-center py-16">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-400">Aucune séance à venir</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(session => {
              if (!session) return null
              const confirmedBookings = session.bookings?.filter(
                (b: { status: string }) => b.status === 'confirmed'
              ) || []

              return (
                <div key={session.id} className="card overflow-hidden">
                  <div className="h-1" style={{ backgroundColor: session.color }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900 text-lg">{session.title}</h3>
                        <div className="flex flex-wrap gap-3 mt-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {formatDate(session.date, 'EEEE d MMMM yyyy')}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {formatTime(session.start_time)} – {formatTime(session.end_time)}
                          </span>
                          {session.location && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" />
                              {session.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-primary-600 font-semibold">
                          <Users className="w-4 h-4" />
                          {confirmedBookings.length} inscrit(s)
                        </div>
                      </div>
                    </div>

                    {/* Participants */}
                    {confirmedBookings.length > 0 && (
                      <div className="border-t border-slate-100 pt-3">
                        <p className="text-xs font-medium text-slate-500 mb-2">Participants :</p>
                        <div className="flex flex-wrap gap-2">
                          {confirmedBookings.map((b: { user: { full_name: string } }, i: number) => (
                            <span key={i} className="badge-blue text-xs">
                              {b.user?.full_name || 'Anonyme'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {session.notes && (
                      <div className="bg-slate-50 rounded-lg p-3 mt-3">
                        <p className="text-sm text-slate-600">{session.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="section-title mb-4 text-slate-500">Séances passées</h2>
          <div className="space-y-2">
            {past.map(session => {
              if (!session) return null
              const count = session.bookings?.filter((b: { status: string }) => b.status === 'confirmed').length || 0
              return (
                <div key={session.id} className="card px-5 py-3 flex items-center gap-4 opacity-70">
                  <div className="w-1 h-8 rounded-full" style={{ backgroundColor: session.color }} />
                  <div className="flex-1">
                    <p className="font-medium text-slate-700 text-sm">{session.title}</p>
                    <p className="text-xs text-slate-400">
                      {formatDate(session.date)} · {formatTime(session.start_time)}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{count} participant(s)</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
