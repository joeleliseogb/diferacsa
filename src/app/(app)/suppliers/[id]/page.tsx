
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
import { ArrowLeft, Edit, FileText, MapPin, Phone, Mail, Home, Clock, Wallet, Percent, Package, HandCoins, Banknote } from "lucide-react"
import Link from "next/link"
import { getSupplier, type Supplier, getPaymentMethods, type PaymentMethod, registerBulkSupplierPayment, addCashRegisterMovement } from "@/lib/servicios"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

export default function SupplierDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<Supplier | null | undefined>(undefined);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDoc, setPaymentDoc] = useState('');
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentMethod[]>([]);

  async function loadData() {
    if (id) {
        const data = await getSupplier(id);
        setSupplier(data);
    }
  }

  useEffect(() => {
    loadData();
    async function loadPaymentMethods() {
        const methods = await getPaymentMethods();
        setAvailablePaymentMethods(methods);
        if(methods.length > 0) {
            setPaymentMethod(methods[0].id.toString());
        }
    }
    loadPaymentMethods();
  }, [id]);

  const handleOpenPaymentDialog = () => {
    const totalDebt = parseFloat(supplier?.currentBalance.replace(/[Q,]/g, '') || '0');
    setPaymentAmount(totalDebt.toFixed(2));
    setPaymentDoc('');
    setIsPaymentDialogOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!supplier || !paymentAmount || !paymentMethod) {
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

    await registerBulkSupplierPayment(supplier.id, amount, selectedMethod.name, paymentDoc);
    
    await addCashRegisterMovement({
        id: Date.now(),
        fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
        tipo: 'Gasto',
        concepto: `Abono a cuenta de proveedor ${supplier.name}`,
        ingreso: 0,
        egreso: amount,
        branchId: "1", // Needs a way to determine branch
        terminalId: undefined,
        paymentMethod: selectedMethod.name,
    });

    toast({
        title: 'Pago Registrado',
        description: `Se ha registrado un abono de Q${amount.toFixed(2)} a la cuenta de ${supplier.name}.`,
    });
    
    setIsPaymentDialogOpen(false);
    setPaymentAmount('');
    await loadData(); // Recargar datos del proveedor
  };

  if (supplier === undefined) {
    return <SupplierDetailSkeleton />;
  }

  if (!supplier) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Proveedor no encontrado</h2>
        <p className="text-muted-foreground">El proveedor que buscas no existe.</p>
        <Button asChild className="mt-4">
          <Link href="/suppliers">Volver a Proveedores</Link>
        </Button>
      </div>
    );
  }

  const primaryPhone = (supplier.phones || []).find(p => p.isPrimary) || (supplier.phones || [])[0];
  const hasPendingOrders = parseFloat(supplier.currentBalance.replace(/[Q,]/g, '')) > 0;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Recibido':
      case 'Pagado':
        return 'secondary';
      case 'Pendiente':
      case 'Recibido Parcial':
      case 'Pago Parcial':
        return 'outline';
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <Button variant="outline" size="icon" asChild>
            <Link href="/suppliers">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver a Proveedores</span>
            </Link>
          </Button>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Ficha del Proveedor</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href={`/suppliers/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar Proveedor
            </Link>
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={`https://placehold.co/64x64.png`} alt={supplier.name} data-ai-hint="company logo" />
            <AvatarFallback>{supplier.avatar}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{supplier.name}</CardTitle>
            <CardDescription>
              Contacto: {supplier.contactPerson}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{supplier.email}</span>
          </div>
          {primaryPhone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{primaryPhone.number} {(supplier.phones || []).length > 1 && `(y ${(supplier.phones || []).length -1} más)`}</span>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="history">Historial de Compras</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
           <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Información Fiscal y Comercial</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-muted-foreground"><FileText className="h-4 w-4"/> NIT</span>
                        <span className="font-semibold">{supplier.nit}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-muted-foreground"><FileText className="h-4 w-4"/> Nombre Fiscal</span>
                        <span className="font-semibold">{supplier.fiscalName}</span>
                      </div>
                      <hr className="my-2"/>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4"/> Plazo de Crédito (días)</span>
                        <span className="font-semibold">{supplier.creditTerms === '0' ? 'Contado' : `${supplier.creditTerms} días`}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-muted-foreground"><FileText className="h-4 w-4"/> Pago Habitual</span>
                        <span className="font-semibold">{supplier.usualPaymentMethod}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-muted-foreground"><Wallet className="h-4 w-4"/> Saldo Actual</span>
                        <span className="font-semibold">{supplier.currentBalance}</span>
                      </div>
                      <hr className="my-2"/>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-muted-foreground"><Percent className="h-4 w-4"/> Descuento Máximo</span>
                        <span className="font-semibold">{supplier.maxPurchaseDiscount}</span>
                      </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Notas Internas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{supplier.notes || "No hay notas para este proveedor."}</p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Direcciones</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(supplier.addresses || []).map(addr => (
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
                      {(supplier.phones || []).map(phone => (
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
                        <CardTitle>Historial de Compras</CardTitle>
                        <CardDescription>Resumen de órdenes de compra y productos recibidos del proveedor.</CardDescription>
                    </div>
                    {hasPendingOrders && (
                        <Button onClick={handleOpenPaymentDialog}>
                            <HandCoins className="mr-2 h-4 w-4" />
                            Abonar a Cuenta
                        </Button>
                    )}
                </div>
              </CardHeader>
              <CardContent>
                {(supplier.purchaseHistory || []).length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {(supplier.purchaseHistory || []).map((purchase) => (
                      <AccordionItem value={purchase.order} key={purchase.order}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex justify-between items-center w-full pr-4">
                            <div className="text-left">
                              <p className="font-semibold">{purchase.order}</p>
                              <p className="text-sm text-muted-foreground">{purchase.date}</p>
                            </div>
                            <Badge variant={getStatusVariant(purchase.status)}>{purchase.status}</Badge>
                            <p className="font-semibold text-right">{purchase.total}</p>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="px-4 pt-2 pb-4 border-t space-y-4">
                            <div>
                                <h4 className="font-semibold mb-2 mt-2 flex items-center gap-2"><Package className="h-4 w-4"/>Productos Recibidos</h4>
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-right">Cantidad</TableHead>
                                    <TableHead className="text-right">Costo Unit.</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchase.products.map((product) => (
                                    <TableRow key={product.sku}>
                                        <TableCell>{product.sku}</TableCell>
                                        <TableCell>{product.name}</TableCell>
                                        <TableCell className="text-right">{product.qty}</TableCell>
                                        <TableCell className="text-right">Q{product.cost.toFixed(2)}</TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                                </Table>
                            </div>
                             {(purchase.payments && purchase.payments.length > 0) && (
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
                                        {purchase.payments.map((payment, index) => (
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
                    ))}
                  </Accordion>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Este proveedor aún no tiene historial de compras.</p>
                )}
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>

    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abonar a la Cuenta de {supplier.name}</DialogTitle>
          <DialogDescription>
            Ingresa el monto total a abonar. El sistema lo aplicará a las órdenes de compra más antiguas primero.
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
    </>
  )
}

function SupplierDetailSkeleton() {
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
                <Skeleton className="h-10 w-64" />
                 <div className="grid lg:grid-cols-2 gap-6">
                    <Skeleton className="h-72 w-full" />
                    <Skeleton className="h-72 w-full" />
                 </div>
            </div>
        </div>
    )
}
