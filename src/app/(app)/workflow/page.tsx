'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Package, 
  Warehouse, 
  Receipt, 
  CreditCard, 
  Lock, 
  RotateCcw, 
  Wrench, 
  ArrowRight, 
  Sparkles,
  CheckCircle2,
  Boxes,
  Activity,
  Layers,
  ArrowUpRight
} from "lucide-react";

type NodeKey = 'compras' | 'stock' | 'tpv' | 'caja';

interface NodeDetail {
  title: string;
  tag: string;
  desc: string;
  in: string;
  proc: string;
  out: string;
  icon: any;
  color: string;
  badgeVariant: 'amber' | 'mint' | 'default' | 'blue';
}

const nodeData: Record<NodeKey, NodeDetail> = {
  tpv: {
    title: "Punto de Venta (TPV)",
    tag: "Núcleo Transaccional",
    desc: "El cajero selecciona la sucursal y almacén. Al registrar productos, el sistema verifica existencias en tiempo real, aplica tarifas según el tipo de cliente (general, mayorista) y permite pausar la compra con 'Ventas Aparcadas'. Al cobrar, descuenta el stock atómicamente y genera el registro en caja.",
    in: "Escaneo de SKU, tarifa de cliente, selección de almacén activo.",
    proc: "sellStock() atómico, cálculo de IVA, validación de cupones y apartados.",
    out: "Factura / DTE emitida, ticket impreso, movimiento de ingreso en caja.",
    icon: ShoppingCart,
    color: "#EE5937",
    badgeVariant: "default"
  },
  compras: {
    title: "Compras & Abastecimiento",
    tag: "Cadena de Suministro",
    desc: "Monitorea los artículos que han alcanzado su umbral de stock mínimo o pedidos especiales. Permite crear Órdenes de Compra (OC) hacia proveedores, registrar costos y recepcionar la mercadería actualizando el costo promedio ponderado.",
    in: "Alertas de stock mínimo, catálogo de proveedores, costos de compra.",
    proc: "Generación de OC, inspección física en bodega, aprobación de entrada.",
    out: "Incremento automático en inventario, registro en Cuentas por Pagar.",
    icon: Package,
    color: "#D97706",
    badgeVariant: "amber"
  },
  stock: {
    title: "Gestión Multi-Almacén",
    tag: "Inventario Central",
    desc: "Administra múltiples ubicaciones físicas (Bodega Principal, Bodega Secundaria, Mostrador). Controla traspasos entre sucursales mediante transferencias y asegura que el TPV descuente de la ubicación correcta sin descuadres.",
    in: "Entradas de compra, traspasos entre bodegas, ajustes por mermas.",
    proc: "Control de stock por ubicación física, bloqueo de productos apartados.",
    out: "Inventario valorizado, reporte de rotación y disponibilidad en vivo.",
    icon: Warehouse,
    color: "#059669",
    badgeVariant: "mint"
  },
  caja: {
    title: "Facturación, Tesorería & Arqueo",
    tag: "Cierre Financiero",
    desc: "Cada terminal abre con un fondo de caja asignado. Durante el turno acumula cobros en efectivo, tarjetas y transferencias, así como salidas por gastos menores. Al final de la jornada realiza el arqueo físico y genera el Corte Z definitivo.",
    in: "Fondo inicial de turno, cobros TPV, egresos y retiros autorizados.",
    proc: "Conteo físico vs balance del sistema, conciliación de discrepancias.",
    out: "Corte X parcial, Corte Z diario, reporte contable en PDF.",
    icon: Receipt,
    color: "#0284C7",
    badgeVariant: "blue"
  }
};

export default function WorkflowPage() {
  const [selectedNode, setSelectedNode] = useState<NodeKey>('tpv');
  const [activeFilter, setActiveFilter] = useState<'all' | NodeKey>('all');

  const currentDetail = nodeData[selectedNode];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-ping"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Flujo Operativo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-headline mt-1">
            Diagrama Gráfico de Operaciones
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium">
            Representación visual interactiva del ciclo de vida de una venta, stock y tesorería en Diferacsa.
          </p>
        </div>

        {/* Filtro de Módulos */}
        <div className="inline-flex p-1 rounded-full bg-card border border-border/80 shadow-sm text-xs font-semibold gap-1 self-start sm:self-auto">
          {(['all', 'compras', 'stock', 'tpv', 'caja'] as const).map((key) => {
            const labels = { all: 'Todo', compras: 'Compras', stock: 'Almacén', tpv: 'Venta TPV', caja: 'Caja' };
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setActiveFilter(key);
                  if (key !== 'all') setSelectedNode(key);
                }}
                className={`px-3.5 py-1.5 rounded-full transition-all ${
                  isActive 
                    ? 'bg-[#1E2538] text-white shadow-xs font-bold' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {labels[key]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Nodos Visuales Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Nodo 1: Compras */}
        <div 
          onClick={() => setSelectedNode('compras')}
          className={`cursor-pointer rounded-3xl p-5 border transition-all flex flex-col justify-between ${
            selectedNode === 'compras' 
              ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 shadow-md ring-2 ring-amber-500/20 scale-[1.01]' 
              : 'border-border/70 bg-card hover:border-amber-400 hover:shadow-sm'
          } ${activeFilter !== 'all' && activeFilter !== 'compras' ? 'opacity-40' : 'opacity-100'}`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="amber">Paso 1</Badge>
              <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground font-headline">Compras & Abastecimiento</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Órdenes de compra a proveedores al alcanzar umbral mínimo de stock.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 text-xs font-semibold text-amber-700 flex items-center justify-between">
            <span>Entrada física</span>
            <span className="flex items-center gap-1">Hacia Almacén <ArrowRight className="h-3 w-3" /></span>
          </div>
        </div>

        {/* Nodo 2: Inventario */}
        <div 
          onClick={() => setSelectedNode('stock')}
          className={`cursor-pointer rounded-3xl p-5 border transition-all flex flex-col justify-between ${
            selectedNode === 'stock' 
              ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20 scale-[1.01]' 
              : 'border-border/70 bg-card hover:border-emerald-400 hover:shadow-sm'
          } ${activeFilter !== 'all' && activeFilter !== 'stock' ? 'opacity-40' : 'opacity-100'}`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="mint">Paso 2</Badge>
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Warehouse className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground font-headline">Gestión Multi-Almacén</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Recepción, control por ubicaciones y transferencias entre bodegas.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 text-xs font-semibold text-emerald-700 flex items-center justify-between">
            <span>Disponibilidad</span>
            <span className="flex items-center gap-1">Hacia TPV <ArrowRight className="h-3 w-3" /></span>
          </div>
        </div>

        {/* Nodo 3: Punto de Venta (TPV) */}
        <div 
          onClick={() => setSelectedNode('tpv')}
          className={`cursor-pointer rounded-3xl p-5 border-2 transition-all flex flex-col justify-between ${
            selectedNode === 'tpv' 
              ? 'border-primary bg-orange-50/40 dark:bg-orange-950/20 shadow-lg ring-2 ring-primary/20 scale-[1.02]' 
              : 'border-primary/60 bg-card hover:border-primary hover:shadow-md'
          } ${activeFilter !== 'all' && activeFilter !== 'tpv' ? 'opacity-40' : 'opacity-100'}`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="default" className="bg-primary text-white">Paso 3 • Principal</Badge>
              <div className="h-10 w-10 rounded-2xl bg-orange-50 text-primary flex items-center justify-center">
                <ShoppingCart className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground font-headline">Punto de Venta (TPV)</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Atención en mostrador, escaneo de SKU, tarifas, ventas aparcadas y apartados.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-orange-200/80 text-xs font-semibold text-primary flex items-center justify-between">
            <span>sellStock() atómico</span>
            <span className="flex items-center gap-1">Cobro & DTE <ArrowRight className="h-3 w-3" /></span>
          </div>
        </div>

        {/* Nodo 4: Facturación y Caja */}
        <div 
          onClick={() => setSelectedNode('caja')}
          className={`cursor-pointer rounded-3xl p-5 border transition-all flex flex-col justify-between ${
            selectedNode === 'caja' 
              ? 'border-sky-500 bg-sky-50/30 dark:bg-sky-950/20 shadow-md ring-2 ring-sky-500/20 scale-[1.01]' 
              : 'border-border/70 bg-card hover:border-sky-400 hover:shadow-sm'
          } ${activeFilter !== 'all' && activeFilter !== 'caja' ? 'opacity-40' : 'opacity-100'}`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="blue">Paso 4</Badge>
              <div className="h-10 w-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground font-headline">Facturación & Caja</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Cobro multiformato, certificación electrónica y arqueo de corte X/Z diario.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 text-xs font-semibold text-sky-700 flex items-center justify-between">
            <span>Conciliación</span>
            <span className="flex items-center gap-1">Dashboard <ArrowRight className="h-3 w-3" /></span>
          </div>
        </div>
      </div>

      {/* Sub-procesos Especializados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Apartados */}
        <div className="rounded-3xl border border-border/70 bg-card p-5 space-y-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Lock className="h-4 w-4" />
            </div>
            <h4 className="font-bold text-sm text-foreground">Apartados & Encargos</h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            El cliente asegura el producto mediante un abono inicial. El stock se bloquea en almacén hasta liquidar la cuenta o retirar el pedido.
          </p>
        </div>

        {/* Devoluciones */}
        <div className="rounded-3xl border border-border/70 bg-card p-5 space-y-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <RotateCcw className="h-4 w-4" />
            </div>
            <h4 className="font-bold text-sm text-foreground">Devoluciones & Vales</h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Asistente guiado: reingreso del artículo al inventario del almacén emisor y generación de un Vale de Descuento con código para futuras compras.
          </p>
        </div>

        {/* Taller */}
        <div className="rounded-3xl border border-border/70 bg-card p-5 space-y-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <Wrench className="h-4 w-4" />
            </div>
            <h4 className="font-bold text-sm text-foreground">Taller & Reparaciones</h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Recepción de maquinaria/equipos, cotización de repuestos consumidos de inventario y facturación consolidada en el TPV al entregar el trabajo.
          </p>
        </div>
      </div>

      {/* Panel de Detalle Dinámico de la Fase Activa (Estilo Kalender Kegiatan) */}
      <div className="rounded-3xl bg-[#1E2538] text-white p-6 shadow-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center text-primary">
              <currentDetail.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-lg text-white">
                Detalle Operativo: {currentDetail.title}
              </h3>
              <p className="text-xs text-slate-400">Especificación técnica y de negocio</p>
            </div>
          </div>
          <Badge className="self-start sm:self-auto bg-primary text-white border-0 px-3 py-1 text-xs">
            {currentDetail.tag}
          </Badge>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
          {currentDetail.desc}
        </p>

        {/* 3 Columnas: Entrada -> Proceso -> Salida */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="rounded-2xl bg-slate-800/80 p-4 border border-slate-700/80 space-y-1.5">
            <span className="text-xs font-bold text-primary uppercase tracking-wider block">1. Datos de Entrada</span>
            <p className="text-xs text-slate-300 leading-normal">{currentDetail.in}</p>
          </div>
          <div className="rounded-2xl bg-slate-800/80 p-4 border border-slate-700/80 space-y-1.5">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">2. Lógica & Proceso</span>
            <p className="text-xs text-slate-300 leading-normal">{currentDetail.proc}</p>
          </div>
          <div className="rounded-2xl bg-slate-800/80 p-4 border border-slate-700/80 space-y-1.5">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">3. Resultados & Salida</span>
            <p className="text-xs text-slate-300 leading-normal">{currentDetail.out}</p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button asChild size="sm" className="rounded-full bg-primary hover:bg-primary/90 text-white text-xs font-bold gap-1.5">
            <Link href={selectedNode === 'tpv' ? '/tpv' : selectedNode === 'stock' ? '/inventory' : selectedNode === 'compras' ? '/purchases' : '/cash-register'}>
              <span>Ir al módulo de {currentDetail.title}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
