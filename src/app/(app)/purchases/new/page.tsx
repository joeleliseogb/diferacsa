

'use client'

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, PlusCircle, Save, Trash2, Calendar as CalendarIcon, Filter, X, Search } from "lucide-react";
import type { Supplier, PurchaseOrder, PurchasedProduct } from "@/lib/supplier-data";
import { getSuppliers, savePurchaseOrder } from "@/lib/supplier-service";
import { generateNewPurchaseOrderId } from "@/lib/servicios";
import type { Product } from "@/lib/product-data";
import { getProducts } from "@/lib/product-service";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [order, setOrder] = useState<Partial<PurchaseOrder>>({
    status: 'Pendiente',
    products: [],
    total: 'Q0.00'
  });
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBySupplier, setFilterBySupplier] = useState(true);
  
  useEffect(() => {
    async function loadData() {
        setSuppliers(await getSuppliers());
        setAllProducts(await getProducts());
    }
    loadData();
    setOrder(prev => ({
        ...prev,
        date: new Date().toISOString().split('T')[0]
    }));
  }, []);
  
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  const filteredProducts = useMemo(() => {
    let productsToShow = allProducts;
    
    if (filterBySupplier && selectedSupplierId) {
        productsToShow = allProducts.filter(p => p.suppliers.some(s => s.id === selectedSupplierId));
    }
    
    if (searchTerm) {
        return productsToShow.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.codes.some(c => c.value.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }
    
    return productsToShow;
  }, [allProducts, searchTerm, filterBySupplier, selectedSupplierId]);

  const addProductToOrder = (product: Product) => {
    if (!selectedSupplier) return;

    const sku = product.codes.find(c => c.type === 'SKU')?.value || '';
    const existingProduct = (order.products || []).find(p => p.sku === sku);

    if (existingProduct) {
        handleProductLineChange(
            (order.products || []).findIndex(p => p.sku === sku),
            'qty',
            existingProduct.qty + 1
        );
        return;
    }

    const supplierCost = product.suppliers.find(s => s.id === selectedSupplier.id)?.cost || 0;
    
    const newProductLine: PurchasedProduct = {
      sku,
      name: product.name,
      qty: 1,
      cost: supplierCost,
    };
    const updatedProducts = [...(order.products || []), newProductLine];
    setOrder(prev => ({ ...prev, products: updatedProducts }));
    recalculateTotal(updatedProducts);
  }

  const handleRemoveProduct = (index: number) => {
    const updatedProducts = (order.products || []).filter((_, i) => i !== index);
    setOrder(prev => ({ ...prev, products: updatedProducts }));
    recalculateTotal(updatedProducts);
  };
  
  const handleProductLineChange = (index: number, field: keyof PurchasedProduct, value: any) => {
    if (!order.products) return;
    const newProducts = [...order.products];
    if (field === 'qty') {
        const newQty = Math.max(1, Number(value) || 1);
        (newProducts[index] as any)[field] = newQty;
    } else {
        (newProducts[index] as any)[field] = value;
    }
    setOrder(prev => ({ ...prev, products: newProducts }));
    recalculateTotal(newProducts);
  };
  
  const recalculateTotal = (currentProducts: PurchasedProduct[]) => {
     setOrder(prev => {
       if (!prev || !prev.products) return prev;
       const total = currentProducts.reduce((acc, p) => acc + (p.qty * p.cost), 0);
       return {...prev, total: `Q${total.toFixed(2)}`};
    });
  };

  const handleSave = async () => {
    if (!selectedSupplierId || !order.products || order.products.length === 0) {
      toast({
        title: "Faltan datos",
        description: "Por favor, selecciona un proveedor y añade al menos un producto a la orden.",
        variant: "destructive",
      });
      return;
    }

    const finalOrder: PurchaseOrder = {
      order: await generateNewPurchaseOrderId(),
      date: order.date!,
      status: order.status!,
      total: order.total!,
      products: order.products!,
    };
    
    await savePurchaseOrder(selectedSupplierId, finalOrder);
    toast({
        title: "Orden de Compra Guardada",
        description: `Se ha creado la orden ${finalOrder.order} para ${selectedSupplier?.name}.`,
    });
    router.push('/purchases');
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/purchases"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Nueva Orden de Compra</h1>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" asChild><Link href="/purchases">Cancelar</Link></Button>
            <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" />Guardar Orden</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader>
                <CardTitle>1. Información General</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha de la Orden</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {order.date ? format(new Date(order.date), "PPP") : <span>Elige una fecha</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={order.date ? new Date(order.date) : undefined}
                        onSelect={(date) => setOrder(prev => ({...prev, date: date?.toISOString().split('T')[0] ?? ''}))}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
          <Card>
              <CardHeader>
                <CardTitle>3. Productos en la Orden</CardTitle>
                <CardDescription>Añade los productos que deseas comprar.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Costo</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(order.products || []).length > 0 ? (order.products || []).map((p, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium text-sm">
                          {p.name}
                          <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={p.qty} 
                            onChange={(e) => handleProductLineChange(index, 'qty', parseInt(e.target.value))}
                            className="w-20"
                            min="1"
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={p.cost.toFixed(2)} 
                            onChange={(e) => handleProductLineChange(index, 'cost', parseFloat(e.target.value))} 
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          Q{(p.qty * p.cost).toFixed(2)}
                        </TableCell>
                         <TableCell>
                          <Button variant="destructive" size="icon" onClick={() => handleRemoveProduct(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                          No has añadido productos a la orden.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex justify-end bg-muted/50 p-4 font-bold text-lg">
                 <div className="flex items-center gap-4">
                    <span>Total</span>
                    <span>{order.total}</span>
                 </div>
              </CardFooter>
            </Card>
        </div>
        <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle>2. Buscador de Productos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="filter-supplier" 
                  checked={filterBySupplier} 
                  onCheckedChange={setFilterBySupplier}
                  disabled={!selectedSupplierId}
                />
                <Label htmlFor="filter-supplier" className="flex items-center gap-2 text-sm">
                  <Filter className="h-4 w-4" />
                  Filtrar por proveedor
                </Label>
              </div>
               <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar producto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={!selectedSupplierId}
                    className="pl-8"
                />
                {searchTerm && (
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8" onClick={() => setSearchTerm('')}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
               </div>
               {!selectedSupplierId && (
                <p className="text-sm text-muted-foreground text-center pt-4">Selecciona un proveedor para buscar productos.</p>
               )}
               <ScrollArea className="h-96">
                 <div className="space-y-2 pr-4">
                  {filteredProducts.map(product => (
                    <div 
                      key={product.id}
                      className="flex items-center justify-between p-2 border rounded-md hover:bg-muted"
                    >
                      <div>
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{product.codes.find(c=>c.type === 'SKU')?.value}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => addProductToOrder(product)}>
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        Añadir
                      </Button>
                    </div>
                  ))}
                 </div>
               </ScrollArea>
            </CardContent>
          </Card>
      </div>
    </div>
  )
}
