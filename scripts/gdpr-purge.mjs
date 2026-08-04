#!/usr/bin/env node
/**
 * Cron GDPR — purge quotidienne des comptes en sursis expirés + fichiers export > 7j.
 *
 * Exécuté par .github/workflows/gdpr-purge.yml.
 * Nécessite les env vars SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.
 *
 * Pattern FK RESTRICT :
 *   - auth.admin.deleteUser() est atomique côté Postgres. Si un DES a des
 *     entries.supervisor_id référencées, le DELETE échoue avec SQLSTATE 23503.
 *   - On catch cette erreur et on bascule sur anonymize_user_data() qui
 *     nettoie les PII mais garde les FKs valides (préserve la valeur
 *     académique des logbooks superviseurs).
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EXPORT_BUCKET = 'gdpr-exports'
const EXPORT_TTL_DAYS = 7

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const stats = {
  candidates: 0,
  deleted: 0,
  anonymized: 0,
  failed: 0,
  exports_purged: 0,
}

async function purgeExpiredAccounts() {
  const { data: pending, error } = await supabase.rpc('list_pending_deletions')
  if (error) {
    console.error('❌ list_pending_deletions RPC échoué :', error.message)
    throw error
  }

  stats.candidates = pending?.length ?? 0
  console.log(`📋 ${stats.candidates} comptes à purger`)

  for (const row of pending ?? []) {
    const { user_id: userId, email } = row
    console.log(`\n→ ${email} (${userId})`)

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)

    if (!deleteError) {
      stats.deleted += 1
      console.log('  ✅ Supprimé complètement')
      await auditLog(userId, 'gdpr_purge_completed', { mode: 'delete' })
      continue
    }

    const code = deleteError.code
    const msg = deleteError.message || ''
    const isFkRestrict = code === '23503' || msg.includes('foreign key') || msg.includes('violates')

    if (isFkRestrict) {
      console.log('  ⚠️  FK RESTRICT — bascule anonymisation')
      const { error: anonError } = await supabase.rpc('anonymize_user_data', { target_user_id: userId })
      if (anonError) {
        stats.failed += 1
        console.error(`  ❌ anonymize_user_data échoué : ${anonError.message}`)
        await auditLog(userId, 'gdpr_purge_failed', { mode: 'anonymize', error: anonError.message })
      } else {
        stats.anonymized += 1
        console.log('  ✅ Anonymisé')
        await auditLog(userId, 'gdpr_purge_completed', { mode: 'anonymize' })
      }
    } else {
      stats.failed += 1
      console.error(`  ❌ Suppression échouée : ${msg}`)
      await auditLog(userId, 'gdpr_purge_failed', { mode: 'delete', error: msg })
    }
  }
}

async function purgeOldExportFiles() {
  const cutoff = Date.now() - EXPORT_TTL_DAYS * 24 * 60 * 60 * 1000

  const { data: userDirs, error } = await supabase.storage.from(EXPORT_BUCKET).list('', { limit: 1000 })
  if (error) {
    console.error(`❌ list ${EXPORT_BUCKET} échoué :`, error.message)
    return
  }

  for (const dir of userDirs ?? []) {
    const { data: files } = await supabase.storage.from(EXPORT_BUCKET).list(dir.name, { limit: 1000 })
    for (const f of files ?? []) {
      const createdAt = f.created_at ? new Date(f.created_at).getTime() : 0
      if (createdAt && createdAt < cutoff) {
        const path = `${dir.name}/${f.name}`
        const { error: removeErr } = await supabase.storage.from(EXPORT_BUCKET).remove([path])
        if (!removeErr) {
          stats.exports_purged += 1
          console.log(`  🗑️  ${path}`)
        }
      }
    }
  }
}

async function auditLog(userId, action, payload) {
  try {
    await supabase.from('audit_log').insert({
      user_id: null,
      action,
      table_name: 'profiles',
      record_id: userId,
      new_data: payload,
    })
  } catch {
    // best-effort
  }
}

async function main() {
  console.log(`🧹 GDPR purge — ${new Date().toISOString()}\n`)
  await purgeExpiredAccounts()
  console.log(`\n🗑️  Purge fichiers export > ${EXPORT_TTL_DAYS}j`)
  await purgeOldExportFiles()

  console.log('\n📊 Résumé :')
  console.log(`   Candidats           : ${stats.candidates}`)
  console.log(`   Supprimés complets  : ${stats.deleted}`)
  console.log(`   Anonymisés (FK)     : ${stats.anonymized}`)
  console.log(`   Échecs              : ${stats.failed}`)
  console.log(`   Fichiers purgés     : ${stats.exports_purged}`)

  if (stats.failed > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('❌ Fatal :', err)
  process.exit(1)
})
