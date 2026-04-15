import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Recherche un matricule DES à partir du nom + prénom
export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName } = await request.json()

    if (!firstName || !lastName) {
      return NextResponse.json({ matricule: null })
    }

    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('des_registry')
      .select('matricule')
      .ilike('first_name', firstName.trim())
      .ilike('last_name', lastName.trim())
      .eq('is_active', true)
      .limit(1)

    if (data && data.length > 0) {
      return NextResponse.json({ matricule: data[0].matricule })
    }

    return NextResponse.json({ matricule: null })
  } catch {
    return NextResponse.json({ matricule: null })
  }
}
