import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CoursesClient from './courses-client'
import type { Course } from '@/types/database'

export default async function AdminCoursesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/tableau-de-bord')

  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false })

  return <CoursesClient courses={(courses || []) as Course[]} />
}
