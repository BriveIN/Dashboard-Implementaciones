"use client"

import { Button } from "@/components/ui/button"
import {
  AlertCircle,
  ChevronDown,
  CircleHelp,
  LoaderCircle,
  Search,
  X,
} from "lucide-react"

export interface FilterChip {
  id: string
  label: string
}

const filterOptions = [
  {
    label: "Estatus",
    options: ["No iniciada", "Agendada", "Kickoff", "En proceso", "Entrega final", "Implementación finalizada", "En pausa"],
  },
  {
    label: "Responsable",
    options: ["Fernanda Solís", "Julio Cárdenas", "Renata Lozano", "Sin responsable"],
  },
  {
    label: "Asociado",
    options: ["Diego Herrera", "Marisol Ponce", "Rafael Cruz", "Sandra Vélez"],
  },
  {
    label: "Cuenta comercial",
    options: ["Grupo Andares", "Universidad del Valle Norte", "Hospital Santa Elena", "Cuenta Patito del Bajío"],
  },
  {
    label: "Solución adquirida",
    options: ["Evaluatest", "Entorno+", "Evou"],
  },
  {
    label: "Controles de cambio",
    options: ["Con controles", "Sin controles"],
  },
  {
    label: "Consumo de horas",
    options: ["Bajo consumo", "Consumo normal", "Próximo a agotar", "Completo", "Excedido", "Sin horas contratadas"],
  },
  {
    label: "Actividades realizadas (por grupo)",
    options: ["Kickoff", "Planeación", "Ejecución", "Análisis", "Entrega final"],
  },
]

export function FilterPanel({
  open,
  onToggle,
  chips,
  onRemoveChip,
  onClearChips,
}: {
  open: boolean
  onToggle: () => void
  chips: FilterChip[]
  onRemoveChip: (id: string) => void
  onClearChips: () => void
}) {
  return (
    <section className="filter-panel surface-card" aria-labelledby="filters-heading">
      <div className="filter-summary">
        <div className="filter-summary-main">
          <div className="filter-period-summary">
            <span className="filter-period-label">Periodo</span>
            <strong>01–07 oct 2026</strong>
          </div>
          <div className="active-filter-area">
            <span className="active-filter-label">Filtros activos</span>
            <div className="active-filter-chips" aria-label={`${chips.length} filtros activos de muestra`}>
              {chips.length ? (
                chips.map((chip) => (
                  <span className="filter-chip" key={chip.id}>
                    <span>{chip.label}</span>
                    <button
                      className="filter-chip-remove"
                      type="button"
                      aria-label={`Quitar filtro ${chip.label}`}
                      onClick={() => onRemoveChip(chip.id)}
                    >
                      <X aria-hidden="true" />
                    </button>
                  </span>
                ))
              ) : (
                <span className="no-active-filters">Sin filtros activos</span>
              )}
            </div>
          </div>
        </div>
        <div className="filter-summary-actions">
          <Button
            type="button"
            variant="ghost"
            className="dashboard-button clear-filters-button"
            onClick={onClearChips}
            disabled={!chips.length}
          >
            Quitar todos
          </Button>
          <Button
            type="button"
            variant="outline"
            className="dashboard-button toggle-filters-button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls="filter-fields"
          >
            {open ? "Ocultar filtros" : "Cambiar filtros"}
            <ChevronDown data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {open ? (
        <div className="filter-fields" id="filter-fields">
          <div className="filter-topline">
            <h2 id="filters-heading">Filtros</h2>
            <p>La vista muestra controles de referencia con datos ficticios.</p>
          </div>

          <div className="cutoff-row">
            <div className="cutoff-notice" role="note">
              <CircleHelp aria-hidden="true" />
              <span><strong>Corte de información:</strong> se incluyen registros, actividades y cambios desde el 1 de octubre de 2026.</span>
            </div>
            <label className="test-account-switch">
              <span className="test-switch-copy">
                <span>Cuenta de pruebas</span>
                <strong>Visible</strong>
              </span>
              <input type="checkbox" role="switch" defaultChecked aria-label="Cuenta de pruebas visible" />
              <span className="switch-track" aria-hidden="true"><span /></span>
            </label>
          </div>

          <div className="filter-grid">
            {filterOptions.map((filter) => (
              <label className="field-control" key={filter.label}>
                <span>{filter.label}</span>
                <select defaultValue="" aria-label={filter.label}>
                  <option value="">Todos</option>
                  {filter.options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="period-filter-row">
            <label className="field-control period-type-control">
              <span>Rango según</span>
              <select defaultValue="Creación" aria-label="Rango según">
                <option>Creación</option>
                <option>Kickoff acordado</option>
                <option>Kickoff</option>
                <option>Último cambio de etapa</option>
              </select>
            </label>
            <label className="field-control">
              <span>Desde</span>
              <input type="date" min="2026-10-01" defaultValue="2026-10-01" aria-label="Fecha desde" />
            </label>
            <label className="field-control">
              <span>Hasta</span>
              <input type="date" min="2026-10-01" defaultValue="2026-10-07" aria-label="Fecha hasta" />
            </label>
            <p className="date-range-help">No se permiten fechas anteriores al corte.</p>
          </div>

          <details className="screen-states-panel">
            <summary>
              <span>Estados de pantalla</span>
              <span className="state-summary-caption">4 variantes de la maqueta</span>
              <ChevronDown aria-hidden="true" />
            </summary>
            <div className="screen-state-grid">
              <article className="screen-state-card">
                <span className="screen-state-label"><LoaderCircle aria-hidden="true" /> Cargando</span>
                <span className="loading-indicator" role="status" aria-label="Cargando datos de muestra">
                  <LoaderCircle aria-hidden="true" />
                </span>
                <p>Cargando implementaciones y proyectos…</p>
              </article>
              <article className="screen-state-card screen-state-card--error" role="alert">
                <span className="screen-state-label"><AlertCircle aria-hidden="true" /> Error</span>
                <p>No fue posible cargar los datos de Apex.</p>
                <Button type="button" variant="outline" className="state-example-button">Actualizar</Button>
              </article>
              <article className="screen-state-card">
                <span className="screen-state-label"><CircleHelp aria-hidden="true" /> Sin datos</span>
                <p>No hay registros desde el 1 de octubre de 2026.</p>
              </article>
              <article className="screen-state-card">
                <span className="screen-state-label"><Search aria-hidden="true" /> Sin resultados</span>
                <p>Ningún registro coincide con los filtros de muestra.</p>
                <Button type="button" variant="ghost" className="state-example-button" onClick={onClearChips}>Quitar todos</Button>
              </article>
            </div>
            <div className="control-states">
              <span className="control-states-title">Estados de controles</span>
              <div className="control-state-examples">
                <button type="button" className="state-demo-button">Normal</button>
                <button type="button" className="state-demo-button state-demo-hover">Hover</button>
                <button type="button" className="state-demo-button state-demo-selected" aria-pressed="true">Seleccionado</button>
                <button type="button" className="state-demo-button state-demo-focus">Foco visible</button>
                <button type="button" className="state-demo-button" disabled>Deshabilitado</button>
              </div>
            </div>
          </details>
        </div>
      ) : null}
    </section>
  )
}
