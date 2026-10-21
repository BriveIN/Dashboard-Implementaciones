"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, ExternalLink, FileClock } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MockActivity } from "./data"
import { formatDate, formatNumber } from "./ui"

export function ActivityList({
  activities,
  withGroupSelector = false,
  initialVisible = activities.length,
  pageSize = 8,
  showLoadMore = true,
  showGroupActions = true,
}: {
  activities: MockActivity[]
  withGroupSelector?: boolean
  initialVisible?: number
  pageSize?: number
  showLoadMore?: boolean
  showGroupActions?: boolean
}) {
  const [visibleCount, setVisibleCount] = useState(initialVisible)
  const [openIds, setOpenIds] = useState<string[]>([])
  const visibleActivities = useMemo(
    () => activities.slice(0, visibleCount),
    [activities, visibleCount]
  )
  const allVisibleOpen =
    visibleActivities.length > 0 &&
    visibleActivities.every((activity) => openIds.includes(activity.id))

  const toggleActivity = (id: string, isOpen: boolean) => {
    setOpenIds((current) =>
      isOpen
        ? current.includes(id)
          ? current
          : [...current, id]
        : current.filter((openId) => openId !== id)
    )
  }

  const toggleAll = () => {
    setOpenIds((current) => {
      if (allVisibleOpen) {
        return current.filter(
          (id) => !visibleActivities.some((activity) => activity.id === id)
        )
      }
      return Array.from(
        new Set([...current, ...visibleActivities.map((activity) => activity.id)])
      )
    })
  }

  return (
    <div className="activity-list">
      <div className="activity-list-toolbar">
        {withGroupSelector ? (
          <label className="field-control activity-group-select">
            <span>Grupo</span>
            <select defaultValue="Todos los grupos" aria-label="Seleccionar grupo de actividad">
              <option>Todos los grupos</option>
              <option>Kickoff</option>
              <option>Planeación</option>
              <option>Ejecución</option>
              <option>Análisis</option>
              <option>Entrega final</option>
            </select>
          </label>
        ) : (
          <p className="activity-list-count">
            {activities.length} actividades de muestra
          </p>
        )}
        {showGroupActions ? (
          <Button
            type="button"
            variant="outline"
            className="dashboard-button activity-toggle-all"
            onClick={toggleAll}
          >
            {allVisibleOpen ? (
              <ChevronUp data-icon="inline-start" aria-hidden="true" />
            ) : (
              <ChevronDown data-icon="inline-start" aria-hidden="true" />
            )}
            {allVisibleOpen ? "Cerrar todas" : "Abrir todas"}
          </Button>
        ) : null}
      </div>

      <div className="activity-list-items">
        {visibleActivities.map((activity) => (
          <details
            className="activity-item"
            key={activity.id}
            open={openIds.includes(activity.id)}
            onToggle={(event) =>
              toggleActivity(
                activity.id,
                (event.currentTarget as HTMLDetailsElement).open
              )
            }
          >
            <summary className="activity-item-summary">
              <span className="activity-item-chevron" aria-hidden="true">
                <ChevronDown />
              </span>
              <span className="activity-item-copy">
                <span className="activity-item-title">{activity.subject}</span>
                <span className="activity-item-meta">
                  <span>{activity.section}</span>
                  <span>{activity.stage}</span>
                  <span>{formatDate(activity.date)}</span>
                  <span>{formatNumber(activity.hours, 1)} h</span>
                </span>
                <span className="activity-item-preview">{activity.preview}</span>
              </span>
            </summary>
            <div className="activity-item-detail">
              <div>
                <span className="detail-caption">Resumen completo</span>
                <p>{activity.summary}</p>
              </div>
              <div className="activity-links">
                <a className="inline-link" href={`#record-${activity.recordId}`}>
                  <ExternalLink aria-hidden="true" />
                  Abrir registro · {activity.recordName}
                </a>
                <span className="activity-session-link">
                  <FileClock aria-hidden="true" />
                  Liga de sesión · muestra
                </span>
              </div>
            </div>
          </details>
        ))}
      </div>

      {showLoadMore && visibleCount < activities.length ? (
        <div className="activity-load-more">
          <Button
            type="button"
            variant="outline"
            className="dashboard-button"
            onClick={() => setVisibleCount((count) => Math.min(count + pageSize, activities.length))}
          >
            Cargar {Math.min(pageSize, activities.length - visibleCount)} más
          </Button>
          <span>
            Mostrando {visibleActivities.length} de {activities.length}
          </span>
        </div>
      ) : null}
    </div>
  )
}
