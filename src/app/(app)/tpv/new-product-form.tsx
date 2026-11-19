
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  saveProduct,
  generateNewProductId,
  getWarehouses,
  getPriceTiers,
  getProductFamilies,
  getTaxes,
  getSuppliers,
  type Product,
  type ProductSupplier,
  type Warehouse,
  type PriceTier,
  type ProductFamily,
  type Tax,
  type Supplier,
} from '@/lib/servicios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Trash2,
  PlusCircle,
  Image as ImageIcon,
  DollarSign,
  Barcode,
  Users,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface NewProductFormProps {
    onProductCreated: (product: Product) => void;
    warehouses: Warehouse[];
    priceTiers: PriceTier[];
}

export default function NewProductForm({ onProductCreated, warehouses, priceTiers }: NewProductFormProps) {
  const { toast } = useToast();
  
  const [product, setProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    isService: false,
    codes: [{ id: 1, type: 'SKU', value: '' }],
    images: [],
    stock: [],
    prices: [],
    suppliers: [],
    history: [],
    attributes: { color: '', size: '' },
  });

  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    async function fetchData() {
        const familiesData = await getProductFamilies();
        setFamilies(familiesData);
        const taxesData = await getTaxes();
        setTaxes(taxesData);
        setAvailableSuppliers(await getSuppliers());

        setProduct(prev => ({
            ...prev,
            family: familiesData[0],
            tax: taxesData[0],
            prices: priceTiers.map(tier => ({ tierId: tier.id, tierName: tier.name, price: 0 }))
        }))
    }
    fetchData();
  }, [priceTiers]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!product) return;
    const { name, value } = e.target;
    setProduct((prev) => (prev ? { ...prev, [name]: value } : null));
  };
  
  const handleAttributeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!product?.attributes) return;
    const { name, value } = e.target;
    setProduct(prev => prev ? {
        ...prev,
        attributes: {
            ...prev.attributes!,
            [name]: value
        }
    } : null)
  }

  const handleSelectChange = (
    name: 'family' | 'tax',
    value: string
  ) => {
    if (!product) return;
    let selectedObject;
    if (name === 'family') {
        selectedObject = families.find(f => f.id.toString() === value);
    } else {
        selectedObject = taxes.find(t => t.id.toString() === value);
    }

    if(selectedObject){
        setProduct(prev => prev ? { ...prev, [name]: selectedObject } : null);
    }
  };

  const handleServiceToggle = (checked: boolean) => {
    if (!product) return;
    setProduct(prev => prev ? { ...prev, isService: checked } : null);
  }

  const handleCodeChange = (
    index: number,
    field: 'type' | 'value',
    value: string
  ) => {
    if (!product?.codes) return;
    const newCodes = [...product.codes];
    (newCodes[index] as any)[field] = value;
    setProduct((prev) => (prev ? { ...prev, codes: newCodes } : null));
  };

  const addCode = () => {
    if (!product) return;
    setProduct((prev) =>
      prev
        ? {
            ...prev,
            codes: [
              ...(prev.codes || []),
              { id: Date.now() + Math.random(), type: 'EAN', value: '' },
            ],
          }
        : null
    );
  };

  const removeCode = (id: number) => {
    if (!product?.codes) return;
    setProduct((prev) =>
      prev ? { ...prev, codes: (prev.codes || []).filter((c) => c.id !== id) } : null
    );
  };

  const handlePriceChange = (tierId: number, newPrice: string) => {
    if (!product) return;
    const currentPrices = product.prices || [];
    let newPrices = [...currentPrices];
    const priceIndex = newPrices.findIndex(p => p.tierId === tierId);

    if (priceIndex > -1) {
        newPrices[priceIndex].price = parseFloat(newPrice) || 0;
    } else {
        const tier = priceTiers.find(t => t.id === tierId);
        if (tier) {
            newPrices.push({ tierId, tierName: tier.name, price: parseFloat(newPrice) || 0 });
        }
    }
    
    setProduct(prev => prev ? { ...prev, prices: newPrices } : null);
  };

  const handleStockChange = (warehouseId: number, newQuantity: string) => {
      if(!product) return;

      let updatedStock = [...(product.stock || [])];
      const stockIndex = updatedStock.findIndex(s => s.warehouseId === warehouseId);
      const quantity = parseInt(newQuantity, 10) || 0;

      if(stockIndex > -1){
          updatedStock[stockIndex].quantity = quantity;
      } else {
          const warehouse = warehouses.find(w => w.id === warehouseId);
          if(warehouse){
              updatedStock.push({ warehouseId, warehouseName: warehouse.name, quantity});
          }
      }
      setProduct(prev => prev ? {...prev, stock: updatedStock} : null);
  }

  const handleSupplierChange = (
    relId: number,
    field: 'id' | 'cost',
    value: string
  ) => {
    if (!product) return;
    const newSuppliers = [...(product.suppliers || [])];
    const index = newSuppliers.findIndex(s => s.relId === relId);
    if (index === -1) return;

    if (field === 'id') {
      const selectedSupplier = availableSuppliers.find(s => s.id === value);
      if (selectedSupplier) {
        newSuppliers[index] = { 
            ...newSuppliers[index], 
            id: selectedSupplier.id, 
            name: selectedSupplier.name 
        };
      }
    } else if (field === 'cost') {
      newSuppliers[index] = { ...newSuppliers[index], cost: parseFloat(value) || 0 };
    }
    
    setProduct((prev) => (prev ? { ...prev, suppliers: newSuppliers } : null));
  };

  const addSupplier = () => {
    if (!product) return;
    const newSupplier: ProductSupplier = {
      relId: Date.now() + Math.random(),
      id: '',
      name: '',
      cost: 0,
      lastPurchaseDate: 'N/A',
      isPrimary: !product.suppliers || product.suppliers.length === 0,
    };
    setProduct((prev) =>
      prev
        ? {
            ...prev,
            suppliers: [...(prev.suppliers || []), newSupplier],
          }
        : null
    );
  };

  const removeSupplier = (relId: number) => {
    if (!product?.suppliers) return;
    const wasPrimary = (product.suppliers || []).find(s => s.relId === relId)?.isPrimary;
    let updatedSuppliers = (product.suppliers || []).filter((s) => s.relId !== relId);

    if(wasPrimary && updatedSuppliers.length > 0) {
      updatedSuppliers[0].isPrimary = true;
    }
    
    setProduct((prev) =>
      prev ? { ...prev, suppliers: updatedSuppliers } : null
    );
  };
  
  const setPrimarySupplier = (relId: number) => {
    if (!product?.suppliers) return;
    const newSuppliers = (product.suppliers || []).map(s => ({
      ...s,
      isPrimary: s.relId === relId
    }));
    setProduct(prev => prev ? { ...prev, suppliers: newSuppliers } : null);
  }

  const handleSaveChanges = async () => {
    if (!product) return;
    
    if(!product.name) {
        toast({ title: "Error", description: "El nombre del producto es obligatorio.", variant: "destructive" });
        return;
    }

    const productToSave: Product = {
      id: await generateNewProductId(),
      name: product.name,
      description: product.description || '',
      isService: product.isService || false,
      codes: product.codes || [{ id: Date.now(), type: 'SKU', value: `SKU-${Date.now()}` }],
      attributes: product.attributes || { color: '', size: '' },
      images: product.images || [],
      stock: product.isService ? [] : (product.stock || []),
      prices: product.prices || [],
      tax: product.tax || taxes[0],
      family: product.family || families[0],
      suppliers: product.suppliers || [],
      history: product.isService ? [] : (product.stock || []).map(s => ({
        date: new Date().toISOString().split('T')[0],
        type: 'Ajuste' as const,
        document: 'Stock Inicial',
        quantity: s.quantity,
        price: (product.suppliers || []).find(sup => sup.isPrimary)?.cost || 0
      })),
    };

    await saveProduct(productToSave);
    toast({ title: "Producto Creado", description: `${productToSave.name} ha sido añadido al inventario.` });
    onProductCreated(productToSave);
  };

  if (!product) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-6 p-1">
        <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                 <Card>
                    <CardHeader><CardTitle>Información Básica</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <Input name="name" value={product.name} onChange={handleInputChange} placeholder="Nombre del Producto" />
                        <Textarea name="description" value={product.description} onChange={handleInputChange} placeholder="Descripción detallada..." />
                        <div className="grid md:grid-cols-2 gap-4">
                            <Select value={product.family?.id.toString()} onValueChange={(v) => handleSelectChange('family', v)}>
                                <SelectTrigger><SelectValue placeholder="Familia..." /></SelectTrigger>
                                <SelectContent>{families.map(f => <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>)}</SelectContent>
                            </Select>
                             <Select value={product.tax?.id.toString()} onValueChange={(v) => handleSelectChange('tax', v)}>
                                <SelectTrigger><SelectValue placeholder="Impuesto..." /></SelectTrigger>
                                <SelectContent>{taxes.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name} ({t.rate}%)</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                           <Input name="color" value={product.attributes?.color} onChange={handleAttributeChange} placeholder="Color"/>
                           <Input name="size" value={product.attributes?.size} onChange={handleAttributeChange} placeholder="Talla / Medida"/>
                        </div>
                        <div className="flex items-center space-x-2 pt-4 border-t mt-4">
                            <Switch id="isService" checked={product.isService} onCheckedChange={handleServiceToggle} />
                            <Label htmlFor="isService">Es un servicio (no gestiona stock)</Label>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Barcode />Códigos</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {(product.codes || []).map((code, index) => (
                            <div key={code.id} className="flex items-end gap-2 p-3 border rounded-lg">
                                <div className="grid grid-cols-3 gap-2 flex-1">
                                    <div className='col-span-1'><Label>Tipo</Label><Select value={code.type} onValueChange={(v) => handleCodeChange(index, 'type', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="SKU">SKU</SelectItem><SelectItem value="EAN">EAN</SelectItem></SelectContent></Select></div>
                                    <div className='col-span-2'><Label>Valor</Label><Input value={code.value} onChange={(e) => handleCodeChange(index, 'value', e.target.value)} /></div>
                                </div>
                                <Button variant="destructive" size="icon" onClick={() => removeCode(code.id)}><Trash2/></Button>
                            </div>
                        ))}
                        <div className="flex justify-center pt-2"><Button variant="outline" onClick={addCode}><PlusCircle className="mr-2"/>Añadir Código</Button></div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Users />Proveedores</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {(product.suppliers || []).map((supplier, index) => (
                            <div key={supplier.relId} className="p-3 border rounded-lg space-y-2 relative">
                                {supplier.isPrimary && (<span className="absolute top-2 right-2 text-xs flex items-center font-semibold text-primary"><Star className="h-3 w-3 mr-1.5 fill-current"/>Principal</span>)}
                                <div className="grid grid-cols-2 gap-4 flex-1">
                                    <div className="space-y-1"><Label>Proveedor</Label><Select value={supplier.id} onValueChange={(v) => handleSupplierChange(supplier.relId, 'id', v)}><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger><SelectContent>{availableSuppliers.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent></Select></div>
                                    <div className="space-y-1"><Label>Costo (Q)</Label><Input type="number" placeholder="0.00" value={supplier.cost} onChange={(e) => handleSupplierChange(supplier.relId, 'cost', e.target.value)} /></div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                                    <Button variant="outline" size="sm" onClick={() => setPrimarySupplier(supplier.relId)} disabled={supplier.isPrimary}>Hacer Principal</Button>
                                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => removeSupplier(supplier.relId)}><Trash2/></Button>
                                </div>
                            </div>
                        ))}
                        <div className="flex justify-center pt-2"><Button variant="outline" onClick={addSupplier}><PlusCircle className="mr-2"/>Añadir Proveedor</Button></div>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign/>Precios</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {priceTiers.map(tier => (<div key={tier.id} className="space-y-2"><Label>{tier.name}</Label><Input type="number" placeholder="0.00" value={(product.prices || []).find(p => p.tierId === tier.id)?.price || ''} onChange={(e) => handlePriceChange(tier.id, e.target.value)}/></div>))}
                    </CardContent>
                </Card>
                 <Card className={cn(product.isService && "bg-muted/50")}>
                    <CardHeader><CardTitle>Stock por Almacén</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {product.isService ? (<p className="text-sm text-center text-muted-foreground p-4">La gestión de stock está desactivada para servicios.</p>) : (warehouses.map(wh => (<div key={wh.id} className="space-y-2"><Label>{wh.name}</Label><Input type="number" placeholder="0" value={(product.stock || []).find(s => s.warehouseId === wh.id)?.quantity || ''} onChange={(e) => handleStockChange(wh.id, e.target.value)}/></div>)))}
                    </CardContent>
                </Card>
                 <Button onClick={handleSaveChanges} className="w-full">Guardar y Añadir al Carrito</Button>
            </div>
        </div>
    </div>
  );
}
