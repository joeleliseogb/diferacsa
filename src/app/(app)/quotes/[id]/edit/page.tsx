

'use client'

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, PlusCircle, Save, Trash2, Calendar as CalendarIcon, Package, FileText, Printer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Customer, Quote, QuoteProduct, Order, Purchase, OrderProduct } from "@/lib/servicios";
import type { Product } from "@/lib/product-data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { PrintableDocument } from '@/components/printable-document';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";
import { getQuote, getProducts, updateQuote, saveOrder, generateNewOrderId, generateNewInvoiceId, addPurchaseToHistory, sellStock, getCompanyInfo } from '@/lib/servicios';


export default function EditQuotePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState(null);
  const printableRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    async function loadData() {
        if (id) {
            const data = await getQuote(id);
            if (data) {
                setQuote(data.quote);
                setCustomer(data.customer);
            }
        }
        setProducts(await getProducts());
        setCompanyInfo(await getCompanyInfo());
        setLoading(false);
    }
    loadData();
  }, [id]);

  const handleAddProduct = () => {
    if (!quote) return;
    const newProductLine: QuoteProduct = {
      sku: '',
      name: '',
      qty: 1,
      price: 0,
    };
    setQuote(prev => prev ? { ...prev, products: [...(prev.products || []), newProductLine] } : null);
  };

  const handleRemoveProduct = (index: number) => {
    if (!quote) return;
    const newProducts = (quote.products || []).filter((_, i) => i !== index);
    setQuote(prev => prev ? {...prev, products: newProducts} : null);
    recalculateTotal(newProducts);
  };
  
  const handleProductLineChange = (index: number, field: keyof QuoteProduct, value: any) => {
    if (!quote || !quote.products) return;
    const newProducts = [...quote.products];
    const productLine = newProducts[index];

    if (field === 'sku') {
      const selectedProduct = products.find(p => p.codes.some(c => c.value === value));
      if (selectedProduct && customer) {
        productLine.sku = selectedProduct.codes.find(c => c.type === 'SKU')?.value || value;
        productLine.name = selectedProduct.name;
        const customerPrice = selectedProduct.prices.find(p => p.tierName === customer.priceTier)?.price;
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
    setQuote(prev => prev ? { ...prev, products: newProducts } : null);
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
    if (!quote || !customer) return;
    await updateQuote(customer.id, quote);
    toast({
        title: "Presupuesto Guardado",
        description: `El presupuesto ${quote.id} se ha actualizado.`,
    })
    router.push('/quotes');
  }

  const handleConvertToOrder = async () => {
    if (!quote || !customer) return;
    const newOrder: Order = {
      id: await generateNewOrderId(),
      date: new Date().toISOString().split('T')[0],
      status: 'En Preparación',
      total: quote.total,
      products: quote.products.map(p => ({...p, qty: p.qty, qtyDelivered: 0}) as OrderProduct),
      notes: `Proviene del presupuesto ${quote.id}`
    };
    await saveOrder(customer.id, newOrder);
    
    const updatedQuote = { ...quote, status: 'Convertido' as const, notes: `Convertido a pedido ${newOrder.id}` };
    await updateQuote(customer.id, updatedQuote);

    toast({ title: "Presupuesto Convertido a Pedido", description: `Se ha creado el pedido ${newOrder.id}.`});
    router.push(`/orders/edit/${newOrder.id}`);
  };

  const handleConvertToInvoice = async () => {
     if (!quote || !customer) return;
    
    // 1. Create Invoice (Purchase record)
    const newInvoiceId = await generateNewInvoiceId();
    const newPurchase: Purchase = {
        invoice: newInvoiceId,
        date: new Date().toISOString().split('T')[0],
        total: quote.total,
        status: 'Pendiente de Pago',
        products: quote.products.map(p => ({sku: p.sku, name: p.name, qty: p.qty, price: p.price})),
        notes: `Proviene del presupuesto ${quote.id}`,
        branchId: "1", // Assuming default branch for now
        terminalId: "1", // Assuming default terminal
    };
    await addPurchaseToHistory(customer.id, newPurchase);

    // 2. Sell Stock (assuming warehouse 1 by default for direct conversion)
    await sellStock(quote.products.map(p => ({...p, qtyDelivered: 0})), newInvoiceId, 1);
    
    // 3. Update quote status
    const updatedQuote = { ...quote, status: 'Convertido' as const, notes: `Convertido a factura ${newInvoiceId}` };
    await updateQuote(customer.id, updatedQuote);

    toast({ title: "Presupuesto Convertido a Factura", description: `Se ha generado la factura ${newInvoiceId}.`});
    router.push('/invoicing');
  };

  const handlePrint = () => {
    const input = printableRef.current;
    if (input && quote) {
      html2canvas(input, { scale: 2 })
        .then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          const ratio = canvasWidth / canvasHeight;
          const imgWidth = pdfWidth;
          const imgHeight = imgWidth / ratio;

          pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
          pdf.save(`Presupuesto-${quote.id}.pdf`);
        });
    }
  };

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

  if (!quote || !customer) {
    return <div>Presupuesto no encontrado</div>
  }

  return (
    <>
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/quotes"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Editar Presupuesto: {quote.id}</h1>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
            <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" />Guardar y Salir</Button>
            <Button variant="secondary" onClick={handleConvertToOrder} disabled={quote.status !== 'Aceptado'}>
                <Package className="mr-2 h-4 w-4" />
                Convertir a Pedido
            </Button>
            <Button variant="secondary" onClick={handleConvertToInvoice} disabled={quote.status !== 'Aceptado'}>
                <FileText className="mr-2 h-4 w-4" />
                Convertir a Factura
            </Button>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Productos</CardTitle>
                <CardDescription>Añade o edita los productos del presupuesto.</CardDescription>
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
                            disabled={quote.status === 'Convertido'}
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
                            disabled={quote.status === 'Convertido'}
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={p.price.toFixed(2)} 
                            onChange={(e) => handleProductLineChange(index, 'price', parseFloat(e.target.value))} 
                            className="w-28"
                            disabled={quote.status === 'Convertido'}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          Q{(p.qty * p.price).toFixed(2)}
                        </TableCell>
                         <TableCell>
                          <Button variant="destructive" size="icon" onClick={() => handleRemoveProduct(index)} disabled={quote.status === 'Convertido'}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                 <Button onClick={handleAddProduct} variant="outline" className="mt-4" disabled={quote.status === 'Convertido'}>
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
                <Label>Cliente</Label>
                <Input value={customer.name} disabled />
              </div>
              <div className="space-y-2">
                <Label>Fecha del Presupuesto</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                        disabled={quote.status === 'Convertido'}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {quote.date ? format(new Date(quote.date), "PPP") : <span>Elige una fecha</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={quote.date ? new Date(quote.date) : undefined}
                        onSelect={(date) => setQuote(prev => prev ? {...prev, date: date?.toISOString().split('T')[0] ?? ''} : null)}
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
                        disabled={quote.status === 'Convertido'}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {quote.expiryDate ? format(new Date(quote.expiryDate), "PPP") : <span>Elige una fecha</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={quote.expiryDate ? new Date(quote.expiryDate) : undefined}
                        onSelect={(date) => setQuote(prev => prev ? {...prev, expiryDate: date?.toISOString().split('T')[0] ?? ''} : null)}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
              </div>
               <div className="space-y-2">
                <Label>Estado del Presupuesto</Label>
                <Select 
                    value={quote.status} 
                    onValueChange={(value) => setQuote(prev => prev ? {...prev, status: value as any} : null)}
                    disabled={quote.status === 'Convertido'}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Borrador">Borrador</SelectItem>
                    <SelectItem value="Enviado">Enviado</SelectItem>
                    <SelectItem value="Aceptado">Aceptado</SelectItem>
                    <SelectItem value="Rechazado">Rechazado</SelectItem>
                    <SelectItem value="Vencido">Vencido</SelectItem>
                    <SelectItem value="Convertido" disabled>Convertido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
               {quote.notes && (
                <div className="space-y-2 pt-2">
                    <Label>Notas</Label>
                    <p className="text-sm text-muted-foreground">{quote.notes}</p>
                </div>
               )}
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
     <div className="absolute left-[-9999px] top-0">
        <div ref={printableRef}>
          {quote && customer && companyInfo && <PrintableDocument type="quote" data={{quote, customer}} companyInfo={companyInfo} />}
        </div>
      </div>
    </>
  )
}
