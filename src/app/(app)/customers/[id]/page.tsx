
'use client'

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, FileText, MapPin, Phone, Mail, Home, CreditCard, DollarSign, Tag, Calendar, Package, Clock, Wallet, Percent, ClipboardList, HandCoins, Banknote, Edit3, PlusCircle, Trash2 } from "lucide-react"
import Link from "next/link"
import { getCustomer, registerBulkPayment, type Customer, type PaymentMethod, getPaymentMethods, type PurchaseProduct, type Purchase, addCashRegisterMovement, getAllReservations, getProducts, saveReservation, type Reservation, type ReservationProduct, type Product } from '@/lib/servicios';
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { format, isPast, parseISO } from 'date-fns';


/**
 * Página de detalle para un cliente específico. Muestra toda la información relevante,
 * organizada en datos de contacto, económicos, historial de compras, presupuestos y apartados/encargos.
 * @returns {JSX.Element} El componente de la página de la ficha del cliente.
 */
export default function PaginaDetalleCliente() {
  const parametros = useParams();
  const id = parametros.id as string;
  const { toast } = useToast();
  const [cliente, setCliente] = useState<Customer | null | undefined>(undefined);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDoc, setPaymentDoc] = useState('');
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentMethod[]>([]);

  // State for editing reservations
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [productSearch, setProductSearch] = useState('');


  async function cargarCliente() {
      if (id) {
          const datos = await getCustomer(id);
          setCliente(datos);
      }
  }

  useEffect(() => {
    cargarCliente();
    async function loadDependencies() {
        const [methods, productsData] = await Promise.all([
            getPaymentMethods(),
            getProducts()
        ]);
        setAvailablePaymentMethods(methods);
        setAllProducts(productsData);
        if(methods.length > 0) {
            setPaymentMethod(methods[0].id.toString());
        }
    }
    loadDependencies();
  }, [id]);

  const handleOpenPaymentDialog = () => {
    const totalDebt = (cliente?.purchaseHistory || [])
        .filter(p => p.status === 'Pendiente de Pago' || p.status === 'Pago Parcial' || p.status === 'Certificado')
        .reduce((sum, p) => {
            const total = parseFloat(p.total.replace(/Q|,/g, '')) || 0;
            const paid = (p.payments || []).reduce((s, pay) => s + pay.amount, 0);
            return sum + (total - paid);
        }, 0);
    setPaymentAmount(totalDebt.toFixed(2));
    setPaymentDoc('');
    setIsPaymentDialogOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!cliente || !paymentAmount || !paymentMethod) {
        toast({ title: 'Error', description: 'Por favor ingresa un monto y selecciona un método de pago.', variant: 'destructive' });
        return;
    }
    const amount = parseFloat(paymentAmount);
    if(isNaN(amount) || amount <= 0) {
        toast({ title: 'Monto inválido', description: 'El monto debe ser un número positivo.', variant: 'destructive' });
        return;
    }
    
    const selectedMethod = availablePaymentMethods.find(m => m.id.toString() === paymentMethod);
    if (!selectedMethod) return;

    await registerBulkPayment(cliente.id, amount, selectedMethod.name, paymentDoc);
    
    const firstInvoice = (cliente.purchaseHistory || []).find(p => p.status === 'Pendiente de Pago' || p.status === 'Pago Parcial' || p.status === 'Certificado');

    await addCashRegisterMovement({
        id: Date.now(),
        fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
        tipo: 'Pago Factura',
        concepto: `Abono a cuenta de ${cliente.name}`,
        ingreso: amount,
        egreso: 0,
        branchId: firstInvoice?.branchId || "1", // Fallback to a default
        terminalId: firstInvoice?.terminalId || undefined,
        paymentMethod: selectedMethod.name,
    });

    toast({
        title: 'Pago Registrado',
        description: `Se ha registrado un abono de Q${amount.toFixed(2)} a la cuenta de ${cliente.name}.`,
    });
    
    setIsPaymentDialogOpen(false);
    setPaymentAmount('');
    await cargarCliente(); // Recargar datos del cliente
  };

  const handleOpenReservationDialog = (reservation: Reservation) => {
    setEditingReservation(JSON.parse(JSON.stringify(reservation))); // Deep copy for editing
    setIsReservationDialogOpen(true);
  };

  const handleAddProductToReservation = () => {
    if (!editingReservation) return;
    setEditingReservation(prev => {
        if (!prev) return null;
        const newProduct: ReservationProduct = { sku: '', name: 'Nuevo Producto', qty: 1, price: 0 };
        return { ...prev, products: [...prev.products, newProduct] };
    });
  };

  const handleReservationProductChange = (index: number, field: keyof ReservationProduct, value: string | number) => {
    if (!editingReservation) return;
    let updatedProducts = [...editingReservation.products];
    if (field === 'sku') {
        const product = allProducts.find(p => p.codes.some(c => c.value === value));
        if (product && cliente) {
            const price = product.prices.find(p => p.tierName === cliente.priceTier)?.price || 0;
            updatedProducts[index] = { ...updatedProducts[index], sku: value as string, name: product.name, price };
        }
    } else {
       if (field === 'qty') {
            const newQty = Math.max(1, Number(value) || 1);
            (updatedProducts[index] as any)[field] = newQty;
       } else {
           (updatedProducts[index] as any)[field] = value;
       }
    }

    const totalAmount = updatedProducts.reduce((sum, p) => sum + (p.qty * p.price), 0);
    const remainingBalance = totalAmount - editingReservation.advancePayment;
    setEditingReservation(prev => prev ? { ...prev, products: updatedProducts, totalAmount, remainingBalance } : null);
  };
  
  const handleRemoveProductFromReservation = (index: number) => {
    if (!editingReservation) return;
    const updatedProducts = editingReservation.products.filter((_, i) => i !== index);
    const totalAmount = updatedProducts.reduce((sum, p) => sum + (p.qty * p.price), 0);
    const remainingBalance = totalAmount - editingReservation.advancePayment;
    setEditingReservation(prev => prev ? { ...prev, products: updatedProducts, totalAmount, remainingBalance } : null);
  };
  
  const handleSaveReservationChanges = async () => {
    if (!editingReservation || !cliente) return;
    await saveReservation(cliente.id, editingReservation);
    toast({ title: 'Reservación Actualizada', description: `Los cambios en ${editingReservation.id} han sido guardados.` });
    setIsReservationDialogOpen(false);
    setEditingReservation(null);
    cargarCliente();
  };

  if (cliente === undefined) {
    return <EsqueletoDetalleCliente />;
  }

  if (!cliente) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Cliente no encontrado</h2>
        <p className="text-muted-foreground">El cliente que buscas no existe.</p>
        <Button asChild className="mt-4">
          <Link href="/customers">Volver a Clientes</Link>
        </Button>
      </div>
    );
  }

  const telefonoPrincipal = (cliente.phones || []).find(p => p.isPrimary) || (cliente.phones || [])[0];
  const hasPendingInvoices = (cliente.purchaseHistory || []).some(p => p.status === 'Pendiente de Pago' || p.status === 'Pago Parcial' || p.status === 'Certificado');
  
  const obtenerVarianteEstadoDocumento = (estado: string, dueDate?: string): "secondary" | "outline" | "destructive" | "default" => {
    if (estado === 'Pendiente de Pago' && dueDate && isPast(parseISO(dueDate))) {
        return 'destructive';
    }
    switch (estado) {
        case 'Aceptado':
        case 'Convertido':
        case 'Pagado':
        case 'Certificado':
        case 'Recibido':
        case 'Completado':
            return 'secondary';
        case 'Enviado':
        case 'Borrador':
        case 'Pendiente de Pago':
        case 'Pago Parcial':
        case 'Pendiente':
        case 'Esperando Surtido':
        case 'Listo para Recoger':
            return 'outline';
        case 'Vencido':
        case 'Rechazado':
        case 'Anulado':
        case 'Cancelada':
        case 'Cancelado':
            return 'destructive';
        default:
            return 'default';
    }
  };
  
  const metodoPagoActual = availablePaymentMethods.find(m => m.id.toString() === paymentMethod);
  const mostrarCampoDocumento = metodoPagoActual && metodoPagoActual.name !== 'Efectivo';


  return (
    <>
    <div className="space-y-6">
      {/* Cabecera con navegación y acciones principales */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <Button variant="outline" size="icon" asChild>
            <Link href="/customers">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver a Clientes</span>
            </Link>
          </Button>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Ficha del Cliente</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href={`/customers/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar Cliente
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Tarjeta de contacto principal */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={`https://placehold.co/64x64.png`} alt={cliente.name} data-ai-hint="user avatar" />
            <AvatarFallback>{cliente.avatar}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{cliente.name}</CardTitle>
            <div className="text-sm text-muted-foreground mt-1">
              <Badge variant="secondary">{cliente.type}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{cliente.email}</span>
          </div>
          {telefonoPrincipal && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{telefonoPrincipal.number} {(cliente.phones?.length || 0) > 1 && `(y ${(cliente.phones?.length || 0) - 1} más)`}</span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Sistema de pestañas para el resto de la información */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="history">Historial de Compras</TabsTrigger>
          <TabsTrigger value="quotes">Presupuestos</TabsTrigger>
          <TabsTrigger value="reservations">Apartados y Encargos</TabsTrigger>
          <TabsTrigger value="notes">Notas Internas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
           <div className="grid lg:grid-cols-2 gap-6">
             <Card>
                <CardHeader>
                  <CardTitle>Información Fiscal y Económica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                   <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-muted-foreground"><FileText className="h-4 w-4"/> NIT</span>
                    <span className="font-semibold">{cliente.nit}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-muted-foreground"><FileText className="h-4 w-4"/> Nombre Fiscal</span>
                    <span className="font-semibold">{cliente.fiscalName}</span>
                  </div>
                  <hr className="my-2"/>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-muted-foreground"><DollarSign className="h-4 w-4"/> Gasto Total</span>
                    <span className="font-semibold">{cliente.totalSpent}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4"/> Última Compra</span>
                    <span className="font-semibold">{cliente.lastPurchase}</span>
                  </div>
                   <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-muted-foreground"><Tag className="h-4 w-4"/> Tarifa Asignada</span>
                    <span className="font-semibold">{cliente.priceTier}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-muted-foreground"><CreditCard className="h-4 w-4"/> Límite de Crédito</span>
                    <span className="font-semibold">{cliente.creditLimit}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4"/> Plazo de Crédito (días)</span>
                    <span className="font-semibold">{cliente.creditTerms === '0' ? 'Contado' : `${cliente.creditTerms} días`}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-muted-foreground"><Wallet className="h-4 w-4"/> Saldo Actual</span>
                    <span className="font-semibold text-lg text-red-600">{cliente.currentBalance}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-muted-foreground"><Percent className="h-4 w-4"/> Descuento Máx. Ventas</span>
                    <span className="font-semibold">{cliente.maxSalesDiscount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-muted-foreground"><FileText className="h-4 w-4"/> Pago Habitual</span>
                    <span className="font-semibold">{cliente.usualPaymentMethod}</span>
                  </div>
                </CardContent>
              </Card>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Direcciones</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(cliente.addresses || []).map(addr => (
                      <div key={addr.id} className="flex gap-3">
                        <MapPin className="h-5 w-5 mt-1 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{addr.street}</p>
                          <p className="text-sm text-muted-foreground">{addr.city}</p>
                          {addr.isPrimary && (
                            <Badge variant="outline" className="mt-2 flex items-center w-fit">
                              <Home className="h-3 w-3 mr-1.5" />
                              Dirección Principal
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Teléfonos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     {(cliente.phones || []).map(phone => (
                      <div key={phone.id} className="flex gap-3">
                        <Phone className="h-5 w-5 mt-1 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{phone.number}</p>
                          {phone.isPrimary && (
                            <Badge variant="outline" className="mt-2 flex items-center w-fit">
                              <Phone className="h-3 w-3 mr-1.5" />
                              Teléfono Principal
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
           </div>
        </TabsContent>
        
        <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Historial de Compras y Productos</CardTitle>
                        <CardDescription>Resumen de transacciones y productos despachados al cliente.</CardDescription>
                    </div>
                    {hasPendingInvoices && (
                        <Button onClick={handleOpenPaymentDialog}>
                            <HandCoins className="mr-2 h-4 w-4" />
                            Abonar a Cuenta
                        </Button>
                    )}
                </div>
              </CardHeader>
              <CardContent>
                {(cliente.purchaseHistory || []).length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {(cliente.purchaseHistory || []).map((compra) => {
                      const totalFactura = parseFloat(compra.total.replace(/Q|,/g, '')) || 0;
                      const totalAbonado = (compra.payments || []).reduce((s, pay) => s + pay.amount, 0);
                      const saldoPendiente = totalFactura - totalAbonado;
                      
                      return (
                        <AccordionItem value={compra.invoice} key={compra.invoice}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex justify-between items-center w-full pr-4">
                              <div className="text-left">
                                <p className="font-semibold">{compra.invoice}</p>
                                <p className="text-sm text-muted-foreground">{compra.date}</p>
                              </div>
                              <Badge variant={obtenerVarianteEstadoDocumento(compra.status, compra.dueDate)}>
                                {compra.status === 'Pendiente de Pago' && compra.dueDate && isPast(parseISO(compra.dueDate)) ? 'Vencida' : compra.status}
                              </Badge>
                              <div className="font-semibold text-right">
                                <p>{compra.total}</p>
                                {saldoPendiente > 0 && <p className="text-xs text-red-500">Pendiente: Q{saldoPendiente.toFixed(2)}</p>}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="px-4 pt-2 pb-4 border-t space-y-4">
                              <div className="bg-muted/50 p-3 rounded-md grid grid-cols-3 gap-4 text-center">
                                  <div>
                                      <p className="text-xs text-muted-foreground">Total Factura</p>
                                      <p className="font-bold">Q{totalFactura.toFixed(2)}</p>
                                  </div>
                                   <div>
                                      <p className="text-xs text-muted-foreground">Total Abonado</p>
                                      <p className="font-bold text-green-600">Q{totalAbonado.toFixed(2)}</p>
                                  </div>
                                   <div>
                                      <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
                                      <p className="font-bold text-red-600">Q{saldoPendiente.toFixed(2)}</p>
                                  </div>
                              </div>
                              <div>
                                  <h4 className="font-semibold mb-2 mt-2 flex items-center gap-2"><Package className="h-4 w-4"/>Productos Despachados</h4>
                                  <Table>
                                  <TableHeader>
                                      <TableRow>
                                      <TableHead>SKU</TableHead>
                                      <TableHead>Producto</TableHead>
                                      <TableHead className="text-right">Cantidad</TableHead>
                                      <TableHead className="text-right">Precio Unit.</TableHead>
                                      <TableHead className="text-right">Subtotal</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {compra.products.map((producto) => (
                                      <TableRow key={producto.sku}>
                                          <TableCell>{producto.sku}</TableCell>
                                          <TableCell>{producto.name}</TableCell>
                                          <TableCell className="text-right">{producto.qty}</TableCell>
                                          <TableCell className="text-right">Q{producto.price.toFixed(2)}</TableCell>
                                          <TableCell className="text-right font-medium">Q{(producto.price * producto.qty).toFixed(2)}</TableCell>
                                      </TableRow>
                                      ))}
                                  </TableBody>
                                  </Table>
                              </div>
                              {(compra.payments && compra.payments.length > 0) && (
                                  <div className="pt-4 border-t">
                                      <h4 className="font-semibold mb-2 flex items-center gap-2"><Banknote className="h-4 w-4"/>Pagos Registrados</h4>
                                      <Table>
                                      <TableHeader>
                                          <TableRow>
                                              <TableHead>Fecha</TableHead>
                                              <TableHead>Método</TableHead>
                                              <TableHead>No. Doc</TableHead>
                                              <TableHead className="text-right">Monto</TableHead>
                                          </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                          {compra.payments.map((payment, index) => (
                                              <TableRow key={index}>
                                                  <TableCell>{format(new Date(payment.date), 'dd/MM/yyyy')}</TableCell>
                                                  <TableCell>{payment.method}</TableCell>
                                                  <TableCell>{payment.documentNumber}</TableCell>
                                                  <TableCell className="text-right font-medium">Q{payment.amount.toFixed(2)}</TableCell>
                                              </TableRow>
                                          ))}
                                      </TableBody>
                                      </Table>
                                  </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    })}
                  </Accordion>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Este cliente aún no tiene historial de compras.</p>
                )}
              </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="quotes">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Presupuestos</CardTitle>
                <CardDescription>Presupuestos enviados a este cliente.</CardDescription>
              </CardHeader>
              <CardContent>
                {(cliente.quotes || []).length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {(cliente.quotes || []).map((presupuesto) => (
                      <AccordionItem value={presupuesto.id} key={presupuesto.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex justify-between items-center w-full pr-4">
                            <div className="text-left">
                              <p className="font-semibold">{presupuesto.id}</p>
                              <p className="text-sm text-muted-foreground">{presupuesto.date}</p>
                            </div>
                            <Badge variant={obtenerVarianteEstadoDocumento(presupuesto.status)}>
                              {presupuesto.status}
                            </Badge>
                            <p className="font-semibold text-right">{presupuesto.total}</p>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="px-4 pt-2 pb-4 border-t">
                            <h4 className="font-semibold mb-2 mt-2 flex items-center gap-2"><ClipboardList className="h-4 w-4"/>Productos del Presupuesto</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>SKU</TableHead>
                                  <TableHead>Producto</TableHead>
                                  <TableHead className="text-right">Cantidad</TableHead>
                                  <TableHead className="text-right">Precio</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {presupuesto.products.map((producto, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{producto.sku}</TableCell>
                                    <TableCell>{producto.name}</TableCell>
                                    <TableCell className="text-right">{producto.qty}</TableCell>
                                    <TableCell className="text-right">Q{producto.price.toFixed(2)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Este cliente aún no tiene presupuestos.</p>
                )}
              </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="reservations">
            <Card>
              <CardHeader>
                <CardTitle>Apartados y Encargos</CardTitle>
                <CardDescription>Reservaciones de productos realizadas por este cliente.</CardDescription>
              </CardHeader>
              <CardContent>
                 {(cliente.reservations || []).length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {(cliente.reservations || []).map((res) => (
                            <AccordionItem value={res.id} key={res.id}>
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex justify-between items-center w-full pr-4">
                                        <div className="text-left">
                                            <p className="font-semibold">{res.id} ({res.type})</p>
                                            <p className="text-sm text-muted-foreground">{format(new Date(res.date), 'dd/MM/yyyy')}</p>
                                        </div>
                                        <Badge variant={obtenerVarianteEstadoDocumento(res.status, res.expiryDate)}>
                                            {res.status === 'Pendiente' && res.expiryDate && isPast(parseISO(res.expiryDate)) ? 'Vencido' : res.status}
                                        </Badge>
                                        <div className="font-semibold text-right">
                                            <p>Q{res.totalAmount.toFixed(2)}</p>
                                            {res.remainingBalance > 0 && <p className="text-xs text-red-500">Pendiente: Q{res.remainingBalance.toFixed(2)}</p>}
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="px-4 pt-2 pb-4 border-t space-y-4">
                                        <Table>
                                            <TableHeader>
                                                <TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {res.products.map((p, i) => (
                                                    <TableRow key={i}><TableCell>{p.name}</TableCell><TableCell className="text-right">{p.qty}</TableCell></TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        <div className="flex justify-end">
                                            <Button size="sm" onClick={() => handleOpenReservationDialog(res)}>
                                                <Edit3 className="mr-2 h-4 w-4" />Gestionar Reservación
                                            </Button>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                 ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Este cliente no tiene apartados ni encargos.</p>
                 )}
              </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Notas Internas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{cliente.notes || "No hay notas para este cliente."}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

     {/* Bulk Payment Dialog */}
    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abonar a la Cuenta de {cliente.name}</DialogTitle>
          <DialogDescription>
            Ingresa el monto total a abonar. El sistema lo aplicará a las facturas más antiguas primero.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="payment-amount" className="text-right">Monto a Pagar</Label>
            <Input
              id="payment-amount"
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="col-span-3"
              placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="payment-method" className="text-right">Método</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="payment-method" className="col-span-3">
                <SelectValue placeholder="Seleccionar método..." />
              </SelectTrigger>
              <SelectContent>
                {availablePaymentMethods.map(method => (
                  <SelectItem key={method.id} value={method.id.toString()}>
                    {method.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           {mostrarCampoDocumento && (
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="payment-doc" className="text-right">No. Doc / Ref.</Label>
                  <Input
                      id="payment-doc"
                      value={paymentDoc}
                      onChange={(e) => setPaymentDoc(e.target.value)}
                      className="col-span-3"
                      placeholder="Ej: Cheque 12345, Transf. 67890"
                  />
              </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleConfirmPayment}>Confirmar Abono</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

     {/* Edit Reservation Dialog */}
     <Dialog open={isReservationDialogOpen} onOpenChange={setIsReservationDialogOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Gestionar {editingReservation?.type}: {editingReservation?.id}</DialogTitle>
                <DialogDescription>Modifica los productos o cantidades y guarda los cambios.</DialogDescription>
            </DialogHeader>
            {editingReservation && (
                <div className="py-4">
                    <Table>
                        <TableHeader>
                            <TableRow><TableHead>Producto</TableHead><TableHead className="w-24">Cant.</TableHead><TableHead className="w-32">Precio</TableHead><TableHead className="w-12"></TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                            {editingReservation.products.map((p, i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-start">{p.name || "Seleccionar..."}</Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Buscar producto..." onValueChange={setProductSearch}/>
                                                    <CommandList>
                                                        <CommandEmpty>No se encontró.</CommandEmpty>
                                                        <CommandGroup>
                                                            {allProducts.filter(prod => prod.name.toLowerCase().includes(productSearch.toLowerCase())).map(prod => (
                                                                <CommandItem key={prod.id} onSelect={() => handleReservationProductChange(i, 'sku', prod.codes.find(c=>c.type==='SKU')?.value || '')}>
                                                                    {prod.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </TableCell>
                                    <TableCell><Input type="number" min="1" value={p.qty} onChange={(e) => handleReservationProductChange(i, 'qty', parseInt(e.target.value, 10) || 1)}/></TableCell>
                                    <TableCell><Input type="number" value={p.price} onChange={(e) => handleReservationProductChange(i, 'price', parseFloat(e.target.value) || 0)}/></TableCell>
                                    <TableCell><Button size="icon" variant="destructive" onClick={() => handleRemoveProductFromReservation(i)}><Trash2 className="h-4 w-4"/></Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Button variant="outline" size="sm" className="mt-4" onClick={handleAddProductToReservation}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Producto</Button>
                </div>
            )}
            <DialogFooter>
                <Button variant="secondary" onClick={() => setIsReservationDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveReservationChanges}>Guardar Cambios</Button>
            </DialogFooter>
        </DialogContent>
     </Dialog>
    </>
  )
}

function EsqueletoDetalleCliente() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className='space-y-2'>
                        <Skeleton className="h-7 w-40" />
                        <Skeleton className="h-5 w-32" />
                    </div>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                </CardContent>
            </Card>

            <div className="space-y-4">
                <Skeleton className="h-10 w-96" />
                <div className="grid lg:grid-cols-2 gap-6">
                    <Skeleton className="h-72 w-full" />
                    <div className="space-y-6">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                </div>
            </div>
        </div>
    )
}

    
