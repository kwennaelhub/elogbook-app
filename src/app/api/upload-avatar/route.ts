import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { uploadLogger as log } from '@/lib/logger'

export async function POST(request: NextRequest) {
  // Vérifier l'auth via le client session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'error.unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
  }

  // Vérifier le type
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'upload.error.notImage' }, { status: 400 })
  }

  // Vérifier la taille (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'upload.error.tooLarge' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${user.id}/avatar.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  // Upload via service client (contourne RLS — auth déjà vérifiée ci-dessus)
  const serviceClient = await createServiceClient()
  const { error: uploadError } = await serviceClient.storage
    .from('avatars')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    log.error({ err: uploadError, userId: user.id }, 'Erreur upload avatar')
    return NextResponse.json({ error: 'Erreur upload : ' + uploadError.message }, { status: 500 })
  }

  // Récupérer l'URL publique
  const { data: urlData } = serviceClient.storage
    .from('avatars')
    .getPublicUrl(fileName)

  // Mettre à jour le profil (via service client pour fiabilité)
  await serviceClient
    .from('profiles')
    .update({ avatar_url: urlData.publicUrl })
    .eq('id', user.id)

  return NextResponse.json({ url: urlData.publicUrl })
}
