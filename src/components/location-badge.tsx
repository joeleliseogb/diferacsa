'use client';

import * as React from 'react';
import { Store, Warehouse, Boxes, Building2, Building, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface WarehouseBadgeConfig {
  code: string;
  shortName: string;
  fullName: string;
  Icon: React.ComponentType<{ className?: string }>;
  bg: string;
  text: string;
  border: string;
  badgeClass: string;
  dot: string;
}

export interface BranchBadgeConfig {
  code: string;
  shortName: string;
  fullName: string;
  Icon: React.ComponentType<{ className?: string }>;
  bg: string;
  text: string;
  border: string;
  badgeClass: string;
  dot: string;
}

/**
 * Obtiene la configuración visual (icono, color, abreviatura) para una bodega específica.
 */
export function getWarehouseConfig(idOrName?: string | number): WarehouseBadgeConfig {
  const str = String(idOrName || '').toLowerCase();

  // Bodega 1 / Principal / Sala de Ventas (Verde Esmeralda - Atención al Cliente y Mostrador)
  if (
    str.includes('wh-matriz-1') ||
    str === '1' ||
    str.includes('principal') ||
    str.includes('ventas') ||
    str.includes('bod-1') ||
    str.includes('bodega 1')
  ) {
    return {
      code: 'BOD-1',
      shortName: 'Sala de Ventas',
      fullName: 'Bodega Principal / Sala de Ventas',
      Icon: Store,
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200/90 dark:border-emerald-800/60',
      badgeClass:
        'bg-emerald-50/90 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
      dot: 'bg-emerald-500',
    };
  }

  // Bodega 2 / Secundaria / Material Pesado (Ámbar / Naranja - Materiales de Construcción y Patio)
  if (
    str.includes('wh-matriz-2') ||
    str === '2' ||
    str.includes('secundaria') ||
    str.includes('pesado') ||
    str.includes('bod-2') ||
    str.includes('bodega 2')
  ) {
    return {
      code: 'BOD-2',
      shortName: 'Material Pesado',
      fullName: 'Bodega Secundaria / Material Pesado',
      Icon: Warehouse,
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-200/90 dark:border-amber-800/60',
      badgeClass:
        'bg-amber-50/90 text-amber-800 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
      dot: 'bg-amber-500',
    };
  }

  // Bodega 3 / Auxiliar (Púrpura / Violeta)
  if (str.includes('bod-3') || str === '3' || str.includes('auxiliar')) {
    return {
      code: 'BOD-3',
      shortName: 'Bodega Auxiliar',
      fullName: 'Bodega 3 / Almacén Auxiliar',
      Icon: Boxes,
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200/90 dark:border-purple-800/60',
      badgeClass:
        'bg-purple-50/90 text-purple-800 border-purple-200/80 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
      dot: 'bg-purple-500',
    };
  }

  // Fallback genérico o dinámico (Azul cielo / Cyan)
  const nameDisplay = idOrName ? String(idOrName).replace(/^bodega\s*/i, '').trim() : 'Almacén';
  return {
    code: 'BOD',
    shortName: nameDisplay || 'Almacén',
    fullName: String(idOrName || 'Almacén'),
    Icon: Package,
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200/90 dark:border-sky-800/60',
    badgeClass:
      'bg-sky-50/90 text-sky-800 border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
    dot: 'bg-sky-500',
  };
}

/**
 * Obtiene la configuración visual (icono, color, abreviatura) para una sucursal específica.
 */
export function getBranchConfig(idOrName?: string | number): BranchBadgeConfig {
  const str = String(idOrName || '').toLowerCase();

  // Casa Matriz (Azul Índigo / Royal Blue)
  if (
    str.includes('matriz') ||
    str.includes('tacana') ||
    str.includes('tacaná') ||
    str.includes('gonzalez') ||
    str.includes('gonzález') ||
    str === '1' ||
    str === 'branch-matriz'
  ) {
    return {
      code: 'MATRIZ',
      shortName: 'Casa Matriz',
      fullName: 'Casa Matriz - Ferretería González (Tacaná)',
      Icon: Building2,
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-200/90 dark:border-indigo-800/60',
      badgeClass:
        'bg-indigo-50/90 text-indigo-800 border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
      dot: 'bg-indigo-500',
    };
  }

  // Sucursales adicionales (Violeta)
  return {
    code: 'SUC',
    shortName: idOrName ? String(idOrName).replace(/^sucursal\s*/i, '').trim() : 'Sucursal',
    fullName: String(idOrName || 'Sucursal'),
    Icon: Building,
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200/90 dark:border-blue-800/60',
    badgeClass:
      'bg-blue-50/90 text-blue-800 border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    dot: 'bg-blue-500',
  };
}

/**
 * Componente visual para mostrar una bodega con distintivo de color, icono y tooltip.
 */
export function WarehouseBadge({
  warehouseId,
  warehouseName,
  className,
  size = 'sm',
  showIcon = true,
  showCode = false,
}: {
  warehouseId?: string | number;
  warehouseName?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
  showCode?: boolean;
}) {
  const config = getWarehouseConfig(warehouseId || warehouseName);
  const Icon = config.Icon;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 font-semibold rounded-full border transition-all select-none shadow-2xs',
              size === 'xs' && 'px-1.5 py-0.5 text-[9px]',
              size === 'sm' && 'px-2 py-0.5 text-[10px]',
              size === 'md' && 'px-2.5 py-1 text-xs',
              config.badgeClass,
              className
            )}
          >
            <span
              className={cn('rounded-full shrink-0', size === 'xs' ? 'w-1 h-1' : 'w-1.5 h-1.5', config.dot)}
            />
            {showIcon && <Icon className={cn('shrink-0', size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />}
            {showCode && <span className="font-bold opacity-80">{config.code}</span>}
            <span className="truncate max-w-[130px]">{config.shortName}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs">
          <p className="font-bold">
            {config.code}: {config.fullName}
          </p>
          <p className="text-[10px] text-muted-foreground">Origen del despacho para esta línea</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Componente visual para mostrar una sucursal con distintivo de color, icono y tooltip.
 */
export function BranchBadge({
  branchId,
  branchName,
  className,
  size = 'sm',
  showIcon = true,
}: {
  branchId?: string | number;
  branchName?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
}) {
  const config = getBranchConfig(branchId || branchName);
  const Icon = config.Icon;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 font-semibold rounded-full border transition-all select-none shadow-2xs',
              size === 'xs' && 'px-1.5 py-0.5 text-[9px]',
              size === 'sm' && 'px-2 py-0.5 text-[10px]',
              size === 'md' && 'px-2.5 py-1 text-xs',
              config.badgeClass,
              className
            )}
          >
            <span
              className={cn('rounded-full shrink-0', size === 'xs' ? 'w-1 h-1' : 'w-1.5 h-1.5', config.dot)}
            />
            {showIcon && <Icon className={cn('shrink-0', size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />}
            <span className="truncate max-w-[140px]">{config.shortName}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs">
          <p className="font-bold">
            {config.code}: {config.fullName}
          </p>
          <p className="text-[10px] text-muted-foreground">Sucursal operativa seleccionada</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
