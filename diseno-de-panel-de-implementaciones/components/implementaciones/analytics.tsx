"use client"

import { useState } from "react"
import { ChevronDown, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  activityGroups,
  activityHoursBySection,
  activityHoursByStage,
  activitySectionBars,
  activitySolutionBars,
  activityStageBars,
  consumptionStateCounts,
  durationByType,
  globalHours,
  largestDateDeviations,
  milestoneChangeBars,
  mostChangedBars,
  recentActivities,
  stageHistoryHours,
  topConsumptionBars,
} from "./data"
import { ActivityList } from "./activity-list"
import { HorizontalBars } from "./horizontal-bars"
import { formatNumber, TonePill } from "./ui"

export function ComplementaryAnalysis() {
  return (
    <section className="dashboard-section analysis-section" aria-labelledby="analysis-heading">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Detalle para seguimiento</p>
          <h2 id="analysis-heading">Análisis complementario</h2>
        </div>
        <span className="section-caption">Los tres bloques empiezan plegados</span>
      </div>

      <details className="analysis-block">
        <summary className="analysis-summary">
          <span className="analysis-letter">A</span>
          <span className="analysis-summary-copy">
            <strong>Actividades</strong>
            <span>Captura, grupos y distribución desde el corte</span>
          </span>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="analysis-content">
          <div className="activity-group-heading">
            <div>
              <h3>Actividades por grupo</h3>
              <p>Selección visual del grupo en esta maqueta.</p>
            </div>
            <TonePill tone="info">65 actividades</TonePill>
          </div>
          <ActivityGroupCards />

          <div className="analysis-chart-grid analysis-chart-grid--three">
            <HorizontalBars
              title="Por sección · top 10"
              description="Los nombres de las 27 secciones están pendientes de confirmar."
              data={activitySectionBars}
              unit="actividades"
            />
            <HorizontalBars
              title="Por etapa"
              description="Actividades ligadas a cada estatus del registro."
              data={activityStageBars}
              unit="actividades"
            />
            <HorizontalBars
              title="Por solución"
              description="Actividades ligadas a la solución adquirida."
              data={activitySolutionBars}
              unit="actividades"
            />
          </div>

          <section className="activity-capture-section" aria-labelledby="activity-capture-heading">
            <div className="subsection-heading-row">
              <div>
                <h3 id="activity-capture-heading">Qué se capturó en cada actividad</h3>
                <p>De la más reciente a la más antigua · carga de 8 en 8.</p>
              </div>
            </div>
            <ActivityList
              activities={recentActivities}
              withGroupSelector
              initialVisible={8}
              pageSize={8}
            />
          </section>
        </div>
      </details>

      <details className="analysis-block">
        <summary className="analysis-summary">
          <span className="analysis-letter">B</span>
          <span className="analysis-summary-copy">
            <strong>Horas contratadas, consumidas y restantes</strong>
            <span>Estados de consumo y distribución de horas</span>
          </span>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="analysis-content">
          <div className="subsection-heading-row">
            <div>
              <h3>Estados de consumo</h3>
              <p>Porcentaje de horas consumidas respecto de las contratadas.</p>
            </div>
          </div>
          <div className="consumption-state-grid">
            {consumptionStateCounts.map((item) => (
              <Card className={`dashboard-card consumption-state-card tone-card-${item.tone}`} key={item.label}>
                <CardHeader className="consumption-state-header">
                  <CardTitle className="consumption-state-label" role="heading" aria-level={4}>{item.label}</CardTitle>
                </CardHeader>
                <CardContent className="consumption-state-content">
                  <strong>{item.count}</strong>
                  <span>registros</span>
                  <TonePill tone={item.tone}>{item.label}</TonePill>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="inline-note inline-note--info threshold-note" role="note">
            <Info aria-hidden="true" />
            <span>Los umbrales de bajo consumo (&lt;25%) y próximo a agotar (90% a menos de 100%) no están confirmados en Salesforce.</span>
          </div>

          <div className="analysis-chart-grid analysis-chart-grid--two">
            <HorizontalBars
              title="Top 8 · registros más avanzados en consumo"
              description="Las barras usan el tono del estado de consumo."
              data={topConsumptionBarsWithValues}
              unit="% consumido"
              selectable={false}
              valueMax={120}
            />
            <div className="hours-global-card surface-card">
              <div className="subsection-heading-row">
                <div>
                  <h3>Horas de actividades</h3>
                  <p>Distribución por etapa y por sección.</p>
                </div>
              </div>
              <div className="hours-reference-line">
                <span>Referencia global · Horas__</span>
                <strong>{formatNumber(globalHours.consumed)} h</strong>
              </div>
              <p className="calculation-note">
                Las horas consumidas del registro vienen del flow; la duración de Task se lee de su descripción.
              </p>
            </div>
          </div>
          <div className="analysis-chart-grid analysis-chart-grid--two">
            <HorizontalBars
              title="Horas de actividades por etapa"
              data={activityHoursByStage}
              unit="h"
              selectable={false}
            />
            <HorizontalBars
              title="Horas de actividades por sección"
              description="Secciones identificadas con marcador temporal."
              data={activityHoursBySection}
              unit="h"
              selectable={false}
            />
          </div>
          <div className="global-hours-summary" aria-label="Suma global de horas">
            <span>Contratadas <strong>{formatNumber(globalHours.contracted)} h</strong></span>
            <span>Consumidas <strong>{formatNumber(globalHours.consumed)} h</strong></span>
            <span>Restantes <strong>{formatNumber(globalHours.remaining)} h</strong></span>
          </div>
        </div>
      </details>

      <details className="analysis-block">
        <summary className="analysis-summary">
          <span className="analysis-letter">C</span>
          <span className="analysis-summary-copy">
            <strong>Tiempos y controles de cambio</strong>
            <span>Duraciones, historiales, hitos y desviaciones</span>
          </span>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="analysis-content">
          <section aria-labelledby="duration-heading">
            <div className="subsection-heading-row">
              <div>
                <h3 id="duration-heading">Duración desde el Kickoff</h3>
                <p>Promedio de días por tipo de registro.</p>
              </div>
            </div>
            <div className="table-scroll compact-table-scroll">
              <table className="dashboard-table compact-table duration-table">
                <thead>
                  <tr>
                    <th scope="col">Tipo</th>
                    <th scope="col">Finalizadas</th>
                    <th scope="col">Abiertas</th>
                  </tr>
                </thead>
                <tbody>
                  {durationByType.map((item) => (
                    <tr key={item.kind}>
                      <th scope="row">{item.kind}</th>
                      <td>{item.finished} días</td>
                      <td>{item.open} días</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="calculation-note">
              Finalizadas: hasta el último cambio de etapa. Abiertas: hasta hoy.
            </p>
          </section>

          <div className="analysis-chart-grid analysis-chart-grid--two">
            <HorizontalBars
              title="Tiempo por etapa"
              description="Horas acumuladas según los historiales."
              data={stageHistoryHours}
              unit="h"
              selectable={false}
            />
            <HorizontalBars
              title="Hitos afectados"
              description="Veces que cambió la fecha de cada hito."
              data={milestoneChangeBars}
              unit="cambios"
              selectable={false}
            />
          </div>

          <div className="analysis-chart-grid analysis-chart-grid--two">
            <HorizontalBars
              title="Registros con más cambios"
              description="Registros con más reprogramaciones desde el corte."
              data={mostChangedBars}
              unit="cambios"
              selectable={false}
            />
            <section className="deviation-section surface-card" aria-labelledby="deviations-heading">
              <div className="subsection-heading-row">
                <div>
                  <h3 id="deviations-heading">Mayores desviaciones de fechas</h3>
                  <p>Las 8 mayores · positivo es atraso, negativo es adelanto.</p>
                </div>
              </div>
              <div className="table-scroll compact-table-scroll">
                <table className="dashboard-table compact-table deviation-table">
                  <thead>
                    <tr>
                      <th scope="col">Registro</th>
                      <th scope="col">Hito</th>
                      <th scope="col">Desviación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {largestDateDeviations.map((item) => (
                      <tr key={`${item.account}-${item.milestone}`}>
                        <td>{item.account}</td>
                        <td>{item.milestone}</td>
                        <td>
                          <TonePill tone={item.deviation > 0 ? "alert" : "info"}>
                            {item.deviation > 0 ? "+" : "−"}{Math.abs(item.deviation)} días · {item.deviation > 0 ? "atraso" : "adelanto"}
                          </TonePill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </details>
    </section>
  )
}

function ActivityGroupCards() {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  return (
    <div className="activity-groups">
      {activityGroups.map((group) => (
        <Button
          type="button"
          variant="outline"
          className={`activity-group-card ${selectedGroup === group.label ? "activity-group-card--selected" : ""}`}
          key={group.label}
          aria-pressed={selectedGroup === group.label}
          onClick={() => setSelectedGroup((current) => current === group.label ? null : group.label)}
        >
          <span className="activity-group-name">{group.label}</span>
          <strong>{group.count}</strong>
          <span>actividades</span>
        </Button>
      ))}
    </div>
  )
}

const topConsumptionBarsWithValues = topConsumptionBars
