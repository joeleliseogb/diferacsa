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
  ChevronDown,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardOverview } from "@/components/dashboard-overview";
import type { InvoiceWithCustomer, Movement, PurchaseOrderWithSupplier, Settings } from '@/lib/servicios';
import { 
  startOfToday, 
  startOfWeek, 
  startOfMonth, 
  startOfYear, 
  endOfToday, 
  endOfWeek, 
  endOfMonth, 
  endOfYear, 
  isWithinInterval, 
  parseISO, 
  eachDayOfInterval, 
  format, 
  eachMonthOfInterval 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { DashboardAssistant } from '@/components/dashboard-assistant';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { useAuth } from '@/context/auth-context';

type TimeRange = 'today' | 'week' | 'month' | 'year';

export default function PaginaDashboard() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [calendarTab, setCalendarTab] = useState<'today' | 'social'>('today');
  const [facturas, setFacturas] = useState<InvoiceWithCustomer[]>([]);
  const [movimientosCaja, setMovimientosCaja] = useState<Movement[]>([]);
  const [ordenesCompra, setOrdenesCompra] = useState<PurchaseOrderWithSupplier[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  
  useEffect(() => {
    async function fetchData() {
      const { getAllInvoices, getCashRegisterMovements, getAllPurchaseOrders, getSettings } = await import('@/lib/servicios');
      setFacturas(await getAllInvoices());
      setMovimientosCaja(await getCashRegisterMovements());
      setOrdenesCompra(await getAllPurchaseOrders());
      setSettings(await getSettings());
    }
    fetchData();
  }, []);

  const datosFiltrados = useMemo(() => {
    const ahora = new Date();
    let intervalo;

    switch(timeRange) {
      case 'today':
        intervalo = { start: startOfToday(), end: endOfToday() };
        break;
      case 'week':
        intervalo = { start: startOfWeek(ahora, { weekStartsOn: 1 }), end: endOfWeek(ahora, { weekStartsOn: 1 }) };
        break;
      case 'month':
        intervalo = { start: startOfMonth(ahora), end: endOfMonth(ahora) };
        break;
      case 'year':
        intervalo = { start: startOfYear(ahora), end: endOfYear(ahora) };
        break;
    }
    
    const facturasFiltradas = facturas.filter(factura => isWithinInterval(parseISO(factura.date), intervalo));
    const movimientosFiltrados = movimientosCaja.filter(m => isWithinInterval(parseISO(m.fecha), intervalo));
    const ordenesFiltradas = ordenesCompra.filter(oc => isWithinInterval(parseISO(oc.date), intervalo));

    const ingresosTotales = facturasFiltradas.reduce((sum, inv) => sum + (parseFloat(inv.total.replace(/Q|,/g, '')) || 0), 0);
    const numeroVentas = facturasFiltradas.length;
    const clientesActivos = new Set(facturasFiltradas.map(inv => inv.customerId)).size;
    const itemsVendidos = facturasFiltradas.reduce((sum, inv) => sum + inv.products.reduce((prodSum, prod) => prodSum + prod.qty, 0), 0);
    
    const costosTotales = movimientosFiltrados.filter(m => m.egreso > 0).reduce((sum, m) => sum + m.egreso, 0);
    const gananciaBruta = Math.max(0, ingresosTotales - costosTotales);
    const margenNeto = ingresosTotales > 0 ? (gananciaBruta / ingresosTotales) * 100 : 0;
    const numeroCompras = ordenesFiltradas.length;

    return {
      ingresosTotales,
      numeroVentas,
      clientesActivos,
      itemsVendidos,
      costosTotales,
      gananciaBruta,
      margenNeto,
      numeroCompras,
      facturas: facturasFiltradas
    };
  }, [facturas, movimientosCaja, ordenesCompra, timeRange]);

  const datosGrafico = useMemo(() => {
    const ahora = new Date();
    if (timeRange === 'year') {
      const meses = eachMonthOfInterval({ start: startOfYear(ahora), end: endOfMonth(ahora) });
      return meses.map(mes => {
        const mesStr = format(mes, 'MMM', { locale: es });
        const total = facturas
          .filter(inv => format(parseISO(inv.date), 'MMM', { locale: es }) === mesStr && format(parseISO(inv.date), 'yyyy') === format(ahora, 'yyyy'))
          .reduce((sum, inv) => sum + (parseFloat(inv.total.replace(/Q|,/g, '')) || 0), 0);
        return { name: mesStr.charAt(0).toUpperCase() + mesStr.slice(1), total };
      });
    }

    let intervalo;
    switch(timeRange) {
      case 'today':
        intervalo = { start: startOfToday(), end: endOfToday() };
        break;
      case 'week':
        intervalo = { start: startOfWeek(ahora, { weekStartsOn: 1 }), end: endOfWeek(ahora, { weekStartsOn: 1 }) };
        break;
      case 'month':
      default:
        intervalo = { start: startOfMonth(ahora), end: endOfMonth(ahora) };
        break;
    }

    const dias = eachDayOfInterval(intervalo);
    return dias.map(dia => {
      const diaStr = format(dia, 'yyyy-MM-dd');
      const total = facturas
        .filter(inv => inv.date === diaStr)
        .reduce((sum, inv) => sum + (parseFloat(inv.total.replace(/Q|,/g, '')) || 0), 0);
      return { name: format(dia, 'dd MMM', { locale: es }), total };
    });
  }, [facturas, timeRange]);

  // Donut chart de composición (Navy + Coral idéntico a theme.jpeg)
  const datosDonut = useMemo(() => {
    const ganancia = datosFiltrados.gananciaBruta || 1;
    const costos = datosFiltrados.costosTotales || 1;
    return [
      { name: 'Costos / Egresos', value: costos, color: '#1E2538' },
      { name: 'Ganancia Neta', value: ganancia, color: '#F25C3B' },
    ];
  }, [datosFiltrados]);

  // Fecha y saludo en español
  const saludo = useMemo(() => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Selamat pagi'; // O Buenos días
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  const fechaFormateada = useMemo(() => {
    const ahora = new Date();
    const str = format(ahora, "EEEE, d MMMM yyyy", { locale: es });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, []);

  const diasSemana = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const diasSimulados = [
    { num: 28, isPast: true },
    { num: 29, isPast: true },
    { num: 30, isPast: true },
    { num: 1, isPast: false },
    { num: 2, isPast: false },
    { num: 3, isPast: false },
    { num: 4, isPast: false },
    { num: 5, isPast: false },
    { num: 6, isPast: false },
    { num: 7, isPast: false },
    { num: 8, isPast: false },
    { num: 9, isPast: false },
    { num: 10, isPast: false },
    { num: 11, isPast: false },
    { num: 12, isPast: false },
    { num: 13, isPast: false },
    { num: 14, isPast: false },
    { num: 15, isPast: false },
    { num: 16, isPast: false },
    { num: 17, isPast: false },
    { num: 18, isPast: false },
    { num: 19, isPast: false },
    { num: 20, isPast: false },
    { num: 21, isPast: false, isToday: true },
    { num: 22, isPast: false },
    { num: 23, isPast: false },
    { num: 24, isPast: false },
    { num: 25, isPast: false },
  ];

  const recentSalesList = datosFiltrados.facturas.slice(0, 4);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* 1. Subheader: Saludo a la izquierda + Píldoras de filtro y botón de acción a la derecha */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-headline">
            Buenos días, <span className="text-[#F25C3B]">{user?.name ? user.name.split(' ')[0] : 'Joel'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium">
            {fechaFormateada}
          </p>
        </div>

        {/* Controles de la derecha (Idénticos a theme.jpeg: 2 píldoras + botón navy sólido) */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Píldora 1: Selector de Período */}
          <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-card border border-border/80 shadow-sm text-xs font-semibold text-foreground cursor-pointer hover:bg-muted/40 transition-colors">
            <span>Noviembre 2026</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Píldora 2: Filtro de Rango */}
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-card border border-border/80 shadow-sm text-xs font-semibold">
            <button 
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1 rounded-full transition-all ${timeRange === 'month' ? 'bg-[#F25C3B] text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Mes
            </button>
            <button 
              onClick={() => setTimeRange('week')}
              className={`px-3 py-1 rounded-full transition-all ${timeRange === 'week' ? 'bg-[#F25C3B] text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Semana
            </button>
            <button 
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1 rounded-full transition-all ${timeRange === 'today' ? 'bg-[#F25C3B] text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Hoy
            </button>
          </div>

          {/* Botón Principal Navy Sólido: "+ Catat pembayaran" -> "+ Nueva Venta" */}
          <Button asChild className="rounded-full bg-[#1E2538] hover:bg-[#151B28] text-white px-5 py-2 h-9 text-xs font-bold shadow-sm gap-1.5 transition-transform active:scale-95">
            <Link href="/tpv">
              <Plus className="h-4 w-4" />
              <span>Nueva Venta</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Fila de 4 Tarjetas KPI (Estructura idéntica a theme.jpeg: Label + Icono en caja pastel, Número grande, Subtexto) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Ingresos del Período */}
        <Card className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Ventas Totales</span>
            <div className="h-9 w-9 rounded-xl bg-[#FFF1ED] text-[#F25C3B] flex items-center justify-center">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-headline">
              Q{datosFiltrados.ingresosTotales.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              +{datosFiltrados.numeroVentas} facturas en el período
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
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-headline">
              Q{datosFiltrados.gananciaBruta.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {datosFiltrados.margenNeto.toFixed(1)}% margen operativo
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
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-headline">
              {datosFiltrados.clientesActivos}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              compradores con registro activo
            </p>
          </div>
        </Card>

        {/* KPI 4: Egresos y Gastos de Caja */}
        <Card className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Costos & Egresos</span>
            <div className="h-9 w-9 rounded-xl bg-[#FEF7E6] text-[#F59E0B] flex items-center justify-center">
              <Receipt className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-headline">
              Q{datosFiltrados.costosTotales.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {datosFiltrados.numeroCompras} órdenes y salidas de caja
            </p>
          </div>
        </Card>
      </div>

      {/* 3. SECCIÓN MEDIA: 3 COLUMNAS EXACTAS DE THEME.JPEG:
          Columna 1: Gráfico de Ingresos (Pemasukan SPP Bulanan)
          Columna 2: Gráfico Donut de Composición (Komposisi Siswa)
          Columna 3: Widget Oscuro de Calendario & Agenda (Kalender Kegiatan) */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Columna 1 (~42%): Ingresos Mensuales */}
        <Card className="lg:col-span-5 rounded-3xl border border-border/70 bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-headline font-bold text-base text-foreground">
                  Ingresos Mensuales
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total acumulado: <span className="font-semibold text-foreground">Q{datosFiltrados.ingresosTotales.toFixed(2)}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-xs bg-[#1E2538] inline-block" />
                <span className="text-[11px] font-medium">Facturación</span>
              </div>
            </div>

            <div className="mt-6">
              <DashboardOverview data={datosGrafico} />
            </div>
          </div>
        </Card>

        {/* Columna 2 (~33%): Composición Financiera (El Donut Chart exacto de theme.jpeg) */}
        <Card className="lg:col-span-3 rounded-3xl border border-border/70 bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <h3 className="font-headline font-bold text-base text-foreground">
              Composición de Ventas
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rentabilidad vs Egresos
            </p>

            {/* Donut Chart central con número exacto en el medio */}
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
                    formatter={(val: number) => [`Q${val.toFixed(2)}`, '']}
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

              {/* Centro del anillo idéntico a theme.jpeg: Número grande + label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-foreground font-headline">
                  {datosFiltrados.margenNeto.toFixed(0)}%
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Margen Neto
                </span>
              </div>
            </div>
          </div>

          {/* Leyenda inferior con porcentajes a la derecha (idéntica a theme.jpeg) */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#1E2538] inline-block" />
                <span className="text-muted-foreground font-medium">Costos y Egresos</span>
              </div>
              <span className="font-bold text-foreground font-mono">
                {(100 - datosFiltrados.margenNeto).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#F25C3B] inline-block" />
                <span className="text-muted-foreground font-medium">Ganancia Neta</span>
              </div>
              <span className="font-bold text-foreground font-mono">
                {datosFiltrados.margenNeto.toFixed(1)}%
              </span>
            </div>
          </div>
        </Card>

        {/* Columna 3 (~25% / 4 cols): Kalender Kegiatan (El Widget Oscuro de theme.jpeg) */}
        <div className="lg:col-span-4 rounded-3xl bg-[#1E2538] text-white p-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            {/* Cabecera del Widget con botón "+" */}
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-base text-white">
                Kalender Kegiatan
              </h3>
              <button className="h-6 w-6 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-xs">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Píldoras de pestañas internas: "Hari Ini (3)" y "Sosial (2)" */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCalendarTab('today')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  calendarTab === 'today' 
                    ? 'bg-white text-[#1E2538] shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hari Ini (3)
              </button>
              <button 
                onClick={() => setCalendarTab('social')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  calendarTab === 'social' 
                    ? 'bg-white text-[#1E2538] shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sosial (2)
              </button>
            </div>

            {/* Navegación del mes */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-white tracking-wide">
                Noviembre 2026
              </span>
              <div className="flex items-center gap-1 text-slate-400">
                <button className="p-1 hover:text-white transition-colors">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button className="p-1 hover:text-white transition-colors">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Cuadrícula de Calendario compacta idéntica a theme.jpeg */}
            <div className="space-y-1">
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400">
                {diasSemana.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {diasSimulados.slice(0, 21).map((item, idx) => (
                  <div key={idx} className="flex justify-center py-0.5">
                    <span 
                      className={`h-6 w-6 flex items-center justify-center rounded-full text-[11px] font-medium transition-all ${
                        item.isToday 
                          ? 'bg-[#F25C3B] text-white font-bold ring-2 ring-[#F25C3B]/40' 
                          : item.isPast 
                            ? 'text-slate-500' 
                            : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      {item.num}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Separador de eventos del día */}
            <div className="pt-2 border-t border-slate-700/60 space-y-2">
              <span className="text-[11px] font-bold text-slate-300 block">
                Sábado, 21 de Noviembre
              </span>
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 text-xs">
                  <span className="font-mono text-[11px] text-slate-400 mt-0.5">08:00</span>
                  <div>
                    <p className="font-semibold text-white leading-tight">Apertura y Arqueo Inicial</p>
                    <p className="text-[10px] text-slate-400">Sucursal Central • Turno mañana</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-xs">
                  <span className="font-mono text-[11px] text-slate-400 mt-0.5">13:30</span>
                  <div>
                    <p className="font-semibold text-white leading-tight">Sincronización de Stock</p>
                    <p className="text-[10px] text-slate-400">Almacén Central • Sin discrepancias</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SECCIÓN INFERIOR:
          Izquierda (~65%): Tablón de Actividad & Ventas Recientes (Papan Pengumuman)
          Derecha (~35%): Banner Promocional Cálido (Kelola sekolah...) */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Tablón de Actividad (Papan Pengumuman) */}
        <Card className="lg:col-span-8 rounded-3xl border border-border/70 bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div>
              <h3 className="font-headline font-bold text-base text-foreground">
                Tablón de Actividad & Ventas Recientes
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Información reciente de transacciones y pedidos en Diferacsa
              </p>
            </div>
            <Link 
              href="/orders" 
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Ver todas</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Lista de Actividad idéntica a theme.jpeg con avatar verde, descripción, badge y botón */}
          <div className="divide-y divide-border/50">
            {recentSalesList.length > 0 ? (
              recentSalesList.map((sale) => (
                <div key={sale.invoice} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {sale.customerName ? sale.customerName.substring(0, 2).toUpperCase() : 'CF'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                        {sale.customerName || 'Consumidor Final'} — Factura #{sale.invoice}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {sale.date} • {sale.products?.length || 1} producto(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200/60">
                      Venta POS
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-foreground">
                      {sale.total}
                    </span>
                    <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-xs rounded-full font-medium border-border/80">
                      <Link href={`/orders`}>
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

        {/* Tarjeta Promocional Cálida (Idéntica al card melocotón "Kelola sekolah lebih rapi..." de theme.jpeg) */}
        <div className="lg:col-span-4 rounded-3xl bg-gradient-to-br from-[#FEECE5] via-[#FDE8DF] to-[#FAD6C8] border border-orange-200/80 p-6 flex flex-col justify-between shadow-xs">
          <div className="space-y-3">
            <h4 className="font-headline font-extrabold text-lg text-slate-900 leading-snug">
              Gestión Diferacsa más ágil, más fácil.
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Controla ventas, caja, apartados, taller e inventario en una plataforma centralizada y diseñada para la productividad diaria.
            </p>
          </div>

          <div className="pt-6">
            <Button asChild className="rounded-full bg-[#1E2538] hover:bg-[#151B28] text-white px-6 py-2.5 h-10 text-xs font-bold shadow-sm transition-transform active:scale-95">
              <Link href="/tpv">
                <span>Abrir Punto de Venta</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Asistente IA si está configurado */}
      {settings?.showDashboardAssistant && <DashboardAssistant />}
    </div>
  );
}
