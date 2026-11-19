// --- SERVER-SIDE ACTIONS for products ---
// This file does NOT use the 'use client' directive.
// These functions are safe to be called from Server Components and other server-side code.

import { type Product, initialProducts } from './product-data';

// --- IN-MEMORY DATA STORE (Mirrored from product-service) ---
// In a real DB scenario, this would connect to the database directly.
let memoryProducts: Product[] = JSON.parse(JSON.stringify(initialProducts));


/**
 * Server-safe function to get all products.
 * Does NOT calculate reserved stock, as that depends on client-side logic.
 * @returns A promise that resolves to an array of all products.
 */
export async function getProducts_server(): Promise<Product[]> {
    // This is the server-safe version that doesn't calculate reserved stock.
    // In a real app with a DB, this would be a direct DB query.
    return JSON.parse(JSON.stringify(memoryProducts));
}

/**
 * Server-safe function to save a product.
 * @param productToSave The product object to save.
 */
export async function saveProduct_server(productToSave: Product): Promise<void> {
    const { reservedStock, ...productCoreData } = productToSave;
    const index = memoryProducts.findIndex(p => p.id === productCoreData.id);
    if (index !== -1) {
        memoryProducts[index] = JSON.parse(JSON.stringify(productCoreData));
    } else {
        memoryProducts.push(JSON.parse(JSON.stringify(productCoreData)));
    }
}
