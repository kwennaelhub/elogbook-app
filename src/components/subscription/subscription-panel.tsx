'use client'

import { useState } from 'react'
import { Crown, Building2, Check, Zap, AlertCircle, Loader2, X } from 'lucide-react'
import type { Profile, Subscription, SubscriptionPlan } from '@/types/database'
import { SUBSCRIPTION_FEATURES, SUBSCRIPTION_PRICES } from '@/types/database'

interface Props {
  profile: (Profile & { hospital?: { name: string } | null }) | null
  subscription: Subscription | null
  paymentStatus?: string
}

export function SubscriptionPanel({ profile, subscription, paymentStatus }: Props) {
  const [loading, setLoading] = useState<PlanKey | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  type PlanKey = 'premium' | 'institutional'

  const currentPlan: SubscriptionPlan = subscription?.status === 'active'
    ? (subscription.plan as SubscriptionPlan)
    : 'free'

  async function handleSubscribe(planKey: PlanKey) {
    setLoading(planKey)
    setError(null)

    try {
      const planIdEnv = planKey === 'premium'
        ? process.env.NEXT_PUBLIC_PAYPAL_PLAN_PREMIUM
        : process.env.NEXT_PUBLIC_PAYPAL_PLAN_INSTITUTIONAL

      if (!planIdEnv) {
        setError('Configuration PayPal manquante. Contactez l\'administrateur.')
        setLoading(null)
        return
      }

      const res = await fetch('/api/paypal/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: planIdEnv, planKey }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la souscription')
        setLoading(null)
        return
      }

      // Redirection vers PayPal pour approbation
      window.location.href = data.approvalUrl
    } catch {
      setError('Erreur de connexion. Réessayez.')
      setLoading(null)
    }
  }

  async function handleCancel() {
    if (!confirm('Êtes-vous sûr de vouloir annuler votre abonnement ?')) return

    setCancelling(true)
    setError(null)

    try {
      const res = await fetch('/api/paypal/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Annulé par l\'utilisateur' }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erreur lors de l\'annulation')
      } else {
        window.location.reload()
      }
    } catch {
      setError('Erreur de connexion. Réessayez.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Message de statut post-paiement */}
      {paymentStatus === 'success' && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          <Check className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Paiement en cours de traitement</p>
            <p className="text-emerald-600">Votre abonnement sera activé dans quelques instants. Rechargez la page si nécessaire.</p>
          </div>
        </div>
      )}

      {paymentStatus === 'cancelled' && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>Le paiement a été annulé. Vous pouvez réessayer à tout moment.</p>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          <X className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Abonnement actuel */}
      {subscription?.status === 'active' && (
        <div className="mb-6 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentPlan === 'institutional' ? (
                <Building2 className="h-6 w-6 text-emerald-600" />
              ) : (
                <Crown className="h-6 w-6 text-emerald-600" />
              )}
              <div>
                <h3 className="font-bold text-emerald-900">
                  Plan {currentPlan === 'premium' ? 'Premium' : 'Institutionnel'} actif
                </h3>
                <p className="text-sm text-emerald-700">
                  {SUBSCRIPTION_PRICES[currentPlan].label} · Depuis le{' '}
                  {new Date(subscription.starts_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm ring-1 ring-red-200 transition-colors hover:bg-red-50"
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Annuler'}
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">Abonnement InternLog</h1>
        <p className="mt-1 text-sm text-slate-500">
          Choisissez le plan adapté à vos besoins
        </p>
      </div>

      {/* Grille des plans */}
      <div className="space-y-4">
        {/* Plan Gratuit */}
        <PlanCard
          name="Gratuit"
          price="0 €"
          priceFcfa="Gratuit"
          features={SUBSCRIPTION_FEATURES.free}
          isCurrent={currentPlan === 'free'}
          icon={<Zap className="h-5 w-5 text-slate-400" />}
          color="slate"
        />

        {/* Plan Premium */}
        <PlanCard
          name="Premium DES"
          price="7,99 €/mois"
          priceFcfa="4 999 FCFA/mois"
          features={SUBSCRIPTION_FEATURES.premium}
          isCurrent={currentPlan === 'premium'}
          isRecommended
          icon={<Crown className="h-5 w-5 text-amber-500" />}
          color="amber"
          onSubscribe={() => handleSubscribe('premium')}
          loading={loading === 'premium'}
          disabled={currentPlan !== 'free'}
        />

        {/* Plan Institutionnel */}
        <PlanCard
          name="Institutionnel"
          price="45,99 €/mois"
          priceFcfa="29 999 FCFA/mois"
          features={SUBSCRIPTION_FEATURES.institutional}
          isCurrent={currentPlan === 'institutional'}
          icon={<Building2 className="h-5 w-5 text-blue-500" />}
          color="blue"
          onSubscribe={() => handleSubscribe('institutional')}
          loading={loading === 'institutional'}
          disabled={currentPlan === 'institutional'}
        />
      </div>

      {/* FAQ rapide */}
      <div className="mt-8 space-y-3">
        <h2 className="text-sm font-bold text-slate-700">Questions fréquentes</h2>
        <FaqItem
          q="Comment fonctionne le paiement ?"
          a="Le paiement est sécurisé via PayPal. Vous pouvez payer par carte bancaire ou compte PayPal. L'abonnement est mensuel et renouvelé automatiquement."
        />
        <FaqItem
          q="Puis-je annuler à tout moment ?"
          a="Oui, vous pouvez annuler votre abonnement à tout moment depuis cette page. L'accès reste actif jusqu'à la fin de la période payée."
        />
        <FaqItem
          q="Que comprend le pack Institutionnel ?"
          a="Le pack inclut 20 postes pour les chefs de service de votre hôpital. Chaque chef de service peut gérer ses DES et valider leurs actes. Pour plus de postes, contactez-nous."
        />
        <FaqItem
          q="Les prix en FCFA sont-ils fixes ?"
          a="Les prix affichés en FCFA sont indicatifs (taux 1 € ≈ 655,957 FCFA). La facturation est en euros via PayPal."
        />
      </div>
    </div>
  )
}

function PlanCard({
  name,
  price,
  priceFcfa,
  features,
  isCurrent,
  isRecommended,
  icon,
  color,
  onSubscribe,
  loading,
  disabled,
}: {
  name: string
  price: string
  priceFcfa: string
  features: string[]
  isCurrent: boolean
  isRecommended?: boolean
  icon: React.ReactNode
  color: 'slate' | 'amber' | 'blue'
  onSubscribe?: () => void
  loading?: boolean
  disabled?: boolean
}) {
  const borderColor = isCurrent
    ? 'border-emerald-300 bg-emerald-50/50'
    : isRecommended
      ? 'border-amber-200 bg-white'
      : 'border-slate-200 bg-white'

  return (
    <div className={`relative rounded-xl border-2 p-5 ${borderColor}`}>
      {isRecommended && !isCurrent && (
        <span className="absolute -top-2.5 right-4 rounded-full bg-amber-500 px-3 py-0.5 text-[10px] font-bold text-white">
          RECOMMANDÉ
        </span>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h3 className="font-bold text-slate-900">{name}</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-slate-900">{price}</span>
              <span className="text-xs text-slate-400">{priceFcfa}</span>
            </div>
          </div>
        </div>

        {isCurrent && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            Actif
          </span>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
            <Check className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
              color === 'amber' ? 'text-amber-500' :
              color === 'blue' ? 'text-blue-500' : 'text-slate-400'
            }`} />
            {feature}
          </li>
        ))}
      </ul>

      {onSubscribe && !isCurrent && (
        <button
          onClick={onSubscribe}
          disabled={disabled || loading}
          className={`mt-4 w-full rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
            color === 'amber'
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirection vers PayPal…
            </span>
          ) : (
            `Souscrire — ${price}`
          )}
        </button>
      )}
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-lg bg-slate-50 px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-slate-700 group-open:mb-2">
        {q}
      </summary>
      <p className="text-xs text-slate-500 leading-relaxed">{a}</p>
    </details>
  )
}
