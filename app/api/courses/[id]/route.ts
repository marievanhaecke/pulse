import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, error: 'Non autorisé' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { supabase, user, error: 'Accès interdit' }
  return { supabase, user, error: null }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status: error === 'Non autorisé' ? 401 : 403 })

  const body = await req.json()
  const { data, err } = await supabase
    .from('courses').update(body).eq('id', params.id).select().single()
    .then(r => ({ data: r.data, err: r.error }))

  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status: error === 'Non autorisé' ? 401 : 403 })

  // Soft delete
  const { error: err } = await supabase
    .from('courses').update({ is_active: false }).eq('id', params.id)
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
