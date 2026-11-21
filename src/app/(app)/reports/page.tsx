'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  CreditCard,
  Building2,
  Download,
  Printer,
  RefreshCw,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  Receipt,
  FileSpreadsheet,
  ArrowDownRight,
  Scale,
  UserCheck,
  CalendarDays,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';

interface CategoryItem {
  id: number;
  name: string;
  productCount: number;
  unitsSold: number;
  totalSales: number;
  inStock: number;
  percentage: number;
}

interface SalespersonItem {
  name: string;
  invoiceCount: number;
  totalSales: number;
  averageTicket: number;
  creditSales: number;
  cashSales: number;
  percentage: number;
}

interface FiscalPeriodItem {
  fiscalYear: string;
  invoiceCount: number;
  totalSales: number;
  averageTicket: number;
  creditSales: number;
  cashSales: number;
  growthPct: number;
}

interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  salesCount: number;
  inStock: number;
  priceNormal: number;
  priceMayorista: number;
}

interface ReportData {
  period: string;
  summary: {
    totalSales: number;
    salesCount: number;
    averageTicket: number;
    creditSales: number;
    cashSales: number;
    creditSalesPct: number;
    totalPurchases: number;
    purchaseCount: number;
    totalReceivable: number;
    debtorsCount: number;
    totalCustomers: number;
    totalCatalogProducts: number;
    totalUnitsInStock: number;
  };
  salesTrend: Array<{ label: string; salesCount: number; totalSales: number }>;
  paymentDistribution: Array<{ name: string; count: number; value: number }>;
  categoryComparison: CategoryItem[];
  salespeopleComparison: SalespersonItem[];
  fiscalPeriodsComparison: FiscalPeriodItem[];
  monthlyComparisonByYear: Array<{ label: string; '2024': number; '2025': number; '2026': number }>;
  topProducts: Array<{ id: string; sku: string; name: string; qtySold: number; totalAmount: number; inStock: number }>;
  topCustomers: Array<{ id: string; name: string; nit: string; invoiceCount: number; totalSpent: number; currentBalance: number; creditLimit: number }>;
  topDebtors: Array<{ id: string; name: string; nit: string; phone: string; balance: number; limitCredit: number }>;
  supplierComparison: Array<{ id: string; name: string; nit: string; phone: string; purchaseCount: number; totalPurchased: number; percentage: number }>;
  recentCreditMovements: Array<{ id: string; date: string; reason: string; debit: number; credit: number; balance: number; userName: string; customerName: string }>;
  catalogSummary: CatalogProduct[];
}

const PIE_COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316'];

export default function ReportsPage() {
  const [period, setPeriod] = useState<string>('all');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('resumen');
  const [, startTransition] = useTransition();

  // Estados para el Comparador Interactivo de 2 Productos
  const [productAId, setProductAId] = useState<string>('');
  const [productBId, setProductBId] = useState<string>('');

  const fetchReports = async (selectedPeriod: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?period=${encodeURIComponent(selectedPeriod)}`);
      if (res.ok) {
        const json: ReportData = await res.json();
        setData(json);
        // Inicializar productos seleccionados para el comparador si no están asignados
        if (json.catalogSummary && json.catalogSummary.length >= 2 && !productAId) {
          setProductAId(json.catalogSummary[0].id);
          setProductBId(json.catalogSummary[1].id);
        }
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(period);
  }, [period]);

  const handlePeriodChange = (val: string) => {
    setPeriod(val);
    startTransition(() => {
      fetchReports(val);
    });
  };

  // Comparador de Productos Activos
  const productA = useMemo(() => {
    return data?.catalogSummary?.find(p => p.id === productAId) || null;
  }, [data, productAId]);

  const productB = useMemo(() => {
    return data?.catalogSummary?.find(p => p.id === productBId) || null;
  }, [data, productBId]);

  // Función para exportar a CSV con BOM UTF-8 compatible con Microsoft Excel
  const handleExportCSV = (tipo: string) => {
    if (!data) return;
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `reporte_${tipo}_${period}.csv`;

    if (tipo === 'ventas' || tipo === 'resumen') {
      headers = ['Periodo', 'Total Facturado (Q)', 'Cantidad de Ventas'];
      rows = (data.salesTrend || []).map(r => [r.label, r.totalSales.toFixed(2), r.salesCount.toString()]);
    } else if (tipo === 'familias') {
      headers = ['Familia / Categoría', 'Cantidad Productos', 'Unidades Vendidas', 'Total Facturado (Q)', 'Stock Actual', '% Participación'];
      rows = (data.categoryComparison || []).map(c => [`"${c.name}"`, c.productCount.toString(), c.unitsSold.toString(), c.totalSales.toFixed(2), c.inStock.toString(), `${c.percentage}%`]);
    } else if (tipo === 'vendedores') {
      headers = ['Vendedor / Cajero', 'Facturas Emitidas', 'Total Vendido (Q)', 'Ticket Promedio (Q)', 'Ventas Contado (Q)', 'Ventas Crédito (Q)', '% Participación'];
      rows = (data.salespeopleComparison || []).map(s => [`"${s.name}"`, s.invoiceCount.toString(), s.totalSales.toFixed(2), s.averageTicket.toFixed(2), s.cashSales.toFixed(2), s.creditSales.toFixed(2), `${s.percentage}%`]);
    } else if (tipo === 'periodos') {
      headers = ['Año Fiscal', 'Facturas', 'Total Ventas (Q)', 'Ticket Promedio (Q)', 'Crecimiento Anual (%)'];
      rows = (data.fiscalPeriodsComparison || []).map(f => [f.fiscalYear, f.invoiceCount.toString(), f.totalSales.toFixed(2), f.averageTicket.toFixed(2), `${f.growthPct}%`]);
    } else if (tipo === 'productos') {
      headers = ['SKU', 'Producto', 'Unidades Vendidas', 'Total Facturado (Q)', 'Stock Actual'];
      rows = (data.topProducts || []).map(p => [p.sku || '', `"${p.name.replace(/"/g, '""')}"`, p.qtySold.toString(), p.totalAmount.toFixed(2), p.inStock.toString()]);
    } else if (tipo === 'proveedores') {
      headers = ['Proveedor', 'NIT', 'Teléfono', 'Compras Realizadas', 'Total Invertido (Q)', '% Participación'];
      rows = (data.supplierComparison || []).map(s => [`"${s.name.replace(/"/g, '""')}"`, s.nit || 'CF', s.phone || '', s.purchaseCount.toString(), s.totalPurchased.toFixed(2), `${s.percentage}%`]);
    } else if (tipo === 'deudores') {
      headers = ['Cliente', 'NIT', 'Teléfono', 'Saldo Pendiente (Q)', 'Límite Crédito (Q)'];
      rows = (data.topDebtors || []).map(d => [`"${d.name.replace(/"/g, '""')}"`, d.nit || 'CF', d.phone || '', d.balance.toFixed(2), d.limitCredit.toFixed(2)]);
    }

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formattedSummary = useMemo(() => {
    if (!data?.summary) return null;
    const s = data.summary;
    return {
      totalSales: `Q${s.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      salesCount: s.salesCount.toLocaleString('es-GT'),
      averageTicket: `Q${s.averageTicket.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      cashSales: `Q${s.cashSales.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      creditSales: `Q${s.creditSales.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      creditSalesPct: `${s.creditSalesPct}%`,
      totalPurchases: `Q${s.totalPurchases.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      purchaseCount: s.purchaseCount.toLocaleString('es-GT'),
      totalReceivable: `Q${s.totalReceivable.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      debtorsCount: s.debtorsCount.toLocaleString('es-GT'),
      totalCustomers: s.totalCustomers.toLocaleString('es-GT'),
      totalUnitsInStock: Math.round(s.totalUnitsInStock).toLocaleString('es-GT'),
      totalCatalogProducts: s.totalCatalogProducts.toLocaleString('es-GT'),
    };
  }, [data]);

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-4">
      {/* Cabecera con Título, Selector de Período y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4 print:border-none">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-headline tracking-tight text-foreground">
                Reportes y Estadísticas
              </h1>
              <p className="text-sm text-muted-foreground">
                Análisis comparativo entre familias, productos, proveedores, vendedores y períodos fiscales.
              </p>
            </div>
          </div>
        </div>

        {/* Controles de Período y Exportación */}
        <div className="flex items-center flex-wrap gap-2 print:hidden">
          <div className="flex items-center gap-1.5 bg-card border border-border/70 rounded-xl px-2.5 py-1 shadow-sm">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="border-0 shadow-none h-8 w-[170px] text-xs font-semibold focus:ring-0">
                <SelectValue placeholder="Seleccionar Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Histórico Completo</SelectItem>
                <SelectItem value="2026">Año 2026 (Actual)</SelectItem>
                <SelectItem value="2025">Año 2025</SelectItem>
                <SelectItem value="2024">Año 2024</SelectItem>
                <SelectItem value="2023">Año 2023</SelectItem>
                <SelectItem value="2022">Año 2022</SelectItem>
                <SelectItem value="12months">Últimos 12 Meses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportCSV(activeTab)}
            className="h-9 gap-1.5 text-xs font-semibold rounded-xl border-border/70 bg-card hover:bg-muted/70"
            title="Exportar datos actuales a archivo Excel CSV"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Excel</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-9 gap-1.5 text-xs font-semibold rounded-xl border-border/70 bg-card hover:bg-muted/70"
            title="Imprimir reporte"
          >
            <Printer className="h-4 w-4 text-muted-foreground" />
            <span>Imprimir</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchReports(period)}
            disabled={loading}
            className="h-9 w-9 rounded-xl hover:bg-muted/70"
            title="Recargar métricas"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
          </Button>
        </div>
      </div>

      {/* 4 Tarjetas Métricas Principales (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="rounded-2xl border-border/70 shadow-sm bg-card hover:border-primary/40 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Total Ventas</p>
              {loading ? (
                <Skeleton className="h-7 w-28" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {formattedSummary?.totalSales}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                <span>{formattedSummary?.salesCount} facturas</span>
                <span>•</span>
                <span className="text-emerald-600 font-semibold">Q{data?.summary?.averageTicket.toFixed(0)} prom.</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
              <DollarSign className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-sm bg-card hover:border-emerald-500/40 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Cuentas por Cobrar</p>
              {loading ? (
                <Skeleton className="h-7 w-28" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                  {formattedSummary?.totalReceivable}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground font-mono">
                {formattedSummary?.debtorsCount} clientes con saldo pendiente
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <CreditCard className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-sm bg-card hover:border-blue-500/40 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Existencia en Bodegas</p>
              {loading ? (
                <Skeleton className="h-7 w-28" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {formattedSummary?.totalUnitsInStock} <span className="text-xs font-normal text-muted-foreground">unidades</span>
                </p>
              )}
              <p className="text-[11px] text-muted-foreground font-mono">
                {formattedSummary?.totalCatalogProducts} artículos en catálogo
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <Package className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-sm bg-card hover:border-purple-500/40 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Total Compras</p>
              {loading ? (
                <Skeleton className="h-7 w-28" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {formattedSummary?.totalPurchases}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground font-mono">
                {formattedSummary?.purchaseCount} comprobantes a proveedores
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pestañas de Análisis y Comparativas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-2xl border border-border/60 w-full sm:w-auto flex flex-wrap h-auto gap-1">
          <TabsTrigger value="resumen" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            <span>Ventas y Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="familias" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            <span>Comparativa Familias</span>
          </TabsTrigger>
          <TabsTrigger value="periodos" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            <span>Periodos Fiscales (YoY)</span>
          </TabsTrigger>
          <TabsTrigger value="vendedores" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <UserCheck className="h-4 w-4" />
            <span>Vendedores / Cajeros</span>
          </TabsTrigger>
          <TabsTrigger value="productos" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <Scale className="h-4 w-4" />
            <span>Comparador Productos</span>
          </TabsTrigger>
          <TabsTrigger value="proveedores" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <Receipt className="h-4 w-4" />
            <span>Proveedores</span>
          </TabsTrigger>
          <TabsTrigger value="creditos" className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <CreditCard className="h-4 w-4" />
            <span>Créditos y Cobros</span>
          </TabsTrigger>
        </TabsList>

        {/* ================= PESTAÑA 1: RESUMEN Y VENTAS ================= */}
        <TabsContent value="resumen" className="space-y-4 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg font-headline">Evolución de Facturación</CardTitle>
                  <CardDescription className="text-xs">
                    Comportamiento del volumen de ventas en el período seleccionado ({period === 'all' ? 'Histórico 2009-2026' : period})
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {data?.salesTrend?.length || 0} cortes
                </Badge>
              </CardHeader>
              <CardContent className="pt-2">
                {loading ? (
                  <Skeleton className="h-[280px] w-full rounded-xl" />
                ) : (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data?.salesTrend || []} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                        <XAxis 
                          dataKey="label" 
                          tick={{ fontSize: 11 }} 
                          tickLine={false} 
                          axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 11 }} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(val) => `Q${(val / 1000000).toFixed(1)}M`}
                        />
                        <RechartsTooltip 
                          formatter={(value: any) => [`Q${Number(value).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, 'Facturado']}
                          labelFormatter={(label) => `Período: ${label}`}
                          contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                        />
                        <Bar dataKey="totalSales" fill="#F25C3B" radius={[6, 6, 0, 0]} name="Ventas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg font-headline">Contado vs Crédito</CardTitle>
                <CardDescription className="text-xs">Distribución de formas de pago registradas</CardDescription>
              </CardHeader>
              <CardContent className="pt-2 flex-grow flex flex-col justify-center">
                {loading ? (
                  <Skeleton className="h-[220px] w-full rounded-xl" />
                ) : (
                  <>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data?.paymentDistribution || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {(data?.paymentDistribution || []).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            formatter={(value: any) => [`Q${Number(value).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, 'Total']}
                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2 mt-2 pt-2 border-t border-border/40">
                      {(data?.paymentDistribution || []).map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                            <span className="font-medium text-foreground">{item.name}</span>
                            <span className="text-muted-foreground">({item.count.toLocaleString('es-GT')} facturas)</span>
                          </div>
                          <span className="font-mono font-semibold text-foreground">
                            Q{item.value.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================= PESTAÑA 2: COMPARATIVA ENTRE FAMILIAS ================= */}
        <TabsContent value="familias" className="space-y-4 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg font-headline">Participación por Familia de Productos</CardTitle>
                <CardDescription className="text-xs">
                  Comparativa de facturación acumulada entre las 10 categorías de inventario
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {loading ? (
                  <Skeleton className="h-[300px] w-full rounded-xl" />
                ) : (
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={data?.categoryComparison || []} 
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                        <XAxis 
                          type="number" 
                          tickFormatter={(val) => `Q${(val / 1000000).toFixed(0)}M`}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          tick={{ fontSize: 11, fontWeight: 600 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <RechartsTooltip 
                          formatter={(value: any) => [`Q${Number(value).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, 'Total Vendido']}
                          contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                        />
                        <Bar dataKey="totalSales" fill="#3B82F6" radius={[0, 6, 6, 0]} name="Ventas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg font-headline">Distribución Porcentual (%)</CardTitle>
                <CardDescription className="text-xs">Cuota de mercado interna por familia</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {loading ? (
                  <Skeleton className="h-[280px] w-full rounded-xl" />
                ) : (
                  <div className="space-y-3">
                    {(data?.categoryComparison || []).slice(0, 6).map((cat, idx) => (
                      <div key={cat.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                            {cat.name}
                          </span>
                          <span className="font-mono text-primary">{cat.percentage}%</span>
                        </div>
                        <Progress value={cat.percentage} className="h-1.5" />
                        <div className="flex justify-between text-[10.5px] text-muted-foreground font-mono">
                          <span>{cat.productCount} productos</span>
                          <span>Q{cat.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-headline">Tabla Comparativa Completa de Familias</CardTitle>
                <CardDescription className="text-xs">Métricas de rotación, unidades, inventario y facturación por categoría</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleExportCSV('familias')} className="h-8 gap-1 text-xs">
                <Download className="h-3.5 w-3.5" /> Exportar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border border-border/60 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold text-xs">Familia / Categoría</TableHead>
                      <TableHead className="text-center font-semibold text-xs">Variedad Productos</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Unidades Vendidas</TableHead>
                      <TableHead className="text-center font-semibold text-xs">Stock Actual</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Total Facturado</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Participación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      (data?.categoryComparison || []).map((cat) => (
                        <TableRow key={cat.id} className="hover:bg-muted/40 text-xs font-mono">
                          <TableCell className="font-sans font-bold text-foreground">{cat.name}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{cat.productCount} skus</TableCell>
                          <TableCell className="text-right font-semibold text-foreground">{cat.unitsSold.toLocaleString('es-GT')}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px] font-mono">{Math.round(cat.inStock).toLocaleString('es-GT')} unid.</Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">Q{cat.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">{cat.percentage}%</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= PESTAÑA 3: PERIODOS FISCALES (YoY) ================= */}
        <TabsContent value="periodos" className="space-y-4 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg font-headline">Comparativa Mensual Multianual (2024 vs 2025 vs 2026)</CardTitle>
                <CardDescription className="text-xs">
                  Comparativa directa mes a mes de facturación entre los últimos 3 períodos fiscales
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {loading ? (
                  <Skeleton className="h-[300px] w-full rounded-xl" />
                ) : (
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data?.monthlyComparisonByYear || []} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `Q${(val / 1000000).toFixed(1)}M`} />
                        <RechartsTooltip 
                          formatter={(value: any, name: any) => [`Q${Number(value).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, `Año ${name}`]}
                          contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                        <Bar dataKey="2024" fill="#3B82F6" radius={[4, 4, 0, 0]} name="2024" />
                        <Bar dataKey="2025" fill="#F59E0B" radius={[4, 4, 0, 0]} name="2025" />
                        <Bar dataKey="2026" fill="#10B981" radius={[4, 4, 0, 0]} name="2026" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg font-headline">Crecimiento YoY</CardTitle>
                <CardDescription className="text-xs">Tasa de variación anual de ingresos</CardDescription>
              </CardHeader>
              <CardContent className="pt-2 space-y-3">
                {loading ? (
                  <Skeleton className="h-[260px] w-full rounded-xl" />
                ) : (
                  (data?.fiscalPeriodsComparison || []).slice(-5).map((fy) => (
                    <div key={fy.fiscalYear} className="p-2.5 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm text-foreground">Año {fy.fiscalYear}</span>
                        <p className="text-[11px] text-muted-foreground font-mono">{fy.invoiceCount.toLocaleString('es-GT')} facturas</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-foreground block">
                          Q{fy.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 0 })}
                        </span>
                        {fy.growthPct !== 0 ? (
                          <span className={`text-[11px] font-bold font-mono inline-flex items-center gap-0.5 ${fy.growthPct > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {fy.growthPct > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {fy.growthPct > 0 ? `+${fy.growthPct}%` : `${fy.growthPct}%`}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">Base</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-headline">Historial Comparativo de Ejercicios Fiscales</CardTitle>
                <CardDescription className="text-xs">Serie cronológica anual completa con tasas de crecimiento</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleExportCSV('periodos')} className="h-8 gap-1 text-xs">
                <Download className="h-3.5 w-3.5" /> Exportar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border border-border/60 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold text-xs">Ejercicio Fiscal</TableHead>
                      <TableHead className="text-center font-semibold text-xs">Total Facturas</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Ticket Promedio</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Ventas Contado</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Ventas Crédito</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Total Facturado</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Crecimiento YoY</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-28 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      (data?.fiscalPeriodsComparison || []).map((fy) => (
                        <TableRow key={fy.fiscalYear} className="hover:bg-muted/40 text-xs font-mono">
                          <TableCell className="font-sans font-bold text-foreground">Año {fy.fiscalYear}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{fy.invoiceCount.toLocaleString('es-GT')}</TableCell>
                          <TableCell className="text-right text-muted-foreground">Q{fy.averageTicket.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right text-muted-foreground">Q{fy.cashSales.toLocaleString('es-GT', { minimumFractionDigits: 0 })}</TableCell>
                          <TableCell className="text-right text-muted-foreground">Q{fy.creditSales.toLocaleString('es-GT', { minimumFractionDigits: 0 })}</TableCell>
                          <TableCell className="text-right font-bold text-primary">Q{fy.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right font-bold">
                            {fy.growthPct > 0 ? (
                              <span className="text-emerald-600">+{fy.growthPct}%</span>
                            ) : fy.growthPct < 0 ? (
                              <span className="text-red-500">{fy.growthPct}%</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= PESTAÑA 4: VENDEDORES Y CAJEROS ================= */}
        <TabsContent value="vendedores" className="space-y-4 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg font-headline">Ranking de Facturación por Vendedor</CardTitle>
                <CardDescription className="text-xs">
                  Comparativa de rendimiento en ventas del equipo de despacho y cajas
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {loading ? (
                  <Skeleton className="h-[300px] w-full rounded-xl" />
                ) : (
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={(data?.salespeopleComparison || []).slice(0, 10)} 
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                        <XAxis 
                          type="number" 
                          tickFormatter={(val) => `Q${(val / 1000000).toFixed(0)}M`}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          tick={{ fontSize: 11, fontWeight: 600 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <RechartsTooltip 
                          formatter={(value: any) => [`Q${Number(value).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, 'Total Vendido']}
                          contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                        />
                        <Bar dataKey="totalSales" fill="#10B981" radius={[0, 6, 6, 0]} name="Ventas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg font-headline">Líderes de Ventas</CardTitle>
                <CardDescription className="text-xs">Participación sobre el total facturado</CardDescription>
              </CardHeader>
              <CardContent className="pt-2 space-y-3">
                {loading ? (
                  <Skeleton className="h-[280px] w-full rounded-xl" />
                ) : (
                  (data?.salespeopleComparison || []).slice(0, 5).map((sp, idx) => (
                    <div key={sp.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono text-muted-foreground">#{idx + 1}</span>
                          {sp.name}
                        </span>
                        <span className="font-mono text-emerald-600">{sp.percentage}%</span>
                      </div>
                      <Progress value={sp.percentage * 3} className="h-1.5" />
                      <div className="flex justify-between text-[10.5px] text-muted-foreground font-mono">
                        <span>{sp.invoiceCount.toLocaleString('es-GT')} facturas</span>
                        <span>Ticket prom: Q{sp.averageTicket.toFixed(0)}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-headline">Desglose Detallado por Vendedor</CardTitle>
                <CardDescription className="text-xs">Volumen total, ticket promedio, ventas al contado y crédito</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleExportCSV('vendedores')} className="h-8 gap-1 text-xs">
                <Download className="h-3.5 w-3.5" /> Exportar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border border-border/60 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12 text-center font-semibold text-xs">#</TableHead>
                      <TableHead className="font-semibold text-xs">Vendedor / Cajero</TableHead>
                      <TableHead className="text-center font-semibold text-xs">Facturas Emitidas</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Ticket Promedio</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Ventas Contado</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Ventas Crédito</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Total Facturado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-28 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      (data?.salespeopleComparison || []).map((sp, idx) => (
                        <TableRow key={sp.name} className="hover:bg-muted/40 text-xs font-mono">
                          <TableCell className="text-center font-bold text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-sans font-bold text-foreground">{sp.name}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{sp.invoiceCount.toLocaleString('es-GT')}</TableCell>
                          <TableCell className="text-right text-muted-foreground">Q{sp.averageTicket.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right text-muted-foreground">Q{sp.cashSales.toLocaleString('es-GT', { minimumFractionDigits: 0 })}</TableCell>
                          <TableCell className="text-right text-muted-foreground">Q{sp.creditSales.toLocaleString('es-GT', { minimumFractionDigits: 0 })}</TableCell>
                          <TableCell className="text-right font-bold text-primary">Q{sp.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= PESTAÑA 5: COMPARADOR DE PRODUCTOS ================= */}
        <TabsContent value="productos" className="space-y-4 mt-0">
          {/* Comparador Interactivo de 2 Productos Lado a Lado */}
          <Card className="rounded-2xl border-2 border-primary/30 shadow-sm bg-card/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-primary">
                <Scale className="h-5 w-5" />
                <CardTitle className="text-base sm:text-lg font-headline">Comparador Interactivo de Productos</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Selecciona dos productos de tu catálogo para contrastar ventas históricas, tarifas de precios y existencias en bodega
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Selectores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-border/60">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Producto A:</label>
                  <Select value={productAId} onValueChange={setProductAId}>
                    <SelectTrigger className="h-9 text-xs font-medium rounded-xl">
                      <SelectValue placeholder="Seleccionar Producto A" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {(data?.catalogSummary || []).map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.sku} • {p.name.slice(0, 45)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Producto B:</label>
                  <Select value={productBId} onValueChange={setProductBId}>
                    <SelectTrigger className="h-9 text-xs font-medium rounded-xl">
                      <SelectValue placeholder="Seleccionar Producto B" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {(data?.catalogSummary || []).map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.sku} • {p.name.slice(0, 45)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tarjetas Comparativas Frente a Frente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {/* Columna Producto A */}
                <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="outline" className="text-[10.5px] font-mono text-primary border-primary/40">Producto A</Badge>
                      <h4 className="font-bold text-sm text-foreground mt-1">{productA?.name || 'Seleccione un producto'}</h4>
                      <p className="text-xs font-mono text-muted-foreground">SKU: {productA?.sku || '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                    <div className="p-2 rounded-lg bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block font-medium">Unidades Vendidas</span>
                      <span className="text-base font-bold font-mono text-foreground">{productA?.salesCount?.toLocaleString('es-GT') || 0}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block font-medium">Stock en Bodega</span>
                      <span className="text-base font-bold font-mono text-foreground">{productA?.inStock?.toLocaleString('es-GT') || 0}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block font-medium">Precio Normal</span>
                      <span className="text-base font-bold font-mono text-primary">Q{productA?.priceNormal?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block font-medium">Precio Mayorista</span>
                      <span className="text-base font-bold font-mono text-emerald-600">Q{productA?.priceMayorista?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                </div>

                {/* Columna Producto B */}
                <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="outline" className="text-[10.5px] font-mono text-blue-600 border-blue-400">Producto B</Badge>
                      <h4 className="font-bold text-sm text-foreground mt-1">{productB?.name || 'Seleccione un producto'}</h4>
                      <p className="text-xs font-mono text-muted-foreground">SKU: {productB?.sku || '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                    <div className="p-2 rounded-lg bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block font-medium">Unidades Vendidas</span>
                      <span className="text-base font-bold font-mono text-foreground">{productB?.salesCount?.toLocaleString('es-GT') || 0}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block font-medium">Stock en Bodega</span>
                      <span className="text-base font-bold font-mono text-foreground">{productB?.inStock?.toLocaleString('es-GT') || 0}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block font-medium">Precio Normal</span>
                      <span className="text-base font-bold font-mono text-primary">Q{productB?.priceNormal?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block font-medium">Precio Mayorista</span>
                      <span className="text-base font-bold font-mono text-emerald-600">Q{productB?.priceMayorista?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ranking General Top 20 Productos */}
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-headline">Top 20 Productos Más Vendidos del Catálogo</CardTitle>
                <CardDescription className="text-xs">Artículos con mayor demanda histórica en Ferretería González</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleExportCSV('productos')} className="h-8 gap-1 text-xs">
                <Download className="h-3.5 w-3.5" /> Exportar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border border-border/60 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12 text-center font-semibold text-xs">#</TableHead>
                      <TableHead className="font-semibold text-xs">SKU</TableHead>
                      <TableHead className="font-semibold text-xs">Descripción</TableHead>
                      <TableHead className="text-center font-semibold text-xs">Stock Disponible</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Unidades Vendidas</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Total Facturado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-60" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      (data?.topProducts || []).map((prod, index) => (
                        <TableRow key={prod.id} className="hover:bg-muted/40 text-xs">
                          <TableCell className="text-center font-bold text-muted-foreground font-mono">{index + 1}</TableCell>
                          <TableCell className="font-mono font-medium text-muted-foreground">{prod.sku}</TableCell>
                          <TableCell className="font-medium text-foreground max-w-md truncate" title={prod.name}>
                            {prod.name}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={prod.inStock > 0 ? "secondary" : "destructive"} className="text-[10.5px] font-mono">
                              {prod.inStock > 0 ? `${prod.inStock.toLocaleString('es-GT')} disp.` : 'Agotado'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-foreground">
                            {prod.qtySold.toLocaleString('es-GT')}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            Q{prod.totalAmount.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= PESTAÑA 6: PROVEEDORES Y COMPRAS ================= */}
        <TabsContent value="proveedores" className="space-y-4 mt-0">
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg font-headline">Comparativa de Proveedores</CardTitle>
                <CardDescription className="text-xs">
                  Participación y volumen total abastecido por los proveedores registrados
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleExportCSV('proveedores')} className="h-8 gap-1 text-xs">
                <Download className="h-3.5 w-3.5" /> Exportar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border border-border/60 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12 text-center font-semibold text-xs">#</TableHead>
                      <TableHead className="font-semibold text-xs">Proveedor</TableHead>
                      <TableHead className="font-semibold text-xs">NIT</TableHead>
                      <TableHead className="font-semibold text-xs">Teléfono</TableHead>
                      <TableHead className="text-center font-semibold text-xs">Órdenes de Compra</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Total Invertido</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Participación %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      (data?.supplierComparison || []).map((sup, index) => (
                        <TableRow key={sup.id} className="hover:bg-muted/40 text-xs">
                          <TableCell className="text-center font-bold text-muted-foreground font-mono">{index + 1}</TableCell>
                          <TableCell className="font-semibold text-foreground">{sup.name}</TableCell>
                          <TableCell className="font-mono text-muted-foreground">{sup.nit || 'CF'}</TableCell>
                          <TableCell className="font-mono text-muted-foreground">{sup.phone || 'N/A'}</TableCell>
                          <TableCell className="text-center font-mono font-medium">{sup.purchaseCount}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-primary">
                            Q{sup.totalPurchased.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {sup.percentage}%
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= PESTAÑA 7: CRÉDITOS Y COBROS ================= */}
        <TabsContent value="creditos" className="space-y-4 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-headline">Cuentas por Cobrar (Deudores)</CardTitle>
                  <CardDescription className="text-xs">Saldos pendientes más altos para gestión de cobro</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleExportCSV('deudores')} className="h-8 gap-1 text-xs">
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="border border-border/60 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-semibold text-xs">Cliente / Teléfono</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Límite</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Saldo Pendiente</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        (data?.topDebtors || []).slice(0, 10).map((d) => (
                          <TableRow key={d.id} className="hover:bg-muted/40 text-xs">
                            <TableCell>
                              <p className="font-semibold text-foreground truncate max-w-[200px]" title={d.name}>{d.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">Tel: {d.phone || 'N/A'}</p>
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              Q{d.limitCredit.toLocaleString('es-GT', { minimumFractionDigits: 0 })}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                              Q{d.balance.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-headline">Top Clientes Históricos</CardTitle>
                  <CardDescription className="text-xs">Mayor volumen de facturación acumulada</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border border-border/60 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-semibold text-xs">Cliente</TableHead>
                        <TableHead className="text-center font-semibold text-xs">Facturas</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Total Comprado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        (data?.topCustomers || []).slice(0, 10).map((c) => (
                          <TableRow key={c.id} className="hover:bg-muted/40 text-xs">
                            <TableCell>
                              <p className="font-semibold text-foreground truncate max-w-[200px]" title={c.name}>{c.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">NIT: {c.nit || 'CF'}</p>
                            </TableCell>
                            <TableCell className="text-center font-mono text-muted-foreground">{c.invoiceCount}</TableCell>
                            <TableCell className="text-right font-mono font-bold text-primary">
                              Q{c.totalSpent.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-headline">Últimos Abonos de Crédito Recibidos</CardTitle>
              <CardDescription className="text-xs">Registro de pagos y amortizaciones a saldos de clientes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-border/60 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold text-xs">Fecha</TableHead>
                      <TableHead className="font-semibold text-xs">Cliente</TableHead>
                      <TableHead className="font-semibold text-xs">Concepto / Motivo</TableHead>
                      <TableHead className="text-center font-semibold text-xs">Cajero / Usuario</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Monto Abonado</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Saldo Resultante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      (data?.recentCreditMovements || []).map((m) => (
                        <TableRow key={m.id} className="hover:bg-muted/40 text-xs font-mono">
                          <TableCell className="text-muted-foreground">{m.date.split('T')[0]}</TableCell>
                          <TableCell className="font-sans font-medium text-foreground">{m.customerName}</TableCell>
                          <TableCell className="font-sans text-muted-foreground">{m.reason}</TableCell>
                          <TableCell className="text-center text-muted-foreground font-sans">
                            <Badge variant="outline" className="text-[10px] font-mono">{m.userName || 'Sistema'}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                            Q{m.debit > 0 ? m.debit.toLocaleString('es-GT', { minimumFractionDigits: 2 }) : m.credit.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            Q{m.balance.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
