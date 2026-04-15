'use client'

interface CircularProgressProps {
  percentage: number
  size?: number
  strokeWidth?: number
  color?: string
  bgColor?: string
}

export function CircularProgress({
  percentage,
  size = 120,
  strokeWidth = 8,
  color = '#4f6fff',
  bgColor = 'rgba(255,255,255,0.08)',
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Cercle de fond */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Cercle de progression */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
          style={{
            filter: `drop-shadow(0 0 6px ${color}40)`,
          }}
        />
      </svg>
      {/* Texte central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{percentage}<span className="text-sm">%</span></span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Objectifs</span>
      </div>
    </div>
  )
}
