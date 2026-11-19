

'use client';

// Este archivo actúa como un "barrel" para todos los servicios de datos,
// estableciendo un límite claro entre el código del servidor y el del cliente.
// Todos los componentes que necesiten acceder a la base de datos deben importar
// las funciones desde este archivo.

import * as customerService from './customer-service';
import * as settingsService from './settings-service';
import * as deliveryService from './delivery-service';
import * as productService from './product-service';
import * as supplierService from './supplier-service';
import * as authService from './auth-service';
import * as userService from './user-service';
import { getProducts_server } from './product-actions';
import type { PurchaseProduct, DiscountVoucher } from './data';

// --- Customer Service ---
export const getCustomers = (searchTerm?: string) => customerService.getCustomers(searchTerm);
export const getCustomer = (id: string) => customerService.getCustomer(id);
export const saveCustomer = (customerToSave: customerService.Customer) => customerService.saveCustomer(customerToSave);
export const addPurchaseToHistory = (customerId: string, purchase: Omit<customerService.Purchase, 'products'> & { products: PurchaseProduct[] }) => customerService.addPurchaseToHistory(customerId, purchase);
export const getAllOrders = () => customerService.getAllOrders();
export const getPendingDeliveryOrders = () => customerService.getPendingDeliveryOrders();
export const getOrder = (orderId: string) => customerService.getOrder(orderId);
export const updateOrder = (customerId: string, updatedOrder: customerService.Order) => customerService.updateOrder(customerId, updatedOrder);
export const saveOrder = (customerId: string, order: customerService.Order) => customerService.saveOrder(customerId, order);
export const getAllQuotes = () => customerService.getAllQuotes();
export const getQuote = (quoteId: string) => customerService.getQuote(quoteId);
export const updateQuote = (customerId: string, updatedQuote: customerService.Quote) => customerService.updateQuote(customerId, updatedQuote);
export const saveQuote = (customerId: string, quote: customerService.Quote) => customerService.saveQuote(customerId, quote);
export const getAllInvoices = () => customerService.getAllInvoices();
export const certifyInvoice = (customerId: string, invoiceId: string) => customerService.certifyInvoice(customerId, invoiceId);
export const cancelInvoice = (invoice: customerService.InvoiceWithCustomerAndBalance) => customerService.cancelInvoice(invoice);
export const registerPayment = (customerId: string, invoiceId: string, paymentAmount: number, paymentMethod: string, documentNumber?: string) => customerService.registerPayment(customerId, invoiceId, paymentAmount, paymentMethod, documentNumber);
export const registerBulkPayment = (customerId: string, totalPayment: number, paymentMethod: string, documentNumber?: string) => customerService.registerBulkPayment(customerId, totalPayment, paymentMethod, documentNumber);
export const addDiscountVoucherToCustomer = (customerId: string, voucher: DiscountVoucher) => customerService.addDiscountVoucherToCustomer(customerId, voucher);
export const getAllReservations = () => customerService.getAllReservations();
export const saveReservation = (customerId: string, reservationData: Omit<customerService.Reservation, 'id'> | customerService.Reservation) => customerService.saveReservation(customerId, reservationData);
export const getAllRepairOrders = () => customerService.getAllRepairOrders();
export const getRepairOrder = (id: string) => customerService.getRepairOrder(id);
export const saveRepairOrder = (orderData: customerService.RepairOrder) => customerService.saveRepairOrder(orderData);
export const getRepairHistoryForEquipment = (serialNumber: string) => customerService.getRepairHistoryForEquipment(serialNumber);


// --- Settings Service ---
export const getSettings = () => settingsService.getSettings();
export const saveSettings = (settings: settingsService.Settings) => settingsService.saveSettings(settings);
export const getCompanyInfo = () => settingsService.getCompanyInfo();
export const saveCompanyInfo = (companyInfo: settingsService.CompanyInfo) => settingsService.saveCompanyInfo(companyInfo);
export const getBranches = () => settingsService.getBranches();
export const saveBranches = (branches: settingsService.Branch[]) => settingsService.saveBranches(branches);
export const getPriceTiers = () => settingsService.getPriceTiers();
export const savePriceTiers = (priceTiers: settingsService.PriceTier[]) => settingsService.savePriceTiers(priceTiers);
export const getPaymentMethods = () => settingsService.getPaymentMethods();
export const savePaymentMethods = (paymentMethods: settingsService.PaymentMethod[]) => settingsService.savePaymentMethods(paymentMethods);
export const getDocumentSeries = () => settingsService.getDocumentSeries();
export const saveDocumentSeries = (documentSeries: settingsService.DocumentSeries[]) => settingsService.saveDocumentSeries(documentSeries);
export const getPosTerminals = () => settingsService.getPosTerminals();
export const savePosTerminals = (posTerminals: settingsService.PosTerminal[]) => settingsService.savePosTerminals(posTerminals);
export const getWarehouses = () => settingsService.getWarehouses();
export const saveWarehouses = (warehouses: settingsService.Warehouse[]) => settingsService.saveWarehouses(warehouses);
export const getTaxes = () => settingsService.getTaxes();
export const saveTaxes = (taxes: settingsService.Tax[]) => settingsService.saveTaxes(taxes);
export const getProductFamilies = () => settingsService.getProductFamilies();
export const saveProductFamilies = (productFamilies: settingsService.ProductFamily[]) => settingsService.saveProductFamilies(productFamilies);
export const getDrivers = () => settingsService.getDrivers();
export const saveDrivers = (drivers: settingsService.Driver[]) => settingsService.saveDrivers(drivers);
export const getPosSettings = () => settingsService.getPosSettings();
export const savePosSettings = (settings: settingsService.PosSettings) => settingsService.savePosSettings(settings);

// --- Delivery Service ---
export const getDeliveryRoutes = () => deliveryService.getDeliveryRoutes();
export const getDeliveryRoute = (id: string) => deliveryService.getDeliveryRoute(id);
export const saveDeliveryRoute = (route: deliveryService.DeliveryRoute) => deliveryService.saveDeliveryRoute(route);
export const updateDeliveryRoute = (updatedRoute: deliveryService.DeliveryRoute) => deliveryService.updateDeliveryRoute(updatedRoute);


// --- Product Actions (Server-safe) ---
export { getProducts_server };

// --- Product Service (Client-safe) ---
export const getProducts = () => productService.getProducts();

export const getProduct = (id: string) => productService.getProduct(id);
export const saveProduct = (productToSave: productService.Product) => productService.saveProduct(productToSave);
export const receiveStock = (productsToReceive: productService.PurchasedProduct[], orderId: string, warehouseId: number) => productService.receiveStock(productsToReceive, orderId, warehouseId);
export const sellStock = (productsToSell: productService.OrderProduct[], orderId: string, warehouseId: number) => productService.sellStock(productsToSell, orderId, warehouseId);
export const cancelStockSale = (productsToCancel: PurchaseProduct[], documentId: string, warehouseId: number) => productService.cancelStockSale(productsToCancel, documentId, warehouseId);
export const adjustStockForReturn = (returnedItems: { sku: string; returnQty: number; name: string }[], newSaleItems: { sku: string; qty: number; name: string }[], warehouseId: number) => productService.adjustStockForReturn(returnedItems, newSaleItems, warehouseId);
export const transferStock = (transfer: productService.StockTransfer) => productService.transferStock(transfer);
export const getAllTransfers = () => productService.getAllTransfers();
export const recalculateProductStock = (productId: string) => productService.recalculateProductStock(productId);


// --- Supplier Service ---
export const getSuppliers = (searchTerm?: string) => supplierService.getSuppliers(searchTerm);
export const getSupplier = (id: string) => supplierService.getSupplier(id);
export const saveSupplier = (supplierToSave: supplierService.Supplier) => supplierService.saveSupplier(supplierToSave);
export const getAllPurchaseOrders = () => supplierService.getAllPurchaseOrders();
export const getPurchaseOrder = (orderId: string) => supplierService.getPurchaseOrder(orderId);
export const updatePurchaseOrder = (supplierId: string, updatedOrder: supplierService.PurchaseOrder) => supplierService.updatePurchaseOrder(supplierId, updatedOrder);
export const savePurchaseOrder = (supplierId: string, order: supplierService.PurchaseOrder) => supplierService.savePurchaseOrder(supplierId, order);
export const registerBulkSupplierPayment = (supplierId: string, totalPayment: number, paymentMethod: string, documentNumber?: string) => supplierService.registerBulkSupplierPayment(supplierId, totalPayment, paymentMethod, documentNumber);

// --- User Service ---
export const getUsers = () => userService.getUsers();
export const getUser = (id: string) => userService.getUser(id);
export const saveUser = (userToSave: userService.User) => userService.saveUser(userToSave);
export const deleteUser = (userId: string) => userService.deleteUser(userId);

// --- Auth Service ---
export const hasPermission = (role: authService.UserRole, permission: authService.Permission) => authService.hasPermission(role, permission);
export const getPermissionsForRole = (role: authService.UserRole) => authService.getPermissionsForRole(role);


// --- ID Generation ---
export async function generateNewCustomerId(): Promise<string> {
    const customers = await getCustomers();
    if (customers.length === 0) return "1";
    const maxId = Math.max(...customers.map(c => parseInt(c.id, 10)).filter(id => !isNaN(id)));
    return (maxId + 1).toString();
}

export async function generateNewOrderId(): Promise<string> {
    const allOrders = await getAllOrders();
    if (allOrders.length === 0) return "PED-001";
    const maxId = allOrders.reduce((max, order) => {
        const match = order.id.match(/PED-(\d+)/);
        const num = match ? parseInt(match[1], 10) : 0;
        return num > max ? num : max;
    }, 0);
    return `PED-${(maxId + 1).toString().padStart(3, '0')}`;
}

export async function generateNewQuoteId(): Promise<string> {
    const allQuotes = await getAllQuotes();
    if (allQuotes.length === 0) return "PRE-001";
    const maxId = allQuotes.reduce((max, quote) => {
        const match = quote.id.match(/PRE-(\d+)/);
        const num = match ? parseInt(match[1], 10) : 0;
        return num > max ? num : max;
    }, 0);
    return `PRE-${(maxId + 1).toString().padStart(3, '0')}`;
}

export async function generateNewInvoiceId(terminalId?: string): Promise<string> {
    const settings = await getSettings();
    let seriesConfig;

    if (terminalId) {
        const terminal = settings.posTerminals.find(t => t.id.toString() === terminalId);
        if (terminal) {
            seriesConfig = settings.documentSeries.find(s => s.series === terminal.invoiceSeries);
        }
    }
    
    // Fallback to the first available invoice series if no specific one is found
    if (!seriesConfig) {
        seriesConfig = settings.documentSeries.find(s => s.documentType === 'Factura');
    }

    if (!seriesConfig) {
        // Fallback if no series is configured at all
        const allInvoices = await getAllInvoices();
        const maxId = allInvoices.reduce((max, invoice) => {
            const match = invoice.invoice.match(/TPV-(\d+)/);
            return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }, 0);
        return `TPV-${(maxId + 1).toString().padStart(3, '0')}`;
    }
    
    const newNumber = seriesConfig.currentNumber + 1;
    const newInvoiceId = `${seriesConfig.series}-${newNumber.toString().padStart(3, '0')}`;
    
    // IMPORTANT: Update the series number in settings
    seriesConfig.currentNumber = newNumber;
    await saveDocumentSeries(settings.documentSeries);

    return newInvoiceId;
}


export async function generateNewDiscountVoucherId(): Promise<string> {
    const customers = await getCustomers();
    const allVouchers = customers.flatMap(c => c.vouchers || []);
    if (allVouchers.length === 0) return "VALE-001";
    const maxId = allVouchers.reduce((max, voucher) => {
        const match = voucher.id.match(/VALE-(\d+)/);
        const num = match ? parseInt(match[1], 10) : 0;
        return num > max ? num : max;
    }, 0);
    return `VALE-${(maxId + 1).toString().padStart(3, '0')}`;
}

export async function generateNewSupplierId(): Promise<string> {
    const suppliers = await getSuppliers();
    if (suppliers.length === 0) return "1";
    const maxId = Math.max(...suppliers.map(s => parseInt(s.id, 10)).filter(id => !isNaN(id)));
    return (maxId + 1).toString();
}

export async function generateNewPurchaseOrderId(): Promise<string> {
    const allOrders = await getAllPurchaseOrders();
    if (allOrders.length === 0) return "OC-001";
    const maxId = allOrders.reduce((max, order) => {
        const match = order.order.match(/OC-(\d+)/);
        const num = match ? parseInt(match[1], 10) : 0;
        return num > max ? num : max;
    }, 0);
    return `OC-${(maxId + 1).toString().padStart(3, '0')}`;
}

export async function generateNewProductId(): Promise<string> {
    const products = await getProducts();
    if (products.length === 0) return "1";
    const maxId = Math.max(...products.map(p => parseInt(p.id, 10)).filter(id => !isNaN(id)));
    return (maxId + 1).toString();
}

export async function generateNewDeliveryRouteId(): Promise<string> {
    const routes = await getDeliveryRoutes();
    if (routes.length === 0) return "RUTA-001";
    const maxId = routes.reduce((max, route) => {
        const match = route.id.match(/RUTA-(\d+)/);
        const num = match ? parseInt(match[1], 10) : 0;
        return num > max ? num : max;
    }, 0);
    return `RUTA-${(maxId + 1).toString().padStart(3, '0')}`;
}

export async function generateNewTransferId(): Promise<string> {
    const transfers = await getAllTransfers();
    if (transfers.length === 0) return "VALE-001";
    const maxId = transfers.reduce((max, transfer) => {
        const match = transfer.id.match(/VALE-(\d+)/);
        const num = match ? parseInt(match[1], 10) : 0;
        return num > max ? num : max;
    }, 0);
    return `VALE-${(maxId + 1).toString().padStart(3, '0')}`;
}

export async function generateNewRepairOrderId(): Promise<string> {
    const orders = await getAllRepairOrders();
    if(orders.length === 0) return "REP-001";
    const maxId = orders.reduce((max, order) => {
        const match = order.id.match(/REP-(\d+)/);
        const num = match ? parseInt(match[1], 10) : 0;
        return num > max ? num : max;
    }, 0);
    return `REP-${(maxId + 1).toString().padStart(3, '0')}`;
}



// --- Parked Sale, Cash Register & Closures ---
import type { OrderProduct } from './data';

const PARKED_SALES_COLLECTION = 'parked_sales';

export interface ParkedSale {
  id: string;
  timestamp: any;
  customerId: string;
  customerName: string;
  salespersonName: string;
  terminalId: string;
  cart: OrderProduct[];
  total: number;
}

export type Movement = {
  id: number;
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

// In-memory data stores for these services
let memoryParkedSales: ParkedSale[] = [];
let memoryMovements: Movement[] = [
    { id: 1, fecha: "2024-07-26 09:00", tipo: "Venta", concepto: "Venta TPV - Factura TPV-001 a Cliente General", ingreso: 150.00, egreso: 0, branchId: "1", terminalId: "1", paymentMethod: "Efectivo" },
    { id: 2, fecha: "2024-07-26 09:30", tipo: "Venta", concepto: "Venta TPV - Factura TPV-002 a Constructora GIGA", ingreso: 2500.00, egreso: 0, branchId: "2", terminalId: "3", paymentMethod: "Tarjeta de Crédito" },
    { id: 3, fecha: "2024-07-26 10:15", tipo: "Gasto", concepto: "Pago a proveedor de limpieza", ingreso: 0, egreso: 100.00, branchId: "1", terminalId: "1" },
    { id: 4, fecha: "2024-07-26 11:00", tipo: "Pago Factura", concepto: "Cobro Factura FACA-1198 a Constructora GIGA", ingreso: 85950.00, egreso: 0, branchId: "1", terminalId: "1", paymentMethod: "Transferencia Bancaria" },
];
let memoryClosures: Closure[] = [];

// Functions
export async function getParkedSales(salespersonName?: string): Promise<ParkedSale[]> {
  let sales = JSON.parse(JSON.stringify(memoryParkedSales));
  if (salespersonName) {
      sales = sales.filter((s: ParkedSale) => s.salespersonName === salespersonName);
  }
  return sales.sort((a,b) => b.timestamp - a.timestamp);
}

export async function saveParkedSale(sale: Omit<ParkedSale, 'id' | 'timestamp'>): Promise<string> {
    const newSale: ParkedSale = {
        ...sale,
        id: `parked-${Date.now()}`,
        timestamp: Date.now(),
    };
    memoryParkedSales.push(newSale);
    return newSale.id;
}

export async function deleteParkedSale(id: string): Promise<void> {
    memoryParkedSales = memoryParkedSales.filter(s => s.id !== id);
}

export async function getCashRegisterMovements(): Promise<Movement[]> {
    return JSON.parse(JSON.stringify(memoryMovements));
}

export async function addCashRegisterMovement(movement: Movement): Promise<void> {
    memoryMovements.push(movement);
    memoryMovements.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export async function getClosures(): Promise<Closure[]> {
  return JSON.parse(JSON.stringify(memoryClosures)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function saveClosure(closure: Closure): Promise<void> {
    const index = memoryClosures.findIndex(c => c.id === closure.id);
    if (index !== -1) {
        memoryClosures[index] = closure;
    } else {
        memoryClosures.push(closure);
    }
}


// Re-export types
export type * from './customer-service';
export type * from './settings-service';
export type * from './delivery-service';
export type * from './product-service';
export type * from './supplier-service';
export type { DiscountVoucher } from './data';
