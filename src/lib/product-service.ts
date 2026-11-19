

'use client';

import { type Product, initialProducts } from './product-data';
import type { PurchasedProduct } from './supplier-data';
import type { OrderProduct, PurchaseProduct } from './data';
import { getWarehouses } from './settings-service';
import { getAllReservations } from './customer-service';

const PRODUCTS_COLLECTION = 'products';
const HISTORY_SUBCOLLECTION = 'history';
const TRANSFERS_COLLECTION = 'transfers';


export interface StockTransferItem {
    sku: string;
    name: string;
    quantity: number;
}

export interface StockTransfer {
    id: string; // VALE-001
    date: string;
    originWarehouseId: string;
    destinationWarehouseId: string;
    items: StockTransferItem[];
    status: 'Completado' | 'Pendiente' | 'Cancelado';
    notes?: string;
}

// --- IN-MEMORY DATA STORE ---
let memoryProducts: Product[] = JSON.parse(JSON.stringify(initialProducts));
let memoryTransfers: StockTransfer[] = [];


export async function getProducts_server(): Promise<Product[]> {
    // This is the server-safe version that doesn't calculate reserved stock.
    return JSON.parse(JSON.stringify(memoryProducts));
}


export async function getProducts(): Promise<Product[]> {
    const allActiveReservations = await getAllReservations();
    const productsWithReservedStock = JSON.parse(JSON.stringify(memoryProducts));

    productsWithReservedStock.forEach((product: Product) => {
        const productSKU = product.codes.find(c => c.type === 'SKU')?.value;
        if (!productSKU) return;

        const reservedQty = allActiveReservations
            .filter(r => ['Pendiente', 'Listo para Recoger', 'Esperando Surtido'].includes(r.status))
            .flatMap(r => r.products)
            .filter(p => p.sku === productSKU)
            .reduce((sum, p) => sum + p.qty, 0);
        
        product.reservedStock = reservedQty;
    });

    return productsWithReservedStock;
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const product = memoryProducts.find(p => p.id === id);
  if(!product) return undefined;

  const allActiveReservations = await getAllReservations();
  const productSKU = product.codes.find(c => c.type === 'SKU')?.value;
  let reservedQty = 0;
  
  if (productSKU) {
      reservedQty = allActiveReservations
          .filter(r => ['Pendiente', 'Listo para Recoger', 'Esperando Surtido'].includes(r.status))
          .flatMap(r => r.products)
          .filter(p => p.sku === productSKU)
          .reduce((sum, p) => sum + p.qty, 0);
  }

  const productWithReservation = JSON.parse(JSON.stringify(product));
  productWithReservation.reservedStock = reservedQty;
  
  return productWithReservation;
}

export async function saveProduct(productToSave: Product): Promise<void> {
    const { reservedStock, ...productCoreData } = productToSave;
    const index = memoryProducts.findIndex(p => p.id === productCoreData.id);
    if (index !== -1) {
        memoryProducts[index] = JSON.parse(JSON.stringify(productCoreData));
    } else {
        memoryProducts.push(JSON.parse(JSON.stringify(productCoreData)));
    }
}

export async function receiveStock(productsToReceive: PurchasedProduct[], orderId: string, warehouseId: number): Promise<void> {
    const warehouses = await getWarehouses();
    const warehouseInfo = warehouses.find(w => w.id === warehouseId);
    if (!warehouseInfo) {
        console.error(`Warehouse with ID ${warehouseId} not found.`);
        return;
    }

    for (const receivedProduct of productsToReceive) {
        const productIndex = memoryProducts.findIndex(p => p.codes.some(c => c.value === receivedProduct.sku));
        
        if (productIndex !== -1 && !memoryProducts[productIndex].isService) {
            const productInStock = memoryProducts[productIndex];
            const stockIndex = productInStock.stock.findIndex(s => s.warehouseId === warehouseId);

            if (stockIndex > -1) {
                productInStock.stock[stockIndex].quantity += receivedProduct.qty;
            } else {
                productInStock.stock.push({
                    warehouseId: warehouseId,
                    warehouseName: warehouseInfo.name,
                    quantity: receivedProduct.qty,
                });
            }
            
            productInStock.history.push({
                date: new Date().toISOString().split('T')[0],
                type: 'Compra',
                document: `Recepción ${orderId}`,
                quantity: +receivedProduct.qty,
                price: receivedProduct.cost,
            });
            await saveProduct(productInStock);
        }
    }
}

export async function sellStock(productsToSell: OrderProduct[] | PurchaseProduct[], documentId: string, warehouseId: number): Promise<void> {
    for (const soldProduct of productsToSell) {
       const productIndex = memoryProducts.findIndex(p => p.codes.some(c => c.value === soldProduct.sku));

        if (productIndex !== -1 && !memoryProducts[productIndex].isService) {
            const productInStock = memoryProducts[productIndex];
            const stockIndex = productInStock.stock.findIndex(s => s.warehouseId === warehouseId);

            if (stockIndex > -1) {
                productInStock.stock[stockIndex].quantity -= soldProduct.qty;
            }

            productInStock.history.push({
                date: new Date().toISOString().split('T')[0],
                type: 'Venta',
                document: `Venta ${documentId}`,
                quantity: -soldProduct.qty,
                price: soldProduct.price,
            });
            await saveProduct(productInStock);
        }
    }
}

export async function cancelStockSale(productsToCancel: PurchaseProduct[], documentId: string, warehouseId: number): Promise<void> {
    for (const canceledProduct of productsToCancel) {
       const productIndex = memoryProducts.findIndex(p => p.codes.some(c => c.value === canceledProduct.sku));

        if (productIndex !== -1 && !memoryProducts[productIndex].isService) {
            const productInStock = memoryProducts[productIndex];
            const stockIndex = productInStock.stock.findIndex(s => s.warehouseId === warehouseId);

            // Return stock to the warehouse
            if (stockIndex > -1) {
                productInStock.stock[stockIndex].quantity += canceledProduct.qty;
            }

            // Add a history event for the adjustment
            productInStock.history.push({
                date: new Date().toISOString().split('T')[0],
                type: 'Ajuste',
                document: `Anulación Factura ${documentId}`,
                quantity: +canceledProduct.qty, // Positive quantity for return
                price: canceledProduct.price,
            });
            await saveProduct(productInStock);
        }
    }
}

export async function adjustStockForReturn(
    returnedItems: { sku: string; returnQty: number; name: string }[],
    newSaleItems: { sku: string; qty: number; name: string }[],
    warehouseId: number
): Promise<void> {
    for (const item of returnedItems) {
        const productIndex = memoryProducts.findIndex(p => p.codes.some(c => c.value === item.sku));
        if (productIndex !== -1 && !memoryProducts[productIndex].isService) {
            const product = memoryProducts[productIndex];
            const stockIndex = product.stock.findIndex(s => s.warehouseId === warehouseId);
            if (stockIndex > -1) {
                product.stock[stockIndex].quantity += item.returnQty;
            }
            product.history.push({ date: new Date().toISOString().split('T')[0], type: 'Ajuste', document: 'Devolución de Cliente', quantity: item.returnQty, price: 0 });
            await saveProduct(product);
        }
    }

    for (const item of newSaleItems) {
        const productIndex = memoryProducts.findIndex(p => p.codes.some(c => c.value === item.sku));
        if (productIndex !== -1 && !memoryProducts[productIndex].isService) {
            const product = memoryProducts[productIndex];
            const stockIndex = product.stock.findIndex(s => s.warehouseId === warehouseId);
            if (stockIndex > -1) {
                product.stock[stockIndex].quantity -= item.qty;
            }
            product.history.push({ date: new Date().toISOString().split('T')[0], type: 'Ajuste', document: 'Venta por Cambio', quantity: -item.qty, price: 0 });
            await saveProduct(product);
        }
    }
}


export async function transferStock(transfer: StockTransfer): Promise<void> {
    const warehouses = await getWarehouses();
    for (const item of transfer.items) {
        const productIndex = memoryProducts.findIndex(p => p.codes.some(c => c.value === item.sku));

        if (productIndex !== -1) {
            const productData = memoryProducts[productIndex];
            const originStockIndex = productData.stock.findIndex(s => s.warehouseId.toString() === transfer.originWarehouseId);
            const destStockIndex = productData.stock.findIndex(s => s.warehouseId.toString() === transfer.destinationWarehouseId);

            if (originStockIndex === -1 || productData.stock[originStockIndex].quantity < item.quantity) {
                throw new Error(`Stock insuficiente para ${item.name} en el almacén de origen.`);
            }

            productData.stock[originStockIndex].quantity -= item.quantity;
            
            if (destStockIndex > -1) {
                productData.stock[destStockIndex].quantity += item.quantity;
            } else {
                 const destWarehouse = warehouses.find(w => w.id.toString() === transfer.destinationWarehouseId);
                 if (destWarehouse) {
                    productData.stock.push({ warehouseId: destWarehouse.id, warehouseName: destWarehouse.name, quantity: item.quantity });
                 }
            }
            
            productData.history.push(
                {
                    date: new Date().toISOString().split('T')[0],
                    type: 'Ajuste',
                    document: `Salida Traslado ${transfer.id} a ${warehouses.find(w=>w.id.toString() === transfer.destinationWarehouseId)?.name}`,
                    quantity: -item.quantity,
                    price: 0,
                },
                {
                    date: new Date().toISOString().split('T')[0],
                    type: 'Ajuste',
                    document: `Entrada Traslado ${transfer.id} de ${warehouses.find(w=>w.id.toString() === transfer.originWarehouseId)?.name}`,
                    quantity: +item.quantity,
                    price: 0,
                }
            );
            await saveProduct(productData);
        }
    }
    
    memoryTransfers.push(transfer);
}

export async function getAllTransfers(): Promise<StockTransfer[]> {
    return JSON.parse(JSON.stringify(memoryTransfers)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function recalculateProductStock(productId: string): Promise<Record<number, number>> {
    const product = await getProduct(productId);
    if (!product) {
        throw new Error("Product not found");
    }

    const stockPerWarehouse: Record<number, number> = {};
    const warehouses = await getWarehouses();

    for (const historyEvent of product.history) {
        let warehouseId = 1; // Default to central warehouse

        if (historyEvent.document.includes('Recepción OC')) {
            // Need a way to link OC to warehouse, assuming default 1 for now
        } else if (historyEvent.document.includes('Venta') || historyEvent.document.includes('Anulación')) {
            // Need a way to link invoice to warehouse, assuming default 1 for now
        } else if (historyEvent.document.includes('Traslado')) {
             const destMatch = historyEvent.document.match(/a (.*)$/);
             const originMatch = historyEvent.document.match(/de (.*)$/);
             
             if (historyEvent.type === 'Ajuste' && historyEvent.quantity > 0 && destMatch) { // Entrada
                const destWarehouse = warehouses.find(w => w.name === destMatch[1]);
                if (destWarehouse) warehouseId = destWarehouse.id;
             } else if (historyEvent.type === 'Ajuste' && historyEvent.quantity < 0 && originMatch) { // Salida
                 const originWarehouse = warehouses.find(w => w.name === originMatch[1]);
                 if (originWarehouse) warehouseId = originWarehouse.id;
             }
        }
        
        if (!stockPerWarehouse[warehouseId]) {
            stockPerWarehouse[warehouseId] = 0;
        }
        stockPerWarehouse[warehouseId] += historyEvent.quantity;
    }

    return stockPerWarehouse;
}
