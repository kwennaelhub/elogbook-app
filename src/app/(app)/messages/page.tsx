import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getConversations, getSupportAdminId } from '@/lib/actions/messages'
import { NewMessageButton } from '@/components/messages/new-message-button'
import { SupportButton } from '@/components/messages/support-button'

export const dynamic = 'force-dynamic'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [conversations, supportUserId] = await Promise.all([
    getConversations(),
    getSupportAdminId(),
  ])

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Messagerie</h1>
        </div>
        <NewMessageButton />
      </header>

      {conversations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-foreground">Aucune conversation pour le moment.</p>
          <p className="mt-1 mb-5 text-xs text-muted-foreground">
            Cliquez sur <strong>+ Nouveau</strong> pour écrire à quelqu&apos;un, ou contactez directement le support technique.
          </p>
          <div className="flex justify-center">
            <SupportButton supportUserId={supportUserId} currentUserId={user.id} variant="primary" />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <Link
              key={c.other_user_id}
              href={`/messages/${c.other_user_id}`}
              className="flex items-start gap-3 rounded-xl bg-card p-4 shadow-sm ring-1 ring-border transition-all hover:bg-secondary/40 hover:shadow-md"
            >
              {c.other_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.other_avatar_url}
                  alt=""
                  className="h-11 w-11 flex-shrink-0 rounded-full object-cover ring-1 ring-primary/20"
                />
              ) : (
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {c.other_first_name?.charAt(0)}
                  {c.other_last_name?.charAt(0)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {c.other_last_name} {c.other_first_name}
                  </p>
                  <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                    {formatRelative(c.last_message_at)}
                  </span>
                </div>
                <p
                  className={`mt-0.5 truncate text-xs ${
                    c.unread_count > 0 && !c.last_message_from_me
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {c.last_message_from_me && (
                    <span className="text-muted-foreground">Vous&nbsp;: </span>
                  )}
                  {c.last_message_body}
                </p>
              </div>

              {c.unread_count > 0 && !c.last_message_from_me && (
                <div className="flex-shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {c.unread_count}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function formatRelative(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `il y a ${diffD} j`
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
}
