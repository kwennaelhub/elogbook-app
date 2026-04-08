import { FeedbackForm } from '@/components/feedback/feedback-form'

export default function FeedbackPage() {
  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Header */}
      <header className="bg-blue-600 px-4 py-6 text-white">
        <div className="mx-auto max-w-lg text-center">
          <div className="mb-2 text-3xl">📋</div>
          <h1 className="text-xl font-bold">InternLog</h1>
          <p className="mt-1 text-sm text-blue-200">Retour d&apos;expérience — Phase de test</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-medium">Cher(e) Professeur(e),</p>
          <p className="mt-1">
            Merci de tester InternLog ! Vos retours sont essentiels pour améliorer
            cette application destinée au suivi des compétences médicales des étudiants DES.
          </p>
          <p className="mt-1 text-xs text-blue-600">
            Ce formulaire est anonyme. Temps estimé : 2 minutes.
          </p>
        </div>

        <FeedbackForm userName="" userRole="testeur" />

        <p className="mt-6 text-center text-xs text-slate-400">
          InternLog — Logbook Médical DES
        </p>
      </div>
    </div>
  )
}
