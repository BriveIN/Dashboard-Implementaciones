"use client"

import { useState } from "react"
import { ArrowDownUp, ChevronDown, ChevronRight, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MockRecord } from "./data"
import { formatDate, formatNumber, PercentMeter, StatusPill, TonePill } from "./ui"
import { RecordDetail } from "./record-detail"

const columns = [
  { key: "name", label: "Nombre" },
  { key: "account", label: "Cuenta comercial" },
  { key: "responsible", label: "Responsable" },
  { key: "associate", label: "Asociado" },
  { key: "solution", label: "Solución" },
  { key: "stage", label: "Estatus" },
  { key: "kickoffAgreed", label: "Kickoff acordado" },
  { key: "kickoffReal", label: "Kickoff" },
  { key: "hoursContracted", label: "Contratadas" },
  { key: "hoursConsumed", label: "Consumidas" },
  { key: "remaining", label: "Restantes" },
  { key: "percent", label: "% consumido" },
  { key: "activities", label: "Actividades" },
  { key: "changes", label: "Cambios" },
] as const

function RecordNameButton({
  record,
  isOpen,
  onToggle,
  detailId,
}: {
  record: MockRecord
  isOpen: boolean
  onToggle: () => void
  detailId: string
}) {
  return (
    <button
      type="button"
      className="record-name-button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls={detailId}
    >
      <span className="record-name-chevron" aria-hidden="true">
        <ChevronRight />
      </span>
      <span className="record-name-copy">
        <span className="record-name-title">{record.name}</span>
        <span className="record-id">{record.id}</span>
      </span>
      {record.isTest ? <span className="test-record-tag">Prueba</span> : null}
    </button>
  )
}

function TableValue({
  record,
  column,
}: {
  record: MockRecord
  column: (typeof columns)[number]["key"]
}) {
  const remaining = record.hoursContracted - record.hoursConsumed

  switch (column) {
    case "account":
      return <span className="table-account-name">{record.account}</span>
    case "responsible":
      return record.responsible ? (
        <span>{record.responsible}</span>
      ) : (
        <span className="responsible-missing"><span aria-hidden="true">!</span>Sin responsable</span>
      )
    case "associate":
      return <span>{record.associate}</span>
    case "solution":
      return <span>{record.solution}</span>
    case "stage":
      return <StatusPill stage={record.stage} />
    case "kickoffAgreed":
      return <span className="date-value">{formatDate(record.kickoffAgreed)}</span>
    case "kickoffReal":
      return <span className="date-value">{formatDate(record.kickoffReal)}</span>
    case "hoursContracted":
      return <span className="number-cell">{formatNumber(record.hoursContracted)} h</span>
    case "hoursConsumed":
      return <span className="number-cell">{formatNumber(record.hoursConsumed)} h</span>
    case "remaining":
      return <span className={`number-cell ${remaining < 0 ? "text-critical" : ""}`}>{formatNumber(remaining)} h</span>
    case "percent":
      return <PercentMeter record={record} />
    case "activities":
      return <span className="number-cell">{formatNumber(record.activityCount)}</span>
    case "changes":
      return record.changeCount > 0 ? (
        <TonePill tone="alert">{record.changeCount} {record.changeCount === 1 ? "cambio" : "cambios"}</TonePill>
      ) : (
        <TonePill tone="neutral">0</TonePill>
      )
    default:
      return null
  }
}

function MobileRecordCard({
  record,
  isOpen,
  onToggle,
}: {
  record: MockRecord
  isOpen: boolean
  onToggle: () => void
}) {
  const remaining = record.hoursContracted - record.hoursConsumed

  return (
    <article className="mobile-record-card" id={`mobile-${record.id}`}>
      <div className="mobile-record-card-header">
        <RecordNameButton
          record={record}
          isOpen={isOpen}
          onToggle={onToggle}
          detailId={`detail-${record.id}-mobile`}
        />
        <StatusPill stage={record.stage} />
      </div>
      <dl className="mobile-record-fields">
        <div className="mobile-record-field mobile-record-field--wide"><dt>Cuenta comercial</dt><dd>{record.account}</dd></div>
        <div className="mobile-record-field"><dt>Responsable</dt><dd className={record.responsible ? "" : "text-critical"}>{record.responsible ?? "Sin responsable"}</dd></div>
        <div className="mobile-record-field"><dt>Asociado</dt><dd>{record.associate}</dd></div>
        <div className="mobile-record-field"><dt>Solución</dt><dd>{record.solution}</dd></div>
        <div className="mobile-record-field"><dt>Kickoff acordado</dt><dd>{formatDate(record.kickoffAgreed)}</dd></div>
        <div className="mobile-record-field"><dt>Kickoff</dt><dd>{formatDate(record.kickoffReal)}</dd></div>
        <div className="mobile-record-field"><dt>Contratadas</dt><dd>{formatNumber(record.hoursContracted)} h</dd></div>
        <div className="mobile-record-field"><dt>Consumidas</dt><dd>{formatNumber(record.hoursConsumed)} h</dd></div>
        <div className="mobile-record-field"><dt>Restantes</dt><dd className={remaining < 0 ? "text-critical" : ""}>{formatNumber(remaining)} h</dd></div>
        <div className="mobile-record-field mobile-record-field--wide"><dt>% consumido</dt><dd><PercentMeter record={record} /></dd></div>
        <div className="mobile-record-field"><dt>Actividades</dt><dd>{formatNumber(record.activityCount)}</dd></div>
        <div className="mobile-record-field"><dt>Cambios</dt><dd>{record.changeCount > 0 ? <TonePill tone="alert">{record.changeCount}</TonePill> : <TonePill tone="neutral">0</TonePill>}</dd></div>
      </dl>
      {isOpen ? <RecordDetail record={record} onClose={onToggle} idSuffix="mobile" /> : null}
    </article>
  )
}

export function RecordsTable({
  title,
  records,
  expandedRecordId,
  onToggleRecord,
}: {
  title: string
  records: MockRecord[]
  expandedRecordId: string | null
  onToggleRecord: (recordId: string) => void
}) {
  const [visibleCount, setVisibleCount] = useState(12)
  const [sortKey, setSortKey] = useState<string>("stage")
  const [ascending, setAscending] = useState(true)
  const visibleRecords = records.slice(0, visibleCount)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setAscending((current) => !current)
    } else {
      setSortKey(key)
      setAscending(true)
    }
  }

  return (
    <details className="records-table-section surface-card" open>
      <summary className="records-table-summary">
        <span className="records-table-title-wrap">
          <span className="records-table-title">{title}</span>
          <span className="records-table-count">{records.length} registros de muestra</span>
        </span>
        <ChevronDown aria-hidden="true" />
      </summary>

      <div className="records-table-content">
        <div className="table-toolbar">
          <label className="table-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Buscar por nombre, cuenta, responsable o solución</span>
            <input type="search" placeholder="Buscar nombre, cuenta, responsable o solución" />
          </label>
          <div className="table-count-wrap">
            <span className="table-count"><strong>{visibleRecords.length}</strong> de <strong>{records.length}</strong></span>
            <span>registros</span>
          </div>
        </div>

        <div className="desktop-table-shell">
          <div className="table-scroll">
            <table className="dashboard-table records-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={sortKey === column.key ? (ascending ? "ascending" : "descending") : "none"}
                    >
                      <button
                        type="button"
                        className="sort-control"
                        onClick={() => handleSort(column.key)}
                        aria-label={`Ordenar por ${column.label}${sortKey === column.key ? (ascending ? ", ascendente" : ", descendente") : ""}`}
                      >
                        <span>{column.label}</span>
                        <ArrowDownUp aria-hidden="true" />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((record) => {
                  const isOpen = expandedRecordId === record.id
                  return (
                    <FragmentRow
                      key={record.id}
                      record={record}
                      isOpen={isOpen}
                      onToggle={() => onToggleRecord(record.id)}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mobile-record-list">
          {visibleRecords.map((record) => (
            <MobileRecordCard
              key={record.id}
              record={record}
              isOpen={expandedRecordId === record.id}
              onToggle={() => onToggleRecord(record.id)}
            />
          ))}
        </div>

        <div className="table-footer">
          <span>Mostrando {visibleRecords.length} de {records.length}</span>
          <Button
            type="button"
            variant="outline"
            className="dashboard-button"
            onClick={() => setVisibleCount((count) => Math.min(count + 12, records.length))}
            disabled={visibleCount >= records.length}
          >
            Mostrar más
          </Button>
        </div>
      </div>
    </details>
  )
}

function FragmentRow({
  record,
  isOpen,
  onToggle,
}: {
  record: MockRecord
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr className={isOpen ? "record-table-row record-table-row--open" : "record-table-row"} id={`record-${record.id}`}>
        {columns.map((column) => (
          <td key={column.key}>
            {column.key === "name" ? (
              <RecordNameButton
                record={record}
                isOpen={isOpen}
                onToggle={onToggle}
                detailId={`detail-${record.id}-desktop`}
              />
            ) : (
              <TableValue record={record} column={column.key} />
            )}
          </td>
        ))}
      </tr>
      {isOpen ? (
        <tr className="record-detail-row">
          <td colSpan={columns.length}>
            <RecordDetail record={record} onClose={onToggle} idSuffix="desktop" />
          </td>
        </tr>
      ) : null}
    </>
  )
}
