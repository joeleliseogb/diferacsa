

// Define interfaces for the data structures
export interface Address {
  id: number;
  street: string;
  city: string;
  isPrimary: boolean;
}

export interface Phone {
  id: number;
  number: string;
  isPrimary: boolean;
}

export interface PurchaseProduct {
  sku: string;
  name: string;
  qty: number;
  price: number; // Price at the time of sale
}

export interface Payment {
  date: string;
  amount: number;
  method: string;
  documentNumber?: string;
}

export interface Purchase {
  invoice: string;
  date: string;
  total: string;
  status: 'Pagado' | 'Pendiente de Pago' | 'Cancelada' | 'Pago Parcial' | 'Certificado' | 'Anulado' | 'Pago en Obra';
  products: PurchaseProduct[];
  payments?: Payment[];
  dueDate?: string;
  notes?: string;
  branchId: string;
  terminalId?: string;
  /** Almacén del que se descontó el inventario (si difiere del id de sucursal). */
  warehouseId?: string;
}

export interface OrderProduct {
  sku: string;
  name: string;
  qty: number;
  qtyDelivered: number;
  price: number;
}

export interface Order {
  id: string;
  date: string;
  total: string;
  status: 'En Preparación' | 'Listo para Entrega' | 'En Ruta' | 'Entregado' | 'Cancelado' | 'Facturado' | 'Parcialmente Entregado';
  invoiceId?: string;
  products: OrderProduct[];
  deliveryAddress?: Address;
  notes?: string;
}

export interface QuoteProduct {
  sku: string;
  name: string;
  qty: number;
  price: number;
}

export interface Quote {
  id: string;
  date: string;
  expiryDate: string;
  total: string;
  status: 'Borrador' | 'Enviado' | 'Aceptado' | 'Rechazado' | 'Vencido' | 'Convertido';
  products: QuoteProduct[];
  notes?: string;
}

export interface DiscountVoucher {
  id: string; // VALE-001
  initialAmount: number;
  currentAmount: number;
  creationDate: string;
  expiryDate: string;
  status: 'activo' | 'usado' | 'vencido';
  originalInvoiceId: string; // The invoice that generated this voucher
}

export interface ReservationProduct {
    sku: string;
    name: string;
    qty: number;
    price: number;
}

export interface Reservation {
    id: string; // e.g., AP-001 (Apartado), EN-001 (Encargo)
    type: 'apartado' | 'encargo';
    customerId: string;
    date: string;
    expiryDate?: string; // Only for 'apartado'
    status: 'Pendiente' | 'Esperando Surtido' | 'Listo para Recoger' | 'Completado' | 'Vencido' | 'Cancelado';
    products: ReservationProduct[];
    totalAmount: number;
    advancePayment: number;
    remainingBalance: number;
    notes?: string;
    warehouseId: string;
}

export interface RepairOrder {
    id: string; // REP-001
    creationDate: string;
    customerId: string;
    customerName: string;
    equipment: {
        type: string;
        brand: string;
        model: string;
        serialNumber: string;
    };
    reportedIssues: string;
    serviceType: 'Reparación' | 'Garantía' | 'Mantenimiento';
    warrantyInfo?: {
        originalInvoiceId: string;
        notes: string;
    };
    status: 'Ingresado' | 'En Diagnóstico' | 'Pendiente Aprobación' | 'En Reparación' | 'Reparado' | 'No Reparado' | 'Entregado' | 'Facturado';
    technicianId?: string;
    technicianName?: string;
    diagnosis?: string;
    quote?: {
        parts: { sku: string; name: string; qty: number; price: number }[];
        laborCost: number;
        total: number;
        isApproved: boolean;
    };
    invoiceId?: string;
    incidents: {
        date: string;
        description: string;
    }[];
}


export interface Customer {
  id: string;
  name: string;
  email: string;
  phones: Phone[];
  type: string;
  avatar: string;
  nit: string;
  fiscalName: string;
  totalSpent: string;
  lastPurchase: string;
  priceTier: string;
  creditLimit: string;
  creditTerms: string;
  currentBalance: string;
  usualPaymentMethod: string;
  maxSalesDiscount: string;
  addresses: Address[];
  purchaseHistory: Purchase[];
  orders?: Order[];
  quotes?: Quote[];
  vouchers?: DiscountVoucher[];
  reservations?: Reservation[];
  repairOrders?: RepairOrder[];
  notes: string;
}

// Initial mock data
export const initialCustomers: Customer[] = [
    {
      id: "1",
      name: "Constructora GIGA",
      email: "compras@giga.com.gt",
      phones: [
        { id: 1, number: "2424-1000", isPrimary: true },
        { id: 2, number: "2424-1001", isPrimary: false },
      ],
      type: "Corporativo",
      avatar: "CG",
      nit: "1234567-8",
      fiscalName: "Constructora GIGA, S.A.",
      totalSpent: "Q125,430.00",
      lastPurchase: "2024-07-22",
      priceTier: "Tarifa Mayorista",
      creditLimit: "Q50,000.00",
      creditTerms: "30",
      currentBalance: "Q12,500.00",
      usualPaymentMethod: "Transferencia Bancaria",
      maxSalesDiscount: "8%",
      addresses: [
        { id: 1, street: "Edificio GIGA, Nivel 10, Zona 10", city: "Guatemala", isPrimary: true },
        { id: 2, street: "Bodega 5, Calzada Atanasio Tzul", city: "Guatemala", isPrimary: false },
      ],
      purchaseHistory: [
        { 
          invoice: "FACA-1251", 
          date: "2024-07-22", 
          total: "Q12,500.00", 
          status: "Pendiente de Pago",
          products: [
            { sku: "CEM-01", name: "Bolsa de Cemento UGC", qty: 200, price: 62.50 },
            { sku: "ACR-01", name: "Varilla de Hierro 1/2 pulg", qty: 150, price: 39.00 },
          ],
          dueDate: "2024-08-21",
          branchId: "1"
        },
        { 
          invoice: "FACA-1198", 
          date: "2024-06-15", 
          total: "Q85,950.00", 
          status: "Pagado",
          products: [
            { sku: "LAM-02", name: "Lámina troquelada 12 pies", qty: 100, price: 135.00 },
            { sku: "TOR-01", name: "Tornillo de tabla yeso 1 pulg (Caja 100)", qty: 50, price: 18.00 },
          ],
          payments: [{ date: '2024-07-10', amount: 85950.00, method: 'Transferencia Bancaria', documentNumber: 'GTQ-BANK-889977' }],
          branchId: "2"
        },
      ],
      orders: [
        {
          id: 'PED-001',
          date: '2024-07-25',
          status: 'En Preparación',
          total: 'Q4,500.00',
          products: [
              { sku: 'SKU001', name: 'Martillo de Carpintero Profesional', qty: 20, price: 110.00, qtyDelivered: 0 },
              { sku: 'SKU002', name: 'Destornillador Phillips #2', qty: 50, price: 38.00, qtyDelivered: 0 },
          ],
          deliveryAddress: { id: 1, street: "Edificio GIGA, Nivel 10, Zona 10", city: "Guatemala", isPrimary: true },
        }
      ],
      quotes: [
        {
          id: 'PRE-001',
          date: '2024-07-20',
          expiryDate: '2024-08-20',
          status: 'Aceptado',
          total: 'Q2,120.00',
          products: [
              { sku: 'SKU001', name: 'Martillo de Carpintero Profesional', qty: 10, price: 110.00 },
              { sku: 'SKU002', name: 'Destornillador Phillips #2', qty: 20, price: 40.00 },
          ]
        },
      ],
      reservations: [],
      notes: "Cliente corporativo importante. Las órdenes de compra deben ser aprobadas por el Ing. Méndez. Solicitar siempre la OC antes de despachar."
    },
    {
      id: "2",
      name: "Maria García",
      email: "maria.g@gmail.com",
      phones: [{ id: 3, number: "5555-5678", isPrimary: true }],
      type: "Particular",
      avatar: "MG",
      nit: "CF",
      fiscalName: "Maria García",
      totalSpent: "Q850.50",
      lastPurchase: "2024-07-10",
      priceTier: "Tarifa General",
      creditLimit: "Q0.00",
      creditTerms: "0",
      currentBalance: "Q0.00",
      usualPaymentMethod: "Efectivo",
      maxSalesDiscount: "0%",
      addresses: [
        { id: 3, street: "12 Calle 4-56, Zona 1", city: "Guatemala", isPrimary: true },
      ],
      purchaseHistory: [],
      orders: [
        {
          id: 'PED-003',
          date: '2024-07-26',
          status: 'Entregado',
          total: 'Q300.00',
          products: [
              { sku: 'SKU002', name: 'Destornillador Phillips #2', qty: 5, price: 45.00, qtyDelivered: 5 },
          ]
        },
      ],
      quotes: [
        {
          id: 'PRE-002',
          date: '2024-07-22',
          expiryDate: '2024-08-22',
          status: 'Convertido',
          total: 'Q850.50',
          products: [
              { sku: 'SERV-001', name: 'Servicio de Instalación de Lámpara', qty: 1, price: 250.00 },
              { sku: 'SKU002', name: 'Destornillador Phillips #2', qty: 1, price: 45.00 },
          ]
        }
      ],
      reservations: [],
      notes: "Cliente frecuente para proyectos de bricolaje en casa. Pide factura como Consumidor Final."
    },
     {
      id: "3",
      name: "Carlos Rodríguez",
      email: "carlos.r@reformas.es",
      phones: [{ id: 4, number: "5555-8765", isPrimary: true }],
      type: "Profesional",
      avatar: "CR",
      nit: "9876543-2",
      fiscalName: "Carlos Rodríguez, Servicios Profesionales",
      totalSpent: "Q12,120.00",
      lastPurchase: "2024-06-30",
      priceTier: "Tarifa Profesional",
      creditLimit: "Q5,000.00",
      creditTerms: "15",
      currentBalance: "Q500.00",
      usualPaymentMethod: "Cheque",
      maxSalesDiscount: "10%",
      addresses: [
        { id: 4, street: "Condado Naranjo, Mixco", city: "Guatemala", isPrimary: true },
      ],
      purchaseHistory: [],
      orders: [{
          id: 'PED-002',
          date: '2024-07-26',
          status: 'Listo para Entrega',
          total: 'Q800.00',
          products: [
              { sku: 'SKU001', name: 'Martillo de Carpintero Profesional', qty: 5, price: 110.00, qtyDelivered: 0 },
          ]
        }],
      quotes: [],
      reservations: [],
      notes: "Contratista independiente. Siempre pide descuento profesional y paga puntualmente.",
    },
    {
      id: "4",
      name: "Ana López",
      email: "ana.lopez@diy.net",
      phones: [{ id: 5, number: "5555-4321", isPrimary: true }],
      type: "Particular",
      avatar: "AL",
      nit: "CF",
      fiscalName: "Ana López",
      totalSpent: "Q300.00",
      lastPurchase: "2024-07-20",
      priceTier: "Tarifa General",
      creditLimit: "Q0.00",
      creditTerms: "0",
      currentBalance: "Q0.00",
      usualPaymentMethod: "Tarjeta de Crédito",
      maxSalesDiscount: "0%",
      addresses: [
        { id: 5, street: "Residenciales El Roble, Apto 3B", city: "Santa Catarina Pinula", isPrimary: true },
        { id: 6, street: "Oficina 404, Edificio Empresarial", city: "Guatemala", isPrimary: false },
      ],
      purchaseHistory: [],
      orders: [],
      quotes: [
         {
          id: 'PRE-003',
          date: '2024-05-24',
          expiryDate: '2024-06-24',
          status: 'Vencido',
          total: 'Q10,200.00',
          products: [
              { sku: 'SKU001', name: 'Martillo de Carpintero Profesional', qty: 5, price: 125.00 },
          ]
        }
      ],
      reservations: [],
      notes: "Interesada en talleres de bricolaje.",
    },
];

/** Cliente genérico para ventas de mostrador (Consumidor Final). */
export const GENERAL_CUSTOMER: Customer = {
  id: "0",
  name: "Cliente General",
  email: "",
  phones: [],
  type: "Particular",
  avatar: "CG",
  nit: "CF",
  fiscalName: "Consumidor Final",
  totalSpent: "Q0.00",
  lastPurchase: "N/A",
  priceTier: "Tarifa General",
  creditLimit: "Q0.00",
  creditTerms: "0",
  currentBalance: "Q0.00",
  usualPaymentMethod: "Efectivo",
  maxSalesDiscount: "0%",
  addresses: [],
  purchaseHistory: [],
  orders: [],
  quotes: [],
  vouchers: [],
  reservations: [],
  repairOrders: [],
  notes: "Cliente genérico para ventas de mostrador.",
};
