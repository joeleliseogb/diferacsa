

'use client';

import type { Firestore } from "firebase/firestore";
import { collection, getDocs, doc, getDoc, setDoc, addDoc, query, where, writeBatch, documentId, deleteDoc } from "firebase/firestore";
import { initialCustomers, type Order, type Quote, type Purchase, type Payment, type Customer, type PurchaseProduct, type DiscountVoucher, type Reservation, type RepairOrder } from './data';
import { db } from './firebase';
import { cancelStockSale, sellStock } from "./product-service";
import { addCashRegisterMovement } from "./servicios";

// --- IN-MEMORY DATA STORE ---
let memoryCustomers: Customer[] = [];
let seedingPromise: Promise<void> | null = null;

async function seedCustomersIfEmpty() {
    if (db) {
        const q = query(collection(db, 'customers'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            console.log("Seeding initial customers...");
            const batch = writeBatch(db);
            initialCustomers.forEach(customer => {
                const docRef = doc(db, 'customers', customer.id);
                const { purchaseHistory, orders, quotes, ...customerData } = customer;
                batch.set(docRef, customerData);

                (purchaseHistory || []).forEach(purchase => {
                    const purchaseRef = doc(db, 'customers', customer.id, 'purchaseHistory', purchase.invoice);
                    batch.set(purchaseRef, purchase);
                });
                (orders || []).forEach(order => {
                    const orderRef = doc(db, 'customers', customer.id, 'orders', order.id);
                    batch.set(orderRef, order);
                });
                (quotes || []).forEach(quote => {
                    const quoteRef = doc(db, 'customers', customer.id, 'quotes', quote.id);
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
    }
}

async function ensureDataIsSeeded() {
    if (!seedingPromise) {
        seedingPromise = seedCustomersIfEmpty();
    }
    await seedingPromise;
}

export async function getCustomers(searchTerm?: string): Promise<Customer[]> {
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
  await ensureDataIsSeeded();
  
  if (db) {
      const customerDocRef = doc(db, 'customers', id);
      const customerDoc = await getDoc(customerDocRef);
      if (!customerDoc.exists()) return id === '0' ? JSON.parse(JSON.stringify(initialCustomers.find(c => c.id === '0'))) : undefined;

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
    if(customerToSave.id === '0') return; // Do not save the default customer
    
    if (db) {
        const batch = writeBatch(db);
        const customerRef = doc(db, 'customers', customerToSave.id);
        const { purchaseHistory, orders, quotes, vouchers, reservations, repairOrders, ...customerData } = customerToSave;
        
        batch.set(customerRef, customerData);

        (purchaseHistory || []).forEach(purchase => {
            const purchaseRef = doc(db, 'customers', customerToSave.id, 'purchaseHistory', purchase.invoice);
            batch.set(purchaseRef, purchase);
        });
        (orders || []).forEach(order => {
            const orderRef = doc(db, 'customers', customerToSave.id, 'orders', order.id);
            batch.set(orderRef, order);
        });
        (quotes || []).forEach(quote => {
            const quoteRef = doc(db, 'customers', customerToSave.id, 'quotes', quote.id);
            batch.set(quoteRef, quote);
        });
         (vouchers || []).forEach(voucher => {
            const voucherRef = doc(db, 'customers', customerToSave.id, 'vouchers', voucher.id);
            batch.set(voucherRef, voucher);
        });
        (reservations || []).forEach(reservation => {
            const reservationRef = doc(db, 'customers', customerToSave.id, 'reservations', reservation.id);
            batch.set(reservationRef, reservation);
        });
        (repairOrders || []).forEach(ro => {
            const repairRef = doc(db, 'customers', customerToSave.id, 'repairOrders', ro.id);
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
      const currentTotalSpent = parseFloat(customer.totalSpent.replace(/Q|,/g, '')) || 0;
      const purchaseTotal = parseFloat(purchase.total.replace(/Q|,/g, '')) || 0;
      customer.totalSpent = `Q${(currentTotalSpent + purchaseTotal).toFixed(2)}`;
      customer.lastPurchase = purchase.date;
      
      const currentBalance = parseFloat(customer.currentBalance.replace(/Q|,/g, '')) || 0;
      if(purchase.status !== 'Pagado') {
         customer.currentBalance = `Q${(currentBalance + purchaseTotal).toFixed(2)}`;
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
                customer.orders[orderIndex] = updatedOrder;
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
            customer.orders.push(order);
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
                customer.quotes[quoteIndex] = updatedQuote;
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
            customer.quotes.push(quote);
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
  await ensureDataIsSeeded();
  const customers = await getCustomers();
  let allInvoices: InvoiceWithCustomerAndBalance[] = [];

    if (db) {
        for (const customer of customers) {
            const historyCol = collection(db, 'customers', customer.id, 'purchaseHistory');
            const historySnapshot = await getDocs(historyCol);
            historySnapshot.forEach(doc => {
                const invoice = doc.data() as Purchase;
                const totalAmount = parseFloat(invoice.total.replace(/Q|,/g, '')) || 0;
                const paidAmount = (invoice.payments || []).reduce((sum, p) => sum + p.amount, 0);
                allInvoices.push({
                    ...invoice,
                    customerId: customer.id,
                    customerName: customer.name,
                    remaining: totalAmount - paidAmount,
                });
            });
        }
    } else {
         for (const customer of customers) {
            if (customer.purchaseHistory) {
                for (const invoice of customer.purchaseHistory) {
                    const totalAmount = parseFloat(invoice.total.replace(/Q|,/g, '')) || 0;
                    const paidAmount = (invoice.payments || []).reduce((sum, p) => sum + p.amount, 0);
                    allInvoices.push({
                        ...invoice,
                        customerId: customer.id,
                        customerName: customer.name,
                        remaining: totalAmount - paidAmount,
                    });
                }
            }
        }
    }
    
  return allInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function certifyInvoice(customerId: string, invoiceId: string): Promise<void> {
    await ensureDataIsSeeded();
    
    const customer = await getCustomer(customerId);
    if (!customer) return;

    const invoiceIndex = (customer.purchaseHistory || []).findIndex(p => p.invoice === invoiceId);
    if (invoiceIndex === -1) return;
    
    // Simulate certification by changing status
    customer.purchaseHistory[invoiceIndex].status = 'Certificado';
    
    await saveCustomer(customer);
}

export async function cancelInvoice(invoice: InvoiceWithCustomerAndBalance): Promise<void> {
    await ensureDataIsSeeded();
    
    const customer = await getCustomer(invoice.customerId);
    if (!customer) return;

    const invoiceIndex = (customer.purchaseHistory || []).findIndex(p => p.invoice === invoice.invoice);
    if (invoiceIndex === -1) return;
    
    const amountPaid = invoice.remaining > 0 ? (parseFloat(invoice.total.replace(/Q|,/g, '')) - invoice.remaining) : parseFloat(invoice.total.replace(/Q|,/g, ''));
    
    // 1. Change invoice status
    customer.purchaseHistory[invoiceIndex].status = 'Anulado';
    
    // 2. Reverse stock
    // We assume the branchId from the invoice is correct to find the warehouse
    await cancelStockSale(invoice.products, invoice.invoice, parseInt(invoice.branchId));
    
    // 3. Handle payment reversal
    if (amountPaid > 0) {
        // A) Create a cash register movement for the refund
        await addCashRegisterMovement({
            id: Date.now(),
            fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
            tipo: 'Salida Manual',
            concepto: `Devolución por anulación de Factura ${invoice.invoice}`,
            ingreso: 0,
            egreso: amountPaid,
            branchId: invoice.branchId,
            terminalId: invoice.terminalId,
        });

        // B) Adjust customer balance
        const currentBalance = parseFloat(customer.currentBalance.replace(/Q|,/g, '')) || 0;
        customer.currentBalance = `Q${(currentBalance - amountPaid).toFixed(2)}`;
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

    if (!invoice.payments) {
        invoice.payments = [];
    }
    invoice.payments.push({
        date: new Date().toISOString().split('T')[0],
        amount: paymentAmount,
        method: paymentMethod,
        documentNumber: documentNumber || '',
    });

    const invoiceTotal = parseFloat(invoice.total.replace(/Q|,/g, '')) || 0;
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    
    if (totalPaid >= invoiceTotal - 0.001) { // Tolerance for float issues
        invoice.status = 'Pagado';
    } else {
        invoice.status = 'Pago Parcial';
    }
    
    customer.purchaseHistory[invoiceIndex] = invoice;
    
    if (customerId !== '0') {
      const currentBalance = parseFloat(customer.currentBalance.replace(/Q|,/g, '')) || 0;
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

    const originalBalance = parseFloat(customer.currentBalance.replace(/Q|,/g, '')) || 0;
    let remainingPayment = totalPayment;
    const paymentApplied: { invoiceId: string; amountApplied: number }[] = [];

    const pendingInvoices = (customer.purchaseHistory || [])
        .filter(p => p.status === 'Pendiente de Pago' || p.status === 'Pago Parcial' || p.status === 'Certificado')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const invoice of pendingInvoices) {
        if (remainingPayment <= 0) break;

        const invoiceTotal = parseFloat(invoice.total.replace(/Q|,/g, '')) || 0;
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

    const prefix = reservationData.type === 'apartado' ? 'AP' : 'EN';
    const lastReservation = customer.reservations
        .filter(r => r.id.startsWith(prefix))
        .sort((a, b) => parseInt(b.id.split('-')[1]) - parseInt(a.id.split('-')[1]))[0];

    let newNumber = 1;
    if (lastReservation) {
        newNumber = parseInt(lastReservation.id.split('-')[1]) + 1;
    }
    
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
