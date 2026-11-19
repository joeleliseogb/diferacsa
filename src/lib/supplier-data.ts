

import type { Address, Phone, Payment } from './data';

export interface PurchasedProduct {
  sku: string;
  name: string;
  qty: number;
  cost: number;
}

export interface PurchaseOrder {
  order: string;
  date: string;
  total: string;
  status: 'Recibido' | 'Pendiente' | 'Recibido Parcial' | 'Cancelado' | 'Pagado' | 'Pago Parcial';
  products: PurchasedProduct[];
  payments?: Payment[];
}

export interface Supplier {
  id: string;
  name: string;
  avatar: string;
  contactPerson: string;
  email: string;
  phones: Phone[];
  addresses: Address[];
  nit: string;
  fiscalName: string;
  creditTerms: string; // e.g., "Crédito 30 días", "Contado"
  currentBalance: string;
  maxPurchaseDiscount: string; // Percentage or amount
  usualPaymentMethod: string;
  notes: string;
  purchaseHistory: PurchaseOrder[];
}

export const initialSuppliers: Supplier[] = [
    { 
      id: '1',
      name: "Importadora Ferretera S.A.", 
      avatar: "IF",
      contactPerson: "Carlos Mendoza", 
      email: "ventas@iferretera.com.gt", 
      phones: [
        { id: 1, number: "2233-4455", isPrimary: true },
        { id: 2, number: "2233-4456", isPrimary: false },
      ],
      addresses: [
        { id: 1, street: "Planta Central, Km 15 Carretera al Pacífico", city: "Villa Nueva", isPrimary: true },
        { id: 2, street: "Sala de Ventas Zona 9", city: "Guatemala", isPrimary: false },
      ],
      nit: '1122334-5',
      fiscalName: 'Importadora Ferretera, S.A.',
      creditTerms: '30',
      currentBalance: 'Q12,500.00',
      maxPurchaseDiscount: '5% (incluye 2% por pronto pago)',
      usualPaymentMethod: 'Transferencia Bancaria',
      notes: 'Proveedor principal de herramientas y varios. Pedidos grandes requieren 1 semana de antelación.',
      purchaseHistory: [
        {
          order: 'OC-001',
          date: '2024-05-15',
          status: 'Recibido',
          total: 'Q12,500.00',
          products: [
            { sku: 'SKU001', name: 'Martillo de Carpintero Profesional', qty: 50, cost: 85.00 },
          ]
        },
        {
          order: 'OC-008',
          date: '2024-06-20',
          status: 'Recibido',
          total: 'Q15,000.00',
          products: [
            { sku: 'SKU002', name: 'Destornillador Phillips #2', qty: 100, cost: 25.00 },
          ]
        }
      ]
    },
    { 
      id: '2',
      name: "Cementos Progreso", 
      avatar: "CP",
      contactPerson: "Lucía Hernández", 
      email: "lhernandez@progreso.com", 
      phones: [
        { id: 3, number: "2323-5678", isPrimary: true },
      ],
      addresses: [
        { id: 3, street: "Finca La Pedrera, Zona 6", city: "Guatemala", isPrimary: true },
      ],
      nit: '2233445-6',
      fiscalName: 'Cementos Progreso, S.A.',
      creditTerms: '60',
      currentBalance: 'Q28,000.00',
      maxPurchaseDiscount: '10%',
      usualPaymentMethod: 'Cheque',
      notes: 'Entregan directo a obra si el pedido supera las 100 bolsas.',
      purchaseHistory: [
        {
          order: 'OC-002',
          date: '2024-05-18',
          status: 'Recibido',
          total: 'Q28,000.00',
          products: [
              { sku: 'CEM-01', name: 'Bolsa de Cemento UGC', qty: 50, cost: 55.00 },
          ]
        }
      ]
    },
    { 
      id: '3',
      name: "Distribuidora Eléctrica", 
      avatar: "DE",
      contactPerson: "Mario Chang", 
      email: "mchang@distrielec.com", 
      phones: [
        { id: 4, number: "2456-9988", isPrimary: true },
      ],
      addresses: [
        { id: 4, street: "4ta Avenida 12-34, Zona 1", city: "Guatemala", isPrimary: true },
      ],
      nit: '3344556-7',
      fiscalName: 'Distribuidora Eléctrica de Centroamérica, S.A.',
      creditTerms: '0',
      currentBalance: 'Q0.00',
      maxPurchaseDiscount: '0%',
      usualPaymentMethod: 'Efectivo',
      notes: 'Entregan los días martes y jueves.',
      purchaseHistory: []
    },
    { 
      id: '4',
      name: "Tornillos y Más S.A.", 
      avatar: "TM",
      contactPerson: "Ana Sofía Pérez", 
      email: "soporte@tornillosymas.com", 
      phones: [
        { id: 5, number: "2500-1234", isPrimary: true },
      ],
      addresses: [
        { id: 5, street: "Avenida Petapa 5-67, Zona 12", city: "Guatemala", isPrimary: true },
        { id: 6, street: "Bodega El Naranjo", city: "Mixco", isPrimary: false },
      ],
      nit: '4455667-8',
      fiscalName: 'Tornillos y Más, Sociedad Anónima',
      creditTerms: '0',
      currentBalance: 'Q0.00',
      maxPurchaseDiscount: '3%',
      usualPaymentMethod: 'Tarjeta de Crédito',
      notes: 'Revisar pedido al recibir, a veces hay faltantes.',
      purchaseHistory: [
        { 
          order: "OC-003", 
          date: "2024-05-20", 
          status: "Pendiente", 
          total: "Q1,800.00",
          products: [
            { sku: 'TOR-01', name: 'Tornillo de tabla yeso 1 pulg (Caja 100)', qty: 150, cost: 12.00 },
          ] 
        }
      ]
    },
];
