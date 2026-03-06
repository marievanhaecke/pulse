import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Calendar, Users, CreditCard, Bookmark, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { formatDate, formatTime, MEMBERSHIP_LABELS } from '@/lib/utils'
import type { Profile, Session, Booking, Membership } from '@/types/database'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  // Données selon le rôle
  let stats: Record<string, number | string> = {}
  let upcomingSessions: Session[] = []
  let activeMembership: Membership | null = null

  if (profile.role === 'adherent') {
    const [membershipRes, bookingsRes] = await Promise.all([
      supabase
        .from('memberships')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('bookings')
        .select('*, session:sessions(title, date, start_time, end_time, location)')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .gte('sessions.date', today)
        .order('sessions(date)', { ascending: true })
        .limit(5),
    ])
    activeMembership = membershipRes.data?.[0] || null
    upcomingSessions = bookingsRes.data?.map(b => b.session).filter(Boolean) as Session[] || []
    stats = {
      reservations: bookingsRes.data?.length ?? 0,
    }
  }

  if (profile.role === 'coach') {
    const { data: coachSessions } = await supabase
      .from('session_coaches')
      .select('session:sessions(*, bookings(count))')
      .eq('coach_id', user.id)

    const sessions = coachSessions?.map(sc => sc.session).filter(Boolean) ?? []
    upcomingSessions = (sessions as Session[]).filter(
      (s: Session) => s.date >= today && s.status === 'scheduled'
    ).slice(0, 5)
    stats = { totalSeances: sessions.length }
  }

  if (profile.role === 'admin') {
    const [usersRes, sessionsRes, membershipsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('sessions').select('id', { count: 'exact' }).gte('date', today),
      supabase.from('memberships').select('id', { count: 'exact' }).eq('status', 'active'),
    ])
    stats = {
      users: usersRes.count ?? 0,
      sessions: sessionsRes.count ?? 0,
      memberships: membershipsRes.count ?? 0,
    }

    const { data: nextSessions } = await supabase
      .from('sessions')
      .select('*')
      .gte('date', today)
      .eq('status', 'scheduled')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(5)
    upcomingSessions = nextSessions || []
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">
          Bonjour, {profile.full_name?.split(' ')[0] || 'là'} 👋
        </h1>
        <p className="text-slate-500 mt-1">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Statut adhésion (adhérent) */}
      {profile.role === 'adherent' && (
        <div className={`rounded-xl p-5 flex items-center gap-4 border ${
          activeMembership
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          {activeMembership
            ? <CheckCircle className="w-8 h-8 text-emerald-600 flex-shrink-0" />
            : <AlertCircle className="w-8 h-8 text-amber-600 flex-shrink-0" />
          }
          <div className="flex-1">
            {activeMembership ? (
              <>
                <p className="font-semibold text-emerald-900">
                  Adhésion active — {MEMBERSHIP_LABELS[activeMembership.type]}
                </p>
                <p className="text-sm text-emerald-700 mt-0.5">
                  {activeMembership.end_date
                    ? `Valable jusqu'au ${formatDate(activeMembership.end_date)}`
                    : 'Abonnement actif'
                  }
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-amber-900">Aucune adhésion active</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Souscrivez une adhésion pour réserver vos séances.
                </p>
              </>
            )}
          </div>
          {!activeMembership && (
            <Link href="/adhesion" className="btn-primary btn-sm flex-shrink-0">
              Adhérer
            </Link>
          )}
        </div>
      )}

      {/* Stats cards (admin) */}
      {profile.role === 'admin' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            icon={Users}
            label="Membres inscrits"
            value={stats.users as number}
            color="blue"
            href="/admin/utilisateurs"
          />
          <StatCard
            icon={Calendar}
            label="Séances à venir"
            value={stats.sessions as number}
            color="indigo"
            href="/admin/seances"
          />
          <StatCard
            icon={CreditCard}
            label="Adhésions actives"
            value={stats.memberships as number}
            color="emerald"
            href="/admin/paiements"
          />
        </div>
      )}

      {/* Prochaines séances */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">
            {profile.role === 'adherent' ? 'Mes prochaines séances' : 'Prochaines séances'}
          </h2>
          <Link
            href={profile.role === 'adherent' ? '/mes-reservations' : '/planning'}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Voir tout →
          </Link>
        </div>

        {upcomingSessions.length === 0 ? (
          <div className="card-padding text-center py-12">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Aucune séance à venir</p>
            {profile.role === 'adherent' && (
              <Link href="/planning" className="btn-primary btn-sm mt-4 inline-flex">
                Réserver une séance
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map(session => (
              <SessionRow key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="section-title mb-4">Accès rapides</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction href="/planning" icon={Calendar} label="Planning" color="bg-primary-50 text-primary-700" />
          {profile.role === 'adherent' && (
            <>
              <QuickAction href="/mes-reservations" icon={Bookmark} label="Réservations" color="bg-sky-50 text-sky-700" />
              <QuickAction href="/adhesion" icon={CreditCard} label="Adhésion" color="bg-emerald-50 text-emerald-700" />
            </>
          )}
          {profile.role === 'admin' && (
            <>
              <QuickAction href="/admin/utilisateurs" icon={Users} label="Membres" color="bg-violet-50 text-violet-700" />
              <QuickAction href="/admin/cours" icon={TrendingUp} label="Cours" color="bg-amber-50 text-amber-700" />
              <QuickAction href="/admin/paiements" icon={CreditCard} label="Paiements" color="bg-emerald-50 text-emerald-700" />
            </>
          )}
          {profile.role === 'coach' && (
            <QuickAction href="/mon-planning" icon={Clock} label="Mon planning" color="bg-sky-50 text-sky-700" />
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon, label, value, color, href,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: 'blue' | 'indigo' | 'emerald'
  href: string
}) {
  const colors = {
    blue:    'bg-blue-50 text-blue-600',
    indigo:  'bg-primary-50 text-primary-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <Link href={href} className="card-padding flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </Link>
  )
}

function SessionRow({ session }: { session: Session }) {
  return (
    <div className="card flex items-center gap-4 px-5 py-4">
      <div className="w-2 h-10 rounded-full bg-primary-500 flex-shrink-0" style={{ backgroundColor: session.color }} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900">{session.title}</p>
        <p className="text-sm text-slate-500">
          {formatDate(session.date)} · {formatTime(session.start_time)} – {formatTime(session.end_time)}
          {session.location && ` · ${session.location}`}
        </p>
      </div>
      <Clock className="w-4 h-4 text-slate-300 flex-shrink-0" />
    </div>
  )
}

function QuickAction({ href, icon: Icon, label, color }: {
  href: string
  icon: React.ElementType
  label: string
  color: string
}) {
  return (
    <Link href={href} className={`rounded-xl p-4 flex flex-col items-center gap-2 hover:opacity-80 transition-opacity ${color}`}>
      <Icon className="w-6 h-6" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  )
}
