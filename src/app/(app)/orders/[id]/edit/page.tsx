

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
import { ArrowLeft, PlusCircle, Save, Trash2, Calendar as CalendarIcon, Package, AlertTriangle, Printer, FileText, Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Customer, Order, OrderProduct, Purchase } from "@/lib/servicios";
import type { Product } from "@/lib/product-data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PrintableDocument } from '@/components/printable-document';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";
import { getOrder, getProducts, updateOrder, generateNewInvoiceId, addPurchaseToHistory, sellStock, getCompanyInfo } from '@/lib/servicios';
import type { CompanyInfo } from '@/lib/settings-service';


export default function EditOrderPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [originalStatus, setOriginalStatus] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const printableRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    async function loadData() {
        setLoading(true);
        if (id) {
            const data = await getOrder(id);
            if (data) {
                setOrder(data.order);
                setOriginalStatus(data.order.status);
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
    if (!order) return;
    const newProductLine: OrderProduct = {
      sku: '',
      name: '',
      qty: 1,
      qtyDelivered: 0,
      price: 0,
    };
    setOrder(prev => prev ? { ...prev, products: [...(prev.products || []), newProductLine] } : null);
  };

  const handleRemoveProduct = (index: number) => {
    if (!order) return;
    const newProducts = (order.products || []).filter((_, i) => i !== index);
    setOrder(prev => prev ? {...prev, products: newProducts} : null);
    recalculateTotal(newProducts);
  };
  
  const handleProductLineChange = (index: number, field: keyof OrderProduct, value: any) => {
    if (!order || !order.products) return;
    const newProducts = [...order.products];
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
    setOrder(prev => prev ? { ...prev, products: newProducts } : null);
    recalculateTotal(newProducts);
  };
  
  const recalculateTotal = (currentProducts: OrderProduct[]) => {
     setOrder(prev => {
       if (!prev) return prev;
       const total = currentProducts.reduce((acc, p) => acc + (p.qty * p.price), 0);
       return {...prev, total: `Q${total.toFixed(2)}`};
    });
  };

  const handleSave = async () => {
    if (!order || !customer) return;
    
    const isNowDelivered = order.status === 'Entregado' && originalStatus !== 'Entregado';
    
    if (isNowDelivered) {
        // Assume default warehouse 1 if order doesn't come from a delivery
        await sellStock(order.products, order.id, 1);
    }
    
    await updateOrder(customer.id, order);
    toast({
        title: "Pedido Actualizado",
        description: `El pedido ${order.id} se ha guardado correctamente.`,
    });
    router.push('/orders');
  }

  const handleInvoiceOrder = async () => {
    if (!order || !customer || order.invoiceId) return;

    const newInvoiceId = await generateNewInvoiceId();
    const purchase: Purchase = {
        invoice: newInvoiceId,
        date: new Date().toISOString().split('T')[0],
        total: order.total,
        status: 'Pendiente de Pago',
        products: order.products.map(p => ({sku: p.sku, name: p.name, qty: p.qty, price: p.price})),
        dueDate: new Date(Date.now() + (parseInt(customer.creditTerms) || 0) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        branchId: "1", // Assuming default branch for now
        terminalId: "1", // Assuming default terminal
    };

    await addPurchaseToHistory(customer.id, purchase);

    const updatedOrder = { ...order, status: 'Facturado' as const, invoiceId: newInvoiceId };
    setOrder(updatedOrder);
    await updateOrder(customer.id, updatedOrder);
    
    toast({
        title: "Pedido Facturado",
        description: `Se ha generado la factura ${newInvoiceId} para el pedido ${order.id}.`,
    });
  };

  const handlePrint = () => {
    const input = printableRef.current;
    if (input && order) {
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
          pdf.save(`Pedido-${order.id}.pdf`);
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

  if (!order || !customer) {
    return <div>Pedido no encontrado</div>
  }

  const isOrderComplete = order.status === 'Entregado' || order.status === 'Cancelado' || order.status === 'Facturado';

  return (
    <>
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/orders"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Editar Pedido: {order.id}</h1>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
            <Button onClick={handleInvoiceOrder} disabled={order.status === 'Cancelado' || !!order.invoiceId}>
                <FileText className="mr-2 h-4 w-4"/>
                {order.invoiceId ? `Facturado (${order.invoiceId})` : 'Facturar Pedido'}
            </Button>
            <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" />Guardar y Salir</Button>
        </div>
      </div>
       {(originalStatus === 'Entregado' || originalStatus === 'En Ruta' || originalStatus === 'Parcialmente Entregado') && (
        <Alert>
          <Truck className="h-4 w-4" />
          <AlertTitle>Pedido en Proceso de Entrega o ya Entregado</AlertTitle>
          <AlertDescription>
            Este pedido ya fue procesado para su entrega y el stock fue ajustado. Los cambios que realices podrían no reflejarse correctamente en la logística si ya hay una ruta en curso.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Productos</CardTitle>
                <CardDescription>Añade o edita los productos del pedido.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Producto</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Entregado</TableHead>
                      <TableHead>Precio Unit.</TableHead>
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
                            disabled={isOrderComplete}
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
                            disabled={isOrderComplete}
                          />
                        </TableCell>
                        <TableCell className="text-center">{p.qtyDelivered}</TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={p.price.toFixed(2)} 
                            onChange={(e) => handleProductLineChange(index, 'price', parseFloat(e.target.value))} 
                            className="w-28"
                            disabled={isOrderComplete}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          Q{(p.qty * p.price).toFixed(2)}
                        </TableCell>
                         <TableCell>
                          <Button variant="destructive" size="icon" onClick={() => handleRemoveProduct(index)} disabled={isOrderComplete}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                 <Button onClick={handleAddProduct} variant="outline" className="mt-4" disabled={isOrderComplete}>
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
                <Label>Fecha del Pedido</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                        disabled={isOrderComplete}
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
                <Label>Estado del Pedido</Label>
                <Select 
                    value={order.status} 
                    onValueChange={(value) => setOrder(prev => prev ? {...prev, status: value as any} : null)}
                    disabled={originalStatus === 'Entregado' || originalStatus === 'En Ruta' || originalStatus === 'Facturado'}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="En Preparación">En Preparación</SelectItem>
                    <SelectItem value="Listo para Entrega">Listo para Entrega</SelectItem>
                    <SelectItem value="Parcialmente Entregado" disabled>Parcialmente Entregado</SelectItem>
                    <SelectItem value="En Ruta" disabled>En Ruta</SelectItem>
                    <SelectItem value="Entregado">Entregado (Afecta Stock)</SelectItem>
                    <SelectItem value="Facturado" disabled>Facturado</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Resumen de Totales</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-lg">
               <div className="flex justify-between items-center font-bold">
                    <span>Total</span>
                    <span>{order.total}</span>
                </div>
            </CardContent>
             <CardFooter>
                <p className="text-xs text-muted-foreground">Impuestos incluidos según tarifa del cliente.</p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
    <div className="absolute left-[-9999px] top-0">
        <div ref={printableRef}>
            {order && customer && companyInfo && <PrintableDocument type="order" data={{order, customer}} companyInfo={companyInfo} />}
        </div>
    </div>
    </>
  )
}
