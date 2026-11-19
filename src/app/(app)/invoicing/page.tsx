

'use client'

import { useState, useEffect, useMemo, Fragment } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, Banknote, ArrowUp, ArrowDown, FileSignature, Trash2, ArrowRightLeft, Search } from "lucide-react";
import type { InvoiceWithCustomerAndBalance, Product, DiscountVoucher } from "@/lib/servicios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PaymentMethod } from "@/lib/servicios";
import { format, isPast, parseISO, endOfYear } from "date-fns";
import { certifyInvoice, cancelInvoice, getProducts, adjustStockForReturn, generateNewInvoiceId, addPurchaseToHistory, generateNewDiscountVoucherId, addDiscountVoucherToCustomer } from "@/lib/servicios";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


type SortableKeys = 'invoice' | 'date' | 'status' | 'dueDate';

interface ReturnItem {
  sku: string;
  name: string;
  originalQty: number;
  returnQty: number;
  price: number;
}

interface NewSaleItem {
  sku: string;
  name: string;
  qty: number;
  price: number;
}


/**
 * Página para la gestión de facturación electrónica (DTEs).
 * @returns {JSX.Element} El componente de la página de facturación.
 */
export default function PaginaFacturacion() {
  const { toast } = useToast();
  const [dteVentas, setDteVentas] = useState<InvoiceWithCustomerAndBalance[]>([]);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<InvoiceWithCustomerAndBalance | null>(null);
  const [dialogoPagoAbierto, setDialogoPagoAbierto] = useState(false);
  const [detallesPago, setDetallesPago] = useState({ monto: '', metodo: '', documentNumber: '' });
  const [metodosPago, setMetodosPago] = useState<PaymentMethod[]>([]);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [configuracionOrden, setConfiguracionOrden] = useState<{ key: SortableKeys; direccion: 'ascending' | 'descending' }>({ key: 'date', direccion: 'descending' });

  // State for Return/Exchange Assistant
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<InvoiceWithCustomerAndBalance | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [newSaleItems, setNewSaleItems] = useState<NewSaleItem[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');


  async function cargarFacturas() {
    const { getAllInvoices } = await import('@/lib/servicios');
    const facturas = await getAllInvoices();
    setDteVentas(facturas);
  }

  useEffect(() => {
    cargarFacturas();
    async function cargarDependencias() {
        const { getPaymentMethods, getProducts } = await import('@/lib/servicios');
        const metodos = await getPaymentMethods();
        setMetodosPago(metodos);
        if (metodos.length > 0) {
            setDetallesPago(prev => ({ ...prev, metodo: metodos[0].id.toString() }));
        }
        setAllProducts(await getProducts());
    }
    cargarDependencias();
    
    window.addEventListener('focus', cargarFacturas);
    return () => {
        window.removeEventListener('focus', cargarFacturas);
    };
  }, []);

  const dtesFiltradosYOrdenados = useMemo(() => {
    let itemsOrdenables = [...dteVentas];

    if (terminoBusqueda) {
        itemsOrdenables = itemsOrdenables.filter(item =>
            item.invoice.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
            item.customerName.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
            item.date.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
            item.status.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
            item.total.toLowerCase().includes(terminoBusqueda.toLowerCase())
        );
    }

    itemsOrdenables.sort((a, b) => {
        let valA = a[configuracionOrden.key as keyof typeof a] as any;
        let valB = b[configuracionOrden.key as keyof typeof b] as any;
        let comparacion = 0;

        if (configuracionOrden.key === 'date' || configuracionOrden.key === 'dueDate') {
            const dateA = valA ? new Date(valA as string).getTime() : 0;
            const dateB = valB ? new Date(valB as string).getTime() : 0;
            comparacion = dateA - dateB;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
            comparacion = valA.localeCompare(valB);
        }

        return configuracionOrden.direccion === 'ascending' ? comparacion : -comparacion;
    });

    return itemsOrdenables;
  }, [dteVentas, terminoBusqueda, configuracionOrden]);

  const solicitarOrden = (key: SortableKeys) => {
    let direccion: 'ascending' | 'descending' = 'ascending';
    if (configuracionOrden.key === key && configuracionOrden.direccion === 'ascending') {
        direccion = 'descending';
    }
    setConfiguracionOrden({ key, direccion });
  };

  const obtenerIconoOrden = (key: SortableKeys) => {
      if (configuracionOrden.key !== key) return <span className="w-4 h-4 inline-block ml-2" />;
      if (configuracionOrden.direccion === 'ascending') {
          return <ArrowUp className="inline-block ml-2 h-4 w-4" />;
      }
      return <ArrowDown className="inline-block ml-2 h-4 w-4" />;
  };

  const manejarAbrirDialogoPago = (factura: InvoiceWithCustomerAndBalance) => {
    setFacturaSeleccionada(factura);
    setDetallesPago({
      monto: factura.remaining.toFixed(2),
      metodo: metodosPago[0]?.id.toString() || '',
      documentNumber: '',
    });
    setDialogoPagoAbierto(true);
  }

  const manejarRegistrarPago = async () => {
    if (!facturaSeleccionada || !detallesPago.monto || !detallesPago.metodo) {
      toast({ title: "Error", description: "Por favor, introduce un monto y selecciona un método de pago.", variant: "destructive" });
      return;
    }

    const montoPago = parseFloat(detallesPago.monto);
    if (isNaN(montoPago) || montoPago <= 0 || montoPago > facturaSeleccionada.remaining + 0.001) { // Añadir tolerancia para problemas con flotantes
      toast({ title: "Monto inválido", description: `El monto debe ser un número positivo, no mayor a Q${facturaSeleccionada.remaining.toFixed(2)}.`, variant: "destructive" });
      return;
    }

    const { registerPayment, addCashRegisterMovement } = await import('@/lib/servicios');
    const metodoSeleccionado = metodosPago.find(m => m.id.toString() === detallesPago.metodo);
    if (!metodoSeleccionado) return;
    
    await registerPayment(facturaSeleccionada.customerId, facturaSeleccionada.invoice, montoPago, metodoSeleccionado.name, detallesPago.documentNumber);
    
    await addCashRegisterMovement({
        id: Date.now(),
        fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
        tipo: 'Pago Factura',
        concepto: `Cobro Factura ${facturaSeleccionada.invoice} a ${facturaSeleccionada.customerName}`,
        ingreso: montoPago,
        egreso: 0,
        branchId: facturaSeleccionada.branchId,
        terminalId: facturaSeleccionada.terminalId,
        paymentMethod: metodoSeleccionado.name,
    });

    toast({
      title: "Pago Registrado",
      description: `Se ha registrado un pago de Q${montoPago.toFixed(2)} para la factura ${facturaSeleccionada.invoice}.`,
    });
    setDialogoPagoAbierto(false);
    setFacturaSeleccionada(null);
    cargarFacturas();
  }

  const handleCertifyInvoice = async (invoice: InvoiceWithCustomerAndBalance) => {
    await certifyInvoice(invoice.customerId, invoice.invoice);
    toast({
        title: "Factura Certificada",
        description: `La factura ${invoice.invoice} ha sido marcada como certificada ante la SAT.`,
    });
    cargarFacturas();
  };
  
  const handleCancelInvoice = async (invoice: InvoiceWithCustomerAndBalance) => {
    await cancelInvoice(invoice);
    toast({
        title: "Factura Anulada",
        description: `La factura ${invoice.invoice} ha sido anulada y el stock ha sido devuelto.`,
        variant: "default",
    });
    cargarFacturas();
  };

  const handleReturnOrExchange = (invoice: InvoiceWithCustomerAndBalance) => {
    setSelectedInvoiceForReturn(invoice);
    setReturnItems(invoice.products.map(p => ({
        sku: p.sku,
        name: p.name,
        originalQty: p.qty,
        returnQty: 0,
        price: p.price
    })));
    setNewSaleItems([]);
    setProductSearchTerm('');
    setIsReturnDialogOpen(true);
  };

  const handleReturnQtyChange = (sku: string, newQty: number) => {
    setReturnItems(prevItems => prevItems.map(item => {
        if (item.sku === sku) {
            const validatedQty = Math.max(0, Math.min(item.originalQty, newQty));
            return { ...item, returnQty: validatedQty };
        }
        return item;
    }));
  };
  
  const handleAddNewSaleItem = (product: Product) => {
    const sku = product.codes.find(c => c.type === 'SKU')?.value;
    if (!sku) return;

    const priceTierName = selectedInvoiceForReturn?.customer?.priceTier || "Tarifa General";
    const price = product.prices.find(p => p.tierName === priceTierName)?.price || 0;

    setNewSaleItems(prevItems => {
        const existingItem = prevItems.find(item => item.sku === sku);
        if (existingItem) {
            return prevItems.map(item => item.sku === sku ? { ...item, qty: item.qty + 1 } : item);
        }
        return [...prevItems, { sku, name: product.name, qty: 1, price }];
    });
  };

  const handleNewSaleQtyChange = (sku: string, newQty: number) => {
    setNewSaleItems(prevItems => prevItems.map(item =>
        item.sku === sku ? { ...item, qty: Math.max(1, newQty) } : item
    ));
  };
  
  const handleRemoveNewSaleItem = (sku: string) => {
    setNewSaleItems(prevItems => prevItems.filter(item => item.sku !== sku));
  };

  const totalReturnedValue = useMemo(() => {
    return returnItems.reduce((total, item) => total + (item.returnQty * item.price), 0);
  }, [returnItems]);

  const totalNewSaleValue = useMemo(() => {
    return newSaleItems.reduce((total, item) => total + (item.qty * item.price), 0);
  }, [newSaleItems]);

  const difference = totalNewSaleValue - totalReturnedValue;

  const handleConfirmReturnExchange = async () => {
    if (!selectedInvoiceForReturn) return;

    const returnedProducts = returnItems.filter(item => item.returnQty > 0);
    const newSaleProducts = newSaleItems;

    if (returnedProducts.length === 0 && newSaleProducts.length === 0) {
        toast({ title: "Nada que procesar", description: "No se han seleccionado productos para devolver o vender.", variant: "destructive" });
        return;
    }
    
    // 1. Adjust Stock
    const warehouseId = parseInt(selectedInvoiceForReturn.branchId, 10) || 1;
    await adjustStockForReturn(returnedProducts, newSaleProducts, warehouseId);
    
    // 2. Generate new Invoice if applicable
    if (newSaleProducts.length > 0) {
        const newInvoiceId = await generateNewInvoiceId();
        await addPurchaseToHistory(selectedInvoiceForReturn.customerId, {
            invoice: newInvoiceId,
            date: new Date().toISOString().split('T')[0],
            total: `Q${totalNewSaleValue.toFixed(2)}`,
            status: difference > 0 ? 'Pendiente de Pago' : 'Pagado',
            products: newSaleProducts,
            notes: `Venta por cambio/devolución de Factura ${selectedInvoiceForReturn.invoice}.`,
            branchId: selectedInvoiceForReturn.branchId,
            terminalId: selectedInvoiceForReturn.terminalId,
        });
        toast({ title: "Nueva Venta Generada", description: `Se creó la factura ${newInvoiceId} por el cambio.` });
    }

    // 3. Generate Credit Note / Discount Voucher
    if (difference < 0) {
        const voucherAmount = Math.abs(difference);
        const newVoucher: DiscountVoucher = {
            id: await generateNewDiscountVoucherId(),
            initialAmount: voucherAmount,
            currentAmount: voucherAmount,
            creationDate: new Date().toISOString().split('T')[0],
            expiryDate: endOfYear(new Date()).toISOString().split('T')[0],
            status: 'activo',
            originalInvoiceId: selectedInvoiceForReturn.invoice,
        };
        await addDiscountVoucherToCustomer(selectedInvoiceForReturn.customerId, newVoucher);
        toast({ title: "Vale de Descuento Generado", description: `Se generó un vale por Q${voucherAmount.toFixed(2)} a favor del cliente.` });
    }
    
    toast({
        title: "Operación Completada",
        description: "El inventario ha sido ajustado. Los documentos correspondientes han sido generados.",
    });

    setIsReturnDialogOpen(false);
    cargarFacturas();
  };

  const obtenerVarianteEstado = (estado: string, dueDate?: string): "secondary" | "outline" | "destructive" | "default" => {
    if (estado === 'Pendiente de Pago' && dueDate && isPast(parseISO(dueDate))) {
        return 'destructive';
    }
    switch (estado) {
      case 'Certificado':
      case 'Recibido':
      case 'Pagado':
        return 'secondary';
      case 'Anulado':
      case 'Cancelada':
        return 'destructive';
      case 'Pendiente de Pago':
      case 'Pago Parcial':
        return 'outline';
      default:
        return 'default';
    }
  };
  
  const metodoPagoActual = metodosPago.find(m => m.id.toString() === detallesPago.metodo);
  const mostrarCampoDocumento = metodoPagoActual && metodoPagoActual.name !== 'Efectivo';
  
  const filteredProducts = useMemo(() => {
    if (!productSearchTerm) return [];
    return allProducts.filter(p =>
        p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        p.codes.some(c => c.value.toLowerCase().includes(productSearchTerm.toLowerCase()))
    ).slice(0, 50); // Limit results for performance
  }, [allProducts, productSearchTerm]);

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Facturación</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo DTE Manual
        </Button>
      </div>
      <p className="text-muted-foreground">Gestión de Documentos Tributarios Electrónicos (DTE) y registro de pagos.</p>
      
      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">DTE de Venta</TabsTrigger>
          <TabsTrigger value="purchases">DTE de Compra</TabsTrigger>
        </TabsList>
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>DTEs de Venta Emitidos</CardTitle>
              <CardDescription>Facturas, Notas de Crédito y otros documentos emitidos a clientes.</CardDescription>
              <div className="pt-4">
                  <Input
                    placeholder="Buscar por factura, cliente, estado..."
                    value={terminoBusqueda}
                    onChange={e => setTerminoBusqueda(e.target.value)}
                    className="max-w-sm"
                  />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="p-0">
                      <Button variant="ghost" className="w-full justify-start px-4" onClick={() => solicitarOrden('invoice')}>
                          Factura {obtenerIconoOrden('invoice')}
                      </Button>
                    </TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="p-0">
                      <Button variant="ghost" className="w-full justify-start px-4" onClick={() => solicitarOrden('date')}>
                          Fecha Emisión {obtenerIconoOrden('date')}
                      </Button>
                    </TableHead>
                    <TableHead className="p-0">
                      <Button variant="ghost" className="w-full justify-start px-4" onClick={() => solicitarOrden('dueDate')}>
                          Fecha Venc. {obtenerIconoOrden('dueDate')}
                      </Button>
                    </TableHead>
                    <TableHead className="p-0">
                      <Button variant="ghost" className="w-full justify-start px-4" onClick={() => solicitarOrden('status')}>
                          Estado {obtenerIconoOrden('status')}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Total (Pendiente)</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dtesFiltradosYOrdenados.map((dte) => (
                    <TableRow key={dte.invoice}>
                      <TableCell className="font-medium">{dte.invoice}</TableCell>
                      <TableCell>{dte.customerName}</TableCell>
                      <TableCell>{dte.date}</TableCell>
                       <TableCell>{dte.dueDate ? format(parseISO(dte.dueDate), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={obtenerVarianteEstado(dte.status, dte.dueDate)}>{dte.status === 'Pendiente de Pago' && dte.dueDate && isPast(parseISO(dte.dueDate)) ? 'Vencida' : dte.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {dte.total}
                        {(dte.status === 'Pendiente de Pago' || dte.status === 'Pago Parcial') && dte.remaining > 0 && (
                           <span className="text-muted-foreground text-xs"> (Q{dte.remaining.toFixed(2)})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {['Pagado', 'Certificado', 'Pago Parcial'].includes(dte.status) && (
                            <Button variant="outline" size="sm" onClick={() => handleReturnOrExchange(dte)}>
                                <ArrowRightLeft className="mr-2 h-4 w-4"/> Cambio/Devolución
                            </Button>
                        )}
                        {dte.status === 'Pendiente de Pago' && (
                            <Button variant="outline" size="sm" onClick={() => handleCertifyInvoice(dte)}>
                                <FileSignature className="mr-2 h-4 w-4"/> Firmar y Enviar (SAT)
                            </Button>
                        )}
                        {(dte.status === 'Certificado' || dte.status === 'Pago Parcial') && dte.remaining > 0 ? (
                           <Button variant="outline" size="sm" onClick={() => manejarAbrirDialogoPago(dte)}>
                             <Banknote className="mr-2 h-4 w-4"/>
                             Registrar Pago
                           </Button>
                        ) : null}
                         {dte.status !== 'Anulado' && (
                           <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>¿Estás seguro de anular esta factura?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          Esta acción no se puede deshacer. Se anulará la factura y el stock de los productos asociados será devuelto al inventario.
                                      </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleCancelInvoice(dte)}>Sí, Anular Factura</AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                           </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

    <Dialog open={dialogoPagoAbierto} onOpenChange={setDialogoPagoAbierto}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pago: Factura {facturaSeleccionada?.invoice}</DialogTitle>
          <DialogDescription>
            Total: <span className="font-bold">{facturaSeleccionada?.total}</span>. 
            Pendiente: <span className="font-bold">Q{facturaSeleccionada?.remaining.toFixed(2)}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="monto" className="text-right">Monto a Pagar</Label>
              <Input
                id="monto"
                type="number"
                value={detallesPago.monto}
                onChange={(e) => setDetallesPago(prev => ({...prev, monto: e.target.value}))}
                className="col-span-3"
                placeholder="0.00"
                max={facturaSeleccionada?.remaining.toFixed(2)}
              />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="metodo" className="text-right">Método</Label>
              <Select
                value={detallesPago.metodo}
                onValueChange={(value) => setDetallesPago(prev => ({...prev, metodo: value}))}
              >
                <SelectTrigger id="metodo" className="col-span-3">
                  <SelectValue placeholder="Seleccionar método..."/>
                </SelectTrigger>
                <SelectContent>
                  {metodosPago.map(metodo => (
                    <SelectItem key={metodo.id} value={metodo.id.toString()}>
                      {metodo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
          {mostrarCampoDocumento && (
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="documentNumber" className="text-right">No. Doc. / Ref.</Label>
                  <Input
                      id="documentNumber"
                      value={detallesPago.documentNumber}
                      onChange={(e) => setDetallesPago(prev => ({...prev, documentNumber: e.target.value}))}
                      className="col-span-3"
                      placeholder="Ej: Cheque 12345, Transf. 67890"
                  />
              </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setDialogoPagoAbierto(false)}>Cancelar</Button>
          <Button onClick={manejarRegistrarPago}>Confirmar Pago</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Asistente de Cambios y Devoluciones</DialogTitle>
                <DialogDescription>
                    Factura Original: {selectedInvoiceForReturn?.invoice} | Cliente: {selectedInvoiceForReturn?.customerName}
                </DialogDescription>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-6 flex-grow min-h-0">
                {/* Columna de Devoluciones */}
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>1. Productos a Devolver</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="w-32">Cant. a Devolver</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {returnItems.map(item => (
                                    <TableRow key={item.sku}>
                                        <TableCell>
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">Comprados: {item.originalQty}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                type="number" 
                                                value={item.returnQty}
                                                onChange={(e) => handleReturnQtyChange(item.sku, parseInt(e.target.value, 10) || 0)}
                                                max={item.originalQty}
                                                min={0}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                {/* Columna de Venta Nueva */}
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>2. Productos a Entregar (Venta Nueva)</CardTitle>
                         <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar productos para añadir..." 
                                className="pl-8" 
                                value={productSearchTerm}
                                onChange={e => setProductSearchTerm(e.target.value)}
                            />
                        </div>
                        {productSearchTerm && (
                            <div className="border rounded-md max-h-40 overflow-y-auto">
                                {filteredProducts.map(p => (
                                    <div key={p.id} onClick={() => handleAddNewSaleItem(p)} className="p-2 hover:bg-accent cursor-pointer text-sm">
                                        {p.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="flex-grow overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="w-24">Cant.</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {newSaleItems.length > 0 ? newSaleItems.map(item => (
                                    <TableRow key={item.sku}>
                                        <TableCell className="text-xs">{item.name}</TableCell>
                                        <TableCell>
                                            <Input 
                                                type="number"
                                                value={item.qty}
                                                onChange={(e) => handleNewSaleQtyChange(item.sku, parseInt(e.target.value) || 1)}
                                                min={1}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">Q{(item.qty * item.price).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveNewSaleItem(item.sku)}>
                                                <Trash2 className="h-4 w-4 text-destructive"/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Añada productos a la nueva venta.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <CardFooter className="grid grid-cols-3 gap-4 border-t pt-4">
                 <div className="p-3 rounded-md bg-muted text-center">
                    <p className="text-xs text-muted-foreground">Total Devolución</p>
                    <p className="text-xl font-bold text-red-600">- Q{totalReturnedValue.toFixed(2)}</p>
                </div>
                 <div className="p-3 rounded-md bg-muted text-center">
                    <p className="text-xs text-muted-foreground">Total Venta Nueva</p>
                    <p className="text-xl font-bold text-green-600">+ Q{totalNewSaleValue.toFixed(2)}</p>
                </div>
                 <div className="p-3 rounded-md bg-primary/10 text-center">
                    <p className="text-xs text-primary/80 font-semibold">{difference >= 0 ? 'Diferencia a Pagar' : 'Saldo a Favor del Cliente'}</p>
                    <p className="text-xl font-bold text-primary">Q{Math.abs(difference).toFixed(2)}</p>
                </div>
            </CardFooter>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handleConfirmReturnExchange}>Confirmar Cambio/Devolución</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    </>
  );
}
