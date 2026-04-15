'use client'

import { useState } from 'react'
import { Send, Star, Check } from 'lucide-react'
import { submitFeedback } from '@/lib/actions/feedback'
import { useI18n } from '@/lib/i18n/context'

interface FeedbackFormProps {
  userName: string
  userRole: string
}

const CATEGORIES = [
  { value: 'ui', labelKey: 'feedback.category.design' },
  { value: 'ux', labelKey: 'feedback.category.usability' },
  { value: 'feature', labelKey: 'feedback.category.feature' },
  { value: 'bug', labelKey: 'feedback.category.bug' },
  { value: 'performance', labelKey: 'feedback.category.performance' },
  { value: 'content', labelKey: 'feedback.category.content' },
  { value: 'other', labelKey: 'feedback.category.other' },
]

export function FeedbackForm({ userName: initialName, userRole }: FeedbackFormProps) {
  const { t } = useI18n()
  const [name, setName] = useState(initialName)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [ease, setEase] = useState<number | null>(null)
  const [recommend, setRecommend] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const RATING_LABELS = [
    '',
    t('feedback.rating.1'),
    t('feedback.rating.2'),
    t('feedback.rating.3'),
    t('feedback.rating.4'),
    t('feedback.rating.5'),
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating || !category || !message.trim()) {
      setError(t('feedback.error.requiredFields'))
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
      user_name: name || 'Anonyme',
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
      <div className="flex flex-col items-center justify-center rounded-xl bg-primary/10 p-8 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-6 w-6 text-primary" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-primary">{t('feedback.success.title')}</h3>
        <p className="mb-4 text-sm text-primary">{t('feedback.success.message')}</p>
        <button
          onClick={() => setSuccess(false)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          {t('feedback.button.another')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{t(error)}</div>
      )}

      {/* Nom (optionnel) */}
      <div className="card-base">
        <label className="label">
          {t('feedback.labels.name')} <span className="text-xs text-muted-foreground">(optionnel)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Pr Nom / Dr Nom..."
          className="w-full rounded-lg border border-input px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
      </div>

      {/* Note globale */}
      <div className="card-base">
        <label className="label mb-2">
          {t('feedback.labels.rating')} <span className="text-red-500">*</span>
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
                    : 'text-muted-foreground'
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">
            {RATING_LABELS[hoverRating || rating] || t('common.select')}
          </span>
        </div>
      </div>

      {/* Catégorie */}
      <div className="card-base">
        <label className="label mb-2">
          {t('feedback.labels.category')} <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                category === c.value
                  ? 'bg-primary text-white'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              {t(c.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div className="card-base">
        <label className="label">
          {t('feedback.labels.message')} <span className="text-red-500">*</span>
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          {t('feedback.help.message')}
        </p>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-input px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          placeholder={t('feedback.placeholder.message')}
        />
      </div>

      {/* Facilité d'utilisation */}
      <div className="card-base">
        <label className="label mb-2">
          {t('feedback.labels.ease')}
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
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Recommandation */}
      <div className="card-base">
        <label className="label mb-2">
          {t('feedback.labels.recommend')}
        </label>
        <div className="flex gap-2">
          {[
            { value: 'yes', labelKey: 'feedback.recommend.yes', color: 'bg-green-600' },
            { value: 'maybe', labelKey: 'feedback.recommend.maybe', color: 'bg-amber-500' },
            { value: 'no', labelKey: 'feedback.recommend.no', color: 'bg-red-500' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRecommend(opt.value)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                recommend === opt.value
                  ? `${opt.color} text-white`
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Soumettre */}
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        {loading ? t('feedback.button.sending') : t('feedback.button.submit')}
      </button>
    </form>
  )
}
