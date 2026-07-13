interface BudgetRingProps {
  todayKg: number
  budget: number
  weekAvg: number
}

const OUTER_CIRCUMFERENCE = 2 * Math.PI * 92
const INNER_CIRCUMFERENCE = 2 * Math.PI * 70

export default function BudgetRing({ todayKg, budget, weekAvg }: BudgetRingProps) {
  const outerPct = Math.min(todayKg / budget, 1)
  const innerPct = Math.min(weekAvg / budget, 1)
  const overBudget = todayKg > budget

  return (
    <div className="ring-wrap">
      <div className="ring">
        <svg width="220" height="220" viewBox="0 0 220 220">
          <circle cx="110" cy="110" r="92" fill="none" stroke="var(--neutral-200)" strokeWidth="16" />
          <circle
            cx="110" cy="110" r="92" fill="none"
            stroke={overBudget ? 'var(--clay)' : 'var(--leaf)'}
            strokeWidth="16" strokeLinecap="round"
            strokeDasharray={OUTER_CIRCUMFERENCE}
            strokeDashoffset={OUTER_CIRCUMFERENCE * (1 - outerPct)}
            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s' }}
          />
          <circle cx="110" cy="110" r="70" fill="none" stroke="var(--neutral-200)" strokeWidth="8" opacity="0.6" />
          <circle
            cx="110" cy="110" r="70" fill="none"
            stroke="var(--amber)" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={INNER_CIRCUMFERENCE}
            strokeDashoffset={INNER_CIRCUMFERENCE * (1 - innerPct)}
            opacity="0.9"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="center">
          <div className="kg">{todayKg.toFixed(1)}</div>
          <div className="lbl">kg CO₂e · bugün</div>
        </div>
      </div>
      <div className="budget-line">
        Günlük bütçe: <b>{budget}</b> kg
      </div>
    </div>
  )
}
