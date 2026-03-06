import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatPrice, MEMBERSHIP_LABELS, MEMBERSHIP_STATUS_LABELS } from '@/lib/utils'
import type { Membership, Profile } from '@/types/database'
import { CreditCard, TrendingUp, Users, CheckCircle } from 'lucide-react'

type MembershipWithUser = Membership & { user: Profile }

export default async function AdminPaymentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/tableau-de-bord')

  const [membershipsRes, paymentsRes] = await Promise.all([
    supabase
      .from('memberships')
      .select('*, user:profiles(id, full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('payments')
      .select('*, user:profiles(full_name, email)')
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const memberships = (membershipsRes.data || []) as MembershipWithUser[]
  const payments = paymentsRes.data || []

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount_cents, 0)
  const activeCount = memberships.filter(m => m.status === 'active').length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Paiements & Adhésions</h1>
        <p className="text-slate-500 mt-1">Suivi des cotisations et revenus</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="card-padding flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{formatPrice(totalRevenue)}</p>
            <p className="text-sm text-slate-500">Revenus totaux</p>
          </div>
        </div>
        <div className="card-padding flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
            <p className="text-sm text-slate-500">Adhésions actives</p>
          </div>
        </div>
        <div className="card-padding flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{memberships.length}</p>
            <p className="text-sm text-slate-500">Total adhésions</p>
          </div>
        </div>
      </div>

      {/* Memberships table */}
      <div>
        <h2 className="section-title mb-4">Adhésions</h2>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Membre</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Formule</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Montant</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Statut</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Début</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Fin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {memberships.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400">Aucune adhésion</td></tr>
                ) : memberships.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900 text-sm">{m.user?.full_name || '—'}</p>
                      <p className="text-xs text-slate-500">{m.user?.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="badge-blue text-xs">{MEMBERSHIP_LABELS[m.type]}</span>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-slate-900">
                      {formatPrice(m.amount_cents)}
                      {m.type !== 'session' && <span className="text-slate-400 text-xs">/{m.type === 'monthly' ? 'mois' : 'an'}</span>}
                    </td>
                    <td className="px-4 py-4">
                      {m.status === 'active'    && <span className="badge-green flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" />{MEMBERSHIP_STATUS_LABELS[m.status]}</span>}
                      {m.status === 'pending'   && <span className="badge-yellow">{MEMBERSHIP_STATUS_LABELS[m.status]}</span>}
                      {m.status === 'cancelled' && <span className="badge-red">{MEMBERSHIP_STATUS_LABELS[m.status]}</span>}
                      {m.status === 'expired'   && <span className="badge-gray">{MEMBERSHIP_STATUS_LABELS[m.status]}</span>}
                      {m.status === 'past_due'  && <span className="badge-red">{MEMBERSHIP_STATUS_LABELS[m.status]}</span>}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {m.start_date ? formatDate(m.start_date) : '—'}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {m.end_date ? formatDate(m.end_date) : m.type !== 'session' ? '∞' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent payments */}
      <div>
        <h2 className="section-title mb-4">Paiements récents</h2>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Membre</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Description</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Montant</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-slate-400">Aucun paiement</td></tr>
                ) : payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900 text-sm">{p.user?.full_name || '—'}</p>
                      <p className="text-xs text-slate-500">{p.user?.email}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{p.description || '—'}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-emerald-600">
                      {formatPrice(p.amount_cents)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {formatDate(p.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
