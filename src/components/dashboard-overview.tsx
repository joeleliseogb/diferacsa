
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
          cursor={{ fill: 'hsl(var(--accent) / 0.5)' }}
          contentStyle={{ 
            backgroundColor: 'hsl(var(--background))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)' 
          }}
          formatter={(value: number) => [`Q${value.toFixed(2)}`, 'Total']}
        />
        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
