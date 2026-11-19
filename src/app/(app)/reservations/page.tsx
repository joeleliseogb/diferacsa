

'use client'

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, DollarSign, PlusCircle, Trash2 } from "lucide-react";
import { getAllReservations, getCustomer, getProducts, getProduct, saveReservation, addCashRegisterMovement, type ReservationWithDetails, type Product, type Customer, type ReservationProduct } from "@/lib/servicios";
import { Skeleton } from '@/components/ui/skeleton';
import { format, isPast, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


export default function ReservationsPage() {
    const { toast } = useToast();
    const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReservation, setSelectedReservation] = useState<ReservationWithDetails | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [editingReservation, setEditingReservation] = useState<ReservationWithDetails | null>(null);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [productSearch, setProductSearch] = useState('');

    async function loadData() {
        setLoading(true);
        const [reservationsData, productsData] = await Promise.all([
            getAllReservations(),
            getProducts()
        ]);
        setReservations(reservationsData);
        setAllProducts(productsData);
        setLoading(false);
    }

    useEffect(() => {
        loadData();
    }, []);

    const handleViewDetails = (reservation: ReservationWithDetails) => {
        setEditingReservation(JSON.parse(JSON.stringify(reservation))); // Deep copy for editing
        setSelectedReservation(reservation);
        setIsDetailOpen(true);
    };

    const handleAddProductToReservation = () => {
        if (!editingReservation) return;
        setEditingReservation(prev => {
            if (!prev) return null;
            const newProduct: ReservationProduct = { sku: '', name: 'Nuevo Producto', qty: 1, price: 0 };
            return { ...prev, products: [...prev.products, newProduct] };
        });
    };

    const handleProductChange = (index: number, sku: string) => {
        const product = allProducts.find(p => p.codes.some(c => c.value === sku));
        if (product && editingReservation) {
            const customerId = editingReservation.customerId;
            getCustomer(customerId).then(customer => {
                if (customer) {
                    const priceTier = customer.priceTier;
                    const price = product.prices.find(p => p.tierName === priceTier)?.price || 0;
                    handleReservationProductChange(index, 'sku', sku);
                    handleReservationProductChange(index, 'name', product.name);
                    handleReservationProductChange(index, 'price', price);
                }
            });
        }
    };
    
    const handleReservationProductChange = (index: number, field: keyof ReservationProduct, value: string | number) => {
        if (!editingReservation) return;
        const updatedProducts = [...editingReservation.products];
        if (field === 'qty') {
            const newQty = Math.max(1, Number(value) || 1);
            (updatedProducts[index] as any)[field] = newQty;
        } else {
            (updatedProducts[index] as any)[field] = value;
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

    const handleSaveChanges = async () => {
        if (!editingReservation) return;
        await saveReservation(editingReservation.customerId, editingReservation);
        toast({ title: 'Reservación Actualizada', description: `Los cambios en ${editingReservation.id} han sido guardados.` });
        setIsDetailOpen(false);
        setEditingReservation(null);
        loadData();
    };
    
    const handleOpenPaymentDialog = (reservation: ReservationWithDetails) => {
        setSelectedReservation(reservation);
        setPaymentAmount(reservation.remainingBalance);
        setIsPaymentOpen(true);
    };
    
    const handleRegisterPayment = async () => {
        if (!selectedReservation || paymentAmount <= 0 || paymentAmount > selectedReservation.remainingBalance) {
            toast({ title: 'Monto inválido', description: 'El abono no puede ser cero o mayor al saldo pendiente.', variant: 'destructive' });
            return;
        }

        const updatedReservation = { ...selectedReservation };
        updatedReservation.advancePayment += paymentAmount;
        updatedReservation.remainingBalance -= paymentAmount;
        if (updatedReservation.remainingBalance <= 0.01) { // Tolerance
            updatedReservation.status = 'Listo para Recoger';
        }
        
        await saveReservation(updatedReservation.customerId, updatedReservation);
        await addCashRegisterMovement({
            id: Date.now(),
            fecha: new Date().toISOString(),
            tipo: 'Pago Factura',
            concepto: `Abono a ${updatedReservation.type} #${updatedReservation.id}`,
            ingreso: paymentAmount,
            egreso: 0,
            branchId: updatedReservation.warehouseId,
            paymentMethod: 'Efectivo', // Assuming cash for now
        });

        toast({ title: 'Abono Registrado', description: `Se ha registrado un abono de Q${paymentAmount.toFixed(2)}.` });
        setIsPaymentOpen(false);
        loadData();
    };


    const getStatusVariant = (status: ReservationWithDetails['status'], expiryDate?: string) => {
        if (status === 'Pendiente' && expiryDate && isPast(parseISO(expiryDate))) {
            return 'destructive';
        }
        switch (status) {
            case 'Completado': return 'secondary';
            case 'Listo para Recoger': return 'default';
            case 'Pendiente':
            case 'Esperando Surtido':
                return 'outline';
            case 'Cancelado':
            case 'Vencido':
                return 'destructive';
            default: return 'default';
        }
    };

    const getStatusLabel = (status: ReservationWithDetails['status'], expiryDate?: string) => {
        if (status === 'Pendiente' && expiryDate && isPast(parseISO(expiryDate))) {
            return 'Vencido';
        }
        return status;
    };


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Apartados y Encargos</h1>
            </div>
            <p className="text-muted-foreground">Gestiona los productos reservados y los encargos especiales de tus clientes.</p>
            <Card>
                <CardHeader>
                    <CardTitle>Listado de Operaciones</CardTitle>
                    <CardDescription>Visualiza todas las reservaciones (apartados) y los pedidos especiales (encargos).</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Total (Anticipo)</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : reservations.length > 0 ? (
                                reservations.map((res) => (
                                    <TableRow key={res.id}>
                                        <TableCell className="font-medium">{res.id}</TableCell>
                                        <TableCell>
                                            <Badge variant={res.type === 'apartado' ? 'secondary' : 'outline'}>
                                                {res.type === 'apartado' ? 'Apartado' : 'Encargo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{res.customerName}</TableCell>
                                        <TableCell>{format(new Date(res.date), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(res.status, res.expiryDate)}>
                                                {getStatusLabel(res.status, res.expiryDate)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            Q{res.totalAmount.toFixed(2)}
                                            <span className="text-muted-foreground text-xs"> (Q{res.advancePayment.toFixed(2)})</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleViewDetails(res)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No hay apartados ni encargos registrados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Detalle de {editingReservation?.type}: {editingReservation?.id}</DialogTitle>
                        <DialogDescription>Cliente: {editingReservation?.customerName}</DialogDescription>
                    </DialogHeader>
                    {editingReservation && (
                        <div className="grid grid-cols-3 gap-6 py-4">
                           <div className="col-span-2 space-y-4">
                             <h4 className="font-semibold">Productos</h4>
                             <Table>
                                <TableHeader>
                                    <TableRow><TableHead>Producto</TableHead><TableHead>Cant.</TableHead><TableHead>Precio</TableHead><TableHead>Acción</TableHead></TableRow>
                                </TableHeader>
                                <TableBody>
                                    {editingReservation.products.map((p, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className="w-full justify-start">{p.name}</Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[300px] p-0">
                                                        <Command>
                                                            <CommandInput placeholder="Buscar producto..." onValueChange={setProductSearch}/>
                                                            <CommandList>
                                                                <CommandEmpty>No se encontró.</CommandEmpty>
                                                                <CommandGroup>
                                                                    {allProducts.filter(prod => prod.name.toLowerCase().includes(productSearch.toLowerCase())).map(prod => (
                                                                        <CommandItem key={prod.id} onSelect={() => handleProductChange(i, prod.codes[0].value)}>
                                                                            {prod.name}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            </TableCell>
                                            <TableCell><Input type="number" min="1" value={p.qty} onChange={(e) => handleReservationProductChange(i, 'qty', parseInt(e.target.value))} className="w-20" /></TableCell>
                                            <TableCell><Input type="number" value={p.price} onChange={(e) => handleReservationProductChange(i, 'price', parseFloat(e.target.value))} className="w-24" /></TableCell>
                                            <TableCell><Button size="icon" variant="destructive" onClick={() => handleRemoveProductFromReservation(i)}><Trash2 className="h-4 w-4"/></Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                             </Table>
                             <Button variant="outline" onClick={handleAddProductToReservation}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Producto</Button>
                           </div>
                           <div className="col-span-1 space-y-4">
                                <h4 className="font-semibold">Resumen Financiero</h4>
                                <div className="space-y-2 p-4 border rounded-md">
                                    <div className="flex justify-between"><span>Total:</span><span className="font-bold">Q{editingReservation.totalAmount.toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span>Anticipo:</span><span>Q{editingReservation.advancePayment.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Saldo:</span><span>Q{editingReservation.remainingBalance.toFixed(2)}</span></div>
                                </div>
                                <Button onClick={() => handleOpenPaymentDialog(editingReservation)} className="w-full" disabled={editingReservation.remainingBalance <= 0}>
                                    <DollarSign className="mr-2 h-4 w-4"/> Registrar Abono
                                </Button>
                           </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveChanges}>Guardar Cambios</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Registrar Abono para {selectedReservation?.id}</DialogTitle>
                        <DialogDescription>Saldo actual: Q{selectedReservation?.remainingBalance.toFixed(2)}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="paymentAmount">Monto a Abonar</Label>
                        <Input 
                            id="paymentAmount" 
                            type="number" 
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                            max={selectedReservation?.remainingBalance}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose>
                        <Button onClick={handleRegisterPayment}>Confirmar Abono</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
