import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getConversation, markConversationAsRead } from '@/lib/actions/messages'
import { ConversationView } from '@/components/messages/conversation-view'

export const dynamic = 'force-dynamic'

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: other } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, avatar_url, role')
    .eq('id', userId)
    .maybeSingle()

  if (!other) notFound()

  const messages = await getConversation(userId)

  // Marquer comme lu au chargement de la page (best-effort, silencieux)
  await markConversationAsRead(userId)

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-2xl flex-col px-4 py-4">
      <header className="mb-3 flex items-center gap-3 border-b border-border/60 pb-3">
        <Link
          href="/messages"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary"
          aria-label="Retour"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        {other.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={other.avatar_url}
            alt=""
            className="h-9 w-9 rounded-full object-cover ring-1 ring-primary/20"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {other.first_name?.charAt(0)}
            {other.last_name?.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {other.last_name} {other.first_name}
          </p>
          <p className="text-xs text-muted-foreground capitalize">{other.role}</p>
        </div>
      </header>

      <ConversationView
        currentUserId={user.id}
        otherUserId={other.id}
        initialMessages={messages}
      />
    </div>
  )
}
