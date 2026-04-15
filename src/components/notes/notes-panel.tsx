'use client'

import { useState, useTransition } from 'react'
import { Plus, Pin, Trash2, Edit3, X, Search, ChevronDown, Loader2, StickyNote } from 'lucide-react'
import { createNote, updateNote, deleteNote, togglePinNote } from '@/lib/actions/notes'
import { NOTE_CATEGORIES } from '@/types/database'
import type { Note } from '@/types/database'
import { useI18n } from '@/lib/i18n/context'

interface Props {
  initialNotes: Note[]
}

export function NotesPanel({ initialNotes }: Props) {
  const { t, locale } = useI18n()
  const notes = initialNotes
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string | ''>('')
  const [showEditor, setShowEditor] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Champs éditeur
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<string>('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const filteredNotes = notes.filter((n) => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())
    const matchCat = !filterCategory || n.category === filterCategory
    return matchSearch && matchCat
  })

  const categories = [...new Set(notes.map((n) => n.category).filter(Boolean))] as string[]

  function openEditor(note?: Note) {
    if (note) {
      setEditingNote(note)
      setTitle(note.title)
      setContent(note.content)
      setCategory(note.category || '')
    } else {
      setEditingNote(null)
      setTitle('')
      setContent('')
      setCategory('')
    }
    setShowEditor(true)
    setFeedback(null)
  }

  function closeEditor() {
    setShowEditor(false)
    setEditingNote(null)
    setTitle('')
    setContent('')
    setCategory('')
  }

  function handleSave() {
    setFeedback(null)
    startTransition(async () => {
      const cat = category || null
      const result = editingNote
        ? await updateNote(editingNote.id, title, content, cat)
        : await createNote(title, content, cat)

      if (result.error) {
        setFeedback({ type: 'error', message: result.error })
      } else {
        setFeedback({ type: 'success', message: editingNote ? t('notes.toast.updated') : t('notes.toast.created') })
        closeEditor()
      }
    })
  }

  function handleDelete(noteId: string) {
    startTransition(async () => {
      const result = await deleteNote(noteId)
      if (result.error) {
        setFeedback({ type: 'error', message: result.error })
      }
    })
  }

  function handlePin(noteId: string, isPinned: boolean) {
    startTransition(async () => {
      await togglePinNote(noteId, isPinned)
    })
  }

  return (
    <div>
      {/* En-tête */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
            <StickyNote className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">{t('notes.title')}</h1>
            <p className="text-xs text-muted-foreground">{notes.length} note{notes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => openEditor()}
          className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
        >
          <Plus className="h-3.5 w-3.5" /> {t('notes.new')}
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mb-3 rounded-lg p-2.5 text-xs ${
          feedback.type === 'success' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Recherche + filtre */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('notes.search')}
            className="w-full rounded-lg border border-border bg-card py-2 pl-8 pr-3 text-xs text-foreground focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-amber-500/50 focus:outline-none"
        >
          <option value="">{t('notes.allCategories')}</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Liste des notes */}
      {filteredNotes.length === 0 ? (
        <div className="card-base p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {notes.length === 0 ? t('notes.noNotes') : t('notes.noResults')}
          </p>
          {notes.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">{t('notes.noNotesHint')}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotes.map((note) => (
            <div key={note.id} className="card-base p-0">
              <button
                type="button"
                onClick={() => setExpanded(expanded === note.id ? null : note.id)}
                className="flex w-full items-center gap-3 p-3 text-left"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  note.is_pinned ? 'bg-amber-500/15 text-amber-400' : 'bg-secondary text-muted-foreground'
                }`}>
                  {note.is_pinned ? <Pin className="h-4 w-4" /> : <StickyNote className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{note.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {note.category && <span className="mr-1.5 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium">{note.category}</span>}
                    {new Date(note.updated_at).toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR')}
                  </p>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded === note.id ? 'rotate-180' : ''}`} />
              </button>

              {expanded === note.id && (
                <div className="border-t border-border/60 px-3 pb-3 pt-2">
                  <div className="mb-3 whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                    {note.content || <span className="italic text-muted-foreground">Pas de contenu</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditor(note)}
                      className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
                    >
                      <Edit3 className="h-3 w-3" /> {t('notes.edit')}
                    </button>
                    <button
                      onClick={() => handlePin(note.id, note.is_pinned)}
                      disabled={isPending}
                      className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      <Pin className="h-3 w-3" /> {note.is_pinned ? t('notes.unpin') : t('notes.pin')}
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      disabled={isPending}
                      className="flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" /> {t('notes.delete')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal éditeur */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-card p-6 shadow-xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {editingNote ? t('notes.editTitle') : t('notes.newTitle')}
              </h3>
              <button type="button" onClick={closeEditor}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">{t('notes.titleField')}</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  placeholder="Ex : Anatomie du foie"
                />
              </div>

              <div>
                <label className="label">{t('notes.category')}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="">{t('notes.noCategory')}</option>
                  {NOTE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">{t('notes.content')}</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  placeholder={t('notes.placeholder.content')}
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isPending || !title.trim()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingNote ? t('notes.save') : t('notes.create')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
