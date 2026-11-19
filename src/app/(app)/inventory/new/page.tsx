
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { saveProduct } from '@/lib/product-service';
import { generateNewProductId } from '@/lib/servicios';
import type { Product, ProductSupplier } from '@/lib/product-data';
import {
  getWarehouses,
  getPriceTiers,
  getProductFamilies,
  getTaxes,
} from '@/lib/settings-service';
import { getSuppliers } from '@/lib/supplier-service';
import type { Supplier } from '@/lib/supplier-data';

import type {
  Warehouse,
  PriceTier,
  ProductFamily,
  Tax,
} from '@/lib/settings-service';
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
  ArrowLeft,
  Save,
  Trash2,
  PlusCircle,
  Image as ImageIcon,
  DollarSign,
  Barcode,
  Users,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';


export default function NewProductPage() {
  const router = useRouter();
  
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

  // Settings Data
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    async function fetchData() {
        setWarehouses(await getWarehouses());
        const priceTiersData = await getPriceTiers();
        setPriceTiers(priceTiersData);
        const familiesData = await getProductFamilies();
        setFamilies(familiesData);
        const taxesData = await getTaxes();
        setTaxes(taxesData);
        setAvailableSuppliers(await getSuppliers());

        setProduct(prev => ({
        ...prev,
        family: familiesData[0],
        tax: taxesData[0],
        prices: priceTiersData.map(tier => ({ tierId: tier.id, tierName: tier.name, price: 0 }))
        }))
    }
    fetchData();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!product) return;
    const { name, value } = e.target;
    setProduct((prev) => (prev ? { ...prev, [name]: value } : prev));
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
    } : prev)
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
        setProduct(prev => prev ? { ...prev, [name]: selectedObject } : prev);
    }
  };

  const handleServiceToggle = (checked: boolean) => {
    if (!product) return;
    setProduct(prev => prev ? { ...prev, isService: checked } : prev);
  }

  const handleCodeChange = (
    index: number,
    field: 'type' | 'value',
    value: string
  ) => {
    if (!product?.codes) return;
    const newCodes = [...product.codes];
    (newCodes[index] as any)[field] = value;
    setProduct((prev) => (prev ? { ...prev, codes: newCodes } : prev));
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
        : prev
    );
  };

  const removeCode = (id: number) => {
    if (!product?.codes) return;
    setProduct((prev) =>
      prev ? { ...prev, codes: (prev.codes || []).filter((c) => c.id !== id) } : prev
    );
  };

  const handlePriceChange = (tierId: number, newPrice: string) => {
    if (!product) return;
    const currentPrices = product.prices || [];
    const newPrices = currentPrices.map(p => 
        p.tierId === tierId ? { ...p, price: parseFloat(newPrice) || 0 } : p
    );
    
    const existingTier = priceTiers.find(t => t.id === tierId);
    if (existingTier && !newPrices.some(p => p.tierId === tierId)) {
        newPrices.push({ tierId, tierName: existingTier.name, price: parseFloat(newPrice) || 0 });
    }
    
    setProduct(prev => prev ? { ...prev, prices: newPrices } : prev);
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
      setProduct(prev => prev ? {...prev, stock: updatedStock} : prev);
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
    
    setProduct((prev) => (prev ? { ...prev, suppliers: newSuppliers } : prev));
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
        : prev
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
      prev ? { ...prev, suppliers: updatedSuppliers } : prev
    );
  };
  
  const setPrimarySupplier = (relId: number) => {
    if (!product?.suppliers) return;
    const newSuppliers = (product.suppliers || []).map(s => ({
      ...s,
      isPrimary: s.relId === relId
    }));
    setProduct(prev => prev ? { ...prev, suppliers: newSuppliers } : prev);
  }

  const handleSaveChanges = async () => {
    if (!product) return;

    const productToSave: Product = {
      id: await generateNewProductId(),
      name: product.name || '',
      description: product.description || '',
      isService: product.isService || false,
      codes: product.codes || [],
      attributes: product.attributes || { color: '', size: '' },
      images: product.images || [],
      stock: product.isService ? [] : (product.stock || []),
      prices: product.prices || [],
      tax: product.tax || taxes[0],
      family: product.family || families[0],
      suppliers: product.suppliers || [],
      history: product.history || [],
    };

    await saveProduct(productToSave);
    router.push(`/inventory`);
  };

  if (!product) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href={'/inventory'}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Añadir Nuevo Producto
          </h1>
        </div>
        <Button onClick={handleSaveChanges}>
          <Save className="mr-2 h-4 w-4" />
          Guardar Cambios
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Columna Izquierda */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Producto</Label>
                <Input
                  id="name"
                  name="name"
                  value={product.name || ''}
                  onChange={handleInputChange}
                  placeholder="Ej: Martillo de bola"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={product.description || ''}
                  onChange={handleInputChange}
                  placeholder="Descripción detallada del producto..."
                />
              </div>
               <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="family">Familia</Label>
                    <Select value={product.family?.id.toString()} onValueChange={(value) => handleSelectChange('family', value)}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar familia..." /></SelectTrigger>
                        <SelectContent>
                            {families.map(f => <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tax">Impuesto Aplicable</Label>
                    <Select value={product.tax?.id.toString()} onValueChange={(value) => handleSelectChange('tax', value)}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar impuesto..." /></SelectTrigger>
                        <SelectContent>
                            {taxes.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name} ({t.rate}%)</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
               </div>
               <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input id="color" name="color" value={product.attributes?.color || ''} onChange={handleAttributeChange} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="size">Talla / Medida</Label>
                    <Input id="size" name="size" value={product.attributes?.size || ''} onChange={handleAttributeChange} />
                </div>
               </div>
               <div className="flex items-center space-x-2 pt-4 border-t mt-4">
                <Switch
                  id="isService"
                  checked={product.isService || false}
                  onCheckedChange={handleServiceToggle}
                />
                <Label htmlFor="isService" className="cursor-pointer">Es un servicio (no gestiona stock)</Label>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Barcode />Códigos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(product.codes || []).map((code, index) => (
                <div key={code.id} className="flex items-end gap-2 p-3 border rounded-lg">
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    <div className='col-span-1'>
                        <Label>Tipo</Label>
                        <Select value={code.type} onValueChange={(value) => handleCodeChange(index, 'type', value)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SKU">SKU</SelectItem>
                                <SelectItem value="EAN">EAN</SelectItem>
                                <SelectItem value="UPC">UPC</SelectItem>
                                <SelectItem value="Otro">Otro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className='col-span-2'>
                        <Label>Valor</Label>
                        <Input value={code.value} onChange={(e) => handleCodeChange(index, 'value', e.target.value)} />
                    </div>
                  </div>
                  <Button variant="destructive" size="icon" onClick={() => removeCode(code.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <div className="flex justify-center pt-2">
                  <Button variant="outline" onClick={addCode}><PlusCircle className="mr-2 h-4 w-4" />Añadir Código</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users />Proveedores</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(product.suppliers || []).map((supplier, index) => (
                <div key={supplier.relId} className="p-3 border rounded-lg space-y-2 relative">
                  {supplier.isPrimary && (
                      <span className="absolute top-2 right-2 text-xs flex items-center font-semibold text-primary">
                          <Star className="h-3 w-3 mr-1.5 fill-current" />
                          Principal
                      </span>
                  )}
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div className="space-y-1">
                      <Label htmlFor={`supplier-name-${index}`}>Proveedor</Label>
                      <Select
                        value={supplier.id}
                        onValueChange={(value) => handleSupplierChange(supplier.relId, 'id', value)}
                      >
                        <SelectTrigger id={`supplier-name-${index}`}>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSuppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`supplier-cost-${index}`}>Costo (Q)</Label>
                      <Input
                        id={`supplier-cost-${index}`}
                        name="cost"
                        type="number"
                        placeholder="0.00"
                        value={supplier.cost}
                        onChange={(e) => handleSupplierChange(supplier.relId, 'cost', e.target.value)}
                      />
                    </div>
                  </div>
                   <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                     <Button variant="outline" size="sm" onClick={() => setPrimarySupplier(supplier.relId)} disabled={supplier.isPrimary}>
                       Hacer Principal
                     </Button>
                     <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => removeSupplier(supplier.relId)}>
                        <Trash2 className="h-4 w-4" />
                     </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={addSupplier}><PlusCircle className="mr-2 h-4 w-4" />Añadir Proveedor</Button>
              </div>
            </CardContent>
          </Card>
           <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon />Imágenes</CardTitle></CardHeader>
            <CardContent>
                 <div className="text-center p-8 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">La carga de imágenes no está implementada.</p>
                </div>
            </CardContent>
          </Card>
        </div>
        {/* Columna Derecha */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign/>Precios</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {priceTiers.map(tier => (
                <div key={tier.id} className="space-y-2">
                  <Label htmlFor={`price-${tier.id}`}>{tier.name}</Label>
                  <Input 
                    id={`price-${tier.id}`}
                    type="number" 
                    placeholder="0.00"
                    value={(product.prices || []).find(p => p.tierId === tier.id)?.price || ''}
                    onChange={(e) => handlePriceChange(tier.id, e.target.value)}
                    />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className={cn(product.isService && "bg-muted/50")}>
            <CardHeader><CardTitle>Stock por Almacén</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {product.isService ? (
                 <p className="text-sm text-center text-muted-foreground p-4">La gestión de stock está desactivada para servicios.</p>
              ) : (
                warehouses.map(wh => (
                    <div key={wh.id} className="space-y-2">
                        <Label htmlFor={`stock-${wh.id}`}>{wh.name}</Label>
                        <Input 
                            id={`stock-${wh.id}`}
                            type="number"
                            placeholder="0"
                            value={(product.stock || []).find(s => s.warehouseId === wh.id)?.quantity || ''}
                            onChange={(e) => handleStockChange(wh.id, e.target.value)}
                        />
                    </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
