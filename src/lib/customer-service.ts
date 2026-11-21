

'use client';

import type { Firestore } from "firebase/firestore";
import { collection, getDocs, doc, getDoc, setDoc, addDoc, query, where, writeBatch, documentId, deleteDoc } from "firebase/firestore";
import { initialCustomers, GENERAL_CUSTOMER, type Order, type Quote, type Purchase, type Customer, type PurchaseProduct, type DiscountVoucher, type Reservation, type RepairOrder } from './data';
import { db } from './firebase';
import { loadStore, saveStore } from './local-store';
import { cancelStockSale, sellStock } from "./product-service";
import { addCashRegisterMovement } from "./cash-register-service";
import { formatLocalDateTime } from "./date-utils";

// --- IN-MEMORY DATA STORE ---
const CUSTOMERS_STORE_KEY = 'customers';
let memoryCustomers: Customer[] = loadStore<Customer[]>(CUSTOMERS_STORE_KEY, []);
let seedingPromise: Promise<void> | null = null;

async function seedCustomersIfEmpty() {
    if (db) {
        const firestore = db;
        const q = query(collection(firestore, 'customers'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            console.log("Seeding initial customers...");
            const batch = writeBatch(firestore);
            initialCustomers.forEach(customer => {
                const docRef = doc(firestore, 'customers', customer.id);
                const { purchaseHistory, orders, quotes, ...customerData } = customer;
                batch.set(docRef, customerData);

                (purchaseHistory || []).forEach(purchase => {
                    const purchaseRef = doc(firestore, 'customers', customer.id, 'purchaseHistory', purchase.invoice);
                    batch.set(purchaseRef, purchase);
                });
                (orders || []).forEach(order => {
                    const orderRef = doc(firestore, 'customers', customer.id, 'orders', order.id);
                    batch.set(orderRef, order);
                });
                (quotes || []).forEach(quote => {
                    const quoteRef = doc(firestore, 'customers', customer.id, 'quotes', quote.id);
                    batch.set(quoteRef, quote);
                });
            });
            await batch.commit();
        }
    } else {
        // In-memory fallback
        if (memoryCustomers.length === 0) {
            console.log("Seeding initial customers to memory...");
            memoryCustomers = JSON.parse(JSON.stringify(initialCustomers));
        }
        // El "Cliente General" (id '0') debe existir para poder registrar
        // las ventas de mostrador sin cliente asociado.
        if (!memoryCustomers.some(c => c.id === GENERAL_CUSTOMER.id)) {
            memoryCustomers.unshift(JSON.parse(JSON.stringify(GENERAL_CUSTOMER)));
        }
        persistCustomers();
    }
}

function persistCustomers() {
    saveStore(CUSTOMERS_STORE_KEY, memoryCustomers);
}

const parseQ = (value: string | undefined | null): number => parseFloat((value || '0').replace(/Q|,/g, '')) || 0;

async function ensureDataIsSeeded() {
    if (!seedingPromise) {
        seedingPromise = seedCustomersIfEmpty();
    }
    await seedingPromise;
}

export async function getCustomers(searchTerm?: string): Promise<Customer[]> {
  try {
    const url = typeof window !== 'undefined'
      ? `/api/customers?search=${encodeURIComponent(searchTerm || '')}&limit=100`
      : `http://localhost:9002/api/customers?search=${encodeURIComponent(searchTerm || '')}&limit=100`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        return data.items;
      }
    }
  } catch {
    // Fallback a memoria
  }

  await ensureDataIsSeeded();
  let customers: Customer[];

  if (db) {
    const customersCol = collection(db, 'customers');
    const customerSnapshot = await getDocs(customersCol);
    customers = customerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
  } else {
    // In-memory fallback
    customers = JSON.parse(JSON.stringify(memoryCustomers));
  }

  if (searchTerm) {
    const lowercasedTerm = searchTerm.toLowerCase();
    return customers.filter(customer => {
      const searchInString = (str: string | undefined | null) => str?.toLowerCase().includes(lowercasedTerm);
      
      const inName = searchInString(customer.name);
      const inEmail = searchInString(customer.email);
      const inNit = searchInString(customer.nit);
      const inFiscalName = searchInString(customer.fiscalName);
      const inNotes = searchInString(customer.notes);
      
      const inPhones = customer.phones.some(phone => searchInString(phone.number));
      const inAddresses = customer.addresses.some(addr => searchInString(addr.street) || searchInString(addr.city));
      
      return inName || inEmail || inNit || inFiscalName || inNotes || inPhones || inAddresses;
    });
  }
  
  return customers;
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  try {
    const url = typeof window !== 'undefined'
      ? `/api/customers/${encodeURIComponent(id)}`
      : `http://localhost:9002/api/customers/${encodeURIComponent(id)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data: Customer = await res.json();
      return data;
    }
  } catch {
    // Fallback a memoria local
  }

  await ensureDataIsSeeded();
  
  if (db) {
      const customerDocRef = doc(db, 'customers', id);
      const customerDoc = await getDoc(customerDocRef);
      if (!customerDoc.exists()) return id === GENERAL_CUSTOMER.id ? JSON.parse(JSON.stringify(GENERAL_CUSTOMER)) : undefined;

      const customerData = { id: customerDoc.id, ...customerDoc.data() } as Customer;

      // Fetch subcollections
      const purchaseHistoryCol = collection(db, 'customers', id, 'purchaseHistory');
      const purchaseHistorySnapshot = await getDocs(purchaseHistoryCol);
      customerData.purchaseHistory = purchaseHistorySnapshot.docs.map(d => d.data() as Purchase);

      const ordersCol = collection(db, 'customers', id, 'orders');
      const ordersSnapshot = await getDocs(ordersCol);
      customerData.orders = ordersSnapshot.docs.map(d => d.data() as Order);

      const quotesCol = collection(db, 'customers', id, 'quotes');
      const quotesSnapshot = await getDocs(quotesCol);
      customerData.quotes = quotesSnapshot.docs.map(d => d.data() as Quote);

      const vouchersCol = collection(db, 'customers', id, 'vouchers');
      const vouchersSnapshot = await getDocs(vouchersCol);
      customerData.vouchers = vouchersSnapshot.docs.map(d => d.data() as DiscountVoucher);

      const reservationsCol = collection(db, 'customers', id, 'reservations');
      const reservationsSnapshot = await getDocs(reservationsCol);
      customerData.reservations = reservationsSnapshot.docs.map(d => d.data() as Reservation);
      
      const repairOrdersCol = collection(db, 'customers', id, 'repairOrders');
      const repairOrdersSnapshot = await getDocs(repairOrdersCol);
      customerData.repairOrders = repairOrdersSnapshot.docs.map(d => d.data() as RepairOrder);


      return customerData;
  }
  // In-memory fallback
  const customer = memoryCustomers.find(c => c.id === id);
  return customer ? JSON.parse(JSON.stringify(customer)) : undefined;
}

export async function saveCustomer(customerToSave: Customer): Promise<void> {
    await ensureDataIsSeeded();
    
    if (db) {
        const firestore = db;
        const batch = writeBatch(firestore);
        const customerRef = doc(firestore, 'customers', customerToSave.id);
        const { purchaseHistory, orders, quotes, vouchers, reservations, repairOrders, ...customerData } = customerToSave;
        
        batch.set(customerRef, customerData);

        (purchaseHistory || []).forEach(purchase => {
            const purchaseRef = doc(firestore, 'customers', customerToSave.id, 'purchaseHistory', purchase.invoice);
            batch.set(purchaseRef, purchase);
        });
        (orders || []).forEach(order => {
            const orderRef = doc(firestore, 'customers', customerToSave.id, 'orders', order.id);
            batch.set(orderRef, order);
        });
        (quotes || []).forEach(quote => {
            const quoteRef = doc(firestore, 'customers', customerToSave.id, 'quotes', quote.id);
            batch.set(quoteRef, quote);
        });
         (vouchers || []).forEach(voucher => {
            const voucherRef = doc(firestore, 'customers', customerToSave.id, 'vouchers', voucher.id);
            batch.set(voucherRef, voucher);
        });
        (reservations || []).forEach(reservation => {
            const reservationRef = doc(firestore, 'customers', customerToSave.id, 'reservations', reservation.id);
            batch.set(reservationRef, reservation);
        });
        (repairOrders || []).forEach(ro => {
            const repairRef = doc(firestore, 'customers', customerToSave.id, 'repairOrders', ro.id);
            batch.set(repairRef, ro);
        });
        
        await batch.commit();

    } else {
        const index = memoryCustomers.findIndex(c => c.id === customerToSave.id);
        if (index !== -1) {
            memoryCustomers[index] = JSON.parse(JSON.stringify(customerToSave));
        } else {
            memoryCustomers.push(JSON.parse(JSON.stringify(customerToSave)));
        }
        persistCustomers();
    }
}

export async function addPurchaseToHistory(customerId: string, purchase: Omit<Purchase, 'products'> & { products: PurchaseProduct[] }): Promise<void> {
    await ensureDataIsSeeded();
    const customer = await getCustomer(customerId);
    if (!customer) return;

    if (!customer.purchaseHistory) {
      customer.purchaseHistory = [];
    }
    
    customer.purchaseHistory.push(purchase as Purchase);

    // Recalculate and update aggregates if it's a real customer
    if(customerId !== '0') {
      const currentTotalSpent = parseQ(customer.totalSpent);
      const purchaseTotal = parseQ(purchase.total);
      customer.totalSpent = `Q${(currentTotalSpent + purchaseTotal).toFixed(2)}`;
      customer.lastPurchase = purchase.date;
      
      const currentBalance = parseQ(customer.currentBalance);
      if(purchase.status !== 'Pagado') {
         // Solo se suma al saldo lo que queda pendiente (descontando abonos iniciales).
         const alreadyPaid = (purchase.payments || []).reduce((sum, p) => sum + p.amount, 0);
         const pending = Math.max(0, purchaseTotal - alreadyPaid);
         customer.currentBalance = `Q${(currentBalance + pending).toFixed(2)}`;
      }
    }

    await saveCustomer(customer);
}

export interface OrderWithCustomer extends Order {
    customerId: string;
    customerName: string;
}

export async function getAllOrders(): Promise<OrderWithCustomer[]> {
    await ensureDataIsSeeded();
    const customers = await getCustomers();
    let allOrders: OrderWithCustomer[] = [];

    if (db) {
        for (const customer of customers) {
            if (customer.id === '0') continue;
            const ordersCol = collection(db, 'customers', customer.id, 'orders');
            const ordersSnapshot = await getDocs(ordersCol);
            ordersSnapshot.forEach(doc => {
                allOrders.push({
                    ...(doc.data() as Order),
                    customerId: customer.id,
                    customerName: customer.name,
                });
            });
        }
    } else {
         for (const customer of customers) {
            if (customer.id === '0') continue;
            if (customer.orders) {
                const customerOrders = customer.orders.map(order => ({
                    ...order,
                    customerId: customer.id,
                    customerName: customer.name
                }));
                allOrders.push(...customerOrders);
            }
        }
    }
    
    return allOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getPendingDeliveryOrders(): Promise<OrderWithCustomer[]> {
    const allOrders = await getAllOrders();
    return allOrders.filter(order => {
        const isDeliverableStatus = ['Listo para Entrega', 'Parcialmente Entregado', 'En Preparación'].includes(order.status);
        if (!isDeliverableStatus) return false;
        return order.products.some(p => p.qty > p.qtyDelivered);
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function getOrder(orderId: string): Promise<{ order: Order, customer: Customer } | null> {
    await ensureDataIsSeeded();
     if (db) {
        const customers = await getCustomers();
        for (const customer of customers) {
            if (customer.id === '0') continue;
            const orderDocRef = doc(db, 'customers', customer.id, 'orders', orderId);
            const orderDoc = await getDoc(orderDocRef);
            if (orderDoc.exists()) {
                const fullCustomer = await getCustomer(customer.id);
                if (fullCustomer) {
                    return { order: orderDoc.data() as Order, customer: fullCustomer };
                }
            }
        }
    } else {
        const customers = await getCustomers();
        for (const customer of customers) {
            if (customer.id === '0') continue;
            const order = (customer.orders || []).find(o => o.id === orderId);
            if (order) {
                return { order, customer };
            }
        }
    }
    return null;
}

export async function updateOrder(customerId: string, updatedOrder: Order): Promise<void> {
    await ensureDataIsSeeded();
    if(customerId === '0') return;
    if(db) {
        const orderRef = doc(db, 'customers', customerId, 'orders', updatedOrder.id);
        await setDoc(orderRef, updatedOrder, { merge: true });
    } else {
        const customer = memoryCustomers.find(c => c.id === customerId);
        if (customer && customer.orders) {
            const orderIndex = customer.orders.findIndex(o => o.id === updatedOrder.id);
            if (orderIndex !== -1) {
                customer.orders[orderIndex] = JSON.parse(JSON.stringify(updatedOrder));
                persistCustomers();
            }
        }
    }
}

export async function saveOrder(customerId: string, order: Order): Promise<void> {
    await ensureDataIsSeeded();
    if(customerId === '0') return;
     if(db) {
        const orderRef = doc(db, 'customers', customerId, 'orders', order.id);
        await setDoc(orderRef, order);
    } else {
        const customer = memoryCustomers.find(c => c.id === customerId);
        if (customer) {
            if (!customer.orders) customer.orders = [];
            const existing = customer.orders.findIndex(o => o.id === order.id);
            if (existing !== -1) {
                customer.orders[existing] = JSON.parse(JSON.stringify(order));
            } else {
                customer.orders.push(JSON.parse(JSON.stringify(order)));
            }
            persistCustomers();
        }
    }
}

export interface QuoteWithCustomer extends Quote {
    customerId: string;
    customerName: string;
}

export async function getAllQuotes(): Promise<QuoteWithCustomer[]> {
    await ensureDataIsSeeded();
    const customers = await getCustomers();
    let allQuotes: QuoteWithCustomer[] = [];

     if (db) {
        for (const customer of customers) {
            if (customer.id === '0') continue;
            const quotesCol = collection(db, 'customers', customer.id, 'quotes');
            const quotesSnapshot = await getDocs(quotesCol);
            quotesSnapshot.forEach(doc => {
                allQuotes.push({
                    ...(doc.data() as Quote),
                    customerId: customer.id,
                    customerName: customer.name,
                });
            });
        }
    } else {
        for (const customer of customers) {
            if (customer.id === '0') continue;
            if (customer.quotes) {
                const customerQuotes = customer.quotes.map(quote => ({
                    ...quote,
                    customerId: customer.id,
                    customerName: customer.name
                }));
                allQuotes.push(...customerQuotes);
            }
        }
    }
    
    return allQuotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getQuote(quoteId: string): Promise<{ quote: Quote, customer: Customer } | null> {
    await ensureDataIsSeeded();
     if (db) {
        const customers = await getCustomers();
        for (const customer of customers) {
            if (customer.id === '0') continue;
            const quoteDocRef = doc(db, 'customers', customer.id, 'quotes', quoteId);
            const quoteDoc = await getDoc(quoteDocRef);
            if (quoteDoc.exists()) {
                const fullCustomer = await getCustomer(customer.id);
                if (fullCustomer) {
                    return { quote: quoteDoc.data() as Quote, customer: fullCustomer };
                }
            }
        }
    } else {
        const customers = await getCustomers();
        for (const customer of customers) {
             if (customer.id === '0') continue;
            const quote = (customer.quotes || []).find(q => q.id === quoteId);
            if (quote) {
                return { quote, customer };
            }
        }
    }
    return null;
}

export async function updateQuote(customerId: string, updatedQuote: Quote): Promise<void> {
    await ensureDataIsSeeded();
    if(customerId === '0') return;
     if(db) {
        const quoteRef = doc(db, 'customers', customerId, 'quotes', updatedQuote.id);
        await setDoc(quoteRef, updatedQuote, { merge: true });
    } else {
        const customer = memoryCustomers.find(c => c.id === customerId);
        if (customer && customer.quotes) {
            const quoteIndex = customer.quotes.findIndex(q => q.id === updatedQuote.id);
            if (quoteIndex !== -1) {
                customer.quotes[quoteIndex] = JSON.parse(JSON.stringify(updatedQuote));
                persistCustomers();
            }
        }
    }
}

export async function saveQuote(customerId: string, quote: Quote): Promise<void> {
    await ensureDataIsSeeded();
    if(customerId === '0') return;
     if(db) {
        const quoteRef = doc(db, 'customers', customerId, 'quotes', quote.id);
        await setDoc(quoteRef, quote);
    } else {
        const customer = memoryCustomers.find(c => c.id === customerId);
        if (customer) {
            if (!customer.quotes) customer.quotes = [];
            const existing = customer.quotes.findIndex(q => q.id === quote.id);
            if (existing !== -1) {
                customer.quotes[existing] = JSON.parse(JSON.stringify(quote));
            } else {
                customer.quotes.push(JSON.parse(JSON.stringify(quote)));
            }
            persistCustomers();
        }
    }
}

export interface InvoiceWithCustomer extends Purchase {
  customerId: string;
  customerName: string;
  customer?: Customer;
}

export interface InvoiceWithCustomerAndBalance extends InvoiceWithCustomer {
  remaining: number;
}


export async function getAllInvoices(): Promise<InvoiceWithCustomerAndBalance[]> {
  try {
    const url = typeof window !== 'undefined'
      ? '/api/invoices?limit=100'
      : 'http://localhost:9002/api/invoices?limit=100';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        return data.items.map((item: any) => ({
          invoice: item.invoice,
          date: item.date,
          products: [],
          total: item.total,
          status: item.status,
          paymentMethod: item.paymentMethod,
          customerId: item.customerId,
          customerName: item.customerName,
          remaining: item.remaining,
          payments: [],
        }));
      }
    }
  } catch {
    // fallback
  }

  const customers = memoryCustomers;
  let allInvoices: InvoiceWithCustomerAndBalance[] = [];
  for (const customer of customers) {
    if (customer.purchaseHistory) {
      for (const invoice of customer.purchaseHistory) {
        const totalAmount = parseQ(invoice.total);
        const paidAmount = (invoice.payments || []).reduce((sum, p) => sum + p.amount, 0);
        allInvoices.push({
          ...invoice,
          customerId: customer.id,
          customerName: customer.name,
          remaining: invoice.status === 'Anulado' ? 0 : totalAmount - paidAmount,
        });
      }
    }
  }
  return allInvoices;
}

export async function certifyInvoice(customerId: string, invoiceId: string): Promise<void> {
    await ensureDataIsSeeded();
    
    const customer = await getCustomer(customerId);
    if (!customer) return;

    const invoiceIndex = (customer.purchaseHistory || []).findIndex(p => p.invoice === invoiceId);
    if (invoiceIndex === -1) return;
    
    const target = customer.purchaseHistory[invoiceIndex];
    if (target.status === 'Anulado') {
        throw new Error(`La factura ${invoiceId} está anulada y no se puede certificar.`);
    }
    // Una factura ya pagada conserva su estado; solo las pendientes pasan a 'Certificado'.
    if (target.status !== 'Pagado') {
        target.status = 'Certificado';
    }
    
    await saveCustomer(customer);
}

export async function cancelInvoice(invoice: InvoiceWithCustomerAndBalance): Promise<void> {
    await ensureDataIsSeeded();
    
    const customer = await getCustomer(invoice.customerId);
    if (!customer) return;

    const invoiceIndex = (customer.purchaseHistory || []).findIndex(p => p.invoice === invoice.invoice);
    if (invoiceIndex === -1) return;
    
    const storedInvoice = customer.purchaseHistory[invoiceIndex];
    if (storedInvoice.status === 'Anulado') {
        throw new Error(`La factura ${invoice.invoice} ya está anulada.`);
    }

    // Se recalcula a partir de los datos guardados (no de los recibidos por parámetro)
    const invoiceTotal = parseQ(storedInvoice.total);
    const amountPaid = (storedInvoice.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const outstanding = Math.max(0, invoiceTotal - amountPaid);
    // Las facturas registradas como 'Pagado' sin pagos detallados (p. ej. ventas de contado en TPV)
    // se consideran cobradas completamente.
    const effectivePaid = storedInvoice.status === 'Pagado' && amountPaid === 0 ? invoiceTotal : amountPaid;
    
    const originalStatus = storedInvoice.status;

    // 1. Change invoice status
    storedInvoice.status = 'Anulado';
    
    // 2. Reverse stock
    const warehouseId = parseInt(storedInvoice.warehouseId ?? storedInvoice.branchId, 10) || 1;
    await cancelStockSale(storedInvoice.products, storedInvoice.invoice, warehouseId);
    
    // 3. Handle payment reversal
    // A) Lo cobrado se devuelve al cliente desde la caja
    if (effectivePaid > 0) {
        await addCashRegisterMovement({
            id: Date.now(),
            fecha: formatLocalDateTime(new Date()),
            tipo: 'Salida Manual',
            concepto: `Devolución por anulación de Factura ${storedInvoice.invoice}`,
            ingreso: 0,
            egreso: effectivePaid,
            branchId: storedInvoice.branchId,
            terminalId: storedInvoice.terminalId,
        });
    }

    // B) Lo pendiente deja de ser deuda del cliente
    if (outstanding > 0 && originalStatus !== 'Pagado' && customer.id !== GENERAL_CUSTOMER.id) {
        const currentBalance = parseQ(customer.currentBalance);
        customer.currentBalance = `Q${Math.max(0, currentBalance - outstanding).toFixed(2)}`;
    }
    
    await saveCustomer(customer);
}

export async function registerPayment(customerId: string, invoiceId: string, paymentAmount: number, paymentMethod: string, documentNumber?: string): Promise<void> {
    await ensureDataIsSeeded();
    
    const customer = await getCustomer(customerId);
    if (!customer) return;

    const invoiceIndex = (customer.purchaseHistory || []).findIndex(p => p.invoice === invoiceId);
    if (invoiceIndex === -1) return;

    const invoice = customer.purchaseHistory[invoiceIndex];

    if (!(paymentAmount > 0)) {
        throw new Error('El monto del pago debe ser mayor que cero.');
    }
    if (invoice.status === 'Anulado') {
        throw new Error(`La factura ${invoiceId} está anulada.`);
    }
    const alreadyPaid = (invoice.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const outstandingBefore = parseQ(invoice.total) - alreadyPaid;
    if (paymentAmount > outstandingBefore + 0.001) {
        throw new Error(`El pago (Q${paymentAmount.toFixed(2)}) excede el saldo pendiente de la factura (Q${outstandingBefore.toFixed(2)}).`);
    }

    if (!invoice.payments) {
        invoice.payments = [];
    }
    invoice.payments.push({
        date: new Date().toISOString().split('T')[0],
        amount: paymentAmount,
        method: paymentMethod,
        documentNumber: documentNumber || '',
    });

    const invoiceTotal = parseQ(invoice.total);
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    
    if (totalPaid >= invoiceTotal - 0.001) { // Tolerance for float issues
        invoice.status = 'Pagado';
    } else {
        invoice.status = 'Pago Parcial';
    }
    
    customer.purchaseHistory[invoiceIndex] = invoice;
    
    if (customerId !== GENERAL_CUSTOMER.id) {
      const currentBalance = parseQ(customer.currentBalance);
      customer.currentBalance = `Q${(currentBalance - paymentAmount).toFixed(2)}`;
    }
    
    await saveCustomer(customer);
}

export interface BulkPaymentResult {
    customer: Customer;
    paymentApplied: {
        invoiceId: string;
        amountApplied: number;
    }[];
    originalBalance: number;
    newBalance: number;
}


export async function registerBulkPayment(customerId: string, totalPayment: number, paymentMethod: string, documentNumber?: string): Promise<BulkPaymentResult> {
    await ensureDataIsSeeded();
    if (customerId === '0') throw new Error("Cannot apply bulk payment to default customer.");

    const customer = await getCustomer(customerId);
    if (!customer) throw new Error("Customer not found.");

    if (!(totalPayment > 0)) throw new Error('El monto del abono debe ser mayor que cero.');
    const originalBalance = parseQ(customer.currentBalance);
    let remainingPayment = totalPayment;
    const paymentApplied: { invoiceId: string; amountApplied: number }[] = [];

    const pendingInvoices = (customer.purchaseHistory || [])
        .filter(p => p.status === 'Pendiente de Pago' || p.status === 'Pago Parcial' || p.status === 'Certificado')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const invoice of pendingInvoices) {
        if (remainingPayment <= 0) break;

        const invoiceTotal = parseQ(invoice.total);
        const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + p.amount, 0);
        const outstandingAmount = invoiceTotal - totalPaid;

        if (outstandingAmount > 0) {
            const paymentForThisInvoice = Math.min(remainingPayment, outstandingAmount);
            
            if (!invoice.payments) {
                invoice.payments = [];
            }
            invoice.payments.push({
                date: new Date().toISOString().split('T')[0],
                amount: paymentForThisInvoice,
                method: paymentMethod,
                documentNumber: documentNumber || 'Abono a Cuenta',
            });

            paymentApplied.push({ invoiceId: invoice.invoice, amountApplied: paymentForThisInvoice });

            const newTotalPaid = totalPaid + paymentForThisInvoice;
            if (newTotalPaid >= invoiceTotal - 0.001) {
                invoice.status = 'Pagado';
            } else {
                invoice.status = 'Pago Parcial';
            }
            
            remainingPayment -= paymentForThisInvoice;
        }
    }
    
    const newBalance = originalBalance - totalPayment;
    customer.currentBalance = `Q${newBalance.toFixed(2)}`;

    await saveCustomer(customer);
    
    const updatedCustomer = await getCustomer(customerId);

    return {
        customer: updatedCustomer!,
        paymentApplied,
        originalBalance,
        newBalance
    };
}

export async function addDiscountVoucherToCustomer(customerId: string, voucher: DiscountVoucher): Promise<void> {
    await ensureDataIsSeeded();
    const customer = await getCustomer(customerId);
    if (!customer) return;

    if (!customer.vouchers) {
        customer.vouchers = [];
    }
    customer.vouchers.push(voucher);
    await saveCustomer(customer);
}

export interface ReservationWithDetails extends Reservation {
    customerName: string;
}

export async function getAllReservations(): Promise<ReservationWithDetails[]> {
    await ensureDataIsSeeded();
    const customers = await getCustomers();
    let allReservations: ReservationWithDetails[] = [];

    if (db) {
        for (const customer of customers) {
            if (customer.id === '0') continue;
            const reservationsCol = collection(db, 'customers', customer.id, 'reservations');
            const reservationsSnapshot = await getDocs(reservationsCol);
            reservationsSnapshot.forEach(doc => {
                 allReservations.push({
                    ...(doc.data() as Reservation),
                    customerName: customer.name,
                });
            });
        }
    } else {
        for (const customer of customers) {
            if (customer.reservations) {
                const customerReservations = customer.reservations.map(res => ({
                    ...res,
                    customerName: customer.name
                }));
                allReservations.push(...customerReservations);
            }
        }
    }
    
    return allReservations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}


export async function saveReservation(customerId: string, reservationData: Omit<Reservation, 'id'> | Reservation): Promise<Reservation> {
    await ensureDataIsSeeded();
    const customer = await getCustomer(customerId);
    if (!customer) throw new Error(`Customer with ID ${customerId} not found.`);

    if (!customer.reservations) {
        customer.reservations = [];
    }
    
    // Check if it's a new reservation or an update
    if ('id' in reservationData) {
        // It's an update
        const index = customer.reservations.findIndex(r => r.id === reservationData.id);
        if (index !== -1) {
            customer.reservations[index] = reservationData;
            await saveCustomer(customer);
            return reservationData;
        } else {
             // If not found, treat as new (though this shouldn't happen with proper use)
        }
    } 

    // La numeración debe ser global (no por cliente); si no, dos clientes
    // tendrían el mismo número de apartado/encargo.
    const prefix = reservationData.type === 'apartado' ? 'AP' : 'EN';
    const allReservations = await getAllReservations();
    const maxNumber = allReservations
        .filter(r => r.id.startsWith(`${prefix}-`))
        .reduce((max, r) => Math.max(max, parseInt(r.id.split('-')[1], 10) || 0), 0);
    const newNumber = maxNumber + 1;
    
    const newReservation: Reservation = {
        ...reservationData,
        id: `${prefix}-${newNumber.toString().padStart(3, '0')}`,
    };

    customer.reservations.push(newReservation);
    await saveCustomer(customer);
    return newReservation;
}

export async function getAllRepairOrders(): Promise<RepairOrder[]> {
    await ensureDataIsSeeded();
    const customers = await getCustomers();
    let allRepairOrders: RepairOrder[] = [];

    for (const customer of customers) {
        if (customer.id === '0' || !customer.repairOrders) continue;
        allRepairOrders.push(...customer.repairOrders);
    }
    
    return allRepairOrders.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
}

export async function getRepairOrder(id: string): Promise<RepairOrder | null> {
    await ensureDataIsSeeded();
    const customers = await getCustomers();
    for (const customer of customers) {
        const repairOrder = (customer.repairOrders || []).find(ro => ro.id === id);
        if (repairOrder) {
            return repairOrder;
        }
    }
    return null;
}

export async function saveRepairOrder(orderData: RepairOrder): Promise<void> {
    await ensureDataIsSeeded();
    const customer = await getCustomer(orderData.customerId);
    if (!customer) throw new Error(`Customer with ID ${orderData.customerId} not found.`);

    if (!customer.repairOrders) {
        customer.repairOrders = [];
    }

    const index = customer.repairOrders.findIndex(ro => ro.id === orderData.id);
    if (index !== -1) {
        customer.repairOrders[index] = orderData;
    } else {
        customer.repairOrders.push(orderData);
    }

    await saveCustomer(customer);
}

export async function getRepairHistoryForEquipment(serialNumber: string): Promise<RepairOrder[]> {
    if (!serialNumber) return [];
    
    const allOrders = await getAllRepairOrders();
    return allOrders.filter(order => order.equipment.serialNumber === serialNumber);
}
