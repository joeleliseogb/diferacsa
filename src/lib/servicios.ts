'use client';

// Este archivo actúa como un "barrel" para todos los servicios de datos.
// Todos los componentes que necesiten acceder a los datos deben importar
// las funciones (y los tipos) desde este archivo.

import * as customerService from './customer-service';
import * as settingsService from './settings-service';
import * as deliveryService from './delivery-service';
import * as productService from './product-service';
import * as supplierService from './supplier-service';
import * as authService from './auth-service';
import * as userService from './user-service';
import { getProducts_server } from './product-actions';
import type { Customer, Purchase, PurchaseProduct, DiscountVoucher, Order, OrderProduct, Quote, Reservation, RepairOrder } from './data';
import type { Product } from './product-data';
import type { Supplier, PurchaseOrder, PurchasedProduct } from './supplier-data';
import type { UserRole, User } from './user-service';

// --- Customer Service ---
export const getCustomers = (searchTerm?: string) => customerService.getCustomers(searchTerm);
export const getCustomer = (id: string) => customerService.getCustomer(id);
export const saveCustomer = (customerToSave: Customer) => customerService.saveCustomer(customerToSave);
export const addPurchaseToHistory = (customerId: string, purchase: Omit<Purchase, 'products'> & { products: PurchaseProduct[] }) => customerService.addPurchaseToHistory(customerId, purchase);
export const getAllOrders = () => customerService.getAllOrders();
export const getPendingDeliveryOrders = () => customerService.getPendingDeliveryOrders();
export const getOrder = (orderId: string) => customerService.getOrder(orderId);
export const updateOrder = (customerId: string, updatedOrder: Order) => customerService.updateOrder(customerId, updatedOrder);
export const saveOrder = (customerId: string, order: Order) => customerService.saveOrder(customerId, order);
export const getAllQuotes = () => customerService.getAllQuotes();
export const getQuote = (quoteId: string) => customerService.getQuote(quoteId);
export const updateQuote = (customerId: string, updatedQuote: Quote) => customerService.updateQuote(customerId, updatedQuote);
export const saveQuote = (customerId: string, quote: Quote) => customerService.saveQuote(customerId, quote);
export const getAllInvoices = () => customerService.getAllInvoices();
export const certifyInvoice = (customerId: string, invoiceId: string) => customerService.certifyInvoice(customerId, invoiceId);
export const cancelInvoice = (invoice: customerService.InvoiceWithCustomerAndBalance) => customerService.cancelInvoice(invoice);
export const registerPayment = (customerId: string, invoiceId: string, paymentAmount: number, paymentMethod: string, documentNumber?: string) => customerService.registerPayment(customerId, invoiceId, paymentAmount, paymentMethod, documentNumber);
export const registerBulkPayment = (customerId: string, totalPayment: number, paymentMethod: string, documentNumber?: string) => customerService.registerBulkPayment(customerId, totalPayment, paymentMethod, documentNumber);
export const addDiscountVoucherToCustomer = (customerId: string, voucher: DiscountVoucher) => customerService.addDiscountVoucherToCustomer(customerId, voucher);
export const getAllReservations = () => customerService.getAllReservations();
export const saveReservation = (customerId: string, reservationData: Omit<Reservation, 'id'> | Reservation) => customerService.saveReservation(customerId, reservationData);
export const getAllRepairOrders = () => customerService.getAllRepairOrders();
export const getRepairOrder = (id: string) => customerService.getRepairOrder(id);
export const saveRepairOrder = (orderData: RepairOrder) => customerService.saveRepairOrder(orderData);
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
export const getProducts = (searchTerm?: string, warehouseId?: string) => productService.getProducts(searchTerm, warehouseId);

export const getProduct = (id: string) => productService.getProduct(id);
export const saveProduct = (productToSave: Product) => productService.saveProduct(productToSave);
export const receiveStock = (productsToReceive: PurchasedProduct[], orderId: string, warehouseId: number) => productService.receiveStock(productsToReceive, orderId, warehouseId);
export const sellStock = (productsToSell: OrderProduct[] | PurchaseProduct[], orderId: string, warehouseId: number) => productService.sellStock(productsToSell, orderId, warehouseId);
export const cancelStockSale = (productsToCancel: PurchaseProduct[], documentId: string, warehouseId: number) => productService.cancelStockSale(productsToCancel, documentId, warehouseId);
export const adjustStockForReturn = (returnedItems: { sku: string; returnQty: number; name: string }[], newSaleItems: { sku: string; qty: number; name: string }[], warehouseId: number) => productService.adjustStockForReturn(returnedItems, newSaleItems, warehouseId);
export const transferStock = (transfer: productService.StockTransfer) => productService.transferStock(transfer);
export const getAllTransfers = () => productService.getAllTransfers();
export const recalculateProductStock = (productId: string) => productService.recalculateProductStock(productId);


// --- Supplier Service ---
export const getSuppliers = (searchTerm?: string) => supplierService.getSuppliers(searchTerm);
export const getSupplier = (id: string) => supplierService.getSupplier(id);
export const saveSupplier = (supplierToSave: Supplier) => supplierService.saveSupplier(supplierToSave);
export const getAllPurchaseOrders = () => supplierService.getAllPurchaseOrders();
export const getPurchaseOrder = (orderId: string) => supplierService.getPurchaseOrder(orderId);
export const updatePurchaseOrder = (supplierId: string, updatedOrder: PurchaseOrder) => supplierService.updatePurchaseOrder(supplierId, updatedOrder);
export const savePurchaseOrder = (supplierId: string, order: PurchaseOrder) => supplierService.savePurchaseOrder(supplierId, order);
export const registerBulkSupplierPayment = (supplierId: string, totalPayment: number, paymentMethod: string, documentNumber?: string) => supplierService.registerBulkSupplierPayment(supplierId, totalPayment, paymentMethod, documentNumber);

// --- User Service ---
export const getUsers = () => userService.getUsers();
export const getUser = (id: string) => userService.getUser(id);
export const saveUser = (userToSave: User) => userService.saveUser(userToSave);
export const deleteUser = (userId: string) => userService.deleteUser(userId);
export const authenticateUser = (emailOrName: string, passwordInput: string) => userService.authenticateUser(emailOrName, passwordInput);
export const authenticateWithPin = (userId: string, pinInput: string) => userService.authenticateWithPin(userId, pinInput);

// --- Auth Service ---
export const hasPermission = (role: UserRole, permission: authService.Permission) => authService.hasPermission(role, permission);
export const getPermissionsForRole = (role: UserRole) => authService.getPermissionsForRole(role);


// --- ID Generation ---
function nextNumericId(ids: string[]): string {
    const numeric = ids.map(id => parseInt(id, 10)).filter(n => !isNaN(n));
    const maxId = numeric.length > 0 ? Math.max(...numeric) : 0;
    return (maxId + 1).toString();
}

export async function generateNewCustomerId(): Promise<string> {
    const customers = await getCustomers();
    return nextNumericId(customers.map(c => c.id));
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
    return nextNumericId(suppliers.map(s => s.id));
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
    return nextNumericId(products.map(p => p.id));
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
    // Prefijo propio para no confundir traslados con vales de descuento (VALE-)
    if (transfers.length === 0) return "TRA-001";
    const maxId = transfers.reduce((max, transfer) => {
        const match = transfer.id.match(/(?:TRA|VALE)-(\d+)/);
        const num = match ? parseInt(match[1], 10) : 0;
        return num > max ? num : max;
    }, 0);
    return `TRA-${(maxId + 1).toString().padStart(3, '0')}`;
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
export {
    getParkedSales, saveParkedSale, deleteParkedSale,
    getCashRegisterMovements, addCashRegisterMovement,
    getClosures, saveClosure,
} from './cash-register-service';
export type { ParkedSale, Movement, Closure } from './cash-register-service';


// Re-export types
export type * from './data';
export type * from './product-data';
export type * from './supplier-data';
export type * from './customer-service';
export type * from './settings-service';
export type * from './delivery-service';
export type * from './product-service';
export type * from './supplier-service';
export type { UserRole, User } from './user-service';
export type { Permission } from './auth-service';
