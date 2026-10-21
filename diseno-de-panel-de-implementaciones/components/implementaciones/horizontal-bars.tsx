"use client"

import { useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts"
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { BarDatum } from "./data"

const chartConfig = {
  value: {
    label: "Registros",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function HorizontalBars({
  title,
  description,
  data,
  unit = "registros",
  selectable = true,
  valueMax,
}: {
  title: string
  description?: string
  data: BarDatum[]
  unit?: string
  selectable?: boolean
  valueMax?: number
}) {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const chartMax = valueMax ?? Math.max(1, ...data.map((datum) => datum.value)) * 1.16
  const chartData = data.map((datum) => ({
    ...datum,
    displayValue: datum.displayValue ?? String(datum.value),
  }))

  const selectBar = (label: string) => {
    setSelectedLabel((current) => (current === label ? null : label))
  }

  const renderBar = (props: BarShapeProps) => {
    const datum = props.payload as BarDatum
    const isSelected = selectedLabel === datum.label
    const displayValue = datum.displayValue ?? `${datum.value} ${unit}`

    return (
      <rect
        x={props.x}
        y={props.y}
        width={Math.max(props.width, datum.value === 0 ? 3 : props.width)}
        height={props.height}
        rx={6}
        fill={
          datum.color ??
          (isSelected ? "var(--chart-2)" : "var(--color-value)")
        }
        className={selectable ? "chart-bar-shape chart-bar-shape--selectable" : "chart-bar-shape"}
        role={selectable ? "button" : undefined}
        tabIndex={selectable ? 0 : -1}
        aria-label={selectable ? `${datum.label}: ${displayValue}` : undefined}
        aria-pressed={selectable ? isSelected : undefined}
        onClick={selectable ? () => selectBar(datum.label) : undefined}
        onKeyDown={
          selectable
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  selectBar(datum.label)
                }
              }
            : undefined
        }
      />
    )
  }

  return (
    <Card className="dashboard-card chart-card">
      <CardHeader className="chart-card-header">
        <CardTitle className="chart-card-title" role="heading" aria-level={3}>
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="chart-card-content">
        <ChartContainer
          config={chartConfig}
          className="dashboard-chart"
          role="group"
          aria-label={`${title}. Barras horizontales${selectable ? ", seleccionables" : ""}.`}
        >
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 36, bottom: 2, left: 0 }}
            barCategoryGap={9}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 4" />
            <XAxis
              type="number"
              hide
              domain={[0, chartMax]}
            />
            <YAxis
              dataKey="label"
              type="category"
              axisLine={false}
              tickLine={false}
              width={144}
              tick={{ fill: "#526777", fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(14, 87, 108, 0.06)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const datum = payload[0].payload as BarDatum
                return (
                  <div className="chart-tooltip">
                    <strong>{datum.label}</strong>
                    <span>{datum.displayValue ?? `${datum.value} ${unit}`}</span>
                  </div>
                )
              }}
            />
            <Bar
              dataKey="value"
              shape={renderBar}
              barSize={15}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="displayValue"
                position="right"
                fill="#526777"
                fontSize={11}
                offset={6}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
        {selectable ? (
          <p className="chart-selection-note" aria-live="polite">
            {selectedLabel
              ? `Barra seleccionada: ${selectedLabel}. La selección es visual.`
              : "Selecciona una barra para marcarla; no aplica filtros reales."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
