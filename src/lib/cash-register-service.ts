'use client';

// Ventas aparcadas, movimientos de caja y cierres de caja.
// Separado de `servicios.ts` para evitar dependencias circulares con
// `customer-service.ts`.

import type { OrderProduct } from './data';
import { loadStore, saveStore } from './local-store';

export interface ParkedSale {
  id: string;
  timestamp: number;
  customerId: string;
  customerName: string;
  salespersonName: string;
  terminalId: string;
  cart: OrderProduct[];
  total: number;
}

export type Movement = {
  id: number;
  /** Formato `YYYY-MM-DD HH:mm` (hora local). */
  fecha: string;
  tipo: 'Venta' | 'Gasto' | 'Apertura' | 'Entrada Manual' | 'Salida Manual' | 'Pago Factura' | 'Vale de Descuento';
  concepto: string;
  ingreso: number;
  egreso: number;
  branchId: string;
  terminalId?: string;
  paymentMethod?: string;
};

export interface Closure {
  id: string;
  date: string;
  branchId: string;
  terminalId?: string;
  expectedBalance: number;
  countedBalance: number;
  difference: number;
}

const initialMovements: Movement[] = [
  { id: 1, fecha: "2024-07-26 09:00", tipo: "Venta", concepto: "Venta TPV - Factura TPV-001 a Cliente General", ingreso: 150.00, egreso: 0, branchId: "1", terminalId: "1", paymentMethod: "Efectivo" },
  { id: 2, fecha: "2024-07-26 09:30", tipo: "Venta", concepto: "Venta TPV - Factura TPV-002 a Constructora GIGA", ingreso: 2500.00, egreso: 0, branchId: "2", terminalId: "3", paymentMethod: "Tarjeta de Crédito" },
  { id: 3, fecha: "2024-07-26 10:15", tipo: "Gasto", concepto: "Pago a proveedor de limpieza", ingreso: 0, egreso: 100.00, branchId: "1", terminalId: "1" },
  { id: 4, fecha: "2024-07-26 11:00", tipo: "Pago Factura", concepto: "Cobro Factura FACA-1198 a Constructora GIGA", ingreso: 85950.00, egreso: 0, branchId: "1", terminalId: "1", paymentMethod: "Transferencia Bancaria" },
];

const PARKED_KEY = 'parkedSales';
const MOVEMENTS_KEY = 'cashMovements';
const CLOSURES_KEY = 'closures';

let memoryParkedSales: ParkedSale[] = loadStore<ParkedSale[]>(PARKED_KEY, []);
let memoryMovements: Movement[] = loadStore<Movement[]>(MOVEMENTS_KEY, initialMovements);
let memoryClosures: Closure[] = loadStore<Closure[]>(CLOSURES_KEY, []);

// Los ids de movimiento se generan a menudo con Date.now(); si se registran
// varios en el mismo milisegundo se garantiza que no se repitan.
function uniqueMovementId(id: number): number {
  let candidate = id;
  while (memoryMovements.some(m => m.id === candidate)) candidate++;
  return candidate;
}

// --- Ventas aparcadas ---
export async function getParkedSales(salespersonName?: string): Promise<ParkedSale[]> {
  let sales: ParkedSale[] = JSON.parse(JSON.stringify(memoryParkedSales));
  if (salespersonName) {
    sales = sales.filter(s => s.salespersonName === salespersonName);
  }
  return sales.sort((a, b) => b.timestamp - a.timestamp);
}

export async function saveParkedSale(sale: Omit<ParkedSale, 'id' | 'timestamp'>): Promise<string> {
  const newSale: ParkedSale = {
    ...JSON.parse(JSON.stringify(sale)),
    id: `parked-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };
  memoryParkedSales.push(newSale);
  saveStore(PARKED_KEY, memoryParkedSales);
  return newSale.id;
}

export async function deleteParkedSale(id: string): Promise<void> {
  memoryParkedSales = memoryParkedSales.filter(s => s.id !== id);
  saveStore(PARKED_KEY, memoryParkedSales);
}

// --- Movimientos de caja ---
export async function getCashRegisterMovements(): Promise<Movement[]> {
  return JSON.parse(JSON.stringify(memoryMovements));
}

export async function addCashRegisterMovement(movement: Movement): Promise<void> {
  const toSave: Movement = { ...movement, id: uniqueMovementId(movement.id) };
  memoryMovements.push(toSave);
  // `fecha` usa el formato ordenable YYYY-MM-DD HH:mm → orden lexicográfico = cronológico
  memoryMovements.sort((a, b) => b.fecha.localeCompare(a.fecha));
  saveStore(MOVEMENTS_KEY, memoryMovements);
}

// --- Cierres de caja ---
export async function getClosures(): Promise<Closure[]> {
  const closures: Closure[] = JSON.parse(JSON.stringify(memoryClosures));
  return closures.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function saveClosure(closure: Closure): Promise<void> {
  const index = memoryClosures.findIndex(c => c.id === closure.id);
  if (index !== -1) {
    memoryClosures[index] = closure;
  } else {
    memoryClosures.push(closure);
  }
  saveStore(CLOSURES_KEY, memoryClosures);
}
