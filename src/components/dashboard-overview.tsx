
"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

type OverviewData = {
  name: string;
  total: number;
}

interface DashboardOverviewProps {
  data: OverviewData[];
}

/**
 * Componente que muestra un gráfico de barras con la visión general de las ventas.
 */
export function DashboardOverview({ data }: DashboardOverviewProps) {

  if (!data || data.length === 0 || data.every(d => d.total === 0)) {
    return <div className="flex items-center justify-center h-[350px] text-muted-foreground">No hay datos para mostrar en este período.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `Q${value}`}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted) / 0.4)', radius: 8 }}
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))', 
            border: '1px solid hsl(var(--border) / 0.8)',
            borderRadius: '1rem',
            boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.08)',
            color: 'hsl(var(--foreground))',
            fontSize: '12px',
            fontWeight: 500,
          }}
          formatter={(value: number) => [`Q${value.toFixed(2)}`, 'Ingresos']}
        />
        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[8, 8, 4, 4]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}
