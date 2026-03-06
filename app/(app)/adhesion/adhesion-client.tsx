'use client'

import { useState } from 'react'
import {
  CheckCircle, CreditCard, Calendar, TrendingUp,
  AlertCircle, Loader2, Receipt, ArrowRight,
} from 'lucide-react'
import { formatDate, formatPrice, MEMBERSHIP_LABELS, MEMBERSHIP_STATUS_LABELS, cn } from '@/lib/utils'
import type { Profile, Membership, Payment } from '@/types/database'
import { toast } from 'sonner'

interface Props {
  profile: Profile
  memberships: Membership[]
  payments: Partial<Payment>[]
  activeMembership: Membership | null
}

const PLANS = [
  {
    type: 'session' as const,
    label: 'À la séance',
    price: parseInt(process.env.NEXT_PUBLIC_PRICE_SESSION || '1200'),
    priceUnit: '/ séance',
    period: 'Payez à chaque venue',
    features: ['Réservation à la demande', 'Sans engagement', 'Idéal pour débuter'],
    icon: CreditCard,
    highlight: false,
    color: 'border-slate-200',
  },
  {
    type: 'monthly' as const,
    label: 'Mensuel',
    price: parseInt(process.env.NEXT_PUBLIC_PRICE_MONTHLY || '4500'),
    priceUnit: '/ mois',
    period: 'Prélèvement mensuel automatique',
    features: ['Séances illimitées', 'Annulation à tout moment', 'Accès à tous les cours'],
    icon: Calendar,
    highlight: true,
    color: 'border-primary-500',
  },
  {
    type: 'yearly' as const,
    label: 'Annuel',
    price: parseInt(process.env.NEXT_PUBLIC_PRICE_YEARLY || '40000'),
    priceUnit: '/ an',
    period: 'Paiement en une fois',
    features: ['Séances illimitées', 'Économisez 2 mois', 'Accès à tous les cours'],
    icon: TrendingUp,
    highlight: false,
    color: 'border-slate-200',
  },
]

export default function AdhesionClient({ profile, memberships, payments, activeMembership }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleSubscribe(type: 'session' | 'monthly' | 'yearly') {
    setLoading(type)
    const res = await fetch('/api/memberships/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Erreur lors de la création de la session de paiement')
      setLoading(null)
      return
    }
    // Redirect to Stripe Checkout
    window.location.href = data.url
  }

  async function handleCancel() {
    if (!activeMembership?.stripe_subscription_id) return
    if (!confirm('Êtes-vous sûr de vouloir annuler votre abonnement ? Il restera actif jusqu\'à la fin de la période en cours.')) return

    const res = await fetch('/api/memberships/cancel', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      toast.success('Abonnement annulé. Il reste actif jusqu\'à la fin de la période.')
      window.location.reload()
    } else {
      toast.error(data.error || 'Erreur lors de l\'annulation')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Mon adhésion</h1>
        <p className="text-slate-500 mt-1">Gérez votre cotisation et votre accès à l&apos;association</p>
      </div>

      {/* Status actuel */}
      {activeMembership ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-emerald-900">Adhésion active</p>
                <p className="text-sm text-emerald-700">
                  Formule {MEMBERSHIP_LABELS[activeMembership.type]} · {formatPrice(activeMembership.amount_cents)}
                  {activeMembership.type !== 'session' && `/${activeMembership.type === 'monthly' ? 'mois' : 'an'}`}
                </p>
              </div>
            </div>
            {activeMembership.end_date && (
              <div className="text-right">
                <p className="text-xs text-emerald-600 font-medium">Valide jusqu&apos;au</p>
                <p className="text-sm font-bold text-emerald-900">{formatDate(activeMembership.end_date)}</p>
              </div>
            )}
          </div>

          {(activeMembership.type === 'monthly' || activeMembership.type === 'yearly') &&
            activeMembership.stripe_subscription_id && (
            <div className="mt-4 pt-4 border-t border-emerald-200">
              <button
                onClick={handleCancel}
                className="text-sm text-emerald-700 hover:text-red-600 transition-colors"
              >
                Annuler l&apos;abonnement
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-900">Aucune adhésion active</p>
            <p className="text-sm text-amber-700">Choisissez une formule ci-dessous pour réserver des séances.</p>
          </div>
        </div>
      )}

      {/* Plans */}
      <div>
        <h2 className="section-title mb-5">
          {activeMembership ? 'Changer de formule' : 'Choisir une formule'}
        </h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {PLANS.map(plan => {
            const Icon = plan.icon
            const isActive = activeMembership?.type === plan.type
            const isLoading = loading === plan.type

            return (
              <div
                key={plan.type}
                className={cn(
                  'relative rounded-2xl border-2 p-6 transition-all',
                  plan.highlight
                    ? 'bg-primary-600 border-primary-500 text-white'
                    : 'bg-white border-slate-200',
                  isActive && 'ring-2 ring-emerald-400 ring-offset-2'
                )}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                      Populaire
                    </span>
                  </div>
                )}
                {isActive && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Actif
                    </span>
                  </div>
                )}

                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4',
                  plan.highlight ? 'bg-white/20' : 'bg-primary-50'
                )}>
                  <Icon className={cn('w-5 h-5', plan.highlight ? 'text-white' : 'text-primary-600')} />
                </div>

                <p className={cn('text-sm font-medium mb-1', plan.highlight ? 'text-primary-200' : 'text-slate-500')}>
                  {plan.label}
                </p>
                <div className="flex items-end gap-1 mb-1">
                  <span className={cn('text-4xl font-extrabold', plan.highlight ? 'text-white' : 'text-slate-900')}>
                    {formatPrice(plan.price)}
                  </span>
                </div>
                <p className={cn('text-sm mb-5', plan.highlight ? 'text-primary-200' : 'text-slate-400')}>
                  {plan.period}
                </p>

                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className={cn('flex items-center gap-2 text-sm',
                      plan.highlight ? 'text-primary-100' : 'text-slate-600'
                    )}>
                      <CheckCircle className={cn('w-4 h-4 flex-shrink-0',
                        plan.highlight ? 'text-primary-300' : 'text-emerald-500'
                      )} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.type)}
                  disabled={!!loading || isActive}
                  className={cn(
                    'w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
                    isActive
                      ? plan.highlight
                        ? 'bg-white/20 text-white cursor-default'
                        : 'bg-emerald-50 text-emerald-700 cursor-default'
                      : plan.highlight
                        ? 'bg-white text-primary-700 hover:bg-primary-50'
                        : 'bg-primary-600 text-white hover:bg-primary-700',
                    loading && !isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : isActive
                      ? 'Formule actuelle'
                      : <><span>Choisir cette formule</span><ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-center text-slate-400 mt-4">
          Paiement sécurisé via Stripe · Aucun engagement pour la formule à la séance
        </p>
      </div>

      {/* Historique */}
      {payments.length > 0 && (
        <div>
          <h2 className="section-title mb-4">Historique des paiements</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Description</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Montant</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-700 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-slate-400" />
                      {p.description || 'Paiement'}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                      {formatPrice(p.amount_cents!)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {formatDate(p.created_at!)}
                    </td>
                    <td className="px-4 py-4">
                      {p.status === 'succeeded' && <span className="badge-green">Payé</span>}
                      {p.status === 'pending'   && <span className="badge-yellow">En attente</span>}
                      {p.status === 'failed'    && <span className="badge-red">Échoué</span>}
                      {p.status === 'refunded'  && <span className="badge-gray">Remboursé</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
