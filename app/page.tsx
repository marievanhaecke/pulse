import Link from 'next/link'
import { Calendar, Users, CreditCard, Activity, CheckCircle, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">MLK Sport</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors">
              Connexion
            </Link>
            <Link href="/inscription" className="btn-primary btn-sm">
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-500/20 border border-primary-500/30 rounded-full px-4 py-1.5 text-sm text-primary-300 mb-6">
          <Activity className="w-4 h-4" />
          Association sportive
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-6 leading-tight">
          Gérez vos cours de sport<br />
          <span className="text-primary-400">simplement</span>
        </h1>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
          Planning en ligne, réservations faciles, cotisations en ligne.
          MLK Sport, c&apos;est votre association connectée.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/inscription" className="btn-primary btn-lg group">
            Rejoindre l&apos;association
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/login" className="btn-secondary btn-lg bg-white/10 text-white border-white/20 hover:bg-white/20">
            Se connecter
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Calendar,
              title: 'Planning en ligne',
              desc: 'Consultez les créneaux disponibles et réservez en un clic.',
              color: 'text-primary-400',
            },
            {
              icon: Users,
              title: 'Multi-coachs',
              desc: 'Plusieurs coachs peuvent intervenir sur un même créneau.',
              color: 'text-emerald-400',
            },
            {
              icon: CreditCard,
              title: 'Cotisation flexible',
              desc: 'À la séance, mensuelle ou annuelle. Paiement sécurisé Stripe.',
              color: 'text-amber-400',
            },
            {
              icon: Activity,
              title: 'Suivi des séances',
              desc: 'Historique des réservations et gestion des adhérents.',
              color: 'text-rose-400',
            },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
              <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold mb-2">{title}</h3>
              <p className="text-slate-400 text-sm">{desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing preview */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Nos formules</h2>
          <p className="text-slate-400 mb-12">Choisissez la formule adaptée à vos besoins</p>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { label: 'À la séance', price: '12', unit: '/ séance', desc: 'Payez uniquement quand vous venez', highlight: false },
              { label: 'Mensuel', price: '45', unit: '/ mois', desc: 'Accès illimité aux cours', highlight: true },
              { label: 'Annuel', price: '400', unit: '/ an', desc: 'La meilleure valeur — 2 mois offerts', highlight: false },
            ].map(({ label, price, unit, desc, highlight }) => (
              <div
                key={label}
                className={`rounded-2xl p-8 text-left ${
                  highlight
                    ? 'bg-primary-600 border-2 border-primary-400'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <p className={`text-sm font-medium mb-4 ${highlight ? 'text-primary-200' : 'text-slate-400'}`}>{label}</p>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl font-extrabold text-white">{price}€</span>
                  <span className={`text-sm pb-1 ${highlight ? 'text-primary-200' : 'text-slate-400'}`}>{unit}</span>
                </div>
                <p className={`text-sm mb-6 ${highlight ? 'text-primary-100' : 'text-slate-400'}`}>{desc}</p>
                <div className="space-y-2">
                  {['Accès au planning', 'Réservation en ligne', 'Annulation libre'].map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className={`w-4 h-4 ${highlight ? 'text-primary-200' : 'text-emerald-400'}`} />
                      <span className={highlight ? 'text-primary-100' : 'text-slate-300'}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link href="/inscription" className="btn-primary btn-lg">
              Commencer maintenant
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center">
        <p className="text-slate-500 text-sm">
          © {new Date().getFullYear()} MLK Sport · Association sportive
        </p>
      </footer>
    </div>
  )
}
