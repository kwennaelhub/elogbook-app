/**
 * Setup script — Hospital Logos
 *
 * 1. Ajoute la colonne logo_url à la table hospitals (si elle n'existe pas)
 * 2. Crée le bucket 'hospital-logos' dans Supabase Storage (s'il n'existe pas)
 *
 * Usage: node scripts/setup-hospital-logos.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Lire les variables depuis .env.local
const envPath = resolve(process.cwd(), '.env.local')
let envContent
try {
  envContent = readFileSync(envPath, 'utf-8')
} catch {
  // Fallback sur .vercel/.env.production.local
  const vercelPath = resolve(process.cwd(), '.vercel', '.env.production.local')
  envContent = readFileSync(vercelPath, 'utf-8')
}

function getEnv(key) {
  const match = envContent.match(new RegExp(`^${key}=["']?(.+?)["']?$`, 'm'))
  return match?.[1] || process.env[key]
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Variables NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  console.log('=== Setup Hospital Logos ===\n')

  // 1. Ajouter la colonne logo_url
  console.log('1. Ajout colonne logo_url...')
  let alterError = null
  try {
    const result = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS logo_url text DEFAULT NULL;`
    })
    alterError = result.error
  } catch {
    alterError = { message: 'RPC exec_sql non disponible' }
  }

  if (alterError) {
    // Fallback: essayer directement via REST
    console.log('   RPC non disponible, tentative directe...')
    const { data: testData, error: testError } = await supabase
      .from('hospitals')
      .select('logo_url')
      .limit(1)

    if (testError && testError.message.includes('logo_url')) {
      console.log('   ⚠️  La colonne logo_url doit être ajoutée manuellement dans Supabase Dashboard :')
      console.log('   SQL: ALTER TABLE hospitals ADD COLUMN logo_url text DEFAULT NULL;')
    } else {
      console.log('   ✅ Colonne logo_url déjà présente')
    }
  } else {
    console.log('   ✅ Colonne logo_url ajoutée')
  }

  // 2. Créer le bucket hospital-logos
  console.log('\n2. Création bucket hospital-logos...')
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.name === 'hospital-logos')

  if (exists) {
    console.log('   ✅ Bucket hospital-logos existe déjà')
  } else {
    const { error: bucketError } = await supabase.storage.createBucket('hospital-logos', {
      public: true,
      fileSizeLimit: 2 * 1024 * 1024, // 2MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    })
    if (bucketError) {
      console.error('   ❌ Erreur création bucket:', bucketError.message)
    } else {
      console.log('   ✅ Bucket hospital-logos créé (public, max 2MB)')
    }
  }

  console.log('\n=== Setup terminé ===')
}

main().catch(console.error)
