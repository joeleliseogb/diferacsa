'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { 
  TrendingUp, 
  Users, 
  Target, 
  Receipt,
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight,
  Sparkles,
  CalendarDays,
  Clock,
  CheckCircle2,
  RefreshCw,
  Loader2,
  CreditCard,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardOverview } from "@/components/dashboard-overview";
import { DashboardAssistant } from '@/components/dashboard-assistant';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { useAuth } from '@/context/auth-context';

interface DashboardData {
  period: string;
  summary: {
    totalSales: number;
    salesCount: number;
    activeCustomers: number;
    averageTicket: number;
    creditSales: number;
    cashSales: number;
    totalPurchases: number;
    purchaseCount: number;
    grossProfit: number;
    netMarginPct: number;
    costsPct: number;
    totalCustomers: number;
    totalReceivable: number;
    debtorsCount: number;
    totalCatalogProducts: number;
    totalUnitsInStock: number;
  };
  chartData: Array<{ name: string; total: number; salesCount: number }>;
  composition: Array<{ name: string; value: number; color: string; percentage: number }>;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    date: string;
    total: number;
    isCredit: number;
    customerName: string;
    itemCount: number;
  }>;
}

export default function PaginaDashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<string>('2026');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [calendarTab, setCalendarTab] = useState<'today' | 'pending'>('today');

  const fetchDashboardData = async (selectedPeriod: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?period=${encodeURIComponent(selectedPeriod)}`);
      if (res.ok) {
        const json: DashboardData = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(period);
  }, [period]);

  // Saludo según la hora del día en español
  const saludo = useMemo(() => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  const fechaFormateada = useMemo(() => {
    const ahora = new Date();
    const opciones: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const str = ahora.toLocaleDateString('es-GT', opciones);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, []);

  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Donut chart de composición
  const datosDonut = useMemo(() => {
    if (!data?.composition) {
      return [
        { name: 'Costos y Egresos', value: 72, color: '#1E2538' },
        { name: 'Ganancia Neta', value: 28, color: '#F25C3B' },
      ];
    }
    return data.composition;
  }, [data]);

  const summary = data?.summary;
  const recentInvoices = data?.recentInvoices || [];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* 1. Subheader: Saludo a la izquierda + Selector de período y botón de acción */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-headline">
            {saludo}, <span className="text-[#F25C3B]">{user?.name ? user.name.split(' ')[0] : 'Joel'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium">
            {fechaFormateada} • Sistema de Gestión Diferacsa
          </p>
        </div>

        {/* Controles de la derecha: Selector interactivo de período + Píldoras rápidas + Botón Nueva Venta */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Selector de Período dinámico */}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 px-3 rounded-full bg-card border border-border/80 shadow-xs text-xs font-semibold text-foreground min-w-[170px]">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-primary" />
              <SelectValue placeholder="Seleccionar Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026">Año 2026 (Actual)</SelectItem>
              <SelectItem value="month">Mes Activo (Mayo 2026)</SelectItem>
              <SelectItem value="all">Histórico Completo (2009–2026)</SelectItem>
              <SelectItem value="2025">Año Fiscal 2025</SelectItem>
              <SelectItem value="2024">Año Fiscal 2024</SelectItem>
              <SelectItem value="today">Jornada de Hoy</SelectItem>
            </SelectContent>
          </Select>

          {/* Píldoras de Filtro Rápido */}
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-card border border-border/80 shadow-xs text-xs font-semibold">
            <button 
              onClick={() => setPeriod('2026')}
              className={`px-3 py-1 rounded-full transition-all ${period === '2026' ? 'bg-[#F25C3B] text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Año 2026
            </button>
            <button 
              onClick={() => setPeriod('month')}
              className={`px-3 py-1 rounded-full transition-all ${period === 'month' ? 'bg-[#F25C3B] text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Mes
            </button>
            <button 
              onClick={() => setPeriod('all')}
              className={`px-3 py-1 rounded-full transition-all ${period === 'all' ? 'bg-[#F25C3B] text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Histórico
            </button>
          </div>

          {/* Botón Principal: Nueva Venta */}
          <Button asChild className="rounded-full bg-[#1E2538] hover:bg-[#151B28] text-white px-5 py-2 h-9 text-xs font-bold shadow-xs gap-1.5 transition-transform active:scale-95">
            <Link href="/tpv">
              <Plus className="h-4 w-4" />
              <span>Nueva Venta</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Fila de 4 Tarjetas KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Ventas Totales */}
        <Card className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Ventas Totales</span>
            <div className="h-9 w-9 rounded-xl bg-[#FFF1ED] text-[#F25C3B] flex items-center justify-center">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <Skeleton className="h-8 w-32 mb-1" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-headline">
                Q{summary?.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              +{summary?.salesCount.toLocaleString('es-GT')} facturas en el período
            </p>
          </div>
        </Card>

        {/* KPI 2: Ganancia Neta */}
        <Card className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Ganancia Neta</span>
            <div className="h-9 w-9 rounded-xl bg-[#E8F8F0] text-[#10B981] flex items-center justify-center">
              <Target className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <Skeleton className="h-8 w-32 mb-1" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-headline">
                Q{summary?.grossProfit.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.netMarginPct}% margen operativo estimado
            </p>
          </div>
        </Card>

        {/* KPI 3: Clientes Activos */}
        <Card className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-sky-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Clientes Activos</span>
            <div className="h-9 w-9 rounded-xl bg-[#EBF3FE] text-[#3B82F6] flex items-center justify-center">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <Skeleton className="h-8 w-24 mb-1" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-headline">
                {summary?.activeCustomers.toLocaleString('es-GT')}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              compradores con registro activo
            </p>
          </div>
        </Card>

        {/* KPI 4: Costos & Egresos */}
        <Card className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Costos & Egresos</span>
            <div className="h-9 w-9 rounded-xl bg-[#FEF7E6] text-[#F59E0B] flex items-center justify-center">
              <Receipt className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <Skeleton className="h-8 w-32 mb-1" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-headline">
                Q{summary?.totalPurchases.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.purchaseCount} compras y salidas registradas
            </p>
          </div>
        </Card>
      </div>

      {/* 3. SECCIÓN MEDIA: 3 COLUMNAS
          Columna 1: Gráfico de Ingresos
          Columna 2: Gráfico Donut de Composición
          Columna 3: Widget Agenda & Operaciones */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Columna 1: Ingresos del Período */}
        <Card className="lg:col-span-5 rounded-3xl border border-border/70 bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-headline font-bold text-base text-foreground">
                  Ingresos de Facturación
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total acumulado:{' '}
                  <span className="font-semibold text-foreground">
                    Q{summary?.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-xs bg-primary inline-block" />
                <span className="text-[11px] font-medium">Facturación</span>
              </div>
            </div>

            <div className="mt-6">
              {loading ? (
                <div className="h-[350px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <DashboardOverview data={data?.chartData || []} />
              )}
            </div>
          </div>
        </Card>

        {/* Columna 2: Composición Financiera */}
        <Card className="lg:col-span-3 rounded-3xl border border-border/70 bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <h3 className="font-headline font-bold text-base text-foreground">
              Composición de Ventas
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rentabilidad vs Egresos
            </p>

            {/* Donut Chart central */}
            <div className="relative w-44 h-44 mx-auto my-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={datosDonut}
                    innerRadius={54}
                    outerRadius={74}
                    paddingAngle={3}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {datosDonut.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(val: number) => [`Q${val.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, '']}
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF', 
                      borderRadius: '0.75rem', 
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      fontSize: '11px',
                      fontWeight: 600
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Centro del anillo */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-foreground font-headline">
                  {summary ? `${summary.netMarginPct}%` : '28%'}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Margen Neto
                </span>
              </div>
            </div>
          </div>

          {/* Leyenda inferior */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#1E2538] inline-block" />
                <span className="text-muted-foreground font-medium">Costos y Egresos</span>
              </div>
              <span className="font-bold text-foreground font-mono">
                {summary?.costsPct ?? 72}%
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#F25C3B] inline-block" />
                <span className="text-muted-foreground font-medium">Ganancia Neta</span>
              </div>
              <span className="font-bold text-foreground font-mono">
                {summary?.netMarginPct ?? 28}%
              </span>
            </div>
          </div>
        </Card>

        {/* Columna 3: Widget Agenda & Operaciones */}
        <div className="lg:col-span-4 rounded-3xl bg-[#1E2538] text-white p-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            {/* Cabecera del Widget */}
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-base text-white">
                Agenda & Operaciones
              </h3>
              <div className="h-6 w-6 rounded-md bg-white/10 text-white flex items-center justify-center text-xs">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Píldoras de pestañas */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCalendarTab('today')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  calendarTab === 'today' 
                    ? 'bg-white text-[#1E2538] shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Turno Actual
              </button>
              <button 
                onClick={() => setCalendarTab('pending')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  calendarTab === 'pending' 
                    ? 'bg-white text-[#1E2538] shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Cobros & Pedidos
              </button>
            </div>

            {/* Encabezado del mes */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-white tracking-wide">
                Mayo / Noviembre 2026
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Casa Matriz Tacaná
              </span>
            </div>

            {/* Cuadrícula de días en español */}
            <div className="space-y-1">
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400">
                {diasSemana.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {[19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 1].map((num, idx) => (
                  <div key={idx} className="flex justify-center py-0.5">
                    <span 
                      className={`h-6 w-6 flex items-center justify-center rounded-full text-[11px] font-medium transition-all ${
                        num === 28 
                          ? 'bg-[#F25C3B] text-white font-bold ring-2 ring-[#F25C3B]/40' 
                          : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      {num}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Eventos operativos de la jornada */}
            <div className="pt-2 border-t border-slate-700/60 space-y-2">
              <span className="text-[11px] font-bold text-slate-300 block">
                Operaciones Registradas
              </span>
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 text-xs">
                  <span className="font-mono text-[11px] text-emerald-400 mt-0.5">08:00</span>
                  <div>
                    <p className="font-semibold text-white leading-tight">Apertura y Arqueo Inicial</p>
                    <p className="text-[10px] text-slate-400">Casa Matriz (Tacaná) • Caja Principal</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-xs">
                  <span className="font-mono text-[11px] text-blue-400 mt-0.5">14:00</span>
                  <div>
                    <p className="font-semibold text-white leading-tight">Cobros de Crédito & Abonos</p>
                    <p className="text-[10px] text-slate-400">Q{summary?.totalReceivable ? summary.totalReceivable.toLocaleString('es-GT', { maximumFractionDigits: 0 }) : '270M'} en cartera pendiente</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-xs">
                  <span className="font-mono text-[11px] text-amber-400 mt-0.5">17:30</span>
                  <div>
                    <p className="font-semibold text-white leading-tight">Sincronización de Stock</p>
                    <p className="text-[10px] text-slate-400">{summary?.totalCatalogProducts.toLocaleString('es-GT')} artículos en catálogo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SECCIÓN INFERIOR:
          Izquierda: Tablón de Actividad & Ventas Recientes
          Derecha: Banner de Navegación Rápida */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Tablón de Actividad con Ventas Reales del Sistema */}
        <Card className="lg:col-span-8 rounded-3xl border border-border/70 bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div>
              <h3 className="font-headline font-bold text-base text-foreground">
                Tablón de Actividad & Ventas Recientes
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Últimas facturas emitidas registradas en el sistema ERP Diferacsa
              </p>
            </div>
            <Link 
              href="/invoicing" 
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Ver todas en Facturación</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Lista de Actividad real */}
          <div className="divide-y divide-border/50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))
            ) : recentInvoices.length > 0 ? (
              recentInvoices.map((sale) => (
                <div key={sale.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {sale.customerName ? sale.customerName.substring(0, 2).toUpperCase() : 'CF'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                        {sale.customerName || 'Consumidor Final'} — Factura #{sale.invoiceNumber || sale.id}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {sale.date ? sale.date.replace('T', ' ').substring(0, 16) : 'Reciente'} • {sale.itemCount || 1} producto(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className={`hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      sale.isCredit === 1 
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300'
                    }`}>
                      {sale.isCredit === 1 ? 'Crédito' : 'Contado'}
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-foreground">
                      Q{sale.total.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </span>
                    <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-xs rounded-full font-medium border-border/80">
                      <Link href={`/invoicing`}>
                        Ver
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No hay ventas registradas en este período.
              </div>
            )}
          </div>
        </Card>

        {/* Tarjeta Promocional y Acceso Directo */}
        <div className="lg:col-span-4 rounded-3xl bg-gradient-to-br from-[#FEECE5] via-[#FDE8DF] to-[#FAD6C8] border border-orange-200/80 p-6 flex flex-col justify-between shadow-xs">
          <div className="space-y-3">
            <h4 className="font-headline font-extrabold text-lg text-slate-900 leading-snug">
              Gestión Diferacsa más ágil, más fácil.
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Controla ventas, caja, apartados, taller, inventario y créditos en una plataforma centralizada y conectada en tiempo real.
            </p>
          </div>

          <div className="pt-6 space-y-2">
            <Button asChild className="w-full rounded-full bg-[#1E2538] hover:bg-[#151B28] text-white px-6 py-2.5 h-10 text-xs font-bold shadow-sm transition-transform active:scale-95">
              <Link href="/tpv">
                <span>Abrir Punto de Venta</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full rounded-full bg-white/70 hover:bg-white text-slate-800 border-orange-300/60 px-6 py-2 h-9 text-xs font-semibold">
              <Link href="/reports">
                <span>Ir a Reportes & Estadísticas</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
