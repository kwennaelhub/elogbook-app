'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { messagesLogger as log } from '@/lib/logger'
import type { ConversationSummary, Message } from '@/types/database'

// ============================================================================
// Validations
// ============================================================================

const sendMessageSchema = z.object({
  recipientId: z.string().uuid('Destinataire invalide'),
  body: z.string().trim().min(1, 'Le message ne peut pas être vide').max(5000, 'Message trop long (max 5000 caractères)'),
})

const searchUsersSchema = z.object({
  query: z.string().trim().min(2, 'Tapez au moins 2 caractères'),
})

// ============================================================================
// Types
// ============================================================================

export type MessageActionState = {
  error?: string
  success?: boolean
}

export type UserSearchResult = {
  id: string
  first_name: string
  last_name: string
  role: string
  matricule: string | null
  avatar_url: string | null
}

// ============================================================================
// Lister les conversations de l'user courant
// ============================================================================

export async function getConversations(): Promise<ConversationSummary[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase.rpc('list_conversations')
  if (error) {
    log.error({ err: error.message, userId: user.id }, 'list_conversations RPC échoué')
    return []
  }

  return (data ?? []) as ConversationSummary[]
}

// ============================================================================
// Charger la conversation avec un correspondant
// ============================================================================

export async function getConversation(otherUserId: string): Promise<Message[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // RLS s'occupe de vérifier que le user a le droit de voir ces messages.
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`,
    )
    .order('created_at', { ascending: true })
    .limit(500)

  if (error) {
    log.error({ err: error.message, userId: user.id, otherUserId }, 'getConversation échoué')
    return []
  }

  return (data ?? []) as Message[]
}

// ============================================================================
// Compter les messages non-lus (pour badge header)
// ============================================================================

export async function getUnreadMessagesCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { data, error } = await supabase.rpc('get_unread_messages_count')
  if (error) {
    log.warn({ err: error.message, userId: user.id }, 'get_unread_messages_count RPC échoué')
    return 0
  }
  return (data as number) ?? 0
}

// ============================================================================
// Envoyer un message
// ============================================================================

export async function sendMessage(
  _prev: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  const raw = Object.fromEntries(formData)
  const parsed = sendMessageSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  if (parsed.data.recipientId === user.id) {
    return { error: 'Vous ne pouvez pas vous envoyer un message à vous-même.' }
  }

  const { data: inserted, error } = await supabase
    .from('messages')
    .insert({
      sender_id: user.id,
      recipient_id: parsed.data.recipientId,
      body: parsed.data.body,
    })
    .select('id')
    .single()

  if (error) {
    log.error(
      { err: error.message, userId: user.id, recipientId: parsed.data.recipientId },
      'insert message échoué',
    )
    return { error: 'messages.error.sendFailed' }
  }

  revalidatePath('/messages')
  revalidatePath(`/messages/${parsed.data.recipientId}`)

  // Notification email best-effort si destinataire offline (> 15 min sans activité).
  // Async volontairement — on ne bloque pas la réponse sur Brevo.
  void notifyRecipientIfOffline({
    messageId: inserted!.id,
    senderId: user.id,
    recipientId: parsed.data.recipientId,
    bodyPreview: parsed.data.body,
  }).catch((err) => {
    log.warn({ err: (err as Error).message }, 'notifyRecipientIfOffline non-bloquant échoué')
  })

  return { success: true }
}

// ============================================================================
// Marquer une conversation comme lue
// ============================================================================

export async function markConversationAsRead(otherUserId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', otherUserId)
    .eq('recipient_id', user.id)
    .is('read_at', null)

  if (error) {
    log.warn({ err: error.message, userId: user.id, otherUserId }, 'markConversationAsRead échoué')
    return
  }

  revalidatePath('/messages')
  revalidatePath(`/messages/${otherUserId}`)
}

// ============================================================================
// Recherche user pour destinataire (autocomplete)
// ============================================================================

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const parsed = searchUsersSchema.safeParse({ query })
  if (!parsed.success) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const q = `%${parsed.data.query}%`

  // Recherche sur first_name, last_name, matricule, email. RLS filtre déjà
  // sur home_hospital (voir migration 6) — un student ne voit que son hôpital.
  // On exclut le user courant + les comptes anonymisés (deleted_*).
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role, matricule, avatar_url, email')
    .or(`first_name.ilike.${q},last_name.ilike.${q},matricule.ilike.${q},email.ilike.${q}`)
    .neq('id', user.id)
    .eq('is_active', true)
    .not('email', 'like', 'deleted_%@deleted.local')
    .limit(10)

  if (error) {
    log.warn({ err: error.message, userId: user.id }, 'searchUsers échoué')
    return []
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    role: p.role,
    matricule: p.matricule,
    avatar_url: p.avatar_url,
  }))
}

// ============================================================================
// Récupère l'ID admin support pour raccourci "Contacter le support"
// ============================================================================
// Priorité : env var SUPPORT_ADMIN_USER_ID (permet de désigner explicitement
// qui reçoit les demandes support). Fallback : premier user role=superadmin
// puis developer, actif, le plus ancien. Retourne null si personne trouvé
// (l'appel côté client masque alors le bouton).

export async function getSupportAdminId(): Promise<string | null> {
  const explicit = process.env.SUPPORT_ADMIN_USER_ID
  if (explicit) return explicit

  const serviceClient = await createServiceClient()
  const { data } = await serviceClient
    .from('profiles')
    .select('id')
    .in('role', ['superadmin', 'developer'])
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return data?.id ?? null
}

// ============================================================================
// Notification email best-effort
// ============================================================================

const OFFLINE_THRESHOLD_MS = 15 * 60 * 1000 // 15 min

async function notifyRecipientIfOffline(opts: {
  messageId: string
  senderId: string
  recipientId: string
  bodyPreview: string
}) {
  const brevoApiKey = process.env.BREVO_API_KEY
  if (!brevoApiKey) return

  const serviceClient = await createServiceClient()

  // 1. Le recipient a-t-il une session active récente ?
  const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD_MS).toISOString()
  const { count: activeSessionsCount } = await serviceClient
    .from('active_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', opts.recipientId)
    .gte('last_active', cutoff)

  if ((activeSessionsCount ?? 0) > 0) {
    // Recipient online (< 15 min) — pas besoin d'email, le badge suffira
    return
  }

  // 2. Récupérer les infos du recipient + sender pour l'email
  const [{ data: recipient }, { data: sender }] = await Promise.all([
    serviceClient.from('profiles').select('email, first_name, last_name').eq('id', opts.recipientId).maybeSingle(),
    serviceClient.from('profiles').select('first_name, last_name').eq('id', opts.senderId).maybeSingle(),
  ])

  if (!recipient?.email || !sender) return

  const senderFullName = `${sender.first_name ?? ''} ${sender.last_name ?? ''}`.trim() || 'Un membre InternLog'
  const preview =
    opts.bodyPreview.length > 120 ? opts.bodyPreview.slice(0, 120) + '…' : opts.bodyPreview

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': brevoApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'InternLog', email: process.env.BREVO_SENDER_EMAIL || 'noreply@internlog.app' },
      to: [{ email: recipient.email, name: recipient.first_name ?? '' }],
      subject: `${senderFullName} vous a envoyé un message sur InternLog`,
      htmlContent: `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f1f5f9; }
  .container { max-width: 560px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
  .header { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 24px; text-align: center; }
  .header h1 { color: #10b981; font-size: 22px; margin: 0; }
  .header p { color: #94a3b8; font-size: 13px; margin-top: 4px; }
  .body { padding: 28px 24px; }
  .body h2 { color: #0f172a; font-size: 18px; margin: 0 0 12px; }
  .body p { color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 12px; }
  .preview { background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 8px; padding: 14px 16px; margin: 16px 0; font-style: italic; color: #0c4a6e; }
  .cta { display: inline-block; background: #10b981; color: white !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 8px; }
  .footer { padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; }
  .footer p { color: #94a3b8; font-size: 11px; margin: 0; }
</style></head><body>
<div class="container">
  <div class="header">
    <h1>InternLog</h1>
    <p>Nouveau message</p>
  </div>
  <div class="body">
    <h2>${senderFullName}</h2>
    <p>Vous avez reçu un nouveau message :</p>
    <div class="preview">« ${preview.replace(/</g, '&lt;')} »</div>
    <p style="text-align:center;margin-top:24px;">
      <a href="https://internlog.app/messages/${opts.senderId}" class="cta">Répondre dans l'app</a>
    </p>
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:16px;">
      Vous recevez cet email parce que vous n'étiez pas connecté à InternLog dans les 15 dernières minutes.
    </p>
  </div>
  <div class="footer"><p>InternLog — Messagerie interne</p></div>
</div></body></html>`,
    }),
  }).catch((err) => {
    log.warn({ err, messageId: opts.messageId }, 'Envoi email notif message échoué')
  })
}
