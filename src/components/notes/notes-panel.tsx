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
  const [notes] = useState(initialNotes)
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
        setFeedback({ type: 'success', message: editingNote ? 'Note mise à jour' : 'Note créée' })
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
            <StickyNote className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{t('notes.title')}</h1>
            <p className="text-xs text-slate-500">{notes.length} note{notes.length !== 1 ? 's' : ''}</p>
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
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Recherche + filtre */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('notes.search')}
            className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-xs focus:border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-200"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 focus:border-amber-300 focus:outline-none"
        >
          <option value="">{t('notes.allCategories')}</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Liste des notes */}
      {filteredNotes.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">
            {notes.length === 0 ? t('notes.noNotes') : t('notes.noResults')}
          </p>
          {notes.length === 0 && (
            <p className="mt-1 text-xs text-slate-400">{t('notes.noNotesHint')}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotes.map((note) => (
            <div key={note.id} className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <button
                type="button"
                onClick={() => setExpanded(expanded === note.id ? null : note.id)}
                className="flex w-full items-center gap-3 p-3 text-left"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  note.is_pinned ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {note.is_pinned ? <Pin className="h-4 w-4" /> : <StickyNote className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{note.title}</p>
                  <p className="text-xs text-slate-500">
                    {note.category && <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium">{note.category}</span>}
                    {new Date(note.updated_at).toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR')}
                  </p>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded === note.id ? 'rotate-180' : ''}`} />
              </button>

              {expanded === note.id && (
                <div className="border-t border-slate-100 px-3 pb-3 pt-2">
                  <div className="mb-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                    {note.content || <span className="italic text-slate-400">Pas de contenu</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditor(note)}
                      className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                    >
                      <Edit3 className="h-3 w-3" /> {t('notes.edit')}
                    </button>
                    <button
                      onClick={() => handlePin(note.id, note.is_pinned)}
                      disabled={isPending}
                      className="flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-100 disabled:opacity-50"
                    >
                      <Pin className="h-3 w-3" /> {note.is_pinned ? t('notes.unpin') : t('notes.pin')}
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      disabled={isPending}
                      className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
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
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingNote ? t('notes.editTitle') : t('notes.newTitle')}
              </h3>
              <button type="button" onClick={closeEditor}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t('notes.titleField')}</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  placeholder="Ex : Anatomie du foie"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t('notes.category')}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                >
                  <option value="">{t('notes.noCategory')}</option>
                  {NOTE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t('notes.content')}</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  placeholder="Vos notes ici…"
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
