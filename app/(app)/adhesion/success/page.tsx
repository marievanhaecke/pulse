import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Calendar, ArrowRight } from 'lucide-react'

export default function AdhesionSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  if (!searchParams.session_id) redirect('/adhesion')

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Paiement confirmé !
        </h1>
        <p className="text-slate-500 mb-8">
          Votre adhésion est maintenant active. Vous pouvez réserver vos séances dès maintenant.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/planning" className="btn-primary btn-lg">
            <Calendar className="w-5 h-5" />
            Voir le planning
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/adhesion" className="btn-secondary btn-lg">
            Mon adhésion
          </Link>
        </div>
      </div>
    </div>
  )
}
