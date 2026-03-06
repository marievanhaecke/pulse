'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, RefreshCw, Clock, MapPin, Loader2, X } from 'lucide-react'
import { COURSE_COLORS, DAYS_FR, cn } from '@/lib/utils'
import type { Course } from '@/types/database'
import { toast } from 'sonner'

interface Props { courses: Course[] }

const EMPTY_FORM = {
  name: '', description: '', location: '', duration_minutes: 60,
  day_of_week: '', time_of_day: '', is_recurring: true, color: COURSE_COLORS[0],
}

export default function CoursesClient({ courses: initial }: Props) {
  const [courses, setCourses] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [genWeeks, setGenWeeks] = useState(4)

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(course: Course) {
    setEditing(course)
    setForm({
      name: course.name,
      description: course.description || '',
      location: course.location || '',
      duration_minutes: course.duration_minutes,
      day_of_week: course.day_of_week?.toString() || '',
      time_of_day: course.time_of_day?.slice(0, 5) || '',
      is_recurring: course.is_recurring,
      color: course.color,
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payload = {
      name: form.name,
      description: form.description || null,
      location: form.location || null,
      duration_minutes: form.duration_minutes,
      day_of_week: form.day_of_week !== '' ? parseInt(form.day_of_week) : null,
      time_of_day: form.time_of_day || null,
      is_recurring: form.is_recurring,
      color: form.color,
    }

    const url = editing ? `/api/courses/${editing.id}` : '/api/courses'
    const method = editing ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || 'Erreur')
    } else {
      toast.success(editing ? 'Cours mis à jour' : 'Cours créé')
      if (editing) {
        setCourses(prev => prev.map(c => c.id === editing.id ? { ...c, ...data } : c))
      } else {
        setCourses(prev => [data, ...prev])
      }
      setShowForm(false)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce cours et toutes ses séances futures ?')) return
    const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCourses(prev => prev.filter(c => c.id !== id))
      toast.success('Cours supprimé')
    } else {
      toast.error('Erreur lors de la suppression')
    }
  }

  async function generateSessions(courseId: string) {
    setGenerating(courseId)
    const res = await fetch(`/api/courses/${courseId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weeks: genWeeks }),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success(`${data.count} séance(s) générée(s)`)
    } else {
      toast.error(data.error || 'Erreur lors de la génération')
    }
    setGenerating(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Cours</h1>
          <p className="text-slate-500 mt-1">{courses.length} cours configuré(s)</p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus className="w-4 h-4" /> Nouveau cours
        </button>
      </div>

      {/* Generate controls */}
      <div className="card-padding flex items-center gap-4 bg-primary-50 border-primary-100">
        <RefreshCw className="w-5 h-5 text-primary-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-primary-900 text-sm">Générer des séances récurrentes</p>
          <p className="text-xs text-primary-700 mt-0.5">
            Génère automatiquement les séances pour les prochaines semaines
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={genWeeks}
            onChange={e => setGenWeeks(parseInt(e.target.value))}
            className="input w-32 text-sm"
          >
            {[2, 4, 8, 12].map(w => (
              <option key={w} value={w}>{w} semaines</option>
            ))}
          </select>
        </div>
      </div>

      {/* Courses grid */}
      {courses.length === 0 ? (
        <div className="card-padding text-center py-16">
          <p className="text-slate-400">Aucun cours configuré. Créez votre premier cours !</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(course => (
            <div key={course.id} className="card overflow-hidden">
              <div className="h-2" style={{ backgroundColor: course.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{course.name}</h3>
                    {course.description && (
                      <p className="text-sm text-slate-500 mt-0.5">{course.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(course)} className="btn-ghost btn-sm p-1.5">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(course.id)} className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {course.duration_minutes && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      {course.duration_minutes} min
                    </div>
                  )}
                  {course.location && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5" />
                      {course.location}
                    </div>
                  )}
                  {course.is_recurring && course.day_of_week != null && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <RefreshCw className="w-3.5 h-3.5" />
                      {DAYS_FR[course.day_of_week]}
                      {course.time_of_day && ` à ${course.time_of_day.slice(0, 5)}`}
                    </div>
                  )}
                </div>

                {course.is_recurring && (
                  <button
                    onClick={() => generateSessions(course.id)}
                    disabled={generating === course.id}
                    className="btn-secondary btn-sm w-full mt-4"
                  >
                    {generating === course.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <RefreshCw className="w-3.5 h-3.5" />
                    }
                    Générer {genWeeks} semaines
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-900">
                {editing ? 'Modifier le cours' : 'Nouveau cours'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="label block mb-1.5">Nom du cours *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required placeholder="Yoga, CrossFit..." className="input" />
              </div>

              <div>
                <label className="label block mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Description courte..." className="input resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label block mb-1.5">Lieu</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Salle 1..." className="input" />
                </div>
                <div>
                  <label className="label block mb-1.5">Durée (min)</label>
                  <input type="number" value={form.duration_minutes}
                    onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) }))}
                    min={15} step={15} className="input" />
                </div>
              </div>

              <div className="flex items-center gap-3 py-1">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={form.is_recurring}
                  onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-primary-600"
                />
                <label htmlFor="recurring" className="label">Cours récurrent (horaire fixe)</label>
              </div>

              {form.is_recurring && (
                <div className="grid grid-cols-2 gap-3 pl-7">
                  <div>
                    <label className="label block mb-1.5">Jour</label>
                    <select value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}
                      className="input">
                      <option value="">-- Choisir --</option>
                      {DAYS_FR.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label block mb-1.5">Heure</label>
                    <input type="time" value={form.time_of_day}
                      onChange={e => setForm(f => ({ ...f, time_of_day: e.target.value }))}
                      className="input" />
                  </div>
                </div>
              )}

              <div>
                <label className="label block mb-2">Couleur</label>
                <div className="flex flex-wrap gap-2">
                  {COURSE_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-full hover:scale-110 transition-transform"
                      style={{ backgroundColor: c, outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
