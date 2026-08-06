'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, X, Loader2 } from 'lucide-react'
import { searchUsers, type UserSearchResult } from '@/lib/actions/messages'

export function NewMessageButton() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [isSearching, startSearch] = useTransition()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce recherche 300ms. Le clear des résultats quand query est trop
  // courte passe aussi par startSearch pour respecter la règle Next.js 16
  // "setState synchronously in effect".
  useEffect(() => {
    if (!open) return
    if (query.trim().length < 2) {
      startSearch(() => setResults([]))
      return
    }
    const t = setTimeout(() => {
      startSearch(async () => {
        const found = await searchUsers(query)
        setResults(found)
      })
    }, 300)
    return () => clearTimeout(t)
  }, [query, open])

  // Focus auto sur input à l'ouverture
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const handlePick = (userId: string) => {
    setOpen(false)
    setQuery('')
    setResults([])
    router.push(`/messages/${userId}`)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary/90"
      >
        <Plus className="h-3.5 w-3.5" />
        Nouveau
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-card shadow-2xl">
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom, prénom, matricule ou email…"
                className="flex-1 border-0 bg-transparent p-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
              />
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto py-2">
              {isSearching && (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
              {!isSearching && query.trim().length >= 2 && results.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                  Aucun utilisateur trouvé pour « {query} »
                </p>
              )}
              {!isSearching && query.trim().length < 2 && (
                <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                  Tapez au moins 2 caractères pour rechercher
                </p>
              )}
              {results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handlePick(u.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary/50"
                >
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={u.avatar_url}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover ring-1 ring-primary/20"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {u.first_name?.charAt(0)}
                      {u.last_name?.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {u.last_name} {u.first_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.matricule || u.role}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
