import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { uploadLogger as log } from '@/lib/logger'

export async function POST(request: NextRequest) {
  // Vérifier l'auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Vérifier que l'utilisateur est admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File
  const hospitalId = formData.get('hospitalId') as string

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
  }

  if (!hospitalId) {
    return NextResponse.json({ error: 'ID hôpital manquant' }, { status: 400 })
  }

  // Vérifier le type (images uniquement)
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 400 })
  }

  // Vérifier la taille (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'Le fichier ne doit pas dépasser 2 Mo' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'png'
  const fileName = `${hospitalId}/logo.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  // Upload via service client (contourne RLS)
  const serviceClient = await createServiceClient()
  const { error: uploadError } = await serviceClient.storage
    .from('hospital-logos')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    log.error({ err: uploadError, hospitalId, userId: user.id }, 'Erreur upload logo hôpital')
    return NextResponse.json({ error: 'Erreur upload : ' + uploadError.message }, { status: 500 })
  }

  // Récupérer l'URL publique
  const { data: urlData } = serviceClient.storage
    .from('hospital-logos')
    .getPublicUrl(fileName)

  // Mettre à jour la table hospitals
  const { error: updateError } = await serviceClient
    .from('hospitals')
    .update({ logo_url: urlData.publicUrl })
    .eq('id', hospitalId)

  if (updateError) {
    log.error({ err: updateError, hospitalId }, 'Erreur mise à jour logo_url')
    return NextResponse.json({ error: 'Erreur mise à jour : ' + updateError.message }, { status: 500 })
  }

  return NextResponse.json({ url: urlData.publicUrl })
}
