'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { Send } from 'lucide-react'
import { sendMessage, getConversation, type MessageActionState } from '@/lib/actions/messages'
import type { Message } from '@/types/database'

const POLL_INTERVAL_MS = 30_000

interface Props {
  currentUserId: string
  otherUserId: string
  initialMessages: Message[]
}

export function ConversationView({ currentUserId, otherUserId, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [body, setBody] = useState('')
  const [state, action, isPending] = useActionState<MessageActionState, FormData>(sendMessage, {})
  const [, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Scroll auto en bas au chargement + à chaque nouveau message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  // Reset input + refresh messages après envoi réussi.
  // startTransition évite le lint "setState synchronously in effect"
  // (nouvelle règle stricte Next.js 16).
  useEffect(() => {
    if (!state.success) return
    startTransition(async () => {
      setBody('')
      formRef.current?.reset()
      const fresh = await getConversation(otherUserId)
      setMessages(fresh)
    })
  }, [state.success, otherUserId])

  // Polling toutes les 30s pour rafraîchir la conversation
  useEffect(() => {
    const iv = setInterval(() => {
      startTransition(async () => {
        const fresh = await getConversation(otherUserId)
        setMessages(fresh)
      })
    }, POLL_INTERVAL_MS)
    return () => clearInterval(iv)
  }, [otherUserId])

  return (
    <>
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto py-2">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-muted-foreground">
              Aucun message. Écrivez le premier ci-dessous.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const fromMe = m.sender_id === currentUserId
            return (
              <div key={m.id} className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    fromMe
                      ? 'rounded-br-sm bg-primary text-primary-foreground'
                      : 'rounded-bl-sm bg-secondary text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      fromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {new Intl.DateTimeFormat('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(m.created_at))}
                    {fromMe && m.read_at && ' · Lu'}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <form
        ref={formRef}
        action={action}
        className="mt-2 flex items-end gap-2 border-t border-border/60 pt-3"
      >
        <input type="hidden" name="recipientId" value={otherUserId} />
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            // Cmd/Ctrl+Enter = submit
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              formRef.current?.requestSubmit()
            }
          }}
          rows={2}
          maxLength={5000}
          required
          placeholder="Écrivez votre message… (Cmd+↩ pour envoyer)"
          className="input-field flex-1 resize-none py-2"
        />
        <button
          type="submit"
          disabled={isPending || !body.trim()}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          aria-label="Envoyer"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      {state.error && (
        <p className="mt-1 text-xs text-destructive">{state.error}</p>
      )}
    </>
  )
}
