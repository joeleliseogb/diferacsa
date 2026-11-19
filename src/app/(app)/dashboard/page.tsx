
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, CreditCard, Activity, ArrowDownCircle, Target, Percent, ShoppingBag } from "lucide-react";
import { DashboardOverview } from "@/components/dashboard-overview";
import { RecentSales } from "@/components/recent-sales";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { InvoiceWithCustomer, Movement, PurchaseOrderWithSupplier, Settings } from '@/lib/servicios';
import { startOfToday, startOfWeek, startOfMonth, startOfYear, endOfToday, endOfWeek, endOfMonth, endOfYear, isWithinInterval, parseISO, eachDayOfInterval, format, eachMonthOfInterval } from 'date-fns';
import { DashboardAssistant } from '@/components/dashboard-assistant';

type TimeRange = 'today' | 'week' | 'month' | 'year';

export default function PaginaDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
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
    const gananciaBruta = ingresosTotales - costosTotales;
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
            const mesStr = format(mes, 'MMM');
            const total = facturas
                .filter(inv => format(parseISO(inv.date), 'MMM') === mesStr && format(parseISO(inv.date), 'yyyy') === format(ahora, 'yyyy'))
                .reduce((sum, inv) => sum + (parseFloat(inv.total.replace(/Q|,/g, '')) || 0), 0);
            return { name: mesStr, total };
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
        return { name: format(dia, 'dd MMM'), total };
    });

  }, [facturas, timeRange]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Dashboard</h1>
        <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)} className="space-y-4">
            <TabsList>
                <TabsTrigger value="today">Hoy</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="month">Mes</TabsTrigger>
                <TabsTrigger value="year">Año</TabsTrigger>
            </TabsList>
        </Tabs>
      </div>
      
      {/* Sección de tarjetas de métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Q{datosFiltrados.ingresosTotales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{datosFiltrados.numeroVentas} ventas en el período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costos Totales</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Q{datosFiltrados.costosTotales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{datosFiltrados.numeroCompras} órdenes de compra</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia Bruta</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Q{datosFiltrados.gananciaBruta.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Ingresos menos costos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen Neto</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{datosFiltrados.margenNeto.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Rentabilidad del período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{datosFiltrados.clientesActivos}</div>
            <p className="text-xs text-muted-foreground">clientes únicos en el período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{datosFiltrados.numeroVentas}</div>
            <p className="text-xs text-muted-foreground">facturas emitidas en el período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes de Compra</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{datosFiltrados.numeroCompras}</div>
            <p className="text-xs text-muted-foreground">órdenes generadas en el período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Vendidos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{datosFiltrados.itemsVendidos}</div>
            <p className="text-xs text-muted-foreground">unidades vendidas en el período</p>
          </CardContent>
        </Card>
      </div>

      {/* Sección con el gráfico de visión general y las ventas recientes */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-headline">Visión General</CardTitle>
            <CardDescription>
              Resumen de ingresos para el período seleccionado.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <DashboardOverview data={datosGrafico} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Ventas Recientes</CardTitle>
            <CardDescription>
              Tus ventas más recientes en el período seleccionado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentSales sales={datosFiltrados.facturas} />
          </CardContent>
        </Card>
        {settings?.showDashboardAssistant && <DashboardAssistant />}
      </div>
    </div>
  )
}
