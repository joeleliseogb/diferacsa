

'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, DatabaseBackup, Download, Upload, Loader2, Sparkles, PackageSearch, ChevronsUpDown, FileJson, FileQuestion, UploadCloud } from "lucide-react";
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { getCustomers, getSuppliers, saveCustomer, saveSupplier, getProducts, getSettings, saveSettings, recalculateProductStock, saveProduct, type Product, type ProductStock, type Customer, type Supplier, getPriceTiers, saveProductFamilies, type ProductFamily, generateNewCustomerId, generateNewSupplierId, generateNewProductId, getDeliveryRoutes, saveDeliveryRoute, getAllTransfers, transferStock, getCashRegisterMovements, addCashRegisterMovement, getClosures, saveClosure, getParkedSales, saveParkedSale } from '@/lib/servicios';
import { getCustomer } from '@/lib/customer-service';
import { getSupplier } from '@/lib/supplier-service';
import { getProduct } from '@/lib/product-service';
import { formatJson } from '@/ai/flows/json-formatter-flow';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';


type TaskStatus = 'idle' | 'running' | 'success' | 'error';
type TaskLog = {
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
};

interface StockCalculationResult {
    warehouseId: number;
    warehouseName: string;
    currentStock: number;
    calculatedStock: number;
    difference: number;
}

type ImportDataType = 'customers' | 'suppliers' | 'products' | 'productFamilies';

export default function MaintenancePage() {
    const { toast } = useToast();
    const [repairStatus, setRepairStatus] = useState<TaskStatus>('idle');
    const [repairLogs, setRepairLogs] = useState<TaskLog[]>([]);
    const [repairProgress, setRepairProgress] = useState(0);

    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isProductPopoverOpen, setIsProductPopoverOpen] = useState(false);
    const [stockCalcStatus, setStockCalcStatus] = useState<TaskStatus>('idle');
    const [stockCalcResult, setStockCalcResult] = useState<StockCalculationResult[]>([]);

    const [importDataType, setImportDataType] = useState<ImportDataType>('customers');
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importStatus, setImportStatus] = useState<TaskStatus>('idle');
    const [importLogs, setImportLogs] = useState<TaskLog[]>([]);
    const [importProgress, setImportProgress] = useState(0);

    const [backupFile, setBackupFile] = useState<File | null>(null);
    const [restoreStatus, setRestoreStatus] = useState<TaskStatus>('idle');
    const [restoreLogs, setRestoreLogs] = useState<TaskLog[]>([]);

    const [sourceJsonFile, setSourceJsonFile] = useState<File | null>(null);
    const [templateJsonFile, setTemplateJsonFile] = useState<File | null>(null);
    const [formatterStatus, setFormatterStatus] = useState<TaskStatus>('idle');
    const [formattedJson, setFormattedJson] = useState<string | null>(null);


    useEffect(() => {
        async function loadProductsData() {
            setProducts(await getProducts());
        }
        loadProductsData();
    }, []);

    const recalculateBalancesAndCheckIntegrity = async () => {
        setRepairStatus('running');
        setRepairLogs([{ message: 'Iniciando verificación y reparación de datos...', type: 'info' }]);
        setRepairProgress(0);

        try {
            const allProductsData = await getProducts();
            const productSkuSet = new Set(allProductsData.flatMap(p => p.codes.map(c => c.value)));

            setRepairLogs(prev => [...prev, { message: 'Fase 1/3: Verificando Clientes...', type: 'info' }]);
            const customers = await getCustomers();
            for (let i = 0; i < customers.length; i++) {
                const customer = customers[i];
                if (customer.id === '0') continue; 

                for(const purchase of customer.purchaseHistory || []) {
                    for(const product of purchase.products) {
                        if(!productSkuSet.has(product.sku)) {
                             setRepairLogs(prev => [...prev, { message: `Alerta: Producto con SKU ${product.sku} en factura ${purchase.invoice} no existe en el inventario.`, type: 'warning' }]);
                        }
                    }
                }

                const totalPurchases = (customer.purchaseHistory || []).reduce((sum, p) => sum + (parseFloat(p.total.replace(/Q|,/g, '')) || 0), 0);
                const totalPayments = (customer.purchaseHistory || [])
                    .flatMap(p => p.payments || [])
                    .reduce((sum, payment) => sum + payment.amount, 0);
                
                const correctBalance = totalPurchases - totalPayments;
                const currentBalance = parseFloat(customer.currentBalance.replace(/Q|,/g, '')) || 0;

                if (Math.abs(correctBalance - currentBalance) > 0.01) {
                    setRepairLogs(prev => [...prev, { message: `Corrigiendo saldo de ${customer.name}: ${currentBalance.toFixed(2)} -> ${correctBalance.toFixed(2)}`, type: 'info' }]);
                    customer.currentBalance = `Q${correctBalance.toFixed(2)}`;
                    await saveCustomer(customer);
                }
                setRepairProgress(((i + 1) / customers.length) * 33);
            }
            setRepairLogs(prev => [...prev, { message: 'Saldos de clientes verificados y corregidos.', type: 'success' }]);

            setRepairLogs(prev => [...prev, { message: 'Fase 2/3: Verificando Proveedores...', type: 'info' }]);
            const suppliers = await getSuppliers();
            for (let i = 0; i < suppliers.length; i++) {
                const supplier = suppliers[i];

                for(const purchase of supplier.purchaseHistory || []) {
                    for(const product of purchase.products) {
                        if(!productSkuSet.has(product.sku)) {
                             setRepairLogs(prev => [...prev, { message: `Alerta: Producto con SKU ${product.sku} en orden de compra ${purchase.order} no existe en el inventario.`, type: 'warning' }]);
                        }
                    }
                }

                const totalOrders = (supplier.purchaseHistory || []).reduce((sum, o) => sum + (parseFloat(o.total.replace(/Q|,/g, '')) || 0), 0);
                const totalPayments = (supplier.purchaseHistory || [])
                    .flatMap(o => o.payments || [])
                    .reduce((sum, payment) => sum + payment.amount, 0);

                const correctBalance = totalOrders - totalPayments;
                const currentBalance = parseFloat(supplier.currentBalance.replace(/Q|,/g, '')) || 0;

                if (Math.abs(correctBalance - currentBalance) > 0.01) {
                    setRepairLogs(prev => [...prev, { message: `Corrigiendo saldo de proveedor ${supplier.name}: ${currentBalance.toFixed(2)} -> ${correctBalance.toFixed(2)}`, type: 'info' }]);
                    supplier.currentBalance = `Q${correctBalance.toFixed(2)}`;
                    await saveSupplier(supplier);
                }
                setRepairProgress(33 + ((i + 1) / suppliers.length) * 33);
            }
            setRepairLogs(prev => [...prev, { message: 'Saldos de proveedores verificados y corregidos.', type: 'success' }]);

            setRepairLogs(prev => [...prev, { message: 'Fase 3/3: Verificando Productos...', type: 'info' }]);
            const settings = await getSettings();
            const supplierIdSet = new Set(suppliers.map(s => s.id));
            const priceTierIdSet = new Set(settings.priceTiers.map(t => t.id));
            const warehouseIdSet = new Set(settings.warehouses.map(w => w.id));

            for (let i = 0; i < allProductsData.length; i++) {
                const product = allProductsData[i];
                (product.suppliers || []).forEach(s => {
                    if(!supplierIdSet.has(s.id)) {
                         setRepairLogs(prev => [...prev, { message: `Alerta en ${product.name}: Proveedor asignado con ID ${s.id} no existe.`, type: 'warning' }]);
                    }
                });
                 (product.prices || []).forEach(p => {
                    if(!priceTierIdSet.has(p.tierId)) {
                        setRepairLogs(prev => [...prev, { message: `Alerta en ${product.name}: Tarifa de precio asignada con ID ${p.tierId} no existe.`, type: 'warning' }]);
                    }
                });
                (product.stock || []).forEach(s => {
                    if(!warehouseIdSet.has(s.warehouseId)) {
                        setRepairLogs(prev => [...prev, { message: `Alerta en ${product.name}: Stock asignado a almacén con ID ${s.warehouseId} no existe.`, type: 'warning' }]);
                    }
                });
                 setRepairProgress(66 + ((i + 1) / allProductsData.length) * 34);
            }
             setRepairLogs(prev => [...prev, { message: 'Integridad de productos verificada.', type: 'success' }]);

            setRepairStatus('success');
            setRepairLogs(prev => [...prev, { message: '¡Mantenimiento completado exitosamente!', type: 'success' }]);
            toast({ title: 'Reparación completada', description: 'Los datos han sido verificados y actualizados.' });

        } catch (error) {
            console.error("Error during repair:", error);
            setRepairStatus('error');
            setRepairLogs(prev => [...prev, { message: 'Ocurrió un error inesperado durante la reparación.', type: 'error' }]);
            toast({ title: 'Error de Reparación', description: 'No se pudo completar el proceso.', variant: 'destructive' });
        }
    };

    const handleAnalyzeStock = async () => {
        if (!selectedProduct) {
            toast({ title: "Seleccione un producto", variant: "destructive" });
            return;
        }
        setStockCalcStatus('running');
        setStockCalcResult([]);
        
        try {
            const calculatedStockPerWarehouse = await recalculateProductStock(selectedProduct.id);
            const results: StockCalculationResult[] = [];
            
            const allWarehouseIds = new Set([
                ...selectedProduct.stock.map(s => s.warehouseId),
                ...Object.keys(calculatedStockPerWarehouse).map(id => parseInt(id))
            ]);
            
            const settings = await getSettings();

            for (const id of allWarehouseIds) {
                const warehouseName = settings.warehouses.find(w => w.id === id)?.name || `Almacén ID: ${id}`;
                const currentStock = selectedProduct.stock.find(s => s.warehouseId === id)?.quantity || 0;
                const calculatedStock = calculatedStockPerWarehouse[id] || 0;
                results.push({
                    warehouseId: id,
                    warehouseName,
                    currentStock,
                    calculatedStock,
                    difference: calculatedStock - currentStock
                });
            }

            setStockCalcResult(results);
            setStockCalcStatus('success');

        } catch (error) {
            setStockCalcStatus('error');
            toast({ title: "Error al calcular stock", variant: "destructive" });
        }
    };

    const handleApplyCalculatedStock = async () => {
        if (!selectedProduct || stockCalcResult.length === 0) return;
        
        const updatedStock: ProductStock[] = stockCalcResult.map(res => ({
            warehouseId: res.warehouseId,
            warehouseName: res.warehouseName,
            quantity: res.calculatedStock,
        }));
        
        const updatedProduct = { ...selectedProduct, stock: updatedStock };
        
        await saveProduct(updatedProduct);
        
        const refreshedProduct = await getProducts().then(prods => prods.find(p => p.id === selectedProduct.id));
        if(refreshedProduct) setSelectedProduct(refreshedProduct);
        
        setStockCalcStatus('idle');
        setStockCalcResult([]);

        toast({ title: "Stock Corregido", description: `El stock para ${selectedProduct.name} ha sido actualizado.` });
    };

    const handleExportData = async () => {
        try {
            toast({ title: "Preparando exportación...", description: "Recopilando todos los datos del sistema." });
            
            // Get all data with full details
            const customersData = await getCustomers();
            const fullCustomers = await Promise.all(customersData.map(c => getCustomer(c.id)));
            const suppliersData = await getSuppliers();
            const fullSuppliers = await Promise.all(suppliersData.map(s => getSupplier(s.id)));
            const productsData = await getProducts();
            const fullProducts = await Promise.all(productsData.map(p => getProduct(p.id)));
            
            const [settings, deliveryRoutes, transfers, cashRegisterMovements, cashRegisterClosures, parkedSales] = await Promise.all([
                getSettings(),
                getDeliveryRoutes(),
                getAllTransfers(),
                getCashRegisterMovements(),
                getClosures(),
                getParkedSales()
            ]);

            const fullData = {
                customers: fullCustomers.filter(Boolean),
                products: fullProducts.filter(Boolean),
                suppliers: fullSuppliers.filter(Boolean),
                settings,
                deliveryRoutes,
                transfers,
                cashRegisterMovements,
                cashRegisterClosures,
                parkedSales,
                exportDate: new Date().toISOString(),
                version: '1.2'
            };

            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(fullData, null, 2))}`;
            const link = document.createElement("a");
            link.href = jsonString;
            link.download = `simplygest_backup_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            toast({ title: "Exportación exitosa", description: "El archivo de backup se ha descargado." });
        } catch (error) {
            console.error("Export error:", error);
            toast({ title: "Error de exportación", description: "No se pudieron exportar los datos.", variant: 'destructive' });
        }
    };
    
    const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImportFile(file);
            setImportLogs([{ message: `Archivo "${file.name}" seleccionado.`, type: 'info' }]);
            setImportStatus('idle');
        }
    };
    
    const handleSourceJsonFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) setSourceJsonFile(file);
    };

    const handleTemplateJsonFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) setTemplateJsonFile(file);
    };

    const handleBackupFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setBackupFile(file);
            setRestoreLogs([{ message: `Archivo de backup "${file.name}" seleccionado.`, type: 'info' }]);
            setRestoreStatus('idle');
        }
    };

    const processImport = async () => {
        if (!importFile) return;

        setImportStatus('running');
        setImportProgress(0);
        setImportLogs([{ message: 'Leyendo archivo...', type: 'info' }]);
        
        const settings = await getSettings();
        const existingPriceTiers = settings.priceTiers;
        const existingSuppliers = await getSuppliers();

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const data = JSON.parse(text);
                
                let records: any[] = [];
                // Check if data is an array directly
                if (Array.isArray(data)) {
                    records = data;
                } else {
                    // Check for nested arrays
                    const possibleKeys: ImportDataType[] = ['customers', 'suppliers', 'products', 'productFamilies'];
                    const detectedKey = possibleKeys.find(key => Array.isArray(data[key]));
                    
                    if (detectedKey && detectedKey !== importDataType) {
                        throw new Error(`El tipo de dato seleccionado (${importDataType}) no coincide con el contenido del archivo (${detectedKey}).`);
                    }
                    if (detectedKey) {
                        records = data[detectedKey];
                    } else {
                         throw new Error("No se pudo detectar un array de datos válido (customers, suppliers, etc.) en el archivo JSON.");
                    }
                }
                
                setImportLogs(prev => [...prev, { message: `Archivo JSON parseado. Iniciando importación de ${importDataType}...`, type: 'info' }]);

                if (records.length === 0) {
                     throw new Error("El archivo no contiene un array de registros válidos para el tipo seleccionado.");
                }
                
                setImportLogs(prev => [...prev, { message: `Se encontraron ${records.length} registros.`, type: 'info' }]);

                if (importDataType === 'productFamilies') {
                    const existingFamilies = settings.productFamilies;
                    const newFamilies = records.filter(
                        (rec: ProductFamily) => !existingFamilies.some(ef => ef.name.toLowerCase() === rec.name.toLowerCase())
                    );
                    await saveProductFamilies([...existingFamilies, ...newFamilies]);
                    setImportLogs(prev => [...prev, { message: `Se añadieron ${newFamilies.length} nuevas familias.`, type: 'success' }]);

                } else {
                    for (let i = 0; i < records.length; i++) {
                        let record = records[i];
                        try {
                            switch(importDataType) {
                                case 'customers':
                                    if (!record.name) {
                                        setImportLogs(prev => [...prev, { message: `Registro ${i+1} omitido: falta el campo 'name'.`, type: 'warning' }]);
                                        continue;
                                    }
                                    const newCustomer: Customer = {
                                        ...record,
                                        id: record.id || await generateNewCustomerId(),
                                        avatar: record.avatar || (record.name || '').substring(0, 2).toUpperCase() || '??',
                                        purchaseHistory: record.purchaseHistory || [],
                                        orders: record.orders || [],
                                        quotes: record.quotes || [],
                                        reservations: record.reservations || [],
                                        vouchers: record.vouchers || [],
                                    };
                                    await saveCustomer(newCustomer);
                                    break;
                                case 'suppliers':
                                     if (!record.name) {
                                        setImportLogs(prev => [...prev, { message: `Registro ${i+1} omitido: falta el campo 'name'.`, type: 'warning' }]);
                                        continue;
                                    }
                                    const newSupplier: Supplier = {
                                        ...record,
                                        id: record.id || await generateNewSupplierId(),
                                        avatar: record.avatar || (record.name || '').substring(0, 2).toUpperCase() || '??',
                                        purchaseHistory: record.purchaseHistory || [],
                                    };
                                    await saveSupplier(newSupplier);
                                    break;
                                case 'products':
                                    if (!record.name) {
                                        setImportLogs(prev => [...prev, { message: `Registro ${i+1} omitido: falta el campo 'name'.`, type: 'warning' }]);
                                        continue;
                                    }
                                     const newProduct: Product = {
                                        ...record,
                                        id: record.id || await generateNewProductId(),
                                        codes: record.codes || [],
                                        images: record.images || [],
                                        stock: record.stock || [],
                                        prices: record.prices || [],
                                        suppliers: record.suppliers || [],
                                        history: record.history || [],
                                        attributes: record.attributes || { color: '', size: '' },
                                    };
                                    await saveProduct(newProduct); 
                                    break;
                            }
                        } catch (recordError: any) {
                            setImportLogs(prev => [...prev, { message: `Error en registro ${i+1} (${record.name || record.id}): ${recordError.message}`, type: 'error' }]);
                        }
                        setImportProgress(((i + 1) / records.length) * 100);
                    }
                }
                
                setImportStatus('success');
                setImportLogs(prev => [...prev, { message: '¡Importación completada!', type: 'success' }]);
                toast({ title: "Importación Finalizada", description: `Se procesaron ${records.length} registros.` });

            } catch (error: any) {
                setImportStatus('error');
                setImportLogs(prev => [...prev, { message: `Error crítico: ${error.message}`, type: 'error' }]);
                toast({ title: "Error de Importación", description: "El archivo no pudo ser procesado.", variant: 'destructive' });
            }
        };
        reader.readAsText(importFile);
    };

    const processFullBackup = async () => {
        if (!backupFile) return;
    
        setRestoreStatus('running');
        setRestoreLogs([{ message: 'Leyendo archivo de backup...', type: 'info' }]);
    
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const data = JSON.parse(text);
    
                const requiredKeys: (keyof typeof data)[] = ['customers', 'products', 'suppliers', 'settings', 'deliveryRoutes', 'transfers'];
                if (!requiredKeys.every(key => key in data)) {
                    throw new Error("El archivo de backup no tiene el formato correcto o está incompleto.");
                }
                
                setRestoreLogs(prev => [...prev, { message: "Formato de backup validado. Procediendo a restaurar...", type: 'info' }]);
                
                // Restore primary data
                await saveSettings(data.settings);
                setRestoreLogs(prev => [...prev, { message: "Configuración restaurada.", type: 'success' }]);
    
                for (const supplier of data.suppliers) { await saveSupplier(supplier); }
                setRestoreLogs(prev => [...prev, { message: `${data.suppliers.length} proveedores restaurados.`, type: 'success' }]);
    
                for (const product of data.products) { await saveProduct(product); }
                setRestoreLogs(prev => [...prev, { message: `${data.products.length} productos restaurados.`, type: 'success' }]);
                
                for (const customer of data.customers) { await saveCustomer(customer); }
                setRestoreLogs(prev => [...prev, { message: `${data.customers.length} clientes restaurados.`, type: 'success' }]);
                
                // Restore secondary data
                for (const route of data.deliveryRoutes) { await saveDeliveryRoute(route); }
                setRestoreLogs(prev => [...prev, { message: `${data.deliveryRoutes.length} rutas de entrega restauradas.`, type: 'success' }]);

                for (const transfer of data.transfers) { await transferStock(transfer); }
                setRestoreLogs(prev => [...prev, { message: `${data.transfers.length} traslados restaurados.`, type: 'success' }]);
                
                if (data.cashRegisterMovements) {
                    for (const movement of data.cashRegisterMovements) { await addCashRegisterMovement(movement); }
                    setRestoreLogs(prev => [...prev, { message: `${data.cashRegisterMovements.length} movimientos de caja restaurados.`, type: 'success' }]);
                }
                
                if (data.cashRegisterClosures) {
                    for (const closure of data.cashRegisterClosures) { await saveClosure(closure); }
                    setRestoreLogs(prev => [...prev, { message: `${data.cashRegisterClosures.length} cierres de caja restaurados.`, type: 'success' }]);
                }

                if (data.parkedSales) {
                    for (const sale of data.parkedSales) { await saveParkedSale(sale); }
                    setRestoreLogs(prev => [...prev, { message: `${data.parkedSales.length} ventas aparcadas restauradas.`, type: 'success' }]);
                }

                setRestoreStatus('success');
                setRestoreLogs(prev => [...prev, { message: "¡Restauración completada! Se recomienda recargar la aplicación.", type: 'success' }]);
                toast({ title: "Restauración Completada", description: "Todos los datos han sido restaurados desde el backup.", duration: 10000 });
    
            } catch (error: any) {
                setRestoreStatus('error');
                setRestoreLogs(prev => [...prev, { message: `Error crítico: ${error.message}`, type: 'error' }]);
                toast({ title: "Error de Restauración", description: "El archivo no pudo ser procesado.", variant: 'destructive' });
            }
        };
        reader.readAsText(backupFile);
    }

    const downloadTemplate = (type: ImportDataType) => {
        let data: any;
        let filename = `template_${type}.json`;

        const sampleCustomer = [{
            name: "Cliente de Ejemplo Completo",
            email: "cliente@ejemplo.com",
            phones: [
                { id: 1, number: "5555-1234", isPrimary: true },
                { id: 2, number: "5555-5678", isPrimary: false }
            ],
            type: "Particular",
            nit: "CF",
            fiscalName: "Cliente de Ejemplo Completo",
            priceTier: "Tarifa General",
            creditLimit: "Q1000.00",
            creditTerms: "15",
            currentBalance: "Q0.00",
            usualPaymentMethod: "Efectivo",
            maxSalesDiscount: "5%",
            addresses: [
                { id: 1, street: "Avenida Principal 1-23", city: "Ciudad Ejemplo", isPrimary: true },
                { id: 2, street: "Oficina 404, Torre Empresarial", city: "Ciudad Ejemplo", isPrimary: false }
            ],
            notes: "Notas sobre el cliente de ejemplo.",
            reservations: [{
                id: "AP-001",
                type: "apartado",
                date: "2024-01-01",
                status: "Pendiente",
                products: [{ sku: "SKU-COMP-001", name: "Producto de Ejemplo", qty: 2, price: 150 }],
                totalAmount: 300,
                advancePayment: 100,
                remainingBalance: 200,
                warehouseId: "1"
            }],
            vouchers: []
        }];

        const sampleSupplier = [{
            name: "Proveedor de Ejemplo, S.A.",
            contactPerson: "Juan Muestra",
            email: "contacto@proveedorejemplo.com",
            phones: [
                { id: 1, number: "2222-3333", isPrimary: true },
                { id: 2, number: "2222-4444", isPrimary: false }
            ],
            addresses: [
                { id: 1, street: "Bodega 15, Complejo Industrial", city: "Villa Ejemplo", isPrimary: true }
            ],
            nit: "1231231-2",
            fiscalName: "Proveedor de Ejemplo, Sociedad Anónima",
            creditTerms: "30",
            currentBalance: "Q0.00",
            maxPurchaseDiscount: "10%",
            usualPaymentMethod: "Transferencia Bancaria",
            notes: "Proveedor fiable, entrega los viernes."
        }];
        
        const sampleProduct = [{
          name: "Producto de Ejemplo Completo",
          description: "Este es un ejemplo más detallado de un producto para la plantilla de importación.",
          isService: false,
          codes: [
            { id: 1, type: "SKU", value: "SKU-COMP-001" },
            { id: 2, type: "EAN", value: "1234567890123" }
          ],
          attributes: { size: "Grande", color: "Azul" },
          stock: [
            { warehouseId: 1, warehouseName: "Almacén Central", quantity: 100 },
            { warehouseId: 2, warehouseName: "Almacén Zona 10", quantity: 50 }
          ],
          prices: [
            { tierId: 1, tierName: "Tarifa General", price: 150.00 },
            { tierId: 2, tierName: "Tarifa Mayorista", price: 130.50 },
          ],
          suppliers: [
            { relId: 1, id: '1', name: 'Importadora Ferretera S.A.', cost: 95.00, lastPurchaseDate: 'N/A', isPrimary: true },
            { relId: 2, id: '2', name: 'Cementos Progreso', cost: 102.00, lastPurchaseDate: 'N/A', isPrimary: false }
          ],
          family: { id: 1, name: "Herramientas > Manuales" },
          tax: { id: 1, name: 'IVA', rate: 12 },
          history: []
        }];
        
        const sampleFamily = [
            { id: 1, name: "Herramientas" },
            { id: 2, name: "Herramientas > Eléctricas" },
            { id: 3, name: "Herramientas > Manuales" }
        ];

        switch(type) {
            case 'customers': data = sampleCustomer; break;
            case 'suppliers': data = sampleSupplier; break;
            case 'products': data = sampleProduct; break;
            case 'productFamilies': data = sampleFamily; break;
        }

        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = filename;
        link.click();
    };

    const handleFormatWithAI = async () => {
        if (!sourceJsonFile || !templateJsonFile) {
            toast({ title: "Archivos faltantes", description: "Por favor, sube ambos archivos JSON.", variant: "destructive" });
            return;
        }

        setFormatterStatus('running');
        setFormattedJson(null);
        toast({ title: "Procesando con IA...", description: "Esto puede tardar un momento." });

        try {
            const sourceJson = await sourceJsonFile.text();
            const templateJson = await templateJsonFile.text();
            
            const result = await formatJson({ sourceJson, templateJson });
            
            setFormattedJson(result);
            setFormatterStatus('success');
            toast({ title: "Formateo Exitoso", description: "Tu archivo está listo para descargar." });

        } catch (error: any) {
            console.error("AI Formatting Error:", error);
            setFormatterStatus('error');
            const errorMessage = error instanceof Error ? error.message : "Error desconocido.";
            toast({ title: "Error de la IA", description: `No se pudo formatear el archivo. ${errorMessage}`, variant: "destructive" });
        }
    };
    
    const downloadFormattedJson = () => {
        if (!formattedJson) return;
        const blob = new Blob([formattedJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'formatted_data.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>Verificación y Reparación de Datos</CardTitle>
                    <CardDescription>Ejecuta tareas de mantenimiento para asegurar la integridad de los datos, como recalcular saldos y verificar relaciones entre tablas.</CardDescription>
                </CardHeader>
                <CardContent>
                    {repairStatus === 'idle' && (
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>¿Cuándo usar esta herramienta?</AlertTitle>
                            <AlertDescription>
                                Úsala si notas inconsistencias en los datos. El proceso puede tardar unos minutos y es recomendable hacerlo fuera de horas pico. Se verificarán saldos e integridad de las relaciones.
                            </AlertDescription>
                        </Alert>
                    )}
                    {repairStatus === 'running' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-primary">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <p className="font-semibold">Procesando... por favor, no cierres esta ventana.</p>
                            </div>
                            <Progress value={repairProgress} />
                        </div>
                    )}
                     {repairStatus === 'success' && (
                        <Alert variant="default" className="border-green-500 bg-green-50 text-green-700">
                            <CheckCircle className="h-4 w-4 text-green-700" />
                            <AlertTitle>Proceso Finalizado</AlertTitle>
                            <AlertDescription>
                                La base de datos ha sido verificada y reparada con éxito. Revisa los registros para ver los detalles.
                            </AlertDescription>
                        </Alert>
                    )}
                     {repairStatus === 'error' && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Fallo en el Proceso</AlertTitle>
                            <AlertDescription>
                                Ocurrió un error. Revisa los registros de abajo para más detalles y contacta a soporte si el problema persiste.
                            </AlertDescription>
                        </Alert>
                    )}
                    {(repairStatus === 'running' || repairStatus === 'success' || repairStatus === 'error') && repairLogs.length > 0 && (
                        <div className="mt-4 max-h-40 overflow-y-auto rounded-md border bg-muted p-3 text-xs font-mono">
                            {repairLogs.map((log, index) => (
                                <p key={index} className={cn(
                                    log.type === 'success' && 'text-green-600',
                                    log.type === 'error' && 'text-destructive',
                                    log.type === 'warning' && 'text-amber-600',
                                )}>{log.message}</p>
                            ))}
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={recalculateBalancesAndCheckIntegrity} disabled={repairStatus === 'running'}>
                        {repairStatus === 'running' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</> : 'Iniciar Verificación y Reparación'}
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PackageSearch className="text-primary"/>Auditoría y Recálculo de Stock</CardTitle>
                    <CardDescription>Verifica el stock de un producto comparando su historial de movimientos con el valor actual. Corrige discrepancias.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-end gap-2">
                        <div className="flex-grow space-y-2">
                             <Label>Seleccionar Producto</Label>
                             <Popover open={isProductPopoverOpen} onOpenChange={setIsProductPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" aria-expanded={isProductPopoverOpen} className="w-full justify-between">
                                        {selectedProduct ? selectedProduct.name : "Seleccionar producto..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Buscar producto..."/>
                                        <CommandEmpty>No se encontró el producto.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandList>
                                            {products.map((product) => (
                                                <CommandItem key={product.id} onSelect={() => {
                                                    setSelectedProduct(product);
                                                    setIsProductPopoverOpen(false);
                                                    setStockCalcResult([]);
                                                    setStockCalcStatus('idle');
                                                }}>
                                                    <CheckCircle className={cn("mr-2 h-4 w-4", selectedProduct?.id === product.id ? "opacity-100" : "opacity-0")} />
                                                    {product.name}
                                                </CommandItem>
                                            ))}
                                            </CommandList>
                                        </CommandGroup>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Button onClick={handleAnalyzeStock} disabled={!selectedProduct || stockCalcStatus === 'running'}>
                            {stockCalcStatus === 'running' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Analizar Stock
                        </Button>
                    </div>

                    {stockCalcResult.length > 0 && (
                        <div>
                            <h4 className="font-semibold mt-4 mb-2">Resultados del Análisis para: {selectedProduct?.name}</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Almacén</TableHead>
                                        <TableHead className="text-right">Stock Actual</TableHead>
                                        <TableHead className="text-right">Stock Calculado</TableHead>
                                        <TableHead className="text-right">Diferencia</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stockCalcResult.map(res => (
                                        <TableRow key={res.warehouseId}>
                                            <TableCell>{res.warehouseName}</TableCell>
                                            <TableCell className="text-right">{res.currentStock}</TableCell>
                                            <TableCell className="text-right">{res.calculatedStock}</TableCell>
                                            <TableCell className={cn("text-right font-bold", res.difference !== 0 && "text-destructive")}>{res.difference}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
                {stockCalcResult.some(r => r.difference !== 0) && (
                    <CardFooter>
                        <Button onClick={handleApplyCalculatedStock}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Aplicar Stock Calculado
                        </Button>
                    </CardFooter>
                )}
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>Asistente para Formatear JSON con IA</CardTitle>
                    <CardDescription>Sube un JSON con estructura diferente y una plantilla con la estructura deseada. La IA intentará mapear y convertir los datos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="source-json">1. Sube tu JSON Original</Label>
                            <Button asChild variant="outline" className="w-full">
                                <label>
                                    <UploadCloud className="mr-2 h-4 w-4" />
                                    {sourceJsonFile ? sourceJsonFile.name : 'Seleccionar Archivo'}
                                    <input id="source-json" type="file" accept=".json" className="sr-only" onChange={handleSourceJsonFileChange} />
                                </label>
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="template-json">2. Sube la Plantilla de Destino</Label>
                             <Button asChild variant="outline" className="w-full">
                                <label>
                                    <FileJson className="mr-2 h-4 w-4" />
                                    {templateJsonFile ? templateJsonFile.name : 'Seleccionar Plantilla'}
                                    <input id="template-json" type="file" accept=".json" className="sr-only" onChange={handleTemplateJsonFileChange} />
                                </label>
                            </Button>
                        </div>
                    </div>
                     <Button onClick={handleFormatWithAI} disabled={!sourceJsonFile || !templateJsonFile || formatterStatus === 'running'} className="w-full">
                        {formatterStatus === 'running' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Formatear con IA
                    </Button>
                    {formatterStatus === 'error' && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error de IA</AlertTitle><AlertDescription>No se pudo procesar el archivo. Revisa el formato e inténtalo de nuevo.</AlertDescription></Alert>}
                    {formattedJson && (
                        <div className="space-y-2">
                            <Label>3. Descarga el resultado</Label>
                             <Button onClick={downloadFormattedJson} variant="secondary" className="w-full">
                                <Download className="mr-2 h-4 w-4" />
                                Descargar JSON Formateado
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><DatabaseBackup />Importación y Exportación de Datos</CardTitle>
                    <CardDescription>Crea una copia de seguridad o importa datos desde un archivo JSON.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 border rounded-lg flex items-center justify-between">
                        <div>
                           <h3 className="font-semibold flex items-center gap-2"><Download className="h-5 w-5"/>Exportar Backup Completo</h3>
                           <p className="text-sm text-muted-foreground">Guarda una copia de seguridad de todos los datos en un archivo JSON.</p>
                        </div>
                       <Button onClick={handleExportData}>Descargar Backup</Button>
                    </div>

                    <div className="p-4 border rounded-lg space-y-4">
                        <h3 className="font-semibold flex items-center gap-2"><Upload className="h-5 w-5"/>Restaurar Backup Completo</h3>
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>¡Acción Irreversible!</AlertTitle>
                            <AlertDescription>
                                Restaurar un backup **reemplazará permanentemente todos los datos actuales** de la aplicación.
                            </AlertDescription>
                        </Alert>
                        <div className="flex items-center gap-2">
                             <Button asChild variant="outline" className="flex-grow">
                                <label htmlFor="restore-file">
                                    <UploadCloud className="mr-2 h-4 w-4" />
                                    {backupFile ? backupFile.name : 'Seleccionar Archivo de Backup'}
                                    <input id="restore-file" type="file" accept=".json" className="sr-only" onChange={handleBackupFileChange} />
                                </label>
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button disabled={!backupFile || restoreStatus === 'running'}>Restaurar</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción no se puede deshacer. Se borrarán todos los datos actuales y se reemplazarán con los del archivo de backup.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={processFullBackup}>Sí, entiendo y quiero restaurar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                        {(restoreStatus !== 'idle') && restoreLogs.length > 0 && (
                            <div className="mt-2 max-h-40 overflow-y-auto rounded-md border bg-muted p-3 text-xs font-mono">
                                {restoreLogs.map((log, index) => (
                                    <p key={index} className={cn(log.type === 'success' && 'text-green-600', log.type === 'error' && 'text-destructive')}>{log.message}</p>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="p-4 border rounded-lg space-y-4">
                        <h3 className="font-semibold flex items-center gap-2"><UploadCloud className="h-5 w-5"/>Importar Datos Masivos</h3>
                        <p className="text-sm text-muted-foreground">Añade clientes, proveedores o productos desde un archivo JSON sin borrar los datos existentes.</p>
                        <Separator />
                        <div className='w-full space-y-2'>
                            <Label>1. Descarga una plantilla (opcional)</Label>
                            <div className='flex gap-2 flex-wrap'>
                                <Button size="sm" variant="outline" onClick={() => downloadTemplate('customers')}><FileQuestion className="mr-2 h-4 w-4" />Clientes</Button>
                                <Button size="sm" variant="outline" onClick={() => downloadTemplate('suppliers')}><FileQuestion className="mr-2 h-4 w-4" />Proveedores</Button>
                                <Button size="sm" variant="outline" onClick={() => downloadTemplate('products')}><FileQuestion className="mr-2 h-4 w-4" />Productos</Button>
                                <Button size="sm" variant="outline" onClick={() => downloadTemplate('productFamilies')}><FileQuestion className="mr-2 h-4 w-4" />Familias</Button>
                            </div>
                        </div>
                       <div className="flex items-center gap-2 mt-2 w-full">
                            <div className='flex-grow space-y-2'>
                              <Label>2. Selecciona el tipo de dato</Label>
                              <Select value={importDataType} onValueChange={(v) => setImportDataType(v as ImportDataType)}>
                                  <SelectTrigger><SelectValue placeholder="Tipo de Dato" /></SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="customers">Clientes</SelectItem>
                                      <SelectItem value="suppliers">Proveedores</SelectItem>
                                      <SelectItem value="products">Productos</SelectItem>
                                      <SelectItem value="productFamilies">Familias de Productos</SelectItem>
                                  </SelectContent>
                              </Select>
                            </div>
                            <div className='flex-grow space-y-2'>
                              <Label>3. Elige tu archivo</Label>
                              <Button asChild variant="outline" className='w-full'>
                                  <label htmlFor="import-file">
                                      <FileJson className="mr-2 h-4 w-4" />
                                      {importFile ? importFile.name : 'Seleccionar Archivo'}
                                      <input id="import-file" type="file" accept=".json" className="sr-only" onChange={handleImportFileChange} />
                                  </label>
                              </Button>
                            </div>
                       </div>
                       {importFile && (
                        <div className="w-full mt-4 space-y-4">
                           <Button onClick={processImport} disabled={importStatus === 'running'} className="w-full">
                            {importStatus === 'running' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                             Procesar Importación
                           </Button>
                        </div>
                       )}
                       
                        {(importStatus !== 'idle') && importLogs.length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-semibold mb-2">Registro de Importación:</h4>
                                 {importStatus === 'running' && <Progress value={importProgress} className="mb-2"/>}
                                <div className="max-h-40 overflow-y-auto rounded-md border bg-muted p-3 text-xs font-mono">
                                    {importLogs.map((log, index) => (
                                        <p key={index} className={cn(
                                            log.type === 'success' && 'text-green-600',
                                            log.type === 'error' && 'text-destructive',
                                            log.type === 'warning' && 'text-amber-600',
                                        )}>{log.message}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
