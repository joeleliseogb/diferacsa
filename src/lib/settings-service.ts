

'use client';

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from './firebase';
import { type Permission, allPermissions } from "./auth-service";
import { type UserRole } from "./user-service";
import { loadStore, saveStore } from './local-store';

export type CompanyInfo = {
  name: string;
  nit: string;
  address: string;
  phone: string;
  logoUrl?: string;
};

export type Branch = {
  id: number;
  name: string;
  address: string;
  logoUrl?: string;
}

export type PriceTier = {
  id: number;
  name: string;
};

export type PaymentMethod = {
  id: number;
  name: string;
};

export type DocumentSeries = {
  id: number;
  documentType: string;
  branch: string;
  series: string;
  currentNumber: number;
};

export type PosTerminal = {
  id: number;
  name: string;
  branch: string;
  invoiceSeries: string;
};

export type Warehouse = {
  id: number;
  name: string;
  location: string;
  capacity: string;
  manager: string;
  branch: string;
};

export type Tax = {
  id: number;
  name: string;
  rate: number; // Percentage
};

export type ProductFamily = {
  id: number;
  name: string;
};

export type Driver = {
  id: number;
  name: string;
  license: string;
};

export type PosSettings = {
  parkedSalesMode: 'individual' | 'shared';
  allowTerminalCharging: boolean;
};

export interface Settings {
  companyInfo: CompanyInfo;
  branches: Branch[];
  priceTiers: PriceTier[];
  paymentMethods: PaymentMethod[];
  documentSeries: DocumentSeries[];
  posTerminals: PosTerminal[];
  warehouses: Warehouse[];
  taxes: Tax[];
  productFamilies: ProductFamily[];
  drivers: Driver[];
  posSettings: PosSettings;
  cashRegisterWorkflow: 'flexible' | 'strict';
  permissionsByRole: Record<UserRole, Permission[]>;
  showDashboardAssistant: boolean;
}

const SETTINGS_DOC_ID = 'main_settings';
const SETTINGS_COLLECTION = 'configuration';

// Definición de permisos por rol
const initialPermissions: Record<UserRole, Permission[]> = {
    'Admin': [...allPermissions],
    'Gerente General': [...allPermissions],
    'Gerente de Ventas': [
        'ver-dashboard', 'ver-reportes', 'usar-asistente-ia', 'acceder-tpv', 'crear-apartados-encargos', 'ver-clientes', 'crear-clientes', 'editar-clientes',
        'ver-pedidos', 'crear-pedidos', 'editar-pedidos', 'ver-presupuestos', 'crear-presupuestos', 'editar-presupuestos',
        'ver-entregas', 'crear-entregas', 'editar-entregas', 'acceder-caja'
    ],
    'Gerente de Compras': [
        'ver-dashboard', 'ver-reportes', 'ver-compras', 'crear-compras', 'editar-compras', 'ver-inventario',
        'ver-proveedores', 'crear-proveedores', 'editar-proveedores'
    ],
    'Gerente de Almacen': [
        'ver-dashboard', 'ver-inventario', 'editar-productos', 'realizar-traslados', 'ver-entregas', 'crear-entregas', 'editar-entregas',
        'acceder-taller', 'crear-reparaciones', 'editar-reparaciones'
    ],
    'Jefe de Bodega': [
        'ver-inventario', 'realizar-traslados', 'ver-entregas', 'crear-entregas', 'acceder-taller', 'crear-reparaciones', 'editar-reparaciones'
    ],
    'Vendedor': [
        'acceder-tpv', 'crear-apartados-encargos', 'ver-clientes', 'crear-clientes', 'editar-clientes', 'ver-pedidos', 'crear-pedidos',
        'ver-presupuestos', 'crear-presupuestos', 'editar-presupuestos', 'acceder-taller', 'crear-reparaciones'
    ],
    'Bodeguero': [
        'ver-inventario', 'realizar-traslados'
    ],
    'Digitador de Compras': [
        'ver-compras', 'crear-compras', 'ver-proveedores', 'crear-proveedores'
    ],
    'Cajero': [
        'acceder-caja'
    ],
    'Contable': [
        'ver-dashboard', 'ver-reportes', 'acceder-caja', 'acceder-facturacion', 'ver-compras', 'ver-proveedores'
    ],
    'Rutero': [
        'ver-entregas', 'editar-entregas'
    ]
};


const initialSettings: Settings = {
  companyInfo: {
    name: "Diferacsa - Ferretería González",
    nit: "5489119-1",
    address: "Tacaná, San Marcos",
    phone: "77703362",
    logoUrl: "",
  },
  branches: [
    { id: 1, name: "Casa Matriz - Ferretería González (Tacaná)", address: "Tacaná, San Marcos", logoUrl: ""},
  ],
  priceTiers: [
    { id: 1, name: "Normal" },
    { id: 2, name: "Mayorista" },
    { id: 3, name: "Especial" },
  ],
  paymentMethods: [
    { id: 1, name: "Efectivo" },
    { id: 2, name: "Transferencia Bancaria" },
    { id: 3, name: "Tarjeta de Crédito" },
    { id: 4, name: "Cheque" },
  ],
  documentSeries: [
    { id: 1, documentType: "Factura", branch: "Casa Matriz - Ferretería González (Tacaná)", series: "FACA", currentNumber: 1250 },
    { id: 2, documentType: "Presupuesto", branch: "Casa Matriz - Ferretería González (Tacaná)", series: "PRE-C", currentNumber: 830 },
    { id: 3, documentType: "Nota de Crédito", branch: "Casa Matriz - Ferretería González (Tacaná)", series: "NC-C", currentNumber: 95 },
  ],
  posTerminals: [
    { id: 1, name: "Terminal Principal", branch: "Casa Matriz - Ferretería González (Tacaná)", invoiceSeries: "FACA" },
    { id: 2, name: "Terminal 2", branch: "Casa Matriz - Ferretería González (Tacaná)", invoiceSeries: "FACA" },
  ],
  warehouses: [
    { id: 1, name: "Bodega Principal / Sala de Ventas", location: "Tacaná, San Marcos", capacity: "1500 m²", manager: "Melvin René González", branch: "Casa Matriz - Ferretería González (Tacaná)" },
    { id: 2, name: "Bodega Secundaria / Material Pesado", location: "Tacaná, San Marcos", capacity: "2500 m²", manager: "Seyler González", branch: "Casa Matriz - Ferretería González (Tacaná)" },
  ],
  taxes: [
    { id: 1, name: 'IVA', rate: 12 },
    { id: 2, name: 'Exento', rate: 0 },
  ],
  productFamilies: [
    { id: 1, name: 'FERRETERIA' },
    { id: 2, name: 'CARPINTERIA' },
    { id: 3, name: 'PERFILES' },
    { id: 4, name: 'CONSTRUCCION' },
    { id: 5, name: 'HOGAR' },
    { id: 6, name: 'AUTOMOTRIZ' },
    { id: 7, name: 'ELECTRICIDAD' },
    { id: 8, name: 'PISOS' },
    { id: 9, name: 'REMODELACION' },
    { id: 10, name: 'PINTURA' },
  ],
  drivers: [
    { id: 1, name: 'Pedro Morales', license: 'GU-123456' },
    { id: 2, name: 'Sofia Castillo', license: 'GU-789012' },
    { id: 3, name: 'Externo Express', license: 'N/A' },
  ],
  posSettings: {
    parkedSalesMode: 'shared',
    allowTerminalCharging: true,
  },
  cashRegisterWorkflow: 'flexible',
  permissionsByRole: initialPermissions,
  showDashboardAssistant: false,
};

// --- IN-MEMORY DATA STORE ---
const SETTINGS_KEY = 'settings';

function sanitizeSettings(settings: Settings): Settings {
  if (!settings) return JSON.parse(JSON.stringify(initialSettings));
  const hasLegacyMock = settings.branches?.some(b => 
    b.name.includes("Sucursal Central") || b.name.includes("Zona 10")
  ) || settings.warehouses?.some(w => 
    w.name.includes("Almacén Central") || w.name.includes("Fraijanes")
  ) || settings.priceTiers?.some(t => 
    t.name.includes("Tarifa General") || t.name.includes("Tarifa Profesional")
  );

  if (hasLegacyMock || !settings.branches || settings.branches.length === 0 || !settings.priceTiers || settings.priceTiers.length === 0) {
    settings.branches = JSON.parse(JSON.stringify(initialSettings.branches));
    settings.warehouses = JSON.parse(JSON.stringify(initialSettings.warehouses));
    settings.documentSeries = JSON.parse(JSON.stringify(initialSettings.documentSeries));
    settings.posTerminals = JSON.parse(JSON.stringify(initialSettings.posTerminals));
    settings.companyInfo = JSON.parse(JSON.stringify(initialSettings.companyInfo));
    settings.priceTiers = JSON.parse(JSON.stringify(initialSettings.priceTiers));
    settings.productFamilies = JSON.parse(JSON.stringify(initialSettings.productFamilies));
    saveStore(SETTINGS_KEY, settings);
  }
  return settings;
}

let memorySettings: Settings = sanitizeSettings(loadStore<Settings>(SETTINGS_KEY, initialSettings));

export async function getSettings(): Promise<Settings> {
    memorySettings = sanitizeSettings(memorySettings);
    return JSON.parse(JSON.stringify(memorySettings));
}

export async function saveSettings(settings: Settings): Promise<void> {
    memorySettings = JSON.parse(JSON.stringify(settings));
    saveStore(SETTINGS_KEY, memorySettings);
}

export async function getCompanyInfo(): Promise<CompanyInfo> {
  const settings = await getSettings();
  return settings.companyInfo;
}

export async function saveCompanyInfo(companyInfo: CompanyInfo): Promise<void> {
  const settings = await getSettings();
  settings.companyInfo = companyInfo;
  await saveSettings(settings);
}

export async function getBranches(): Promise<Branch[]> {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/branches');
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          return data.items.map((b: any) => ({
            id: b.id,
            name: b.name,
            address: b.address || '',
            logoUrl: '',
          }));
        }
      }
    }
  } catch {
    // fallback to stored settings
  }
  const settings = await getSettings();
  return settings.branches;
}

export async function saveBranches(branches: Branch[]): Promise<void> {
  const settings = await getSettings();
  settings.branches = branches;
  await saveSettings(settings);
}

export async function getPriceTiers(): Promise<PriceTier[]> {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/price-tiers');
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          return data.items.map((t: any) => ({
            id: t.id,
            name: t.name,
          }));
        }
      }
    }
  } catch {
    // fallback to stored settings
  }
  const settings = await getSettings();
  return settings.priceTiers;
}

export async function savePriceTiers(priceTiers: PriceTier[]): Promise<void> {
  const settings = await getSettings();
  settings.priceTiers = priceTiers;
  await saveSettings(settings);
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const settings = await getSettings();
  return settings.paymentMethods;
}

export async function savePaymentMethods(paymentMethods: PaymentMethod[]): Promise<void> {
  const settings = await getSettings();
  settings.paymentMethods = paymentMethods;
  await saveSettings(settings);
}

export async function getDocumentSeries(): Promise<DocumentSeries[]> {
    const settings = await getSettings();
    return settings.documentSeries;
}

export async function saveDocumentSeries(documentSeries: DocumentSeries[]): Promise<void> {
    const settings = await getSettings();
    settings.documentSeries = documentSeries;
    await saveSettings(settings);
}

export async function getPosTerminals(): Promise<PosTerminal[]> {
    const settings = await getSettings();
    return settings.posTerminals;
}

export async function savePosTerminals(posTerminals: PosTerminal[]): Promise<void> {
    const settings = await getSettings();
    settings.posTerminals = posTerminals;
    await saveSettings(settings);
}

export async function getWarehouses(): Promise<Warehouse[]> {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/warehouses');
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          return data.items.map((w: any) => ({
            id: w.id,
            name: w.name,
            location: w.location || 'Tacaná, San Marcos',
            capacity: w.capacity || '2000 m²',
            manager: w.manager || 'Melvin René González',
            branch: w.branch || 'Casa Matriz - Ferretería González (Tacaná)',
          }));
        }
      }
    }
  } catch {
    // fallback to stored settings
  }
  const settings = await getSettings();
  return settings.warehouses;
}

export async function saveWarehouses(warehouses: Warehouse[]): Promise<void> {
    const settings = await getSettings();
    settings.warehouses = warehouses;
    await saveSettings(settings);
}

export async function getTaxes(): Promise<Tax[]> {
  const settings = await getSettings();
  return settings.taxes;
}

export async function saveTaxes(taxes: Tax[]): Promise<void> {
  const settings = await getSettings();
  settings.taxes = taxes;
  await saveSettings(settings);
}

export async function getProductFamilies(): Promise<ProductFamily[]> {
  const settings = await getSettings();
  return settings.productFamilies;
}

export async function saveProductFamilies(productFamilies: ProductFamily[]): Promise<void> {
  const settings = await getSettings();
  settings.productFamilies = productFamilies;
  await saveSettings(settings);
}

export async function getDrivers(): Promise<Driver[]> {
  const settings = await getSettings();
  return settings.drivers;
}

export async function saveDrivers(drivers: Driver[]): Promise<void> {
  const settings = await getSettings();
  settings.drivers = drivers;
  await saveSettings(settings);
}

export async function getPosSettings(): Promise<PosSettings> {
    const settings = await getSettings();
    return settings.posSettings;
}

export async function savePosSettings(posSettings: PosSettings): Promise<void> {
    const settings = await getSettings();
    settings.posSettings = posSettings;
    await saveSettings(settings);
}
