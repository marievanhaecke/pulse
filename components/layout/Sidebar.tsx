'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity, Calendar, Bookmark, CreditCard, Users,
  BookOpen, LayoutDashboard, LogOut, ChevronRight, Shield,
} from 'lucide-react'
import { cn, getInitials, ROLE_LABELS } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/tableau-de-bord', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['admin', 'coach', 'adherent'] },
  { href: '/planning',        label: 'Planning',         icon: Calendar,       roles: ['admin', 'coach', 'adherent'] },
  { href: '/mes-reservations', label: 'Mes réservations', icon: Bookmark,      roles: ['adherent'] },
  { href: '/adhesion',         label: 'Mon adhésion',     icon: CreditCard,    roles: ['adherent'] },
  { href: '/mon-planning',     label: 'Mon planning',     icon: BookOpen,      roles: ['coach'] },
  // Admin
  { href: '/admin/utilisateurs', label: 'Utilisateurs',   icon: Users,         roles: ['admin'] },
  { href: '/admin/cours',        label: 'Cours',           icon: BookOpen,      roles: ['admin'] },
  { href: '/admin/seances',      label: 'Séances',         icon: Calendar,      roles: ['admin'] },
  { href: '/admin/paiements',    label: 'Paiements',       icon: CreditCard,    roles: ['admin'] },
]

interface SidebarProps {
  profile: Profile
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(profile.role))
  const adminItems = visibleItems.filter(i => i.href.startsWith('/admin'))
  const regularItems = visibleItems.filter(i => !i.href.startsWith('/admin'))

  return (
    <aside className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-5 border-b border-slate-100">
        <Link href="/tableau-de-bord" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 leading-tight">MLK Sport</p>
            <p className="text-xs text-slate-400">Association sportive</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {regularItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className={cn('w-4 h-4', active ? 'text-primary-600' : 'text-slate-400')} />
              {item.label}
              {active && <ChevronRight className="w-3 h-3 ml-auto text-primary-400" />}
            </Link>
          )
        })}

        {adminItems.length > 0 && (
          <>
            <div className="px-3 pt-4 pb-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> Administration
              </p>
            </div>
            {adminItems.map(item => {
              const Icon = item.icon
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    active
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <Icon className={cn('w-4 h-4', active ? 'text-primary-600' : 'text-slate-400')} />
                  {item.label}
                  {active && <ChevronRight className="w-3 h-3 ml-auto text-primary-400" />}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors mb-1">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary-700">
              {getInitials(profile.full_name || profile.email)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {profile.full_name || 'Utilisateur'}
            </p>
            <p className="text-xs text-slate-400">{ROLE_LABELS[profile.role]}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
