import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'coach'].includes(profile?.role || '')) {
    return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
  }

  const body = await req.json()
  const { coach_ids, ...updateData } = body

  const { data, error } = await supabase
    .from('sessions')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update coaches if provided
  if (coach_ids !== undefined) {
    await supabase.from('session_coaches').delete().eq('session_id', params.id)
    if (coach_ids.length > 0) {
      await supabase.from('session_coaches').insert(
        coach_ids.map((id: string) => ({ session_id: params.id, coach_id: id }))
      )
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
  }

  const { error } = await supabase.from('sessions').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
