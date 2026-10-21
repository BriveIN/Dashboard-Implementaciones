import {
  CircleAlert,
  CircleCheck,
  Info,
  Minus,
  TriangleAlert,
} from "lucide-react"
import type { MockRecord } from "./data"

export type SemanticTone =
  | "ok"
  | "info"
  | "caution"
  | "alert"
  | "critical"
  | "neutral"

const toneIcons = {
  ok: CircleCheck,
  info: Info,
  caution: TriangleAlert,
  alert: TriangleAlert,
  critical: CircleAlert,
  neutral: Minus,
} satisfies Record<SemanticTone, typeof CircleCheck>

export function TonePill({
  tone,
  children,
  className = "",
}: {
  tone: SemanticTone
  children: React.ReactNode
  className?: string
}) {
  const Icon = toneIcons[tone]

  return (
    <span className={`tone-pill tone-${tone} ${className}`.trim()}>
      <Icon aria-hidden="true" />
      <span>{children}</span>
    </span>
  )
}

export function formatDate(value: string | null) {
  if (!value) return "—"

  const [year, month, day] = value.split("-").map(Number)
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits }).format(value)
}

export function recordPercent(record: MockRecord) {
  if (record.hoursContracted <= 0) return null
  return Math.round((record.hoursConsumed / record.hoursContracted) * 1000) / 10
}

export function consumptionState(record: MockRecord): {
  label: string
  tone: SemanticTone
  percent: number | null
} {
  const percent = recordPercent(record)

  if (percent === null) {
    return { label: "Sin horas contratadas", tone: "neutral", percent }
  }

  if (percent > 100) {
    return { label: "Excedido", tone: "critical", percent }
  }

  if (percent === 100) {
    return { label: "Completo", tone: "ok", percent }
  }

  if (percent >= 90) {
    return { label: "Próximo a agotar", tone: "caution", percent }
  }

  if (percent < 25) {
    return { label: "Bajo consumo", tone: "info", percent }
  }

  return { label: "Consumo normal", tone: "ok", percent }
}

export function stageTone(stage: MockRecord["stage"]): SemanticTone {
  if (stage === "Implementación finalizada") return "ok"
  if (stage === "En pausa") return "caution"
  if (stage === "No iniciada") return "neutral"
  return "info"
}

export function StatusPill({
  stage,
  className = "",
}: {
  stage: MockRecord["stage"]
  className?: string
}) {
  return (
    <TonePill tone={stageTone(stage)} className={className}>
      {stage}
    </TonePill>
  )
}

export function PercentMeter({ record }: { record: MockRecord }) {
  const state = consumptionState(record)

  if (state.percent === null) {
    return (
      <div className="percent-meter percent-meter--neutral">
        <span className="percent-meter-track" aria-hidden="true">
          <span className="percent-meter-fill" style={{ width: "0%" }} />
        </span>
        <span className="percent-meter-value">—</span>
        <TonePill tone={state.tone}>{state.label}</TonePill>
      </div>
    )
  }

  const meterValue = Math.min(Math.max(state.percent, 0), 100)

  return (
    <div className={`percent-meter percent-meter--${state.tone}`}>
      <span
        className="percent-meter-track"
        role="meter"
        aria-label={`Consumo de horas: ${state.percent}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={meterValue}
      >
        <span
          className="percent-meter-fill"
          style={{ width: `${meterValue}%` }}
        />
      </span>
      <span className="percent-meter-value">{state.percent}%</span>
      <TonePill tone={state.tone}>{state.label}</TonePill>
    </div>
  )
}
