'use client'

import { useState } from 'react'
import { Users, Search, Edit2, Shield, UserCheck, User, Loader2, CheckCircle } from 'lucide-react'
import { formatDate, ROLE_LABELS, MEMBERSHIP_LABELS, getInitials, cn } from '@/lib/utils'
import type { Profile, Role, Membership } from '@/types/database'
import { toast } from 'sonner'

type UserWithMembership = Profile & { memberships: Partial<Membership>[] }

interface Props {
  users: UserWithMembership[]
}

export default function UsersClient({ users: initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [editingUser, setEditingUser] = useState<UserWithMembership | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'all' || u.role === filterRole
    return matchSearch && matchRole
  })

  async function updateRole(userId: string, role: Role) {
    setLoadingId(userId)
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
      toast.success('Rôle mis à jour')
      setEditingUser(null)
    } else {
      toast.error('Erreur lors de la mise à jour')
    }
    setLoadingId(null)
  }

  async function toggleActive(userId: string, currentActive: boolean) {
    setLoadingId(userId)
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !currentActive }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentActive } : u))
      toast.success(currentActive ? 'Compte désactivé' : 'Compte réactivé')
    } else {
      toast.error('Erreur lors de la mise à jour')
    }
    setLoadingId(null)
  }

  const RoleIcon = ({ role }: { role: Role }) => {
    if (role === 'admin') return <Shield className="w-3.5 h-3.5" />
    if (role === 'coach') return <UserCheck className="w-3.5 h-3.5" />
    return <User className="w-3.5 h-3.5" />
  }

  const roleBadgeClass = (role: Role) => {
    if (role === 'admin') return 'badge-purple'
    if (role === 'coach') return 'badge-blue'
    return 'badge-gray'
  }

  const activeMembership = (u: UserWithMembership) =>
    u.memberships?.find(m => m.status === 'active')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Utilisateurs</h1>
        <p className="text-slate-500 mt-1">{users.length} membre(s) inscrit(s)</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            className="input pl-9"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'adherent', 'coach', 'admin'].map(r => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                filterRole === r
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {r === 'all' ? 'Tous' : ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3.5">Membre</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3.5">Rôle</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3.5">Adhésion</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3.5">Inscrit le</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3.5">Statut</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : filtered.map(u => {
                const membership = activeMembership(u)
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary-700">
                            {getInitials(u.full_name || u.email)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{u.full_name || '—'}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={roleBadgeClass(u.role)}>
                        <RoleIcon role={u.role} />
                        <span className="ml-1">{ROLE_LABELS[u.role]}</span>
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {membership ? (
                        <div>
                          <span className="badge-green">{MEMBERSHIP_LABELS[membership.type!]}</span>
                          {membership.end_date && (
                            <p className="text-xs text-slate-400 mt-1">
                              jusqu&apos;au {formatDate(membership.end_date)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="badge-gray">Sans adhésion</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      {u.is_active
                        ? <span className="badge-green"><CheckCircle className="w-3 h-3 mr-1" />Actif</span>
                        : <span className="badge-red">Inactif</span>
                      }
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="btn-ghost btn-sm"
                          title="Modifier le rôle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleActive(u.id, u.is_active)}
                          disabled={loadingId === u.id}
                          className="btn-secondary btn-sm"
                        >
                          {loadingId === u.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : u.is_active ? 'Désactiver' : 'Activer'
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditingUser(null)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg text-slate-900 mb-1">Modifier le rôle</h3>
            <p className="text-sm text-slate-500 mb-5">
              {editingUser.full_name || editingUser.email}
            </p>
            <div className="space-y-2 mb-6">
              {(['adherent', 'coach', 'admin'] as Role[]).map(role => (
                <button
                  key={role}
                  onClick={() => updateRole(editingUser.id, role)}
                  disabled={loadingId === editingUser.id}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all',
                    editingUser.role === role
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  )}
                >
                  {loadingId === editingUser.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <RoleIcon role={role} />
                  }
                  {ROLE_LABELS[role]}
                  {editingUser.role === role && (
                    <CheckCircle className="w-4 h-4 ml-auto text-primary-600" />
                  )}
                </button>
              ))}
            </div>
            <button onClick={() => setEditingUser(null)} className="btn-secondary w-full">
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
