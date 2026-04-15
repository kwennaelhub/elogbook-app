import { FeedbackForm } from '@/components/feedback/feedback-form'
import { I18nProvider } from '@/lib/i18n/context'

export default function FeedbackPage() {
  return (
    <I18nProvider>
      <div className="min-h-dvh bg-background">
        {/* Header */}
        <header className="bg-primary px-4 py-6 text-white">
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
            <p className="mt-1 text-xs text-primary">
              Ce formulaire est anonyme. Temps estimé : 2 minutes.
            </p>
          </div>

          <FeedbackForm userName="" userRole="testeur" />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            InternLog — Logbook Médical DES
          </p>
        </div>
      </div>
    </I18nProvider>
  )
}
