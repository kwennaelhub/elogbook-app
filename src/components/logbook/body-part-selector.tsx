'use client'

import { useState } from 'react'

export interface BodyRegion {
  id: string
  label: string
  labelEn: string
}

export const BODY_REGIONS: BodyRegion[] = [
  { id: 'head', label: 'Tête / Crâne', labelEn: 'Head / Skull' },
  { id: 'neck', label: 'Cou / Cervical', labelEn: 'Neck / Cervical' },
  { id: 'chest', label: 'Thorax / Poitrine', labelEn: 'Chest / Thorax' },
  { id: 'abdomen', label: 'Abdomen', labelEn: 'Abdomen' },
  { id: 'pelvis', label: 'Pelvis / Bassin', labelEn: 'Pelvis' },
  { id: 'left_arm', label: 'Bras gauche', labelEn: 'Left arm' },
  { id: 'right_arm', label: 'Bras droit', labelEn: 'Right arm' },
  { id: 'left_hand', label: 'Main gauche', labelEn: 'Left hand' },
  { id: 'right_hand', label: 'Main droite', labelEn: 'Right hand' },
  { id: 'left_leg', label: 'Jambe gauche', labelEn: 'Left leg' },
  { id: 'right_leg', label: 'Jambe droite', labelEn: 'Right leg' },
  { id: 'left_foot', label: 'Pied gauche', labelEn: 'Left foot' },
  { id: 'right_foot', label: 'Pied droit', labelEn: 'Right foot' },
  { id: 'spine', label: 'Colonne vertébrale', labelEn: 'Spine' },
]

interface BodyPartSelectorProps {
  value: string
  onChange: (regionId: string) => void
  locale?: 'fr' | 'en'
}

export function BodyPartSelector({ value, onChange, locale = 'fr' }: BodyPartSelectorProps) {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null)

  const selectedRegion = BODY_REGIONS.find(r => r.id === value)
  const hoveredRegion = BODY_REGIONS.find(r => r.id === hoveredPart)
  const displayRegion = hoveredRegion || selectedRegion

  const getRegionColor = (regionId: string) => {
    if (value === regionId) return 'var(--region-active)'
    if (hoveredPart === regionId) return 'var(--region-hover)'
    return 'var(--region-default)'
  }

  const getRegionStroke = (regionId: string) => {
    if (value === regionId) return 'var(--region-active-stroke)'
    if (hoveredPart === regionId) return 'var(--region-hover-stroke)'
    return 'var(--region-default-stroke)'
  }

  const regionProps = (id: string) => ({
    fill: getRegionColor(id),
    stroke: getRegionStroke(id),
    strokeWidth: value === id ? 2 : 1,
    className: 'cursor-pointer transition-all duration-200',
    onMouseEnter: () => setHoveredPart(id),
    onMouseLeave: () => setHoveredPart(null),
    onClick: () => onChange(value === id ? '' : id),
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': BODY_REGIONS.find(r => r.id === id)?.[locale === 'fr' ? 'label' : 'labelEn'] || id,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onChange(value === id ? '' : id)
      }
    },
  })

  return (
    <div
      className="rounded-xl border border-border/60 bg-card p-4"
      style={{
        '--region-default': 'oklch(0.35 0.06 260)',
        '--region-hover': 'oklch(0.45 0.12 260)',
        '--region-active': 'oklch(0.55 0.20 260)',
        '--region-default-stroke': 'oklch(0.45 0.06 260)',
        '--region-hover-stroke': 'oklch(0.55 0.14 260)',
        '--region-active-stroke': 'oklch(0.70 0.20 260)',
      } as React.CSSProperties}
    >
      <label className="mb-3 block text-sm font-medium text-foreground">
        Zone anatomique <span className="text-muted-foreground">(optionnel)</span>
      </label>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
        {/* SVG Body — Vue antérieure */}
        <div className="relative shrink-0">
          <svg
            viewBox="0 0 200 440"
            width="160"
            height="350"
            className="drop-shadow-lg"
            aria-label="Sélecteur de zone anatomique"
          >
            {/* ── Tête ── */}
            <ellipse cx="100" cy="32" rx="22" ry="28" {...regionProps('head')} />

            {/* ── Cou ── */}
            <rect x="90" y="58" width="20" height="18" rx="4" {...regionProps('neck')} />

            {/* ── Thorax ── */}
            <path
              d="M68 76 Q66 78 64 88 L60 130 Q60 136 68 138 L94 142 L100 144 L106 142 L132 138 Q140 136 140 130 L136 88 Q134 78 132 76 Z"
              {...regionProps('chest')}
            />

            {/* ── Abdomen ── */}
            <path
              d="M68 138 L68 190 Q68 200 76 204 L94 210 L100 212 L106 210 L124 204 Q132 200 132 190 L132 138 L106 142 L100 144 L94 142 Z"
              {...regionProps('abdomen')}
            />

            {/* ── Pelvis ── */}
            <path
              d="M76 204 L68 210 Q60 218 62 230 L70 248 Q74 254 82 254 L96 250 L100 248 L104 250 L118 254 Q126 254 130 248 L138 230 Q140 218 132 210 L124 204 L106 210 L100 212 L94 210 Z"
              {...regionProps('pelvis')}
            />

            {/* ── Bras droit (côté gauche SVG = droit du patient) ── */}
            <path
              d="M64 88 L54 82 Q44 78 38 86 L24 130 Q20 140 22 148 L28 180 Q30 186 34 188 L40 186 L44 148 L48 130 L56 108 L60 100 L64 92 Z"
              {...regionProps('right_arm')}
            />

            {/* ── Bras gauche ── */}
            <path
              d="M136 88 L146 82 Q156 78 162 86 L176 130 Q180 140 178 148 L172 180 Q170 186 166 188 L160 186 L156 148 L152 130 L144 108 L140 100 L136 92 Z"
              {...regionProps('left_arm')}
            />

            {/* ── Main droite ── */}
            <ellipse cx="36" cy="200" rx="10" ry="14" {...regionProps('right_hand')} />

            {/* ── Main gauche ── */}
            <ellipse cx="164" cy="200" rx="10" ry="14" {...regionProps('left_hand')} />

            {/* ── Jambe droite ── */}
            <path
              d="M70 248 L72 280 L74 320 L72 360 Q70 370 74 378 L78 390 L90 388 L86 370 L84 340 L86 300 L88 270 L96 250 L82 254 Z"
              {...regionProps('right_leg')}
            />

            {/* ── Jambe gauche ── */}
            <path
              d="M130 248 L128 280 L126 320 L128 360 Q130 370 126 378 L122 390 L110 388 L114 370 L116 340 L114 300 L112 270 L104 250 L118 254 Z"
              {...regionProps('left_leg')}
            />

            {/* ── Pied droit ── */}
            <ellipse cx="82" cy="404" rx="14" ry="8" {...regionProps('right_foot')} />

            {/* ── Pied gauche ── */}
            <ellipse cx="118" cy="404" rx="14" ry="8" {...regionProps('left_foot')} />

            {/* ── Colonne vertébrale (ligne centrale) ── */}
            <line
              x1="100" y1="76" x2="100" y2="210"
              strokeWidth={value === 'spine' ? 6 : 3}
              strokeLinecap="round"
              strokeDasharray={value === 'spine' ? '0' : '4 4'}
              stroke={getRegionStroke('spine')}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredPart('spine')}
              onMouseLeave={() => setHoveredPart(null)}
              onClick={() => onChange(value === 'spine' ? '' : 'spine')}
              role="button"
              tabIndex={0}
              aria-label="Colonne vertébrale"
            />

            {/* Point actif lumineux */}
            {value && value !== 'spine' && (
              <circle
                cx="100"
                cy="220"
                r="0"
                fill="transparent"
              />
            )}
          </svg>
        </div>

        {/* Panel info + liste rapide */}
        <div className="flex-1 w-full">
          {/* Zone sélectionnée */}
          {displayRegion ? (
            <div className="mb-3 rounded-lg bg-primary/10 px-3 py-2.5 ring-1 ring-primary/20">
              <p className="text-xs font-semibold text-primary">
                {value === displayRegion.id ? '✓ Sélectionné' : 'Survolé'}
              </p>
              <p className="text-sm font-bold text-foreground">
                {locale === 'fr' ? displayRegion.label : displayRegion.labelEn}
              </p>
            </div>
          ) : (
            <div className="mb-3 rounded-lg bg-secondary/50 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">
                Cliquez sur une zone du corps ou sélectionnez dans la liste
              </p>
            </div>
          )}

          {/* Liste rapide des zones */}
          <div className="grid grid-cols-2 gap-1.5 max-h-[260px] overflow-y-auto scrollbar-hide">
            {BODY_REGIONS.map((region) => (
              <button
                key={region.id}
                type="button"
                onClick={() => onChange(value === region.id ? '' : region.id)}
                className={`rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-all ${
                  value === region.id
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                    : 'bg-secondary/50 text-foreground hover:bg-secondary'
                }`}
              >
                {locale === 'fr' ? region.label : region.labelEn}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
