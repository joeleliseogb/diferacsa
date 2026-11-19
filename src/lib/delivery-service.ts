
'use client';

import type { OrderWithCustomer } from './customer-service';
import { getOrder, updateOrder } from './customer-service';
import { sellStock } from './product-service';
import type { Order, OrderProduct } from './data';

export interface DeliveryOrder extends OrderWithCustomer {
}

export interface DeliveryRoute {
    id: string; // RUTA-001
    driver: string;
    date: string;
    status: 'Programada' | 'En Ruta' | 'Completada' | 'Cancelada';
    stops: number;
    totalValue: number;
    totalItems: number;
    orders: Order[];
}

const initialData: DeliveryRoute[] = [
    { id: "RUTA-001", driver: "Pedro Morales", date: "2024-07-26", status: "En Ruta", stops: 1, totalValue: 800, totalItems: 5, 
    orders: [
        { id: 'PED-002', date: '2024-07-26', status: 'En Ruta', total: 'Q800.00', invoiceId: 'FACA-1252', products: [ { sku: 'SKU001', name: 'Martillo de Carpintero Profesional', qty: 5, price: 110.00, qtyDelivered: 0 } ]}
    ] },
    { id: "RUTA-002", driver: "Sofia Castillo", date: "2024-07-25", status: "Completada", stops: 1, totalValue: 300, totalItems: 5, 
    orders: [
        { id: 'PED-003', date: '2024-07-26', status: 'Entregado', total: 'Q300.00', invoiceId: 'FACA-1253', products: [ { sku: 'SKU002', name: 'Destornillador Phillips #2', qty: 5, price: 45.00, qtyDelivered: 5 }] }
    ]},
];

// --- IN-MEMORY DATA STORE ---
let memoryRoutes: DeliveryRoute[] = JSON.parse(JSON.stringify(initialData));

export async function getDeliveryRoutes(): Promise<DeliveryRoute[]> {
    return JSON.parse(JSON.stringify(memoryRoutes)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getDeliveryRoute(id: string): Promise<DeliveryRoute | undefined> {
    const route = memoryRoutes.find(r => r.id === id);
    return route ? JSON.parse(JSON.stringify(route)) : undefined;
}

export async function saveDeliveryRoute(route: DeliveryRoute): Promise<void> {
    for (const deliveryOrder of route.orders) {
        const sourceOrderData = await getOrder(deliveryOrder.id);
        if (sourceOrderData) {
            const { order: sourceOrder, customer } = sourceOrderData;
            
            const isFullyDispatched = sourceOrder.products.every(p => {
                const deliveredQty = deliveryOrder.products.find(dp => dp.sku === p.sku)?.qty || 0;
                return p.qty <= (p.qtyDelivered || 0) + deliveredQty;
            });
            
            sourceOrder.status = isFullyDispatched ? 'En Ruta' : 'Parcialmente Entregado';
            await updateOrder(customer.id, sourceOrder);
        }
    }

    const index = memoryRoutes.findIndex(r => r.id === route.id);
    if (index !== -1) {
        memoryRoutes[index] = JSON.parse(JSON.stringify(route));
    } else {
        memoryRoutes.push(JSON.parse(JSON.stringify(route)));
    }
}

export async function updateDeliveryRoute(updatedRoute: DeliveryRoute): Promise<void> {
    const originalRoute = await getDeliveryRoute(updatedRoute.id);
    
    if (updatedRoute.status === 'Completada' && originalRoute?.status !== 'Completada') {
        for (const deliveryOrder of updatedRoute.orders) {
            const sourceOrderData = await getOrder(deliveryOrder.id);
            if (sourceOrderData) {
                 const { order: sourceOrder, customer } = sourceOrderData;
                 
                 const productsForHistory: OrderProduct[] = [];

                 deliveryOrder.products.forEach(deliveryProduct => {
                     const sourceProduct = sourceOrder.products.find(p => p.sku === deliveryProduct.sku);
                     if (sourceProduct) {
                         sourceProduct.qtyDelivered = (sourceProduct.qtyDelivered || 0) + deliveryProduct.qty;
                         productsForHistory.push({ ...deliveryProduct, qty: deliveryProduct.qty, qtyDelivered: 0, price: deliveryProduct.price });
                     }
                 });

                 await sellStock(productsForHistory, deliveryOrder.id, 1); 

                 const isFullyDelivered = sourceOrder.products.every(p => p.qty <= p.qtyDelivered);
                 sourceOrder.status = isFullyDelivered ? 'Entregado' : 'Parcialmente Entregado';
                 
                 await updateOrder(customer.id, sourceOrder);
            }
        }
    }
    
    await saveDeliveryRoute(updatedRoute);
}
