'use client';

import React, { useState, useEffect, useMemo, useTransition, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  CreditCard,
  Building2,
  Download,
  FileDown,
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
  Search,
  Check,
  ChevronsUpDown,
  X,
  Loader2,
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

interface ProductSearchComboboxProps {
  label: string;
  badgeLabel: string;
  badgeColorClass: string;
  selectedId: string;
  onSelect: (product: CatalogProduct) => void;
  products: CatalogProduct[];
  placeholder?: string;
}

function ProductSearchCombobox({
  label,
  badgeLabel,
  badgeColorClass,
  selectedId,
  onSelect,
  products,
  placeholder = "Buscar producto por nombre o SKU...",
}: ProductSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [remoteResults, setRemoteResults] = useState<CatalogProduct[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedId) || remoteResults.find(p => p.id === selectedId) || null;
  }, [products, remoteResults, selectedId]);

  // Filtrado reactivo e instantáneo en memoria
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 100);

    const tokens = q.split(/\s+/).filter(Boolean);
    const localMatches = products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      return tokens.every(token => name.includes(token) || sku.includes(token));
    });

    const combined = [...localMatches];
    remoteResults.forEach(r => {
      if (!combined.some(c => c.id === r.id)) {
        combined.push(r);
      }
    });

    return combined.slice(0, 100);
  }, [products, search, remoteResults]);

  // Búsqueda remota inteligente si el término no está en los top precargados
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setRemoteResults([]);
      setIsSearchingRemote(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingRemote(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=25`);
        if (res.ok) {
          const json = await res.json();
          const items: CatalogProduct[] = (json.items || []).map((item: any) => {
            const skuCode = item.codes?.find((c: any) => c.type === 'SKU')?.value || item.sku || item.id;
            const inStock = (item.stock || []).reduce((acc: number, s: any) => acc + (s.quantity || 0), 0);
            const priceNormal = item.prices?.find((p: any) => p.tierName === 'Normal')?.price || 0;
            const priceMayorista = item.prices?.find((p: any) => p.tierName === 'Mayorista')?.price || 0;
            return {
              id: item.id,
              sku: skuCode,
              name: item.name,
              salesCount: Number(item.salesCount || 0),
              inStock,
              priceNormal,
              priceMayorista,
            };
          });
          setRemoteResults(items);
        }
      } catch (err) {
        console.error('Error in search products:', err);
      } finally {
        setIsSearchingRemote(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <span className={badgeColorClass}>{badgeLabel}:</span>
        </label>
        {selectedProduct && (
          <span className="text-[11px] font-mono text-muted-foreground">
            SKU: <strong className="text-foreground">{selectedProduct.sku}</strong>
          </span>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-10 px-3 rounded-xl border border-input bg-background/90 hover:bg-muted/40 text-left font-normal shadow-xs focus:ring-1 focus:ring-primary"
          >
            {selectedProduct ? (
              <div className="flex items-center gap-2 truncate">
                <Badge variant="secondary" className="font-mono text-[10.5px] px-1.5 py-0 shrink-0">
                  {selectedProduct.sku}
                </Badge>
                <span className="text-xs truncate font-medium text-foreground">
                  {selectedProduct.name}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" /> {placeholder}
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[340px] sm:w-[480px] p-0 rounded-xl shadow-xl border border-border" align="start">
          {/* Buscador interactivo integrado directamente en la lista */}
          <div className="flex items-center gap-2 p-2.5 border-b border-border/70 bg-muted/40">
            <Search className="h-4 w-4 shrink-0 text-primary" />
            <input
              type="text"
              placeholder="Buscar por código SKU o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
            {isSearchingRemote && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Información de coincidencias */}
          <div className="px-3 py-1 bg-muted/20 text-[11px] text-muted-foreground flex items-center justify-between border-b border-border/40 font-mono">
            <span>{filteredProducts.length} producto(s) en lista</span>
            <span className="text-[10px] opacity-70">Clic para seleccionar</span>
          </div>

          {/* Lista scrollable de productos filtrados */}
          <div className="max-h-72 overflow-y-auto divide-y divide-border/30 p-1">
            {filteredProducts.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
                <Package className="h-6 w-6 mx-auto opacity-40 mb-1" />
                <p className="font-medium text-foreground">No se encontraron productos</p>
                <p className="text-[11px] opacity-75">Prueba buscando por otra palabra clave o código SKU.</p>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelect(p);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      "w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 group",
                      isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/60 text-foreground"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[10.5px] px-1.5 py-0.2 rounded bg-muted/80 text-foreground">
                          {p.sku}
                        </span>
                        <span className="text-[10.5px] text-muted-foreground">
                          Disp: <strong className={p.inStock > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>{p.inStock.toLocaleString('es-GT')}</strong>
                        </span>
                        <span className="text-[10.5px] text-muted-foreground">
                          Ventas: <strong>{p.salesCount.toLocaleString('es-GT')}</strong>
                        </span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate mt-1 group-hover:text-primary">
                        {p.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-muted-foreground font-mono">
                        <span>Normal: Q{p.priceNormal.toFixed(2)}</span>
                        <span>•</span>
                        <span>Mayorista: Q{p.priceMayorista.toFixed(2)}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface PrintableReportsDocumentProps {
  data: ReportData;
  period: string;
  startDate?: string;
  endDate?: string;
}

const getPeriodLabel = (p: string, start?: string, end?: string) => {
  if (p === 'custom' && start && end) {
    return `Del ${start} al ${end}`;
  }
  switch (p) {
    case 'all': return 'Histórico Completo (2009–2026)';
    case '2026': return 'Año Fiscal 2026';
    case '2025': return 'Año Fiscal 2025';
    case '2024': return 'Año Fiscal 2024';
    case '2023': return 'Año Fiscal 2023';
    case '2022': return 'Año Fiscal 2022';
    case 'this_month': return 'Mes Actual (Mayo 2026)';
    case 'last_month': return 'Mes Anterior (Abril 2026)';
    case 'last_30_days': return 'Últimos 30 Días';
    case 'last_90_days': return 'Últimos 90 Días';
    case '12months': return 'Últimos 12 Meses';
    case 'custom': return start && end ? `Del ${start} al ${end}` : 'Rango Personalizado';
    default: return `Período Fiscal ${p}`;
  }
};

const PrintableReportsDocument = React.forwardRef<HTMLDivElement, PrintableReportsDocumentProps>(
  ({ data, period, startDate, endDate }, ref) => {
    const periodLabel = getPeriodLabel(period, startDate, endDate);
    const currentDate = new Date().toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const currentTime = new Date().toLocaleTimeString('es-GT', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div
        ref={ref}
        style={{
          width: '840px',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        className="p-8 space-y-6"
      >
        {/* Barra superior decorativa con acento corporativo Diferacsa */}
        <div style={{ height: '6px', width: '100%', background: 'linear-gradient(90deg, #1E2538 0%, #1E2538 70%, #FF5722 70%, #FF5722 100%)', borderRadius: '4px' }} />

        {/* Encabezado con Membrete y Branding Oficial */}
        <div className="flex items-start justify-between pb-5 border-b-2 border-slate-200">
          {/* Logo y Nombre de Empresa */}
          <div className="flex items-center gap-3.5">
            <div
              style={{
                width: '54px',
                height: '54px',
                backgroundColor: '#1E2538',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '28px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              D
            </div>
            <div>
              <div style={{ fontSize: '26px', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.5px' }}>
                <span style={{ color: '#1E2538' }}>Difer</span>
                <span style={{ color: '#FF5722' }}>acsa</span>
              </div>
              <p style={{ fontSize: '13px', fontWeight: 800, color: '#334155', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>
                Ferretería González
              </p>
              <p style={{ fontSize: '11px', color: '#64748b' }}>
                Materiales de Construcción & Soluciones de Gestión Integral
              </p>
            </div>
          </div>

          {/* Datos de Membrete Fiscal */}
          <div className="text-[11px] text-slate-600 space-y-0.5 border-l-2 border-slate-200 pl-4 py-0.5">
            <p><strong className="text-slate-800">NIT:</strong> 5489119-1</p>
            <p><strong className="text-slate-800">PBX / Tel:</strong> (502) 7770-3362</p>
            <p><strong className="text-slate-800">Dirección:</strong> Tacaná, San Marcos, Guatemala</p>
            <p><strong className="text-slate-800">Sucursal:</strong> Casa Matriz • Terminal FACA-1251</p>
          </div>

          {/* Ficha de Metadatos del Informe */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '8px 12px',
              textAlign: 'right',
              minWidth: '200px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '9px',
                fontWeight: 800,
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                backgroundColor: '#1E2538',
                color: '#ffffff',
                marginBottom: '4px',
              }}
            >
              INFORME OFICIAL AUDITADO
            </span>
            <h2 style={{ fontSize: '12px', fontWeight: 900, color: '#1E2538', textTransform: 'uppercase' }}>
              Reporte de Gestión
            </h2>
            <p style={{ fontSize: '11px', color: '#334155', fontWeight: 600 }}>
              {periodLabel}
            </p>
            <p style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
              {currentDate} • {currentTime}
            </p>
          </div>
        </div>

        {/* Resumen Ejecutivo - 4 KPIs Corporativos */}
        <div>
          <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1E2538', marginBottom: '8px' }}>
            I. Resumen Financiero y Operativo
          </h3>
          <div className="grid grid-cols-4 gap-3">
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #1E2538', borderRadius: '8px', padding: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Ventas Totales</span>
              <p style={{ fontSize: '16px', fontWeight: 900, color: '#1E2538', marginTop: '2px', fontFamily: 'monospace' }}>
                Q{data.summary.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </p>
              <span style={{ fontSize: '10px', color: '#64748b' }}>{data.summary.salesCount.toLocaleString('es-GT')} facturas emitidas</span>
            </div>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #FF5722', borderRadius: '8px', padding: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Cuentas por Cobrar</span>
              <p style={{ fontSize: '16px', fontWeight: 900, color: '#FF5722', marginTop: '2px', fontFamily: 'monospace' }}>
                Q{data.summary.totalReceivable.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </p>
              <span style={{ fontSize: '10px', color: '#64748b' }}>{data.summary.debtorsCount} clientes con saldo</span>
            </div>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7', borderRadius: '8px', padding: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Existencias Físicas</span>
              <p style={{ fontSize: '16px', fontWeight: 900, color: '#0284c7', marginTop: '2px', fontFamily: 'monospace' }}>
                {data.summary.totalUnitsInStock.toLocaleString('es-GT')}
              </p>
              <span style={{ fontSize: '10px', color: '#64748b' }}>{data.summary.totalCatalogProducts.toLocaleString('es-GT')} artículos registrados</span>
            </div>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #7c3aed', borderRadius: '8px', padding: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Compras Totales</span>
              <p style={{ fontSize: '16px', fontWeight: 900, color: '#7c3aed', marginTop: '2px', fontFamily: 'monospace' }}>
                Q{data.summary.totalPurchases.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </p>
              <span style={{ fontSize: '10px', color: '#64748b' }}>{data.summary.purchaseCount} comprobantes recibidos</span>
            </div>
          </div>
        </div>

        {/* Desglose de Ventas por Modalidad de Pago */}
        <div style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px' }}>
          <div className="flex items-center justify-between text-xs">
            <span style={{ fontWeight: 800, color: '#1E2538' }}>Distribución de Ingresos:</span>
            <div className="flex items-center gap-5">
              <span><strong>Contado:</strong> Q{data.summary.cashSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })} ({100 - data.summary.creditSalesPct}%)</span>
              <span><strong>Crédito:</strong> Q{data.summary.creditSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })} ({data.summary.creditSalesPct}%)</span>
              <span><strong>Ticket Promedio:</strong> Q{data.summary.averageTicket.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Sección II: Comparativa por Familias de Productos (10 Categorías) */}
        <div>
          <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1E2538', marginBottom: '8px' }}>
            II. Desglose y Cuota por Familias de Productos (Categorías)
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#1E2538', color: '#ffffff' }}>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', width: '30px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538' }}>Familia / Categoría</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'center' }}>Artículos</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'right' }}>Unidades Vendidas</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'center' }}>Stock en Bodega</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'right' }}>Total Facturado (Q)</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'right' }}>Cuota (%)</th>
              </tr>
            </thead>
            <tbody>
              {(data.categoryComparison || []).map((cat, idx) => (
                <tr key={cat.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#0f172a' }}>{cat.name}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{cat.productCount}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontFamily: 'monospace' }}>{cat.unitsSold.toLocaleString('es-GT')}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontFamily: 'monospace' }}>{cat.inStock.toLocaleString('es-GT')}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700, color: '#1E2538', fontFamily: 'monospace' }}>
                    Q{cat.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 800, color: '#FF5722', fontFamily: 'monospace' }}>
                    {cat.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sección III: Desempeño Comercial del Equipo de Ventas / Cajeros */}
        <div>
          <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1E2538', marginBottom: '8px' }}>
            III. Desempeño del Equipo de Ventas y Cajeros
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#1E2538', color: '#ffffff' }}>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', width: '30px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538' }}>Vendedor / Cajero</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'center' }}>Facturas</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'right' }}>Ticket Promedio</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'right' }}>Ventas Contado (Q)</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'right' }}>Ventas Crédito (Q)</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'right' }}>Total Facturado (Q)</th>
              </tr>
            </thead>
            <tbody>
              {(data.salespeopleComparison || []).slice(0, 10).map((sp, idx) => (
                <tr key={sp.name} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#0f172a' }}>{sp.name}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontFamily: 'monospace' }}>{sp.invoiceCount.toLocaleString('es-GT')}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontFamily: 'monospace' }}>Q{sp.averageTicket.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontFamily: 'monospace' }}>Q{sp.cashSales.toLocaleString('es-GT', { minimumFractionDigits: 0 })}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontFamily: 'monospace' }}>Q{sp.creditSales.toLocaleString('es-GT', { minimumFractionDigits: 0 })}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700, color: '#1E2538', fontFamily: 'monospace' }}>
                    Q{sp.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sección IV: Evolución por Periodos Fiscales Históricos (YoY) */}
        <div>
          <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1E2538', marginBottom: '8px' }}>
            IV. Crecimiento Interanual por Períodos Fiscales (YoY)
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#1E2538', color: '#ffffff' }}>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'center' }}>Año Fiscal</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'center' }}>Comprobantes</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'right' }}>Ticket Promedio</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'right' }}>Total Facturado (Q)</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'right' }}>Crecimiento Anual (% YoY)</th>
              </tr>
            </thead>
            <tbody>
              {(data.fiscalPeriodsComparison || []).slice(-8).map((fy, idx) => (
                <tr key={fy.fiscalYear} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, color: '#1E2538' }}>{fy.fiscalYear}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontFamily: 'monospace' }}>{fy.invoiceCount.toLocaleString('es-GT')}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontFamily: 'monospace' }}>Q{fy.averageTicket.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                    Q{fy.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: fy.growthPct >= 0 ? '#10b981' : '#ef4444' }}>
                    {fy.growthPct > 0 ? `+${fy.growthPct}%` : `${fy.growthPct}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sección V: Top 10 Productos Más Vendidos */}
        <div>
          <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1E2538', marginBottom: '8px' }}>
            V. Top 10 Productos de Mayor Demanda Histórica
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#1E2538', color: '#ffffff' }}>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', width: '30px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', width: '90px' }}>SKU</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538' }}>Descripción del Artículo</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'center', width: '90px' }}>Stock Bodega</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'right', width: '110px' }}>Unidades Vendidas</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'right', width: '120px' }}>Total Facturado (Q)</th>
              </tr>
            </thead>
            <tbody>
              {(data.topProducts || []).slice(0, 10).map((prod, idx) => (
                <tr key={prod.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', fontFamily: 'monospace', fontWeight: 600 }}>{prod.sku}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', fontWeight: 600, color: '#0f172a' }}>{prod.name}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontFamily: 'monospace' }}>
                    {prod.inStock > 0 ? `${prod.inStock.toLocaleString('es-GT')} disp.` : 'Agotado'}
                  </td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontFamily: 'monospace' }}>{prod.qtySold.toLocaleString('es-GT')}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700, color: '#1E2538', fontFamily: 'monospace' }}>
                    Q{prod.totalAmount.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sección VI: Abastecimiento y Principales Proveedores */}
        <div>
          <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1E2538', marginBottom: '8px' }}>
            VI. Abastecimiento y Principales Proveedores Comerciales
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#1E2538', color: '#ffffff' }}>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', width: '30px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538' }}>Proveedor</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'center' }}>NIT</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'center' }}>Compras</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'right' }}>Total Comprado (Q)</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1E2538', textAlign: 'right' }}>Participación (%)</th>
              </tr>
            </thead>
            <tbody>
              {(data.supplierComparison || []).slice(0, 6).map((sup, idx) => (
                <tr key={sup.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#0f172a' }}>{sup.name}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontFamily: 'monospace' }}>{sup.nit}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontFamily: 'monospace' }}>{sup.purchaseCount}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700, color: '#1E2538', fontFamily: 'monospace' }}>
                    Q{sup.totalPurchased.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 800, color: '#FF5722', fontFamily: 'monospace' }}>
                    {sup.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sección de Validación, Firmas y Membrete de Cierre */}
        <div style={{ paddingTop: '20px', marginTop: '20px', borderTop: '2px solid #e2e8f0' }}>
          <div className="grid grid-cols-2 gap-12 pb-6">
            <div className="text-center">
              <div style={{ height: '50px', borderBottom: '1px solid #94a3b8', marginBottom: '8px' }} />
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#1E2538' }}>Firma y Sello de Autorización</p>
              <p style={{ fontSize: '10px', color: '#64748b' }}>Gerencia General • Diferacsa</p>
            </div>
            <div className="text-center">
              <div style={{ height: '50px', borderBottom: '1px solid #94a3b8', marginBottom: '8px' }} />
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#1E2538' }}>Firma y Sello de Conformidad</p>
              <p style={{ fontSize: '10px', color: '#64748b' }}>Auditoría Contable & Finanzas</p>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px', textAlign: 'center', fontSize: '10px', color: '#64748b', lineHeight: 1.5 }}>
            <p style={{ fontWeight: 600, color: '#334155' }}>
              Este documento es un informe ejecutivo oficial emitido por el sistema ERP Diferacsa. Toda la información contenida es confidencial y para uso exclusivo de la administración de Ferretería González.
            </p>
            <p style={{ marginTop: '2px' }}>
              Diferacsa - Ferretería González • Tacaná, San Marcos, Guatemala • PBX: (502) 7770-3362 • www.diferacsa.com
            </p>
          </div>
        </div>
      </div>
    );
  }
);
PrintableReportsDocument.displayName = 'PrintableReportsDocument';

export default function ReportsPage() {
  const [period, setPeriod] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-05-18');
  const [showCustomRange, setShowCustomRange] = useState<boolean>(false);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('resumen');
  const [, startTransition] = useTransition();
  const { toast } = useToast();
  const printableReportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  // Estados para el Comparador Interactivo de 2 Productos
  const [productAId, setProductAId] = useState<string>('');
  const [productBId, setProductBId] = useState<string>('');
  const [customProducts, setCustomProducts] = useState<Record<string, CatalogProduct>>({});

  const handleSelectProductA = (product: CatalogProduct) => {
    setProductAId(product.id);
    setCustomProducts(prev => ({ ...prev, [product.id]: product }));
  };

  const handleSelectProductB = (product: CatalogProduct) => {
    setProductBId(product.id);
    setCustomProducts(prev => ({ ...prev, [product.id]: product }));
  };

  const handleSetCompareFromTop = (prod: any, slot: 'A' | 'B') => {
    const fromSummary = data?.catalogSummary?.find(p => p.id === prod.id);
    const catalogItem: CatalogProduct = fromSummary || {
      id: prod.id,
      sku: prod.sku,
      name: prod.name,
      salesCount: Number(prod.qtySold || 0),
      inStock: Number(prod.inStock || 0),
      priceNormal: Number(prod.qtySold > 0 ? prod.totalAmount / prod.qtySold : 0),
      priceMayorista: 0,
    };
    if (slot === 'A') {
      handleSelectProductA(catalogItem);
    } else {
      handleSelectProductB(catalogItem);
    }
  };

  // Descarga de Reporte Ejecutivo en PDF con Membrete y Branding Oficial
  const handleDownloadPDF = async () => {
    if (!printableReportRef.current || !data) {
      toast({
        title: "No hay datos para exportar",
        description: "Espere a que las estadísticas del reporte terminen de cargar.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPDF(true);
    toast({
      title: "Generando PDF oficial...",
      description: "Preparando documento con membrete, logotipo y métricas corporativas.",
    });

    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const jspdfModule = await import('jspdf');
      const jsPDF = jspdfModule.default || jspdfModule.jsPDF;

      const element = printableReportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = position - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      const periodClean = period === 'custom' ? `${startDate}_al_${endDate}` : period.replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `Diferacsa_Reporte_Ejecutivo_${periodClean}_${dateStr}.pdf`;
      pdf.save(filename);

      toast({
        title: "Reporte PDF descargado",
        description: `El archivo ${filename} se ha descargado correctamente.`,
      });
    } catch (error) {
      console.error('Error al generar PDF de reporte:', error);
      toast({
        title: "Error al generar PDF",
        description: "Ocurrió un inconveniente al generar el documento. Intente de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const fetchReports = async (selectedPeriod: string, customStart?: string, customEnd?: string) => {
    setLoading(true);
    try {
      let url = `/api/reports?period=${encodeURIComponent(selectedPeriod)}`;
      if (selectedPeriod === 'custom' || (customStart && customEnd)) {
        const s = customStart || startDate;
        const e = customEnd || endDate;
        url += `&startDate=${encodeURIComponent(s)}&endDate=${encodeURIComponent(e)}`;
      }
      const res = await fetch(url);
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
  }, []);

  const handlePeriodChange = (val: string) => {
    setPeriod(val);
    if (val === 'custom') {
      setShowCustomRange(true);
      startTransition(() => {
        fetchReports('custom', startDate, endDate);
      });
    } else {
      setShowCustomRange(false);
      startTransition(() => {
        fetchReports(val);
      });
    }
  };

  const handleApplyCustomRange = () => {
    setPeriod('custom');
    setShowCustomRange(true);
    startTransition(() => {
      fetchReports('custom', startDate, endDate);
    });
  };

  // Comparador de Productos Activos
  const productA = useMemo(() => {
    return data?.catalogSummary?.find(p => p.id === productAId) || customProducts[productAId] || null;
  }, [data, productAId, customProducts]);

  const productB = useMemo(() => {
    return data?.catalogSummary?.find(p => p.id === productBId) || customProducts[productBId] || null;
  }, [data, productBId, customProducts]);

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
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[11px] font-medium border-primary/40 text-primary bg-primary/5 gap-1.5 py-0.5">
                  <Calendar className="h-3 w-3" />
                  <span>Período: <strong>{getPeriodLabel(period, startDate, endDate)}</strong></span>
                </Badge>
                {data && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {data.summary.salesCount.toLocaleString('es-GT')} facturas • Total: <strong className="text-foreground">Q{data.summary.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controles de Período y Exportación */}
        <div className="flex items-center flex-wrap gap-2 print:hidden">
          <div className="flex items-center gap-1.5 bg-card border border-border/70 rounded-xl px-2.5 py-1 shadow-sm">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="border-0 shadow-none h-8 w-[190px] text-xs font-semibold focus:ring-0">
                <SelectValue placeholder="Seleccionar Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Histórico Completo (2009–2026)</SelectItem>
                <SelectItem value="2026">Año 2026 (Actual)</SelectItem>
                <SelectItem value="2025">Año 2025</SelectItem>
                <SelectItem value="2024">Año 2024</SelectItem>
                <SelectItem value="2023">Año 2023</SelectItem>
                <SelectItem value="2022">Año 2022</SelectItem>
                <SelectItem value="this_month">Mes Actual (Mayo 2026)</SelectItem>
                <SelectItem value="last_month">Mes Anterior (Abril 2026)</SelectItem>
                <SelectItem value="last_30_days">Últimos 30 Días</SelectItem>
                <SelectItem value="last_90_days">Últimos 90 Días</SelectItem>
                <SelectItem value="12months">Últimos 12 Meses</SelectItem>
                <SelectItem value="custom">📅 Rango Personalizado...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant={showCustomRange ? "default" : "outline"}
            size="sm"
            onClick={() => setShowCustomRange(!showCustomRange)}
            className="h-9 gap-1.5 text-xs font-semibold rounded-xl border-border/70"
            title="Abrir selector de rango de fechas personalizado"
          >
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Rango</span>
          </Button>

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
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF || loading}
            className="h-9 gap-1.5 text-xs font-semibold rounded-xl border-border/70 bg-card hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors shadow-xs"
            title="Descargar reporte oficial en formato PDF con logotipo, membrete y branding de Diferacsa"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Generando PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span>Descargar PDF</span>
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchReports(period, startDate, endDate)}
            disabled={loading}
            className="h-9 w-9 rounded-xl hover:bg-muted/70"
            title="Recargar métricas"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
          </Button>
        </div>
      </div>

      {/* Barra de Filtro por Rango de Fechas Personalizado */}
      {(period === 'custom' || showCustomRange) && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-card rounded-2xl border border-primary/30 shadow-xs animate-in fade-in duration-200 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-primary" /> Filtrar por Rango Específico:
            </span>
            <div className="flex items-center gap-1.5">
              <label className="text-muted-foreground text-[11px] font-medium">Desde:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-mono text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-muted-foreground text-[11px] font-medium">Hasta:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-mono text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            <Button
              size="sm"
              onClick={handleApplyCustomRange}
              disabled={loading}
              className="h-8 px-3 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span>Aplicar Rango</span>
            </Button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handlePeriodChange('all')}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Restablecer a Histórico
          </Button>
        </div>
      )}

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
              {/* Selectores con buscador integrado en la lista */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-border/60">
                <ProductSearchCombobox
                  label="Producto A"
                  badgeLabel="Producto A"
                  badgeColorClass="text-primary font-bold font-mono"
                  selectedId={productAId}
                  onSelect={handleSelectProductA}
                  products={data?.catalogSummary || []}
                  placeholder="Buscar Producto A (SKU o nombre)..."
                />

                <ProductSearchCombobox
                  label="Producto B"
                  badgeLabel="Producto B"
                  badgeColorClass="text-blue-500 font-bold font-mono"
                  selectedId={productBId}
                  onSelect={handleSelectProductB}
                  products={data?.catalogSummary || []}
                  placeholder="Buscar Producto B (SKU o nombre)..."
                />
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
                      <TableHead className="text-center font-semibold text-xs">Comparar</TableHead>
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
                          <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
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
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-1.5 text-[10.5px] rounded-md font-mono hover:bg-primary/10 hover:text-primary hover:border-primary"
                                onClick={() => handleSetCompareFromTop(prod, 'A')}
                                title="Comparar como Producto A"
                              >
                                vs A
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-1.5 text-[10.5px] rounded-md font-mono hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-400"
                                onClick={() => handleSetCompareFromTop(prod, 'B')}
                                title="Comparar como Producto B"
                              >
                                vs B
                              </Button>
                            </div>
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

      {/* Contenedor Oculto para Generación de PDF con Membrete y Branding Oficial */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none' }} aria-hidden="true">
        {data && (
          <PrintableReportsDocument
            ref={printableReportRef}
            data={data}
            period={period}
            startDate={startDate}
            endDate={endDate}
          />
        )}
      </div>
    </div>
  );
}
