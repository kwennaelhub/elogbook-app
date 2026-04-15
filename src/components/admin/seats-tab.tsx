'use client'

import { useState, useTransition } from 'react'
import { Building2, UserPlus, X, Search, Loader2, UserMinus, Users } from 'lucide-react'
import { assignSeat, removeSeatAssignment, getSeatAssignments, searchUsersForSeat } from '@/lib/actions/admin'
import type { UserRole, DesLevel } from '@/types/database'
import { useI18n } from '@/lib/i18n/context'

interface InstitutionalSeatRow {
  id: string
  subscription_id: string
  hospital_id: string | null
  max_seats: number
  used_seats: number
  created_at: string
  subscription?: { id: string; plan: string; status: string; user_id: string; institution_id: string | null } | null
  hospital?: { id: string; name: string } | null
}

interface AssignmentRow {
  id: string
  institutional_seat_id: string
  user_id: string
  assigned_at: string
  is_active: boolean
  user?: { id: string; first_name: string; last_name: string; email: string; role: string; title: string | null; des_level: string | null } | null
  assigned_by_user?: { first_name: string; last_name: string } | null
}

interface UserResult {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  title: string | null
  des_level: string | null
}

interface Props {
  initialSeats: InstitutionalSeatRow[]
}

export function SeatsTab({ initialSeats }: Props) {
  const { t } = useI18n()
  const seats = initialSeats
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserResult[]>([])
  const [isPending, startTransition] = useTransition()
  const [loadingAssign, setLoadingAssign] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function loadAssignments(seatId: string) {
    setSelectedSeat(seatId)
    setFeedback(null)
    startTransition(async () => {
      const data = await getSeatAssignments(seatId)
      setAssignments(data)
    })
  }

  function handleSearch() {
    if (!searchQuery.trim()) return
    startTransition(async () => {
      const results = await searchUsersForSeat(searchQuery)
      setSearchResults(results)
    })
  }

  function handleAssign(userId: string) {
    if (!selectedSeat) return
    setLoadingAssign(userId)
    setFeedback(null)
    startTransition(async () => {
      const result = await assignSeat(selectedSeat, userId)
      if (result.error) {
        setFeedback({ type: 'error', message: result.error })
      } else {
        setFeedback({ type: 'success', message: t('seats.userAssigned') })
        setShowSearch(false)
        setSearchQuery('')
        setSearchResults([])
        // Recharger les assignations
        const data = await getSeatAssignments(selectedSeat)
        setAssignments(data)
      }
      setLoadingAssign(null)
    })
  }

  function handleRemove(assignmentId: string) {
    if (!selectedSeat) return
    setFeedback(null)
    startTransition(async () => {
      const result = await removeSeatAssignment(assignmentId, selectedSeat)
      if (result.error) {
        setFeedback({ type: 'error', message: result.error })
      } else {
        setFeedback({ type: 'success', message: t('seats.userRemoved') })
        const data = await getSeatAssignments(selectedSeat)
        setAssignments(data)
      }
    })
  }

  const selectedSeatData = seats.find(s => s.id === selectedSeat)

  if (seats.length === 0) {
    return (
      <div className="rounded-xl bg-card p-8 text-center shadow-sm border border-border/60">
        <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">{t('seats.noInstitutional')}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('seats.hint')}
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Feedback */}
      {feedback && (
        <div className={`mb-3 rounded-lg p-2.5 text-xs ${
          feedback.type === 'success' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Liste des sièges institutionnels */}
      <div className="space-y-3">
        {seats.map((seat) => {
          const isSelected = selectedSeat === seat.id
          const pct = seat.max_seats > 0 ? Math.round((seat.used_seats / seat.max_seats) * 100) : 0

          return (
            <div key={seat.id} className="rounded-xl bg-card shadow-sm border border-border/60">
              <button
                type="button"
                onClick={() => isSelected ? setSelectedSeat(null) : loadAssignments(seat.id)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15">
                  <Building2 className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {seat.hospital?.name || t('seats.hospitalUndefined')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('seats.seatsOccupied', { used: seat.used_seats, max: seat.max_seats })}
                    {seat.subscription?.status && (
                      <span className={`ml-2 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        seat.subscription.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {seat.subscription.status === 'active' ? t('admin.active') : seat.subscription.status}
                      </span>
                    )}
                  </p>
                </div>
                {/* Barre de progression */}
                <div className="w-20">
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 90 ? 'bg-destructive/100' : pct >= 70 ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-center text-[10px] text-muted-foreground">{pct}%</p>
                </div>
              </button>

              {/* Détail des assignations */}
              {isSelected && (
                <div className="border-t border-border/60 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-foreground">
                      <Users className="mr-1 inline h-3.5 w-3.5" />
                      {t('seats.assigned')} ({assignments.length})
                    </h4>
                    <button
                      onClick={() => { setShowSearch(!showSearch); setSearchResults([]); setSearchQuery('') }}
                      className="flex items-center gap-1 rounded-lg bg-indigo-500 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-indigo-500/90"
                    >
                      {showSearch ? <X className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                      {showSearch ? t('seats.close') : t('seats.add')}
                    </button>
                  </div>

                  {/* Recherche d'utilisateur */}
                  {showSearch && (
                    <div className="mb-3 space-y-2 rounded-lg bg-secondary/50 p-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                          <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder={t('seats.searchPlaceholder')}
                            className="w-full rounded-lg border border-border bg-card py-2 pl-8 pr-3 text-xs text-foreground focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                          />
                        </div>
                        <button
                          onClick={handleSearch}
                          disabled={isPending}
                          className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500/90 disabled:opacity-50"
                        >
                          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('seats.search')}
                        </button>
                      </div>

                      {searchResults.length > 0 && (
                        <div className="max-h-40 space-y-1 overflow-y-auto">
                          {searchResults.map((u) => (
                            <div key={u.id} className="flex items-center justify-between rounded-lg bg-card p-2 text-xs">
                              <div>
                                <p className="font-medium text-foreground">{u.first_name} {u.last_name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {u.email} · {t('userRole.' + u.role)}
                                  {u.des_level && ` · ${t('des.' + u.des_level)}`}
                                </p>
                              </div>
                              <button
                                onClick={() => handleAssign(u.id)}
                                disabled={loadingAssign === u.id}
                                className="rounded bg-indigo-500/15 px-2 py-1 text-[10px] font-semibold text-indigo-400 hover:bg-indigo-500/25 disabled:opacity-50"
                              >
                                {loadingAssign === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : t('seats.assign')}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {searchResults.length === 0 && searchQuery && !isPending && (
                        <p className="text-center text-[10px] text-muted-foreground">{t('seats.noResults')}</p>
                      )}
                    </div>
                  )}

                  {/* Liste des assignations */}
                  {isPending && assignments.length === 0 ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : assignments.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground">{t('seats.noAssigned')}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {assignments.map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded-lg bg-secondary/50 p-2.5">
                          <div>
                            <p className="text-xs font-medium text-foreground">
                              {a.user?.first_name} {a.user?.last_name}
                              {a.user?.title && (
                                <span className="ml-1 text-[10px] text-muted-foreground">({a.user.title})</span>
                              )}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {a.user?.email}
                              {a.user?.role && ` · ${t('userRole.' + a.user.role)}`}
                              {a.assigned_by_user && ` · ${t('seats.addedBy')} ${a.assigned_by_user.first_name} ${a.assigned_by_user.last_name}`}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemove(a.id)}
                            disabled={isPending}
                            className="flex items-center gap-1 rounded bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                          >
                            <UserMinus className="h-3 w-3" /> {t('seats.remove')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Info capacité */}
                  {selectedSeatData && (
                    <div className="mt-3 text-center text-[10px] text-muted-foreground">
                      {t('seats.available', { count: selectedSeatData.max_seats - selectedSeatData.used_seats })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
