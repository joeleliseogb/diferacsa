

'use client'

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, PlusCircle, Save, Trash2, Calendar as CalendarIcon } from "lucide-react";

import type { Customer, Quote, QuoteProduct } from "@/lib/data";
import type { Product } from "@/lib/product-data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addMonths } from "date-fns";
import { getCustomers, getProducts, saveQuote, generateNewQuoteId } from "@/lib/servicios";


export default function NewQuotePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [quote, setQuote] = useState<Partial<Quote>>({
    status: 'Borrador',
    products: [],
    total: 'Q0.00'
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  useEffect(() => {
    async function loadData() {
      setCustomers(await getCustomers());
      setProducts(await getProducts());
    }
    loadData();
    setQuote(prev => ({
        ...prev,
        date: new Date().toISOString().split('T')[0],
        expiryDate: addMonths(new Date(), 1).toISOString().split('T')[0]
    }));
  }, []);
  
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const handleAddProduct = () => {
    const newProductLine: QuoteProduct = {
      sku: '',
      name: '',
      qty: 1,
      price: 0,
    };
    setQuote(prev => ({ ...prev, products: [...(prev.products || []), newProductLine] }));
  };

  const handleRemoveProduct = (index: number) => {
    const updatedProducts = (quote.products || []).filter((_, i) => i !== index);
    setQuote(prev => ({ ...prev, products: updatedProducts }));
    recalculateTotal(updatedProducts);
  };
  
  const handleProductLineChange = (index: number, field: keyof QuoteProduct, value: any) => {
    if (!quote.products) return;

    const newProducts = [...quote.products];
    const productLine = newProducts[index];

    if (field === 'sku') {
      const selectedProduct = products.find(p => p.codes.some(c => c.value === value));
      if (selectedProduct && selectedCustomer) {
        productLine.sku = selectedProduct.codes.find(c => c.type === 'SKU')?.value || value;
        productLine.name = selectedProduct.name;
        const customerPrice = selectedProduct.prices.find(p => p.tierName === selectedCustomer.priceTier)?.price;
        productLine.price = customerPrice || 0; 
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
    setQuote(prev => ({ ...prev, products: newProducts }));
    recalculateTotal(newProducts);
  };
  
  const recalculateTotal = (currentProducts: QuoteProduct[]) => {
     setQuote(prev => {
       if (!prev) return prev;
       const total = currentProducts.reduce((acc, p) => acc + (p.qty * p.price), 0);
       return {...prev, total: `Q${total.toFixed(2)}`};
    });
  };

  const handleSave = async () => {
    if (!selectedCustomerId || !quote.products || quote.products.length === 0) {
      alert("Por favor, selecciona un cliente y añade al menos un producto.");
      return;
    }

    const finalQuote: Quote = {
      id: await generateNewQuoteId(),
      date: quote.date!,
      expiryDate: quote.expiryDate!,
      status: quote.status!,
      total: quote.total!,
      products: quote.products!,
    };
    
    await saveQuote(selectedCustomerId, finalQuote);
    router.push('/quotes');
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/quotes"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Nuevo Presupuesto</h1>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" asChild><Link href="/quotes">Cancelar</Link></Button>
            <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" />Guardar Presupuesto</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Productos</CardTitle>
                <CardDescription>Añade los productos al presupuesto del cliente.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio Unitario</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead className="w-[50px]">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(quote.products || []).map((p, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select 
                            value={p.sku} 
                            onValueChange={(value) => handleProductLineChange(index, 'sku', value)}
                            disabled={!selectedCustomerId}
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
                            onChange={(e) => handleProductLineChange(index, 'qty', parseInt(e.target.value))}
                            className="w-20"
                            min="1"
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={p.price.toFixed(2)} 
                            onChange={(e) => handleProductLineChange(index, 'price', parseFloat(e.target.value))} 
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          Q{(p.qty * p.price).toFixed(2)}
                        </TableCell>
                         <TableCell>
                          <Button variant="destructive" size="icon" onClick={() => handleRemoveProduct(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                 <Button onClick={handleAddProduct} variant="outline" className="mt-4" disabled={!selectedCustomerId}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Producto
                </Button>
                 {!selectedCustomerId && (
                    <p className="text-sm text-muted-foreground mt-2">Por favor, selecciona un cliente para añadir productos.</p>
                )}
              </CardContent>
            </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Información General</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha del Presupuesto</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {quote.date ? format(new Date(quote.date), "PPP") : <span>Elige una fecha</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={quote.date ? new Date(quote.date) : undefined}
                        onSelect={(date) => setQuote(prev => ({...prev, date: date?.toISOString().split('T')[0] ?? ''}))}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
              </div>
               <div className="space-y-2">
                <Label>Fecha de Vencimiento</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {quote.expiryDate ? format(new Date(quote.expiryDate), "PPP") : <span>Elige una fecha</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={quote.expiryDate ? new Date(quote.expiryDate) : undefined}
                        onSelect={(date) => setQuote(prev => ({...prev, expiryDate: date?.toISOString().split('T')[0] ?? ''}))}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Resumen de Totales</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-lg">
               <div className="flex justify-between items-center font-bold">
                    <span>Total</span>
                    <span>{quote.total}</span>
                </div>
            </CardContent>
             <CardFooter>
                <p className="text-xs text-muted-foreground">Precios válidos hasta la fecha de vencimiento.</p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
