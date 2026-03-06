import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addDays, format, startOfWeek, nextDay } from 'date-fns'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

  const { weeks = 4 } = await req.json()

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!course) return NextResponse.json({ error: 'Cours introuvable' }, { status: 404 })
  if (!course.is_recurring || course.day_of_week == null || !course.time_of_day) {
    return NextResponse.json({ error: 'Ce cours n\'a pas d\'horaire récurrent configuré' }, { status: 400 })
  }

  const today = new Date()
  const endDate = addDays(today, weeks * 7)

  // Calcule les dates de la semaine courante → endDate pour le jour spécifié
  const sessions: {
    course_id: string
    title: string
    location: string | null
    date: string
    start_time: string
    end_time: string
    color: string
    status: string
  }[] = []

  // day_of_week: 0=dim, 1=lun, ..., 6=sam (correspond à getDay())
  let current = new Date(today)

  // Trouve le prochain occurrence du jour de la semaine
  while (current.getDay() !== course.day_of_week) {
    current = addDays(current, 1)
  }

  // Calcule l'heure de fin basée sur la durée
  const [hours, minutes] = course.time_of_day.split(':').map(Number)
  const endHours = Math.floor((hours * 60 + minutes + course.duration_minutes) / 60)
  const endMinutes = (hours * 60 + minutes + course.duration_minutes) % 60
  const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`

  while (current <= endDate) {
    const dateStr = format(current, 'yyyy-MM-dd')

    // Vérifie si une séance existe déjà
    const { data: existing } = await supabase
      .from('sessions')
      .select('id')
      .eq('course_id', params.id)
      .eq('date', dateStr)
      .limit(1)

    if (!existing || existing.length === 0) {
      sessions.push({
        course_id: params.id,
        title: course.name,
        location: course.location,
        date: dateStr,
        start_time: course.time_of_day.slice(0, 5),
        end_time: endTime,
        color: course.color,
        status: 'scheduled',
      })
    }

    current = addDays(current, 7)
  }

  if (sessions.length === 0) {
    return NextResponse.json({ count: 0, message: 'Toutes les séances existent déjà' })
  }

  const { data: created, error } = await supabase
    .from('sessions')
    .insert(sessions)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ count: created?.length || 0 })
}
