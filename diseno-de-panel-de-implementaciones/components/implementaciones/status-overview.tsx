"use client"

import {
  AlertTriangle,
  ArrowRight,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  Clock3,
  FileClock,
  Layers3,
  UserRoundX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  accountBars,
  allRecords,
  associateBars,
  attentionCounts,
  changeRecordsPreview,
  responsibleBars,
  solutionBars,
  stagePath,
  stagePreviews,
  type ProjectStage,
} from "./data"
import { HorizontalBars } from "./horizontal-bars"
import { formatNumber, StatusPill, TonePill } from "./ui"

const recordById = new Map(allRecords.map((record) => [record.id, record]))

export function IndicatorCards({
  controlListOpen,
  onToggleControlList,
  onOpenRecord,
}: {
  controlListOpen: boolean
  onToggleControlList: () => void
  onOpenRecord: (recordId: string) => void
}) {
  const metrics = [
    {
      label: "Registros",
      value: "21",
      note: "13 implementaciones · 8 proyectos",
      icon: Layers3,
    },
    {
      label: "Actividades generadas",
      value: "65",
      note: "Tasks desde el corte",
      icon: ChartNoAxesColumnIncreasing,
    },
    {
      label: "Registros con controles de cambio",
      value: "10",
      note: "12 cambios de fecha de hitos",
      icon: FileClock,
      interactive: true,
    },
    {
      label: "Controles de cambio",
      value: "12",
      note: "Cambios de fecha registrados",
      icon: Clock3,
    },
  ]

  return (
    <section className="dashboard-section" aria-labelledby="indicators-heading">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Resumen ejecutivo</p>
          <h2 id="indicators-heading">Indicadores</h2>
        </div>
        <p className="section-caption">Corte desde el 1 de octubre de 2026</p>
      </div>
      <div className="metrics-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Card className={`dashboard-card metric-card ${metric.interactive ? "metric-card--interactive" : ""}`} key={metric.label}>
              <CardHeader className="metric-card-header">
                <span className="metric-icon" aria-hidden="true"><Icon /></span>
                <CardTitle className="metric-label" role="heading" aria-level={3}>{metric.label}</CardTitle>
              </CardHeader>
              <CardContent className="metric-card-content">
                <strong className="metric-value">{metric.value}</strong>
                <span className="metric-note">{metric.note}</span>
                {metric.interactive ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="metric-action"
                    onClick={onToggleControlList}
                    aria-expanded={controlListOpen}
                    aria-controls="records-with-controls"
                  >
                    {controlListOpen ? "Ocultar registros" : "Ver registros"}
                    <ChevronRight data-icon="inline-end" aria-hidden="true" />
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {controlListOpen ? (
        <div className="record-preview-list" id="records-with-controls" aria-live="polite">
          <div className="preview-list-heading">
            <div>
              <h3>Registros con controles de cambio</h3>
              <p>Vista de muestra · 3 de 10 registros</p>
            </div>
            <TonePill tone="alert">12 controles</TonePill>
          </div>
          <div className="preview-list-items">
            {changeRecordsPreview.map((item) => (
              <button
                type="button"
                className="preview-record-button"
                key={item.id}
                onClick={() => onOpenRecord(item.id)}
              >
                <span className="preview-record-name">{item.account}</span>
                <span className="preview-record-meta">{item.id} · {item.changes} {item.changes === 1 ? "cambio" : "cambios"}</span>
                <ChevronRight aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export function CurrentStatus({
  selectedStage,
  onSelectStage,
  onOpenRecord,
}: {
  selectedStage: ProjectStage | null
  onSelectStage: (stage: ProjectStage | null) => void
  onOpenRecord: (recordId: string) => void
}) {
  const openStage = (stage: ProjectStage) => {
    onSelectStage(selectedStage === stage ? null : stage)
  }

  return (
    <section className="dashboard-section" aria-labelledby="current-status-heading">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Seguimiento operativo</p>
          <h2 id="current-status-heading">Estatus actual</h2>
        </div>
        <span className="section-caption">El estatus no depende de las actividades.</span>
      </div>

      <div className="stage-path" aria-label="Camino de etapas">
        {stagePath.map((stage, index) => (
          <div className="stage-path-item" key={stage.label}>
            <Button
              type="button"
              variant="outline"
              className={`stage-button ${selectedStage === stage.label ? "stage-button--selected" : ""}`}
              aria-pressed={selectedStage === stage.label}
              onClick={() => openStage(stage.label)}
            >
              <span className="stage-button-label">{stage.label}</span>
              <strong>{formatNumber(stage.count)}</strong>
              {stage.activityCount !== null ? (
                <span className="stage-activity-note">{stage.activityCount} con su actividad</span>
              ) : null}
            </Button>
            {index < stagePath.length - 1 ? <ArrowRight className="stage-path-arrow" aria-hidden="true" /> : null}
          </div>
        ))}
      </div>

      <div className="pause-stage-row">
        <div className="pause-stage-card">
          <span className="pause-stage-mark" aria-hidden="true"><Clock3 /></span>
          <div>
            <span className="pause-stage-caption">Condición especial</span>
            <strong>En pausa</strong>
          </div>
          <span className="pause-stage-count">2</span>
          <Button
            type="button"
            variant="ghost"
            className="pause-stage-action"
            aria-pressed={selectedStage === "En pausa"}
            onClick={() => openStage("En pausa")}
          >
            {selectedStage === "En pausa" ? "Ocultar lista" : "Ver registros"}
          </Button>
        </div>
      </div>

      {selectedStage ? (
        <div className="stage-preview-list" aria-live="polite">
          <div className="preview-list-heading">
            <div>
              <h3>Muestra de registros · {selectedStage}</h3>
              <p>Selección visual de ejemplo; no modifica los datos de las tablas.</p>
            </div>
            <Button type="button" variant="ghost" className="dashboard-button" onClick={() => onSelectStage(null)}>
              Cerrar lista
            </Button>
          </div>
          <div className="preview-list-items">
            {stagePreviews[selectedStage].map((id) => {
              const record = recordById.get(id)
              if (!record) return null
              return (
                <button
                  type="button"
                  className="preview-record-button"
                  key={id}
                  onClick={() => onOpenRecord(id)}
                >
                  <span className="preview-record-name">{record.account}</span>
                  <span className="preview-record-meta">{record.id} · {record.kind} · {record.solution}</span>
                  <StatusPill stage={record.stage} />
                  <ChevronRight aria-hidden="true" />
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="attention-heading">
        <div>
          <p className="eyebrow">Prioridad</p>
          <h3>Requiere atención</h3>
        </div>
        <span className="section-caption">Avisos de muestra</span>
      </div>
      <div className="attention-grid">
        <article className="attention-card tone-card-critical">
          <span className="attention-icon"><AlertTriangle aria-hidden="true" /></span>
          <div><span>Horas excedidas</span><strong>{attentionCounts.hoursExceeded}</strong></div>
          <TonePill tone="critical">Crítico</TonePill>
        </article>
        <article className="attention-card tone-card-caution">
          <span className="attention-icon"><Clock3 aria-hidden="true" /></span>
          <div><span>Próximos a agotar horas</span><strong>{attentionCounts.hoursNearLimit}</strong></div>
          <TonePill tone="caution">90% o más</TonePill>
        </article>
        <article className="attention-card tone-card-alert">
          <span className="attention-icon"><FileClock aria-hidden="true" /></span>
          <div><span>Con controles de cambio</span><strong>{attentionCounts.recordsWithChanges}</strong></div>
          <TonePill tone="alert">Revisar fechas</TonePill>
        </article>
        <article className="attention-card tone-card-alert">
          <span className="attention-icon"><UserRoundX aria-hidden="true" /></span>
          <div><span>Sin responsable</span><strong>{attentionCounts.withoutResponsible}</strong></div>
          <TonePill tone="alert">Asignación pendiente</TonePill>
        </article>
      </div>
      <p className="stage-footnote">
        Un registro puede estar en una etapa sin haber completado todas sus secciones.
      </p>
    </section>
  )
}

export function DistributionCharts() {
  return (
    <section className="dashboard-section" aria-labelledby="distribution-heading">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Distribución</p>
          <h2 id="distribution-heading">Dónde se concentran</h2>
        </div>
        <span className="section-caption">Top 8 · selección visual, sin aplicar filtros</span>
      </div>
      <div className="distribution-grid">
        <HorizontalBars title="Por solución" description="Registros por solución adquirida" data={solutionBars} />
        <HorizontalBars title="Por responsable" description="Incluye registros sin responsable" data={responsibleBars} />
        <HorizontalBars title="Por asociado" description="Registros por persona asociada" data={associateBars} />
        <HorizontalBars title="Por cuenta comercial" description="Cuentas con más registros" data={accountBars} />
      </div>
    </section>
  )
}
