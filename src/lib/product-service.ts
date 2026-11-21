

'use client';

import { type Product, initialProducts } from './product-data';
import type { PurchasedProduct } from './supplier-data';
import type { OrderProduct, PurchaseProduct } from './data';
import { getWarehouses } from './settings-service';
import { getAllReservations } from './customer-service';
import { loadStore, saveStore } from './local-store';
import { formatLocalDate } from './date-utils';



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

// --- IN-MEMORY DATA STORE (persistido en localStorage) ---
const PRODUCTS_KEY = 'products';
const TRANSFERS_KEY = 'transfers';
let memoryProducts: Product[] = loadStore<Product[]>(PRODUCTS_KEY, initialProducts);
let memoryTransfers: StockTransfer[] = loadStore<StockTransfer[]>(TRANSFERS_KEY, []);

const persistProducts = () => saveStore(PRODUCTS_KEY, memoryProducts);
const persistTransfers = () => saveStore(TRANSFERS_KEY, memoryTransfers);

const ACTIVE_RESERVATION_STATUSES = ['Pendiente', 'Listo para Recoger', 'Esperando Surtido'];

function findProductIndexBySku(sku: string): number {
    // Primero por SKU exacto; si no, por cualquier código (EAN, UPC...)
    const bySku = memoryProducts.findIndex(p => p.codes.some(c => c.type === 'SKU' && c.value === sku));
    if (bySku !== -1) return bySku;
    return memoryProducts.findIndex(p => p.codes.some(c => c.value === sku));
}

/**
 * Suma `delta` al stock del almacén indicado. Si el producto no tenía registro
 * para ese almacén, se crea (aunque el resultado sea negativo) para que el
 * inventario y el historial nunca queden desincronizados.
 */
async function applyStockDelta(product: Product, warehouseId: number, delta: number): Promise<void> {
    const stockEntry = product.stock.find(s => s.warehouseId === warehouseId);
    if (stockEntry) {
        stockEntry.quantity += delta;
        return;
    }
    const warehouses = await getWarehouses();
    const warehouse = warehouses.find(w => w.id === warehouseId);
    product.stock.push({
        warehouseId,
        warehouseName: warehouse?.name ?? `Almacén ${warehouseId}`,
        quantity: delta,
    });
}

function computeReservedQty(sku: string | undefined, reservations: { status: string; products: { sku: string; qty: number }[] }[]): number {
    if (!sku) return 0;
    return reservations
        .filter(r => ACTIVE_RESERVATION_STATUSES.includes(r.status))
        .flatMap(r => r.products)
        .filter(p => p.sku === sku)
        .reduce((sum, p) => sum + p.qty, 0);
}


export async function getProducts_server(): Promise<Product[]> {
    // This is the server-safe version that doesn't calculate reserved stock.
    return JSON.parse(JSON.stringify(memoryProducts));
}


export async function getProducts(searchTerm?: string): Promise<Product[]> {
    try {
        const url = typeof window !== 'undefined' 
            ? `/api/products?search=${encodeURIComponent(searchTerm || '')}&limit=100` 
            : `http://localhost:9002/api/products?search=${encodeURIComponent(searchTerm || '')}&limit=100`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                return data.items;
            }
        }
    } catch {
        // En caso de fallo de red, fallback a memoria local
    }

    const allActiveReservations = await getAllReservations();
    const productsWithReservedStock: Product[] = JSON.parse(JSON.stringify(memoryProducts));

    productsWithReservedStock.forEach(product => {
        const productSKU = product.codes.find(c => c.type === 'SKU')?.value;
        product.reservedStock = computeReservedQty(productSKU, allActiveReservations);
    });

    return productsWithReservedStock;
}

export async function getProduct(id: string): Promise<Product | undefined> {
  try {
    const url = typeof window !== 'undefined'
      ? `/api/products/${encodeURIComponent(id)}`
      : `http://localhost:9002/api/products/${encodeURIComponent(id)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data: Product = await res.json();
      return data;
    }
  } catch {
    // Fallback a memoria local si falla la red
  }

  const product = memoryProducts.find(p => p.id === id);
  if(!product) return undefined;

  const allActiveReservations = await getAllReservations();
  const productSKU = product.codes.find(c => c.type === 'SKU')?.value;

  const productWithReservation: Product = JSON.parse(JSON.stringify(product));
  productWithReservation.reservedStock = computeReservedQty(productSKU, allActiveReservations);
  
  return productWithReservation;
}

export async function saveProduct(productToSave: Product): Promise<void> {
  try {
    const url = typeof window !== 'undefined'
      ? `/api/products/${encodeURIComponent(productToSave.id)}`
      : `http://localhost:9002/api/products/${encodeURIComponent(productToSave.id)}`;
    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productToSave),
    });
  } catch {
    // Fallback
  }

  const { reservedStock, ...productCoreData } = productToSave;
  const index = memoryProducts.findIndex(p => p.id === productCoreData.id);
  if (index !== -1) {
    memoryProducts[index] = JSON.parse(JSON.stringify(productCoreData));
  } else {
    memoryProducts.push(JSON.parse(JSON.stringify(productCoreData)));
  }
  persistProducts();
}

export async function receiveStock(productsToReceive: PurchasedProduct[], orderId: string, warehouseId: number): Promise<void> {
    const warehouses = await getWarehouses();
    const warehouseInfo = warehouses.find(w => w.id === warehouseId);
    if (!warehouseInfo) {
        throw new Error(`No existe el almacén con ID ${warehouseId}.`);
    }

    for (const receivedProduct of productsToReceive) {
        if (!(receivedProduct.qty > 0)) continue;
        const productIndex = findProductIndexBySku(receivedProduct.sku);
        
        if (productIndex !== -1 && !memoryProducts[productIndex].isService) {
            const productInStock = memoryProducts[productIndex];
            await applyStockDelta(productInStock, warehouseId, receivedProduct.qty);
            
            productInStock.history.push({
                date: formatLocalDate(),
                type: 'Compra',
                document: `Recepción ${orderId}`,
                quantity: +receivedProduct.qty,
                price: receivedProduct.cost,
                warehouseId,
            });
            await saveProduct(productInStock);
        }
    }
}

export async function sellStock(productsToSell: OrderProduct[] | PurchaseProduct[], documentId: string, warehouseId: number): Promise<void> {
    for (const soldProduct of productsToSell) {
        if (!(soldProduct.qty > 0)) continue;
        const productIndex = findProductIndexBySku(soldProduct.sku);

        if (productIndex !== -1 && !memoryProducts[productIndex].isService) {
            const productInStock = memoryProducts[productIndex];
            await applyStockDelta(productInStock, warehouseId, -soldProduct.qty);

            productInStock.history.push({
                date: formatLocalDate(),
                type: 'Venta',
                document: `Venta ${documentId}`,
                quantity: -soldProduct.qty,
                price: soldProduct.price,
                warehouseId,
            });
            await saveProduct(productInStock);
        }
    }
}

export async function cancelStockSale(productsToCancel: PurchaseProduct[], documentId: string, warehouseId: number): Promise<void> {
    for (const canceledProduct of productsToCancel) {
        if (!(canceledProduct.qty > 0)) continue;
        const productIndex = findProductIndexBySku(canceledProduct.sku);

        if (productIndex !== -1 && !memoryProducts[productIndex].isService) {
            const productInStock = memoryProducts[productIndex];
            // Return stock to the warehouse
            await applyStockDelta(productInStock, warehouseId, canceledProduct.qty);

            productInStock.history.push({
                date: formatLocalDate(),
                type: 'Ajuste',
                document: `Anulación Factura ${documentId}`,
                quantity: +canceledProduct.qty, // Positive quantity for return
                price: canceledProduct.price,
                warehouseId,
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
        if (!(item.returnQty > 0)) continue;
        const productIndex = findProductIndexBySku(item.sku);
        if (productIndex !== -1 && !memoryProducts[productIndex].isService) {
            const product = memoryProducts[productIndex];
            await applyStockDelta(product, warehouseId, item.returnQty);
            product.history.push({ date: formatLocalDate(), type: 'Ajuste', document: 'Devolución de Cliente', quantity: item.returnQty, price: 0, warehouseId });
            await saveProduct(product);
        }
    }

    for (const item of newSaleItems) {
        if (!(item.qty > 0)) continue;
        const productIndex = findProductIndexBySku(item.sku);
        if (productIndex !== -1 && !memoryProducts[productIndex].isService) {
            const product = memoryProducts[productIndex];
            await applyStockDelta(product, warehouseId, -item.qty);
            product.history.push({ date: formatLocalDate(), type: 'Ajuste', document: 'Venta por Cambio', quantity: -item.qty, price: 0, warehouseId });
            await saveProduct(product);
        }
    }
}


export async function transferStock(transfer: StockTransfer): Promise<void> {
    if (transfer.originWarehouseId === transfer.destinationWarehouseId) {
        throw new Error('El almacén de origen y el de destino no pueden ser el mismo.');
    }
    if (transfer.items.length === 0) {
        throw new Error('El traslado no contiene productos.');
    }
    const warehouses = await getWarehouses();
    const originWarehouse = warehouses.find(w => w.id.toString() === transfer.originWarehouseId);
    const destWarehouse = warehouses.find(w => w.id.toString() === transfer.destinationWarehouseId);
    if (!originWarehouse || !destWarehouse) {
        throw new Error('Almacén de origen o destino no válido.');
    }

    // 1) Validar TODO antes de modificar nada (evita traslados a medias)
    const requiredBySku = new Map<string, number>();
    for (const item of transfer.items) {
        if (!(item.quantity > 0)) throw new Error(`Cantidad inválida para ${item.name}.`);
        requiredBySku.set(item.sku, (requiredBySku.get(item.sku) || 0) + item.quantity);
    }
    for (const [sku, required] of requiredBySku) {
        const productIndex = findProductIndexBySku(sku);
        if (productIndex === -1) throw new Error(`No se encontró el producto con código ${sku}.`);
        const product = memoryProducts[productIndex];
        if (product.isService) throw new Error(`"${product.name}" es un servicio y no tiene inventario.`);
        const available = product.stock.find(s => s.warehouseId === originWarehouse.id)?.quantity ?? 0;
        if (available < required) {
            throw new Error(`Stock insuficiente para ${product.name} en ${originWarehouse.name} (disponible: ${available}, solicitado: ${required}).`);
        }
    }

    // 2) Aplicar
    const today = formatLocalDate();
    for (const item of transfer.items) {
        const productData = memoryProducts[findProductIndexBySku(item.sku)];
        await applyStockDelta(productData, originWarehouse.id, -item.quantity);
        await applyStockDelta(productData, destWarehouse.id, item.quantity);
        productData.history.push(
            {
                date: today,
                type: 'Ajuste',
                document: `Salida Traslado ${transfer.id} a ${destWarehouse.name}`,
                quantity: -item.quantity,
                price: 0,
                warehouseId: originWarehouse.id,
            },
            {
                date: today,
                type: 'Ajuste',
                document: `Entrada Traslado ${transfer.id} de ${originWarehouse.name}`,
                quantity: +item.quantity,
                price: 0,
                warehouseId: destWarehouse.id,
            }
        );
        await saveProduct(productData);
    }
    
    memoryTransfers.push(JSON.parse(JSON.stringify(transfer)));
    persistTransfers();
}

export async function getAllTransfers(): Promise<StockTransfer[]> {
    const transfers: StockTransfer[] = JSON.parse(JSON.stringify(memoryTransfers));
    return transfers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Recalcula el stock por almacén a partir del historial de movimientos.
 * Usa el `warehouseId` registrado en cada evento; para eventos antiguos sin
 * almacén intenta deducirlo del texto del documento de traslado y, si no,
 * asume el almacén 1 (Central).
 */
export async function recalculateProductStock(productId: string): Promise<Record<number, number>> {
    const product = await getProduct(productId);
    if (!product) {
        throw new Error("Product not found");
    }

    const stockPerWarehouse: Record<number, number> = {};
    const warehouses = await getWarehouses();
    const DEFAULT_WAREHOUSE = 1;

    for (const historyEvent of product.history) {
        let warehouseId = historyEvent.warehouseId ?? DEFAULT_WAREHOUSE;

        if (historyEvent.warehouseId === undefined) {
            // "Salida Traslado X a <destino>" → sale del ORIGEN (desconocido en el texto)
            // "Entrada Traslado X de <origen>" → entra en el DESTINO (desconocido en el texto)
            // Sin warehouseId no se puede saber con certeza; se intenta con el par opuesto.
            const salida = historyEvent.document.match(/^Salida Traslado \S+ a (.+)$/);
            const entrada = historyEvent.document.match(/^Entrada Traslado \S+ de (.+)$/);
            if (salida) {
                const dest = warehouses.find(w => w.name === salida[1]);
                const other = warehouses.find(w => w.id !== dest?.id);
                if (other) warehouseId = other.id;
            } else if (entrada) {
                const origin = warehouses.find(w => w.name === entrada[1]);
                const other = warehouses.find(w => w.id !== origin?.id);
                if (other) warehouseId = other.id;
            }
        }
        
        stockPerWarehouse[warehouseId] = (stockPerWarehouse[warehouseId] || 0) + historyEvent.quantity;
    }

    return stockPerWarehouse;
}
