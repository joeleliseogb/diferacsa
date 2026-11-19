
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Trash2, PlusCircle, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getProducts, transferStock, type StockTransfer, type StockTransferItem } from '@/lib/product-service';
import { getWarehouses, type Warehouse, getSettings } from '@/lib/settings-service';
import { generateNewTransferId } from '@/lib/servicios';
import type { Product } from '@/lib/product-data';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function NewTransferPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [transfer, setTransfer] = useState<Partial<StockTransfer>>({
    date: new Date().toISOString().split('T')[0],
    items: [],
    status: 'Completado',
  });

  useEffect(() => {
    async function loadData() {
      setWarehouses(await getWarehouses());
      setAllProducts(await getProducts());
    }
    loadData();
  }, []);

  const handleSelectChange = (field: 'originWarehouseId' | 'destinationWarehouseId', value: string) => {
    if (
      (field === 'originWarehouseId' && value === transfer.destinationWarehouseId) ||
      (field === 'destinationWarehouseId' && value === transfer.originWarehouseId)
    ) {
      toast({
        title: 'Almacén inválido',
        description: 'El almacén de origen y destino no pueden ser el mismo.',
        variant: 'destructive',
      });
      return;
    }
    setTransfer(prev => ({ ...prev, [field]: value }));
  };

  const filteredProducts = allProducts.filter(p => 
    !p.isService && 
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.codes.some(c => c.value.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const addProductToTransfer = (product: Product) => {
    if (!transfer.originWarehouseId) {
      toast({ title: 'Seleccione almacén de origen', variant: 'destructive' });
      return;
    }

    const sku = product.codes.find(c => c.type === 'SKU')?.value;
    if (!sku) return;

    if (transfer.items?.some(item => item.sku === sku)) {
      toast({ title: 'Producto ya añadido', description: 'La cantidad se puede editar en la tabla.', variant: 'default' });
      return;
    }

    const newItem: StockTransferItem = { sku, name: product.name, quantity: 1 };
    setTransfer(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
  };

  const handleItemQuantityChange = (sku: string, quantity: number) => {
    if (!transfer.originWarehouseId) return;

    const product = allProducts.find(p => p.codes.some(c => c.value === sku));
    const stockAtOrigin = product?.stock.find(s => s.warehouseId.toString() === transfer.originWarehouseId)?.quantity || 0;

    if (quantity > stockAtOrigin) {
      toast({
        title: 'Stock insuficiente en origen',
        description: `Solo hay ${stockAtOrigin} unidades disponibles en este almacén.`,
        variant: 'destructive',
      });
      quantity = stockAtOrigin;
    }

    const updatedItems = (transfer.items || []).map(item =>
      item.sku === sku ? { ...item, quantity: Math.max(0, quantity) } : item
    );
    setTransfer(prev => ({ ...prev, items: updatedItems }));
  };
  
  const handleRemoveItem = (sku: string) => {
    setTransfer(prev => ({ ...prev, items: (prev.items || []).filter(item => item.sku !== sku)}));
  }

  const handleSaveTransfer = async () => {
    if (!transfer.originWarehouseId || !transfer.destinationWarehouseId || !transfer.items || transfer.items.length === 0) {
        toast({ title: 'Datos incompletos', description: 'Por favor, complete todos los campos y añada productos.', variant: 'destructive' });
        return;
    }
    
    const finalTransfer: StockTransfer = {
      id: await generateNewTransferId(),
      date: transfer.date || new Date().toISOString().split('T')[0],
      originWarehouseId: transfer.originWarehouseId,
      destinationWarehouseId: transfer.destinationWarehouseId,
      items: transfer.items,
      status: transfer.status || 'Completado',
      notes: transfer.notes,
    };

    await transferStock(finalTransfer);

    toast({ title: 'Traslado completado', description: `Se ha registrado el vale de traslado ${finalTransfer.id}.` });
    router.push('/inventory/transfers');
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/inventory/transfers"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Nuevo Traslado de Inventario</h1>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" asChild><Link href="/inventory/transfers">Cancelar</Link></Button>
            <Button onClick={handleSaveTransfer}><Save className="mr-2 h-4 w-4" />Guardar Traslado</Button>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Productos a Trasladar</CardTitle>
                    <CardDescription>Esta es la lista de productos que se moverán entre almacenes.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="w-40">Cantidad a Mover</TableHead>
                                <TableHead className="w-12">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transfer.items && transfer.items.length > 0 ? transfer.items.map(item => (
                                <TableRow key={item.sku}>
                                    <TableCell className="font-medium">{item.name}<p className="text-xs text-muted-foreground font-mono">{item.sku}</p></TableCell>
                                    <TableCell>
                                        <Input type="number" value={item.quantity} onChange={e => handleItemQuantityChange(item.sku, parseInt(e.target.value, 10) || 0)} min={1} />
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="destructive" size="icon" onClick={() => handleRemoveItem(item.sku)}><Trash2 className="h-4 w-4"/></Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={3} className="h-24 text-center">Añada productos desde el buscador.</TableCell></TableRow>
                            )}
                        </TableBody>
                     </Table>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Detalles del Traslado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Almacén de Origen</Label>
                        <Select value={transfer.originWarehouseId} onValueChange={value => handleSelectChange('originWarehouseId', value)}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar origen..." /></SelectTrigger>
                            <SelectContent>
                                {warehouses.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Almacén de Destino</Label>
                        <Select value={transfer.destinationWarehouseId} onValueChange={value => handleSelectChange('destinationWarehouseId', value)}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar destino..." /></SelectTrigger>
                            <SelectContent>
                                {warehouses.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Añadir Productos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            type="search" 
                            placeholder="Buscar por nombre o SKU..." 
                            className="pl-8" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <ScrollArea className="h-72 border rounded-md">
                        <div className="p-2 space-y-1">
                            {filteredProducts.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                    <div>
                                      <p className="text-sm font-medium">{p.name}</p>
                                      <p className="text-xs text-muted-foreground">Stock Origen: {p.stock.find(s => s.warehouseId.toString() === transfer.originWarehouseId)?.quantity || 0}</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => addProductToTransfer(p)}>
                                        <PlusCircle className="h-4 w-4"/>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
