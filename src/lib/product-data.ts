

export interface ProductCode {
  id: number;
  type: 'SKU' | 'EAN' | 'UPC' | 'Otro';
  value: string;
}

export interface ProductImage {
  id: number;
  url: string;
  isPrimary: boolean;
}

export interface ProductStock {
  warehouseId: number;
  warehouseName: string;
  quantity: number;
}

export interface ProductPrice {
  tierId: number;
  tierName: string;
  price: number;
}

export interface ProductSupplier {
  relId: number;
  id: string; 
  name: string;
  cost: number;
  lastPurchaseDate: string;
  isPrimary: boolean;
}

export interface ProductHistoryEvent {
  date: string;
  type: 'Compra' | 'Venta' | 'Ajuste';
  document: string;
  quantity: number;
  price: number;
  /** Almacén afectado por el movimiento (para poder recalcular el stock). */
  warehouseId?: number;
}

export interface Product {
  id: string;
  name:string;
  description: string;
  isService: boolean;
  codes: ProductCode[];
  attributes: {
    size: string;
    color: string;
  };
  images: ProductImage[];
  stock: ProductStock[];
  reservedStock?: number;
  salesCount?: number;
  prices: ProductPrice[];
  tax: {
    id: number;
    name: string;
    rate: number;
  };
  family: {
    id: number;
    name: string;
  };
  suppliers: ProductSupplier[];
  history: ProductHistoryEvent[];
}

export const initialProducts: Product[] = [
  {
    id: '1',
    name: 'Martillo de Carpintero Profesional',
    description: 'Martillo de alta resistencia con cabeza de acero forjado y mango de fibra de vidrio ergonómico para una absorción óptima de impactos.',
    isService: false,
    codes: [
      { id: 1, type: 'SKU', value: 'SKU001' },
      { id: 2, type: 'EAN', value: '7421234567890' },
    ],
    attributes: { size: '16 oz', color: 'Naranja/Negro' },
    images: [
      { id: 1, url: 'https://placehold.co/600x600.png', isPrimary: true },
      { id: 2, url: 'https://placehold.co/600x600.png', isPrimary: false },
    ],
    stock: [
      { warehouseId: 1, warehouseName: 'Bodega Principal / Sala de Ventas', quantity: 75 },
      { warehouseId: 2, warehouseName: 'Almacén Zona 10', quantity: 45 },
    ],
    prices: [
      { tierId: 1, tierName: 'Normal', price: 125.00 },
      { tierId: 2, tierName: 'Mayorista', price: 110.00 },
      { tierId: 3, tierName: 'Especial', price: 115.00 },
    ],
    tax: { id: 1, name: 'IVA', rate: 12 },
    family: { id: 1, name: 'Herramientas Manuales' },
    suppliers: [
      { relId: 1, id: '1', name: 'Importadora Ferretera S.A.', cost: 85.00, lastPurchaseDate: '2024-05-20', isPrimary: true },
    ],
    history: [
      { date: '2024-07-15', type: 'Venta', document: 'FACA-1251', quantity: -10, price: 110.00 },
      { date: '2024-06-15', type: 'Compra', document: 'OC-001', quantity: 100, price: 85.00 },
    ],
  },
  {
    id: '2',
    name: 'Destornillador Phillips #2',
    description: 'Destornillador con punta magnética de cromo-vanadio para mayor durabilidad y agarre. Mango bimaterial para mayor comodidad.',
    isService: false,
    codes: [
      { id: 1, type: 'SKU', value: 'SKU002' },
      { id: 2, type: 'EAN', value: '7421234567891' },
    ],
    attributes: { size: '6"', color: 'Rojo/Negro' },
    images: [
      { id: 1, url: 'https://placehold.co/600x600.png', isPrimary: true },
    ],
    stock: [
      { warehouseId: 1, warehouseName: 'Bodega Principal / Sala de Ventas', quantity: 150 },
      { warehouseId: 2, warehouseName: 'Almacén Zona 10', quantity: 80 },
    ],
    prices: [
      { tierId: 1, tierName: 'Normal', price: 45.00 },
      { tierId: 2, tierName: 'Mayorista', price: 38.00 },
      { tierId: 3, tierName: 'Especial', price: 40.00 },
    ],
    tax: { id: 1, name: 'IVA', rate: 12 },
    family: { id: 1, name: 'Herramientas Manuales' },
    suppliers: [
      { relId: 2, id: '1', name: 'Importadora Ferretera S.A.', cost: 25.00, lastPurchaseDate: '2024-06-15', isPrimary: true },
    ],
    history: [
       { date: '2024-05-02', type: 'Venta', document: 'FACA-1198', quantity: -50, price: 38.00 },
    ],
  },
   {
    id: '3',
    name: 'Bolsa de Cemento UGC 4000 PSI',
    description: 'Cemento de uso general de alta resistencia, ideal para todo tipo de construcciones.',
    isService: false,
    codes: [{ id: 1, type: 'SKU', value: 'CEM-01' }],
    attributes: { size: '42.5 kg', color: 'Gris' },
    images: [{ id: 1, url: 'https://placehold.co/600x600.png', isPrimary: true }],
    stock: [{ warehouseId: 1, warehouseName: 'Bodega Principal / Sala de Ventas', quantity: 300 }],
    prices: [
      { tierId: 1, tierName: 'Normal', price: 75.00 },
      { tierId: 2, tierName: 'Mayorista', price: 68.00 },
      { tierId: 3, tierName: 'Especial', price: 70.00 },
    ],
    tax: { id: 1, name: 'IVA', rate: 12 },
    family: { id: 2, name: 'Materiales de Construcción' },
    suppliers: [{ relId: 1, id: '2', name: 'Cementos Progreso', cost: 55.00, lastPurchaseDate: '2024-07-01', isPrimary: true }],
    history: [],
  },
  {
    id: '4',
    name: 'Varilla de Hierro Legítimo 1/2 pulg',
    description: 'Varilla de hierro corrugado de 6 metros de largo para refuerzo de concreto.',
    isService: false,
    codes: [{ id: 1, type: 'SKU', value: 'ACR-01' }],
    attributes: { size: '1/2" x 6m', color: 'N/A' },
    images: [{ id: 1, url: 'https://placehold.co/600x600.png', isPrimary: true }],
    stock: [{ warehouseId: 1, warehouseName: 'Bodega Principal / Sala de Ventas', quantity: 500 }],
    prices: [
      { tierId: 1, tierName: 'Normal', price: 45.00 },
      { tierId: 2, tierName: 'Mayorista', price: 39.00 },
      { tierId: 3, tierName: 'Especial', price: 41.00 },
    ],
    tax: { id: 1, name: 'IVA', rate: 12 },
    family: { id: 2, name: 'Materiales de Construcción' },
    suppliers: [{ relId: 1, id: '1', name: 'Importadora Ferretera S.A.', cost: 32.00, lastPurchaseDate: '2024-07-05', isPrimary: true }],
    history: [],
  },
  {
    id: '5',
    name: 'Lámina troquelada 12 pies',
    description: 'Lámina de zinc troquelada para techos, calibre 26.',
    isService: false,
    codes: [{ id: 1, type: 'SKU', value: 'LAM-02' }],
    attributes: { size: '12 pies', color: 'Zinc' },
    images: [{ id: 1, url: 'https://placehold.co/600x600.png', isPrimary: true }],
    stock: [{ warehouseId: 1, warehouseName: 'Bodega Principal / Sala de Ventas', quantity: 80 }],
    prices: [
      { tierId: 1, tierName: 'Normal', price: 150.00 },
      { tierId: 2, tierName: 'Mayorista', price: 135.00 },
    ],
    tax: { id: 1, name: 'IVA', rate: 12 },
    family: { id: 2, name: 'Materiales de Construcción' },
    suppliers: [{ relId: 1, id: '1', name: 'Importadora Ferretera S.A.', cost: 110.00, lastPurchaseDate: '2024-06-20', isPrimary: true }],
    history: [],
  },
   {
    id: '6',
    name: 'Tornillo de tabla yeso 1 pulg (Caja 100)',
    description: 'Tornillos autorroscantes para fijación de paneles de yeso a estructuras metálicas.',
    isService: false,
    codes: [{ id: 1, type: 'SKU', value: 'TOR-01' }],
    attributes: { size: '1"', color: 'Negro' },
    images: [{ id: 1, url: 'https://placehold.co/600x600.png', isPrimary: true }],
    stock: [{ warehouseId: 1, warehouseName: 'Bodega Principal / Sala de Ventas', quantity: 200 }],
    prices: [
      { tierId: 1, tierName: 'Normal', price: 25.00 },
      { tierId: 2, tierName: 'Mayorista', price: 18.00 },
    ],
    tax: { id: 1, name: 'IVA', rate: 12 },
    family: { id: 3, name: 'Tornillería' },
    suppliers: [{ relId: 1, id: '4', name: 'Tornillos y Más S.A.', cost: 12.00, lastPurchaseDate: '2024-07-10', isPrimary: true }],
    history: [],
  },
  {
    id: '7',
    name: 'Servicio de Instalación de Lámpara',
    description: 'Instalación profesional de una lámpara en el techo o pared. No incluye la lámpara ni materiales eléctricos adicionales.',
    isService: true,
    codes: [
      { id: 1, type: 'SKU', value: 'SERV-001' },
    ],
    attributes: { size: 'N/A', color: 'N/A' },
    images: [
      { id: 1, url: 'https://placehold.co/600x600.png', isPrimary: true },
    ],
    stock: [],
    prices: [
      { tierId: 1, tierName: 'Normal', price: 250.00 },
    ],
    tax: { id: 1, name: 'IVA', rate: 12 },
    family: { id: 6, name: 'Servicios' },
    suppliers: [],
    history: [
       { date: '2024-07-20', type: 'Venta', document: 'FACA-1258', quantity: -1, price: 250.00 },
    ],
  },
];
