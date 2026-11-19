

'use client';

import type { Firestore } from 'firebase/firestore';
import { type Supplier, initialSuppliers, type PurchaseOrder } from './supplier-data';
import { loadStore, saveStore } from './local-store';

const SUPPLIERS_COLLECTION = 'suppliers';
const HISTORY_SUBCOLLECTION = 'purchaseHistory';

// --- IN-MEMORY DATA STORE ---
const SUPPLIERS_KEY = 'suppliers';
let memorySuppliers: Supplier[] = loadStore<Supplier[]>(SUPPLIERS_KEY, initialSuppliers);
const persistSuppliers = () => saveStore(SUPPLIERS_KEY, memorySuppliers);

export async function getSuppliers(searchTerm?: string): Promise<Supplier[]> {
    let suppliers: Supplier[] = JSON.parse(JSON.stringify(memorySuppliers));
    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        return suppliers.filter(supplier =>
            supplier.name.toLowerCase().includes(lowercasedTerm) ||
            supplier.contactPerson.toLowerCase().includes(lowercasedTerm) ||
            supplier.email.toLowerCase().includes(lowercasedTerm) ||
            supplier.nit.toLowerCase().includes(lowercasedTerm)
        );
    }
    return suppliers;
}

export async function getSupplier(id: string): Promise<Supplier | undefined> {
    const supplier = memorySuppliers.find(s => s.id === id);
    return supplier ? JSON.parse(JSON.stringify(supplier)) : undefined;
}

export async function saveSupplier(supplierToSave: Supplier): Promise<void> {
    const index = memorySuppliers.findIndex(s => s.id === supplierToSave.id);
    if (index !== -1) {
        memorySuppliers[index] = JSON.parse(JSON.stringify(supplierToSave));
    } else {
        memorySuppliers.push(JSON.parse(JSON.stringify(supplierToSave)));
    }
    persistSuppliers();
}

export interface PurchaseOrderWithSupplier extends PurchaseOrder {
    supplierId: string;
    supplierName: string;
}

export async function getAllPurchaseOrders(): Promise<PurchaseOrderWithSupplier[]> {
    const suppliers = await getSuppliers();
    let allOrders: PurchaseOrderWithSupplier[] = [];

    for (const supplier of suppliers) {
        if (supplier.purchaseHistory) {
            const supplierOrders = supplier.purchaseHistory.map(order => ({
                ...order,
                supplierId: supplier.id,
                supplierName: supplier.name
            }));
            allOrders.push(...supplierOrders);
        }
    }
    
    return allOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getPurchaseOrder(orderId: string): Promise<{ order: PurchaseOrder, supplier: Supplier } | null> {
    const suppliers = await getSuppliers();

    for (const supplier of suppliers) {
        const order = (supplier.purchaseHistory || []).find(o => o.order === orderId);
        if (order) {
            return { order, supplier };
        }
    }
    return null;
}

export async function updatePurchaseOrder(supplierId: string, updatedOrder: PurchaseOrder): Promise<void> {
    const supplier = await getSupplier(supplierId);
    if (supplier && supplier.purchaseHistory) {
        const orderIndex = supplier.purchaseHistory.findIndex(o => o.order === updatedOrder.order);
        if (orderIndex !== -1) {
            supplier.purchaseHistory[orderIndex] = updatedOrder;
            await saveSupplier(supplier);
        }
    }
}

export async function savePurchaseOrder(supplierId: string, order: PurchaseOrder): Promise<void> {
    const supplier = await getSupplier(supplierId);
    if (supplier) {
        if (!supplier.purchaseHistory) {
            supplier.purchaseHistory = [];
        }
        supplier.purchaseHistory.push(order);
        await saveSupplier(supplier);
    }
}

export interface BulkSupplierPaymentResult {
    supplier: Supplier;
    paymentApplied: {
        orderId: string;
        amountApplied: number;
    }[];
    originalBalance: number;
    newBalance: number;
}


export async function registerBulkSupplierPayment(supplierId: string, totalPayment: number, paymentMethod: string, documentNumber?: string): Promise<BulkSupplierPaymentResult> {
    const supplier = await getSupplier(supplierId);
    if (!supplier) throw new Error("Supplier not found.");

    const originalBalance = parseFloat(supplier.currentBalance.replace(/Q|,/g, '')) || 0;
    let remainingPayment = totalPayment;
    const paymentApplied: { orderId: string; amountApplied: number }[] = [];

    const pendingOrders = (supplier.purchaseHistory || [])
        .filter(p => p.status === 'Pendiente' || p.status === 'Recibido Parcial' || p.status === 'Pago Parcial')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const order of pendingOrders) {
        if (remainingPayment <= 0) break;

        const orderTotal = parseFloat(order.total.replace(/Q|,/g, '')) || 0;
        const totalPaid = (order.payments || []).reduce((sum, p) => sum + p.amount, 0);
        const outstandingAmount = orderTotal - totalPaid;

        if (outstandingAmount > 0) {
            const paymentForThisOrder = Math.min(remainingPayment, outstandingAmount);
            
            if (!order.payments) {
                order.payments = [];
            }
            order.payments.push({
                date: new Date().toISOString().split('T')[0],
                amount: paymentForThisOrder,
                method: paymentMethod,
                documentNumber: documentNumber || 'Abono a Cuenta',
            });

            paymentApplied.push({ orderId: order.order, amountApplied: paymentForThisOrder });

            const newTotalPaid = totalPaid + paymentForThisOrder;
            if (newTotalPaid >= orderTotal - 0.001) {
                order.status = 'Pagado';
            } else {
                order.status = 'Pago Parcial';
            }
            
            remainingPayment -= paymentForThisOrder;
        }
    }
    
    const newBalance = originalBalance - totalPayment;
    supplier.currentBalance = `Q${newBalance.toFixed(2)}`;

    await saveSupplier(supplier);
    
    const updatedSupplier = await getSupplier(supplierId);

    return {
        supplier: updatedSupplier!,
        paymentApplied,
        originalBalance,
        newBalance
    };
}
    
