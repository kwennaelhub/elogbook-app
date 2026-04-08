'use client'

import { useState } from 'react'
import { Send, Star, Check } from 'lucide-react'
import { submitFeedback } from '@/lib/actions/feedback'

interface FeedbackFormProps {
  userName: string
  userRole: string
}

const CATEGORIES = [
  { value: 'ui', label: 'Interface / Design' },
  { value: 'ux', label: 'Facilité d\'utilisation' },
  { value: 'feature', label: 'Fonctionnalité manquante' },
  { value: 'bug', label: 'Bug / Erreur' },
  { value: 'performance', label: 'Performance / Vitesse' },
  { value: 'content', label: 'Contenu médical' },
  { value: 'other', label: 'Autre' },
]

const RATING_LABELS = ['', 'Très insatisfait', 'Insatisfait', 'Neutre', 'Satisfait', 'Très satisfait']

export function FeedbackForm({ userName, userRole }: FeedbackFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [ease, setEase] = useState<number | null>(null)
  const [recommend, setRecommend] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating || !category || !message.trim()) {
      setError('Veuillez remplir tous les champs obligatoires')
      return
    }

    setLoading(true)
    setError('')
    const result = await submitFeedback({
      rating,
      category,
      message: message.trim(),
      ease_of_use: ease,
      would_recommend: recommend,
      user_name: userName,
      user_role: userRole,
    })

    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setRating(0)
      setCategory('')
      setMessage('')
      setEase(null)
      setRecommend(null)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-green-50 p-8 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-green-800">Merci pour votre retour !</h3>
        <p className="mb-4 text-sm text-green-600">Votre feedback a été enregistré avec succès.</p>
        <button
          onClick={() => setSuccess(false)}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Envoyer un autre feedback
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Note globale */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Note globale de l&apos;application <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(n)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 ${
                  n <= (hoverRating || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-300'
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-slate-500">
            {RATING_LABELS[hoverRating || rating] || 'Sélectionnez'}
          </span>
        </div>
      </div>

      {/* Catégorie */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Catégorie <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                category === c.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Votre message <span className="text-red-500">*</span>
        </label>
        <p className="mb-2 text-xs text-slate-400">
          Décrivez votre expérience, un problème rencontré, ou une suggestion d&apos;amélioration
        </p>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          placeholder="Votre retour d'expérience..."
        />
      </div>

      {/* Facilité d'utilisation */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Facilité d&apos;utilisation (1 = très difficile, 10 = très facile)
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setEase(n)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-all ${
                ease === n
                  ? n <= 3 ? 'bg-red-500 text-white' : n <= 6 ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Recommandation */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Recommanderiez-vous cette application à un collègue ?
        </label>
        <div className="flex gap-2">
          {[
            { value: 'yes', label: 'Oui', color: 'bg-green-600' },
            { value: 'maybe', label: 'Peut-être', color: 'bg-amber-500' },
            { value: 'no', label: 'Non', color: 'bg-red-500' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRecommend(opt.value)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                recommend === opt.value
                  ? `${opt.color} text-white`
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Soumettre */}
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        {loading ? 'Envoi en cours...' : 'Envoyer mon feedback'}
      </button>
    </form>
  )
}
