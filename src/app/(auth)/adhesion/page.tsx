'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useI18n } from '@/lib/i18n/context'

type Option = { id: string; name: string }

export default function AdhesionPage() {
  return (
    <Suspense fallback={<div className="rounded-2xl bg-card p-8 shadow-xl text-center text-sm text-muted-foreground">Chargement...</div>}>
      <AdhesionForm />
    </Suspense>
  )
}

function AdhesionForm() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const [hospitals, setHospitals] = useState<Option[]>([])
  const [specialties, setSpecialties] = useState<Option[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    lastName: searchParams.get('nom') || '',
    firstName: searchParams.get('prenom') || '',
    email: searchParams.get('email') || '',
    hospitalId: '',
    hospitalOther: '',
    specialtyId: '',
    desLevel: '',
    promotionYear: '',
    phone: '',
    motivation: '',
  })

  useEffect(() => {
    fetch('/api/adhesion')
      .then(r => r.json())
      .then(data => {
        setHospitals(data.hospitals || [])
        setSpecialties(data.specialties || [])
      })
      .catch(() => {})
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/adhesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (data.success) {
        setSubmitted(true)
      } else {
        setError(data.error || 'Erreur lors de la soumission')
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-card p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">Demande envoyée !</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Votre demande d&apos;adhésion a été soumise avec succès. Vous recevrez un email
            avec votre matricule DES une fois votre demande validée par le coordinateur.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="form-auto-style rounded-2xl bg-card p-8 shadow-xl">
      <h2 className="mb-2 text-xl font-semibold text-foreground">Demande d&apos;adhésion</h2>
      <p className="mb-6 body-text">
        Vous n&apos;êtes pas encore dans le registre InternLog ? Remplissez ce formulaire
        pour demander votre inscription.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {t(error)}
        </div>
      )}

      {/* Nom + Prénom */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="lastName" className="label">
            Nom <span className="text-red-500">*</span>
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            value={form.lastName}
            onChange={handleChange}
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor="firstName" className="label">
            Prénom <span className="text-red-500">*</span>
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            value={form.firstName}
            onChange={handleChange}
            className="input-field"
          />
        </div>
      </div>

      {/* Email */}
      <div className="mb-4">
        <label htmlFor="email" className="label">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={form.email}
          onChange={handleChange}
          className="input-field"
          placeholder="prenom.nom@example.com"
        />
      </div>

      {/* Téléphone */}
      <div className="mb-4">
        <label htmlFor="phone" className="label">
          Téléphone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          className="input-field"
          placeholder="+229 XX XX XX XX"
        />
      </div>

      {/* Niveau DES + Année */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="desLevel" className="label">
            Niveau DES <span className="text-red-500">*</span>
          </label>
          <select
            id="desLevel"
            name="desLevel"
            required
            value={form.desLevel}
            onChange={handleChange}
            className="input-field"
          >
            <option value="">Sélectionner...</option>
            <option value="DES1">DES 1</option>
            <option value="DES2">DES 2</option>
            <option value="DES3">DES 3</option>
            <option value="DES4">DES 4</option>
            <option value="DES5">DES 5</option>
          </select>
        </div>
        <div>
          <label htmlFor="promotionYear" className="label">
            Année de promotion
          </label>
          <input
            id="promotionYear"
            name="promotionYear"
            type="number"
            min="2020"
            max="2030"
            value={form.promotionYear}
            onChange={handleChange}
            className="input-field"
            placeholder="2026"
          />
        </div>
      </div>

      {/* Hôpital */}
      <div className="mb-4">
        <label htmlFor="hospitalId" className="label">
          Hôpital / CHU <span className="text-red-500">*</span>
        </label>
        <select
          id="hospitalId"
          name="hospitalId"
          required={!form.hospitalOther}
          value={form.hospitalId}
          onChange={handleChange}
          className="input-field"
        >
          <option value="">Sélectionner un hôpital...</option>
          {hospitals.map(h => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
          <option value="other">Autre (préciser)</option>
        </select>
        {form.hospitalId === 'other' && (
          <input
            name="hospitalOther"
            type="text"
            required
            value={form.hospitalOther}
            onChange={handleChange}
            className="mt-2 input-field"
            placeholder={t('adhesion.placeholder.hospitalName')}
          />
        )}
      </div>

      {/* Spécialité */}
      <div className="mb-4">
        <label htmlFor="specialtyId" className="label">
          Spécialité / Service
        </label>
        <select
          id="specialtyId"
          name="specialtyId"
          value={form.specialtyId}
          onChange={handleChange}
          className="input-field"
        >
          <option value="">Sélectionner une spécialité...</option>
          {specialties.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Motivation */}
      <div className="mb-6">
        <label htmlFor="motivation" className="label">
          Commentaire (optionnel)
        </label>
        <textarea
          id="motivation"
          name="motivation"
          rows={3}
          value={form.motivation}
          onChange={handleChange}
          className="input-textarea"
          placeholder={t('adhesion.placeholder.info')}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full btn-primary"
      >
        {loading ? 'Envoi en cours...' : 'Soumettre ma demande'}
      </button>

      <p className="mt-4 text-center caption">
        Déjà un matricule ?{' '}
        <Link href="/register" className="font-medium text-primary hover:text-primary/90">
          S&apos;inscrire
        </Link>
      </p>
    </form>
  )
}
