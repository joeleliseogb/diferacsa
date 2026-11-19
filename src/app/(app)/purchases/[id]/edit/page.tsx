

'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, PlusCircle, Save, Trash2, Calendar as CalendarIcon, Package, AlertTriangle, Warehouse as WarehouseIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Supplier, PurchaseOrder, PurchasedProduct } from "@/lib/servicios";
import { getSupplier, updatePurchaseOrder, getProducts, receiveStock, getWarehouses, getPurchaseOrder } from "@/lib/servicios";
import type { Product } from "@/lib/product-data";
import type { Warehouse } from "@/lib/settings-service";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";


export default function EditPurchaseOrderPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [originalStatus, setOriginalStatus] = useState<string | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadData() {
        if (id) {
            const data = await getPurchaseOrder(id);
            if (data) {
                setOrder(data.order);
                setOriginalStatus(data.order.status);
                setSupplier(data.supplier);
            }
        }
        setProducts(await getProducts());
        const availableWarehouses = await getWarehouses();
        setWarehouses(availableWarehouses);
        if (availableWarehouses.length > 0) {
            setSelectedWarehouseId(availableWarehouses[0].id.toString());
        }
        setLoading(false);
    }
    loadData();
  }, [id]);

  const handleAddProduct = () => {
    if (!order) return;
    const newProductLine: PurchasedProduct = {
      sku: '',
      name: '',
      qty: 1,
      cost: 0,
    };
    setOrder(prev => prev ? { ...prev, products: [...(prev.products || []), newProductLine] } : null);
  };

  const handleRemoveProduct = (index: number) => {
    if (!order) return;
    const newProducts = (order.products || []).filter((_, i) => i !== index);
    setOrder(prev => prev ? {...prev, products: newProducts} : null);
    recalculateTotal(newProducts);
  };
  
  const handleProductLineChange = (index: number, field: keyof PurchasedProduct, value: any) => {
    if (!order || !order.products) return;
    const newProducts = [...order.products];
    const productLine = newProducts[index];

    if (field === 'sku') {
      const selectedProduct = products.find(p => p.codes.some(c => c.value === value));
      if (selectedProduct && supplier) {
        productLine.sku = selectedProduct.codes.find(c => c.type === 'SKU')?.value || value;
        productLine.name = selectedProduct.name;
        const supplierCost = selectedProduct.suppliers.find(s => s.id === supplier.id)?.cost;
        productLine.cost = supplierCost || 0;
      }
    } else {
        if (field === 'qty') {
            const newQty = Math.max(1, Number(value) || 1);
            (productLine as any)[field] = newQty;
        } else {
            (productLine as any)[field] = value;
        }
    }
    
    newProducts[index] = productLine;
    setOrder(prev => prev ? { ...prev, products: newProducts } : null);
    recalculateTotal(newProducts);
  };
  
  const recalculateTotal = (currentProducts: PurchasedProduct[]) => {
     setOrder(prev => {
       if (!prev) return prev;
       const total = currentProducts.reduce((acc, p) => acc + (p.qty * p.cost), 0);
       return {...prev, total: `Q${total.toFixed(2)}`};
    });
  };

  const handleSave = async () => {
    if (!order || !supplier) return;

    const isNowReceived = order.status === 'Recibido' && originalStatus !== 'Recibido';
    
    if (isNowReceived) {
        if (!selectedWarehouseId) {
            toast({
                title: 'Error',
                description: 'Por favor, selecciona un almacén para recibir los productos.',
                variant: 'destructive',
            });
            return;
        }
        await receiveStock(order.products, order.order, parseInt(selectedWarehouseId));
        toast({
            title: 'Inventario Actualizado',
            description: `Se han añadido ${order.products.reduce((acc, p) => acc + p.qty, 0)} items al almacén.`,
        });
    }
    
    await updatePurchaseOrder(supplier.id, order);
    router.push('/purchases');
  }

  if (loading) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-8 w-64" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    );
  }

  if (!order || !supplier) {
    return <div>Orden no encontrada</div>
  }

  const isOrderReceived = order.status === 'Recibido' || order.status === 'Cancelado';

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/purchases"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Editar Orden de Compra: {order.order}</h1>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" asChild><Link href="/purchases">Cancelar</Link></Button>
            <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" />Guardar Cambios</Button>
        </div>
      </div>
       {originalStatus === 'Recibido' && (
        <Alert>
          <Package className="h-4 w-4" />
          <AlertTitle>Orden Ya Recibida</AlertTitle>
          <AlertDescription>
            Esta orden ya fue marcada como recibida y el stock fue actualizado. Cualquier cambio no afectará nuevamente al inventario a menos que cambies el estado.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Productos</CardTitle>
                <CardDescription>Añade o edita los productos de la orden de compra.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Costo Unitario</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead className="w-[50px]">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(order.products || []).map((p, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select 
                            value={p.sku} 
                            onValueChange={(value) => handleProductLineChange(index, 'sku', value)}
                            disabled={isOrderReceived}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar producto..." />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map(prod => (
                                <SelectItem key={prod.id} value={prod.codes.find(c => c.type === 'SKU')?.value || ''}>
                                  {prod.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={p.qty} 
                            onChange={(e) => handleProductLineChange(index, 'qty', parseInt(e.target.value, 10) || 0)}
                            className="w-20"
                            min="1"
                            disabled={isOrderReceived}
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={p.cost.toFixed(2)} 
                            onChange={(e) => handleProductLineChange(index, 'cost', parseFloat(e.target.value) || 0)} 
                            className="w-28"
                            disabled={isOrderReceived}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          Q{(p.qty * p.cost).toFixed(2)}
                        </TableCell>
                         <TableCell>
                          <Button variant="destructive" size="icon" onClick={() => handleRemoveProduct(index)} disabled={isOrderReceived}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                 <Button onClick={handleAddProduct} variant="outline" className="mt-4" disabled={isOrderReceived}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Producto
                </Button>
              </CardContent>
            </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Información General</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Input value={supplier.name} disabled />
              </div>
              <div className="space-y-2">
                <Label>Fecha de la Orden</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                        disabled={isOrderReceived}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {order.date ? format(new Date(order.date), "PPP") : <span>Elige una fecha</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={order.date ? new Date(order.date) : undefined}
                        onSelect={(date) => setOrder(prev => prev ? {...prev, date: date?.toISOString().split('T')[0] ?? ''} : null)}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
              </div>
               <div className="space-y-2">
                <Label>Estado de la Orden</Label>
                <Select 
                    value={order.status} 
                    onValueChange={(value) => setOrder(prev => prev ? {...prev, status: value as any} : null)}
                    disabled={originalStatus === 'Recibido'}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="Recibido">Recibido (Afecta Stock)</SelectItem>
                    <SelectItem value="Recibido Parcial">Recibido Parcial</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
           {order.status === 'Recibido' && originalStatus !== 'Recibido' && (
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><WarehouseIcon />Almacén de Destino</CardTitle>
                    <CardDescription>Selecciona a qué almacén ingresarán los productos al recibir la orden.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar almacén..." />
                        </SelectTrigger>
                        <SelectContent>
                            {warehouses.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </CardContent>
             </Card>
            )}
          <Card>
            <CardHeader><CardTitle>Resumen de Totales</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-lg">
               <div className="flex justify-between items-center font-bold">
                    <span>Total</span>
                    <span>{order.total}</span>
                </div>
            </CardContent>
             <CardFooter>
                <p className="text-xs text-muted-foreground">Los impuestos se calcularán al recibir la factura.</p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
