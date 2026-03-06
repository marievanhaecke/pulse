import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  // Admin can update anyone, users can update themselves (limited fields)
  if (profile?.role !== 'admin' && user.id !== params.id) {
    return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
  }

  const body = await req.json()

  // Non-admins cannot change role
  if (profile?.role !== 'admin') {
    delete body.role
    delete body.is_active
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
