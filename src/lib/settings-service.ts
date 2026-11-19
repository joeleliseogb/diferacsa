

'use client';

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from './firebase';
import { type Permission, allPermissions } from "./auth-service";
import { type UserRole } from "./user-service";

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
        'ver-dashboard', 'usar-asistente-ia', 'acceder-tpv', 'crear-apartados-encargos', 'ver-clientes', 'crear-clientes', 'editar-clientes',
        'ver-pedidos', 'crear-pedidos', 'editar-pedidos', 'ver-presupuestos', 'crear-presupuestos', 'editar-presupuestos',
        'ver-entregas', 'crear-entregas', 'editar-entregas', 'acceder-caja'
    ],
    'Gerente de Compras': [
        'ver-dashboard', 'ver-compras', 'crear-compras', 'editar-compras', 'ver-inventario',
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
        'ver-dashboard', 'acceder-caja', 'acceder-facturacion', 'ver-compras', 'ver-proveedores'
    ],
    'Rutero': [
        'ver-entregas', 'editar-entregas'
    ]
};


const initialSettings: Settings = {
  companyInfo: {
    name: "SimplyGest",
    nit: "1234567-8",
    address: "Avenida Las Américas 1-23, Zona 13, Guatemala",
    phone: "2233-4455",
    logoUrl: "",
  },
  branches: [
    { id: 1, name: "Sucursal Central", address: "Zona 1, Ciudad de Guatemala", logoUrl: ""},
    { id: 2, name: "Sucursal Zona 10", address: "Zona 10, Ciudad de Guatemala", logoUrl: ""},
  ],
  priceTiers: [
    { id: 1, name: "Tarifa General" },
    { id: 2, name: "Tarifa Mayorista" },
    { id: 3, name: "Tarifa Profesional" },
  ],
  paymentMethods: [
    { id: 1, name: "Efectivo" },
    { id: 2, name: "Transferencia Bancaria" },
    { id: 3, name: "Tarjeta de Crédito" },
    { id: 4, name: "Cheque" },
  ],
  documentSeries: [
    { id: 1, documentType: "Factura", branch: "Sucursal Central", series: "FACA", currentNumber: 1250 },
    { id: 2, documentType: "Presupuesto", branch: "Sucursal Central", series: "PRE-C", currentNumber: 830 },
    { id: 3, documentType: "Factura", branch: "Sucursal Zona 10", series: "FAZ10", currentNumber: 480 },
    { id: 4, documentType: "Nota de Crédito", branch: "Sucursal Central", series: "NC-C", currentNumber: 95 },
  ],
  posTerminals: [
    { id: 1, name: "Terminal Principal", branch: "Sucursal Central", invoiceSeries: "FACA" },
    { id: 2, name: "Terminal 2", branch: "Sucursal Central", invoiceSeries: "FACA" },
    { id: 3, name: "Mostrador Zona 10", branch: "Sucursal Zona 10", invoiceSeries: "FAZ10" },
  ],
  warehouses: [
    { id: 1, name: "Almacén Central", location: "Zona 1, Ciudad de Guatemala", capacity: "500 m²", manager: "Juan Pérez", branch: "Sucursal Central" },
    { id: 2, name: "Almacén Zona 10", location: "Zona 10, Ciudad de Guatemala", capacity: "200 m²", manager: "María López", branch: "Sucursal Zona 10" },
    { id: 3, name: "Bodega Fraijanes", location: "Carretera a El Salvador, Fraijanes", capacity: "1200 m²", manager: "Carlos Solórzano", branch: "Sucursal Central" },
  ],
  taxes: [
    { id: 1, name: 'IVA', rate: 12 },
    { id: 2, name: 'Exento', rate: 0 },
  ],
  productFamilies: [
    { id: 1, name: 'Herramientas Manuales' },
    { id: 2, name: 'Materiales de Construcción' },
    { id: 3, name: 'Tornillería' },
    { id: 4, name: 'Fontanería' },
    { id: 5, name: 'Electricidad' },
    { id: 6, name: 'Servicios' },
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
let memorySettings: Settings = JSON.parse(JSON.stringify(initialSettings));

export async function getSettings(): Promise<Settings> {
    return JSON.parse(JSON.stringify(memorySettings));
}

export async function saveSettings(settings: Settings): Promise<void> {
    memorySettings = JSON.parse(JSON.stringify(settings));
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
  const settings = await getSettings();
  return settings.branches;
}

export async function saveBranches(branches: Branch[]): Promise<void> {
  const settings = await getSettings();
  settings.branches = branches;
  await saveSettings(settings);
}

export async function getPriceTiers(): Promise<PriceTier[]> {
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
