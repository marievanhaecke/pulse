'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { COURSE_COLORS } from '@/lib/utils'
import type { Profile } from '@/types/database'

interface Props {
  coaches: Pick<Profile, 'id' | 'full_name' | 'role'>[]
  onClose: () => void
  onRefresh: () => void
  initialDate?: string
}

export default function SessionFormModal({ coaches, onClose, onRefresh, initialDate }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(initialDate || today)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [color, setColor] = useState(COURSE_COLORS[0])
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  function toggleCoach(id: string) {
    setSelectedCoaches(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (startTime >= endTime) {
      toast.error('L\'heure de fin doit être après l\'heure de début')
      return
    }

    setLoading(true)
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        date,
        start_time: startTime,
        end_time: endTime,
        location: location || null,
        notes: notes || null,
        color,
        coach_ids: selectedCoaches,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Erreur lors de la création')
    } else {
      toast.success('Séance créée !')
      onRefresh()
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-900">Nouvelle séance</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Titre */}
          <div>
            <label className="label block mb-1.5">Titre de la séance *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="Ex: Yoga, CrossFit, Pilates..."
              className="input"
            />
          </div>

          {/* Date + Horaires */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1">
              <label className="label block mb-1.5">Date *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="input"
              />
            </div>
            <div>
              <label className="label block mb-1.5">Début *</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
                className="input"
              />
            </div>
            <div>
              <label className="label block mb-1.5">Fin *</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                required
                className="input"
              />
            </div>
          </div>

          {/* Lieu */}
          <div>
            <label className="label block mb-1.5">Lieu</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Salle principale, Gymnase..."
              className="input"
            />
          </div>

          {/* Couleur */}
          <div>
            <label className="label block mb-2">Couleur</label>
            <div className="flex flex-wrap gap-2">
              {COURSE_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110 ring-offset-2"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Coachs */}
          {coaches.length > 0 && (
            <div>
              <label className="label block mb-2">Coach(s) assigné(s)</label>
              <div className="flex flex-wrap gap-2">
                {coaches.map(coach => (
                  <button
                    key={coach.id}
                    type="button"
                    onClick={() => toggleCoach(coach.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      selectedCoaches.includes(coach.id)
                        ? 'bg-primary-100 text-primary-700 border-primary-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {coach.full_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label block mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Informations complémentaires..."
              className="input resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer la séance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
