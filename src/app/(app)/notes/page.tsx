import { getNotes } from '@/lib/actions/notes'
import { NotesPanel } from '@/components/notes/notes-panel'

export default async function NotesPage() {
  const notes = await getNotes()

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <NotesPanel initialNotes={notes} />
    </div>
  )
}
