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
  const remaining = Math.max(budget - todayKg, 0)

  return (
    <div className="ring-wrap">
      <div className="ring">
        <svg width="220" height="220" viewBox="0 0 220 220">
          <circle cx="110" cy="110" r="92" fill="none" stroke="var(--paper-alt)" strokeWidth="16" />
          <circle
            cx="110" cy="110" r="92" fill="none"
            stroke={overBudget ? 'var(--clay)' : 'var(--leaf)'}
            strokeWidth="16" strokeLinecap="round"
            strokeDasharray={OUTER_CIRCUMFERENCE}
            strokeDashoffset={OUTER_CIRCUMFERENCE * (1 - outerPct)}
            style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1), stroke 0.3s' }}
          />
          <circle cx="110" cy="110" r="70" fill="none" stroke="var(--paper-alt)" strokeWidth="8" />
          <circle
            cx="110" cy="110" r="70" fill="none"
            stroke="var(--amber)" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={INNER_CIRCUMFERENCE}
            strokeDashoffset={INNER_CIRCUMFERENCE * (1 - innerPct)}
            opacity="0.9"
            style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)' }}
          />
        </svg>
        <div className="center">
          <div className="kg">{todayKg.toFixed(1)}</div>
          <div className="lbl">kg CO₂e · bugün</div>
          <div className="sub-num">
            {overBudget
              ? `bütçeyi ${Math.abs(todayKg - budget).toFixed(1)} kg aştınız`
              : `${remaining.toFixed(1)} kg kaldı`}
          </div>
        </div>
      </div>
      <div className="budget-line">
        Günlük bütçe: <b>{budget}</b> kg · haftalık ort. <b>{weekAvg.toFixed(1)}</b> kg
      </div>
    </div>
  )
}
