"use client"

import { useState } from "react"
import { Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ComplementaryAnalysis } from "./analytics"
import { FilterPanel, type FilterChip } from "./filters"
import { RecordsTable } from "./records-table"
import { CurrentStatus, DistributionCharts, IndicatorCards } from "./status-overview"
import { implementationRecords, projectRecords, type ProjectStage } from "./data"

const initialFilterChips: FilterChip[] = [
  { id: "period", label: "Periodo: 01–07 oct 2026" },
  { id: "test-accounts", label: "Cuenta de pruebas: visible" },
]

const viewTabs = [
  { label: "Vista general", count: 21 },
  { label: "Implementaciones", count: 13 },
  { label: "Proyectos", count: 8 },
]

export function ImplementationsDashboard() {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterChips, setFilterChips] = useState(initialFilterChips)
  const [activeView, setActiveView] = useState("Vista general")
  const [controlListOpen, setControlListOpen] = useState(false)
  const [selectedStage, setSelectedStage] = useState<ProjectStage | null>(null)
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>("IMP-008")

  const handleOpenRecord = (recordId: string) => {
    setExpandedRecordId(recordId)
    window.setTimeout(() => {
      const isMobile = window.matchMedia("(max-width: 820px)").matches
      const target = document.getElementById(
        `${isMobile ? "mobile-" : "record-"}${recordId}`
      )
      target?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 60)
  }

  const handleToggleRecord = (recordId: string) => {
    setExpandedRecordId((current) => current === recordId ? null : recordId)
  }

  const removeFilterChip = (id: string) => {
    setFilterChips((current) => current.filter((chip) => chip.id !== id))
  }

  const focusTab = (index: number) => {
    const nextIndex = (index + viewTabs.length) % viewTabs.length
    const nextTab = viewTabs[nextIndex]
    setActiveView(nextTab.label)
    document.getElementById(`tab-${nextTab.label.toLowerCase().replaceAll(" ", "-")}`)?.focus()
  }

  return (
    <main className="brive-dashboard">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-main">
            <div className="brand-lockup">
              <div className="logo-placeholder" aria-label="Espacio reservado para el logo de Brivé">
                <span>Espacio para logo</span>
              </div>
              <div className="brand-copy">
                <span className="brand-name">Brivé</span>
                <span className="brand-context">Panel de producción</span>
              </div>
            </div>
            <div className="title-block">
              <p className="eyebrow">Seguimiento de delivery</p>
              <h1>Implementaciones y proyectos</h1>
              <p className="updated-copy">Actualizado a las 09:41 · registros desde el 1 de octubre de 2026</p>
            </div>
          </div>
          <div className="header-actions">
            <span className="sample-indicator">Maqueta · datos ficticios</span>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="dashboard-button"
              title="Acción visual de la maqueta; no exporta datos."
            >
              <Download data-icon="inline-start" aria-hidden="true" />
              Exportar CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="dashboard-button refresh-button"
              aria-label="Actualizar panel"
              title="Acción visual de la maqueta; no consulta datos."
            >
              <RefreshCw aria-hidden="true" />
            </Button>
          </div>
        </header>

        <FilterPanel
          open={filtersOpen}
          onToggle={() => setFiltersOpen((current) => !current)}
          chips={filterChips}
          onRemoveChip={removeFilterChip}
          onClearChips={() => setFilterChips([])}
        />

        <div className="view-tabs-row">
          <nav className="view-tabs" aria-label="Vistas del panel" role="tablist">
            {viewTabs.map((tab, index) => (
              <button
                type="button"
                role="tab"
                id={`tab-${tab.label.toLowerCase().replaceAll(" ", "-")}`}
                aria-selected={activeView === tab.label}
                aria-controls="dashboard-view-content"
                tabIndex={activeView === tab.label ? 0 : -1}
                className={activeView === tab.label ? "view-tab view-tab--active" : "view-tab"}
                key={tab.label}
                onClick={() => setActiveView(tab.label)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight") {
                    event.preventDefault()
                    focusTab(index + 1)
                  } else if (event.key === "ArrowLeft") {
                    event.preventDefault()
                    focusTab(index - 1)
                  } else if (event.key === "Home") {
                    event.preventDefault()
                    focusTab(0)
                  } else if (event.key === "End") {
                    event.preventDefault()
                    focusTab(viewTabs.length - 1)
                  }
                }}
              >
                <span>{tab.label}</span>
                <span className="view-tab-count">{tab.count}</span>
              </button>
            ))}
          </nav>
          <span className="view-tab-note">Conteos de muestra · navegación visual</span>
        </div>

        <div
          className="dashboard-view-content"
          id="dashboard-view-content"
          role="tabpanel"
          aria-labelledby={`tab-${activeView.toLowerCase().replaceAll(" ", "-")}`}
          tabIndex={0}
        >
        <IndicatorCards
          controlListOpen={controlListOpen}
          onToggleControlList={() => setControlListOpen((current) => !current)}
          onOpenRecord={handleOpenRecord}
        />

        <CurrentStatus
          selectedStage={selectedStage}
          onSelectStage={setSelectedStage}
          onOpenRecord={handleOpenRecord}
        />

        <DistributionCharts />

        <section className="dashboard-section records-section" aria-labelledby="records-heading">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Detalle</p>
              <h2 id="records-heading">Registros</h2>
            </div>
            <span className="section-caption">Por defecto, ordenados por etapa</span>
          </div>
          <div className="records-tables-stack">
            <RecordsTable
              title="Detalle de Implementaciones"
              records={implementationRecords}
              expandedRecordId={expandedRecordId}
              onToggleRecord={handleToggleRecord}
            />
            <RecordsTable
              title="Detalle de Proyectos"
              records={projectRecords}
              expandedRecordId={expandedRecordId}
              onToggleRecord={handleToggleRecord}
            />
          </div>
        </section>

        <ComplementaryAnalysis />
        </div>
      </div>
    </main>
  )
}
