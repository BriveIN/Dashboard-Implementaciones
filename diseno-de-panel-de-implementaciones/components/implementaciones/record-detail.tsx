"use client"

import { useMemo } from "react"
import {
  ChevronDown,
  CircleAlert,
  ExternalLink,
  FileClock,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MockActivity, MockRecord } from "./data"
import {
  featuredChangeHistory,
  featuredRecordActivities,
  featuredStageHistory,
} from "./data"
import { ActivityList } from "./activity-list"
import {
  consumptionState,
  formatDate,
  formatNumber,
  PercentMeter,
  recordPercent,
  StatusPill,
  TonePill,
} from "./ui"

const groupOrder = [
  "Kickoff",
  "Planeación",
  "Ejecución",
  "Análisis",
  "Otras",
  "Entrega final",
]

const sectionExamples = [
  { group: "Kickoff", status: "Completa con actividad", tone: "ok" as const },
  { group: "Planeación", status: "Completa sin actividad", tone: "neutral" as const },
  { group: "Ejecución", status: "Con actividad", tone: "info" as const },
  { group: "Análisis", status: "Incompleta en captura", tone: "caution" as const },
  { group: "Otras", status: "No genera actividad", tone: "neutral" as const },
  { group: "Entrega final", status: "Sin datos", tone: "neutral" as const },
]

function generatedActivitySamples(record: MockRecord): MockActivity[] {
  if (record.id === "IMP-008") return featuredRecordActivities

  const groups = ["Kickoff", "Planeación", "Ejecución", "Análisis", "Entrega final"] as const
  const amount = Math.min(record.activityCount, 8)

  return Array.from({ length: amount }, (_, index) => {
    const sectionNumber = String(index + 1).padStart(2, "0")
    return {
      id: `${record.id}-ACT-${sectionNumber}`,
      subject: `Sección [nombre pendiente ${sectionNumber}] completado - ${record.account}`,
      section: `Nombre pendiente ${sectionNumber}`,
      group: groups[index % groups.length],
      stage: record.stage,
      date: record.kickoffReal ?? record.createdAt,
      hours: index === 0 ? 2.5 : 1.5,
      preview: "Se registró avance de muestra para visualizar el detalle de la actividad.",
      summary: "Este resumen es contenido de muestra para la maqueta. Los nombres de sección y los datos reales deben venir del catálogo del panel.",
      recordId: record.id,
      recordName: record.account,
    }
  })
}

function generatedChangeHistory(record: MockRecord) {
  if (record.id === "IMP-008") return featuredChangeHistory
  if (!record.changeCount) return []

  return Array.from({ length: Math.min(record.changeCount, 3) }, (_, index) => ({
    milestone: `Hito ${String(index + 1).padStart(2, "0")} · nombre pendiente`,
    previous: record.kickoffAgreed ?? record.createdAt,
    next: record.kickoffReal ?? record.lastStageChange,
    deviation: "+1 día · atraso",
    recordedAt: record.lastStageChange,
  }))
}

export function RecordDetail({
  record,
  onClose,
  idSuffix,
}: {
  record: MockRecord
  onClose: () => void
  idSuffix: "desktop" | "mobile"
}) {
  const activities = useMemo(() => generatedActivitySamples(record), [record])
  const changes = useMemo(() => generatedChangeHistory(record), [record])
  const consumption = consumptionState(record)
  const remaining = record.hoursContracted - record.hoursConsumed
  const percent = recordPercent(record)
  const stageHistory = featuredStageHistory

  return (
    <section
      className="record-detail-panel"
      id={`detail-${record.id}-${idSuffix}`}
      aria-labelledby={`detail-heading-${record.id}-${idSuffix}`}
    >
      <header className="record-detail-header">
        <div>
          <p className="eyebrow">Detalle del registro · {record.id}</p>
          <h3 id={`detail-heading-${record.id}-${idSuffix}`}>{record.account}</h3>
          <p className="record-detail-subtitle">
            {record.name} <span aria-hidden="true">·</span> {record.solution}
          </p>
        </div>
        <div className="record-detail-actions">
          <Button
            type="button"
            variant="outline"
            className="dashboard-button"
            title="En Salesforce, este botón abriría el registro estándar."
          >
            <ExternalLink data-icon="inline-start" aria-hidden="true" />
            Abrir registro
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="dashboard-button close-detail-button"
            onClick={onClose}
            aria-label="Cerrar detalle del registro"
          >
            <X aria-hidden="true" />
            <span>Cerrar</span>
          </Button>
        </div>
      </header>

      <details className="detail-section" open>
        <summary className="detail-section-summary">
          <span className="detail-section-heading">
            <span className="detail-section-index">1</span>
            <span>Información general</span>
          </span>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="detail-section-content">
          <dl className="record-info-grid">
            <div><dt>Tipo</dt><dd>{record.kind}</dd></div>
            <div><dt>Etapa</dt><dd><StatusPill stage={record.stage} /></dd></div>
            <div><dt>Cuenta</dt><dd>{record.account}</dd></div>
            <div><dt>Responsable</dt><dd className={record.responsible ? "" : "text-critical"}>{record.responsible ?? "Sin responsable"}</dd></div>
            <div><dt>Asociado</dt><dd>{record.associate}</dd></div>
            <div><dt>Propietario</dt><dd>{record.owner}</dd></div>
            <div><dt>Contacto</dt><dd>{record.contact}</dd></div>
            <div><dt>Solución</dt><dd>{record.solution}</dd></div>
            <div><dt>Póliza</dt><dd>{record.policy}</dd></div>
            <div><dt>Kickoff acordado</dt><dd>{formatDate(record.kickoffAgreed)}</dd></div>
            <div><dt>Kickoff</dt><dd>{formatDate(record.kickoffReal)}</dd></div>
            <div><dt>Último cambio de etapa</dt><dd>{formatDate(record.lastStageChange)}</dd></div>
            <div><dt>Creación</dt><dd>{formatDate(record.createdAt)}</dd></div>
          </dl>
        </div>
      </details>

      <details className="detail-section" open>
        <summary className="detail-section-summary">
          <span className="detail-section-heading">
            <span className="detail-section-index">2</span>
            <span>Horas</span>
          </span>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="detail-section-content">
          <div className="hours-chain" aria-label="Contratadas, consumidas, restantes y porcentaje utilizado">
            <div className="hours-chain-step">
              <span>Contratadas</span>
              <strong>{formatNumber(record.hoursContracted)} h</strong>
            </div>
            <span className="hours-chain-arrow" aria-hidden="true">→</span>
            <div className="hours-chain-step">
              <span>Consumidas</span>
              <strong>{formatNumber(record.hoursConsumed)} h</strong>
            </div>
            <span className="hours-chain-arrow" aria-hidden="true">→</span>
            <div className={`hours-chain-step ${remaining < 0 ? "text-critical" : ""}`}>
              <span>Restantes</span>
              <strong>{formatNumber(remaining)} h</strong>
            </div>
            <span className="hours-chain-arrow" aria-hidden="true">→</span>
            <div className="hours-chain-step hours-chain-percent">
              <span>% utilizado</span>
              <strong>{percent === null ? "—" : `${percent}%`}</strong>
              <TonePill tone={consumption.tone}>{consumption.label}</TonePill>
            </div>
          </div>

          <div className="record-detail-meter">
            <div className="detail-meter-heading">
              <span>Consumo de horas</span>
              <span>{percent === null ? "Sin horas contratadas" : `${percent}%`}</span>
            </div>
            <PercentMeter record={record} />
          </div>

          <div className="subsection-heading-row">
            <div>
              <h4>Actividades que consumieron horas</h4>
              <p>La duración se lee de la descripción de la Task.</p>
            </div>
            <span className="small-count">{activities.length} de muestra</span>
          </div>
          <div className="table-scroll compact-table-scroll">
            <table className="dashboard-table compact-table">
              <thead>
                <tr>
                  <th scope="col">Actividad</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Horas</th>
                </tr>
              </thead>
              <tbody>
                {activities.slice(0, 4).map((activity) => (
                  <tr key={`hours-${activity.id}`}>
                    <td>{activity.subject}</td>
                    <td>{formatDate(activity.date)}</td>
                    <td>{formatNumber(activity.hours, 1)} h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="inline-note inline-note--info" role="note">
            <CircleAlert aria-hidden="true" />
            <span>Puede haber horas consumidas que no estén ligadas a una actividad fechada desde el corte.</span>
          </div>
          <p className="calculation-note">
            Restantes y porcentaje de esta vista se calculan como contratadas menos consumidas y consumidas entre contratadas.
          </p>
        </div>
      </details>

      <details className="detail-section" open>
        <summary className="detail-section-summary">
          <span className="detail-section-heading">
            <span className="detail-section-index">3</span>
            <span>Avance por etapa y sección</span>
          </span>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="detail-section-content">
          <p className="section-placeholder-note">
            El análisis indica 27 secciones; sus nombres no se compartieron y se muestran como marcadores.
          </p>
          <div className="section-groups">
            {groupOrder.map((group, index) => {
              const example = sectionExamples[index]
              return (
                <details className="section-group" key={group} open={index === 0}>
                  <summary>
                    <span>{group}</span>
                    <TonePill tone={example.tone}>{example.status}</TonePill>
                    <ChevronDown aria-hidden="true" />
                  </summary>
                  <div className="section-group-content">
                    <details className="captured-data">
                      <summary>Datos capturados <ChevronDown aria-hidden="true" /></summary>
                      <dl className="captured-data-grid">
                        <div><dt>Campo del flujo · nombre pendiente</dt><dd>Dato de muestra</dd></div>
                        <div><dt>Campo requerido · nombre pendiente</dt><dd>Valor de muestra</dd></div>
                      </dl>
                    </details>
                    <details className="captured-data">
                      <summary>Actividad generada <ChevronDown aria-hidden="true" /></summary>
                      <p>
{example.status === "Completa con actividad" || example.status === "Con actividad"
            ? "Task de muestra · nombre de sección pendiente · desde el corte"
            : "Sin actividad asociada en esta muestra."}
                      </p>
                    </details>
                  </div>
                </details>
              )
            })}
          </div>
          <div className="available-sections">
            <h4>Secciones disponibles para la solución que no se seleccionaron</h4>
            <div className="available-section-tags">
              <span>Sección disponible · nombre pendiente</span>
              <span>Sección disponible · nombre pendiente</span>
            </div>
          </div>
        </div>
      </details>

      <details className="detail-section">
        <summary className="detail-section-summary">
          <span className="detail-section-heading">
            <span className="detail-section-index">4</span>
            <span>Actividades</span>
          </span>
          <span className="detail-section-count">{record.activityCount}</span>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="detail-section-content">
          {activities.length ? (
            <ActivityList
              activities={activities}
              initialVisible={activities.length}
              showLoadMore={false}
            />
          ) : (
            <p className="empty-inline">Sin actividades desde el corte.</p>
          )}
        </div>
      </details>

      <details className="detail-section">
        <summary className="detail-section-summary">
          <span className="detail-section-heading">
            <span className="detail-section-index">5</span>
            <span>Controles de cambio</span>
          </span>
          <span className="detail-section-count">{record.changeCount}</span>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="detail-section-content">
          {changes.length ? (
            <div className="table-scroll compact-table-scroll">
              <table className="dashboard-table compact-table">
                <thead>
                  <tr>
                    <th scope="col">Hito</th>
                    <th scope="col">Fecha anterior</th>
                    <th scope="col">Fecha nueva</th>
                    <th scope="col">Desviación</th>
                    <th scope="col">Fecha de registro</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((change, index) => (
                    <tr key={`${change.milestone}-${index}`}>
                      <td>{change.milestone}</td>
                      <td>{formatDate(change.previous)}</td>
                      <td>{formatDate(change.next)}</td>
                      <td><TonePill tone="alert">{change.deviation}</TonePill></td>
                      <td>{formatDate(change.recordedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-inline">Sin controles de cambio desde el corte.</p>
          )}

          <div className="pause-summary-grid">
            <div className="pause-summary-card">
              <span>Contador de pausas</span>
              <strong>{record.pauseCount}</strong>
            </div>
            <div className="pause-summary-card">
              <span>Tiempo total en pausa</span>
              <strong>{formatNumber(record.pauseHours, 1)} h</strong>
            </div>
            <div className="pause-summary-card pause-summary-card--wide">
              <span>Motivo</span>
              <strong>{record.pauseReason}</strong>
            </div>
          </div>
          <div className="pause-history-row">
            <span className="detail-caption">Historial de pausas</span>
            {record.pauseDate ? (
              <p>{formatDate(record.pauseDate)} · {record.pauseReason} · {formatNumber(record.pauseHours, 1)} h</p>
            ) : (
              <p>Sin pausas registradas desde el corte.</p>
            )}
          </div>
          <div className="subsection-heading-row stage-history-heading">
            <div>
              <h4>Tiempo por etapa</h4>
              <p>Horas acumuladas según los historiales.</p>
            </div>
            <FileClock aria-hidden="true" />
          </div>
          <div className="table-scroll compact-table-scroll">
            <table className="dashboard-table compact-table">
              <thead>
                <tr><th scope="col">Etapa</th><th scope="col">Tiempo</th></tr>
              </thead>
              <tbody>
                {stageHistory.map((item) => (
                  <tr key={item.stage}><td>{item.stage}</td><td>{formatNumber(item.hours)} h</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </section>
  )
}

export function DetailToggleLabel({ open }: { open: boolean }) {
  return (
    <span className="detail-toggle-label">
      {open ? "Cerrar detalle" : "Ver detalle"}
      <ChevronDown aria-hidden="true" />
    </span>
  )
}
