
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, PlusCircle, User, Wrench, Package, FileText, FilePlus, Trash2, Milestone, ListChecks, Shield, Printer, History } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { getRepairOrder, saveRepairOrder, getProducts, getUsers, addPurchaseToHistory, generateNewInvoiceId, sellStock, getCompanyInfo, getRepairHistoryForEquipment, type RepairOrder, type Product, type User, type Customer } from '@/lib/servicios';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { PrintableDocument } from '@/components/printable-document';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


type RepairPart = { sku: string; name: string; qty: number; price: number };

export default function EditRepairOrderPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { toast } = useToast();

    const [order, setOrder] = useState<RepairOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [technicians, setTechnicians] = useState<User[]>([]);
    const [newIncident, setNewIncident] = useState('');
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [equipmentHistory, setEquipmentHistory] = useState<RepairOrder[]>([]);
    const printableRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        async function loadData() {
            setLoading(true);
            if (id) {
                const [orderData, productsData, usersData, companyData] = await Promise.all([
                    getRepairOrder(id),
                    getProducts(),
                    getUsers(),
                    getCompanyInfo(),
                ]);
                
                setOrder(orderData);
                setCompanyInfo(companyData);

                if (orderData) {
                    const { getCustomer } = await import('@/lib/servicios');
                    setCustomer(await getCustomer(orderData.customerId) || null);
                    
                    if(orderData.equipment.serialNumber) {
                        const history = await getRepairHistoryForEquipment(orderData.equipment.serialNumber);
                        setEquipmentHistory(history.filter(h => h.id !== id));
                    }
                }

                setProducts(productsData);
                setTechnicians(usersData.filter(u => u.role === 'Jefe de Bodega' || u.role === 'Bodeguero' || u.role === 'Admin' || u.role === 'Gerente de Almacen'));
            }
            setLoading(false);
        }
        loadData();
    }, [id]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!order) return;
        setOrder(prev => prev ? { ...prev, diagnosis: e.target.value } : null);
    };

    const handleStatusChange = (value: RepairOrder['status']) => {
        if (!order) return;
        setOrder(prev => prev ? { ...prev, status: value } : null);
    };
    
    const handleTechnicianChange = (userId: string) => {
        if (!order) return;
        if(userId === 'unassigned') {
            setOrder(prev => prev ? { ...prev, technicianId: undefined, technicianName: undefined } : null);
            return;
        }
        const tech = technicians.find(t => t.id === userId);
        setOrder(prev => prev ? { ...prev, technicianId: tech?.id, technicianName: tech?.name } : null);
    };

    const handleAddPart = () => {
        if (!order) return;
        const newPart: RepairPart = { sku: '', name: '', qty: 1, price: 0 };
        const newQuote = {
            ...order.quote,
            parts: [...(order.quote?.parts || []), newPart],
            total: order.quote?.total || 0,
            isApproved: order.quote?.isApproved || false,
            laborCost: order.quote?.laborCost || 0,
        };
        setOrder(prev => prev ? { ...prev, quote: newQuote } : null);
    };
    
    const handlePartChange = (index: number, field: keyof RepairPart, value: any) => {
        if (!order?.quote?.parts) return;
        const newParts = [...order.quote.parts];
        if(field === 'sku') {
            const product = products.find(p => p.codes.some(c => c.value === value));
            if(product) {
                newParts[index].sku = value;
                newParts[index].name = product.name;
                newParts[index].price = product.prices[0]?.price || 0;
            }
        } else {
             (newParts[index] as any)[field] = value;
        }
        updateQuoteTotal(newParts, order.quote.laborCost);
    };

    const handleRemovePart = (index: number) => {
        if (!order?.quote?.parts) return;
        const newParts = order.quote.parts.filter((_, i) => i !== index);
        updateQuoteTotal(newParts, order.quote.laborCost);
    };
    
    const handleLaborCostChange = (value: number) => {
        if (!order) return;
        const laborCost = isNaN(value) ? 0 : value;
        updateQuoteTotal(order.quote?.parts || [], laborCost);
    };
    
    const updateQuoteTotal = (parts: RepairPart[], laborCost: number) => {
        const partsTotal = parts.reduce((sum, p) => sum + (p.qty * p.price), 0);
        const newTotal = partsTotal + laborCost;
        setOrder(prev => prev ? { ...prev, quote: { ...prev.quote!, parts, laborCost, total: newTotal } } : null);
    };

    const handleAddIncident = () => {
        if (!order || !newIncident.trim()) return;
        const incident = {
            date: new Date().toISOString(),
            description: newIncident.trim(),
        };
        setOrder(prev => prev ? { ...prev, incidents: [...prev.incidents, incident] } : null);
        setNewIncident('');
    };

    const handleSave = async () => {
        if (!order) return;
        await saveRepairOrder(order);
        toast({ title: "Orden Actualizada", description: `La orden de reparación ${order.id} ha sido guardada.` });
    };

    const handleInvoice = async () => {
        if (!order || !order.quote || order.status !== 'Reparado') return;
        const newInvoiceId = await generateNewInvoiceId();

        const productsToSell: any[] = order.quote.parts.map(p => ({ sku: p.sku, name: p.name, qty: p.qty, price: p.price }));
        if (order.quote.laborCost > 0) {
            productsToSell.push({ sku: 'SERV-REPAIR', name: `Mano de Obra, Orden #${order.id}`, qty: 1, price: order.quote.laborCost });
        }
        
        await sellStock(productsToSell, newInvoiceId, 1);

        await addPurchaseToHistory(order.customerId, {
            invoice: newInvoiceId,
            date: new Date().toISOString().split('T')[0],
            total: `Q${order.quote.total.toFixed(2)}`,
            status: 'Pendiente de Pago',
            products: productsToSell,
            notes: `Facturación de orden de reparación #${order.id}.`,
            branchId: "1",
            terminalId: undefined,
        });

        const updatedOrder = { ...order, invoiceId: newInvoiceId, status: 'Facturado' as const };
        await saveRepairOrder(updatedOrder);
        setOrder(updatedOrder);

        toast({ title: "Orden Facturada", description: `Se ha generado la factura ${newInvoiceId}.`});
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
              pdf.save(`Reparacion-${order.id}.pdf`);
            });
        }
      };

    if (loading) return <Skeleton className="h-[600px] w-full" />;
    if (!order) return <div>Orden no encontrada.</div>;

    return (
        <>
        <div className="space-y-6">
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/repairs"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <h1 className="text-2xl lg:text-3xl font-bold font-headline tracking-tight">Orden: {order.id}</h1>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
                    <Button variant="outline" onClick={handleSave}><Save className="mr-2 h-4 w-4" />Guardar</Button>
                     <Button onClick={handleInvoice} disabled={!order.quote || order.status !== 'Reparado' || !!order.invoiceId}>
                        <FileText className="mr-2 h-4 w-4"/>
                        {order.invoiceId ? `Facturado (${order.invoiceId})` : 'Facturar'}
                    </Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ListChecks />Diagnóstico y Cotización</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="diagnosis">Diagnóstico Técnico</Label>
                                <Textarea id="diagnosis" value={order.diagnosis || ''} onChange={handleInputChange} placeholder="Describe el problema encontrado y la solución propuesta." />
                            </div>
                             <div className="border-t pt-4">
                                <h4 className="font-semibold mb-2">Repuestos y Mano de Obra</h4>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="min-w-[200px]">Repuesto</TableHead>
                                                <TableHead>Cant.</TableHead>
                                                <TableHead>Precio</TableHead>
                                                <TableHead>Subtotal</TableHead>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(order.quote?.parts || []).map((part, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        <Select value={part.sku} onValueChange={value => handlePartChange(index, 'sku', value)}>
                                                            <SelectTrigger><SelectValue placeholder="Seleccionar repuesto..."/></SelectTrigger>
                                                            <SelectContent>
                                                                {products.filter(p => !p.isService).map(p => <SelectItem key={p.id} value={p.codes.find(c => c.type === 'SKU')?.value || ''}>{p.name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell><Input type="number" min="1" value={part.qty} onChange={e => handlePartChange(index, 'qty', parseInt(e.target.value) || 1)} className="w-20"/></TableCell>
                                                    <TableCell><Input type="number" min="0" value={part.price} onChange={e => handlePartChange(index, 'price', parseFloat(e.target.value) || 0)} className="w-24"/></TableCell>
                                                    <TableCell className="font-semibold">Q{(part.qty * part.price).toFixed(2)}</TableCell>
                                                    <TableCell><Button size="icon" variant="destructive" onClick={() => handleRemovePart(index)}><Trash2 className="h-4 w-4"/></Button></TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow>
                                                <TableCell colSpan={2} className="font-semibold">Mano de Obra</TableCell>
                                                <TableCell><Input type="number" min="0" value={order.quote?.laborCost || 0} onChange={e => handleLaborCostChange(parseFloat(e.target.value) || 0)} className="w-24" /></TableCell>
                                                <TableCell className="font-semibold">Q{(order.quote?.laborCost || 0).toFixed(2)}</TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                                <Button variant="outline" size="sm" className="mt-2" onClick={handleAddPart}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Repuesto</Button>
                             </div>
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-muted p-4 gap-4">
                            <div>
                                <Label className="flex items-center gap-2">
                                    <Checkbox checked={order.quote?.isApproved} onCheckedChange={checked => setOrder(prev => prev ? {...prev, quote: {...prev.quote!, isApproved: !!checked}} : null)} />
                                    Cotización Aprobada por Cliente
                                </Label>
                            </div>
                            <div className="text-right w-full sm:w-auto">
                                <p className="text-sm text-muted-foreground">Total Cotizado</p>
                                <p className="text-2xl font-bold">Q{(order.quote?.total || 0).toFixed(2)}</p>
                            </div>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Milestone />Bitácora de Incidencias</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    {(order.incidents || []).slice().reverse().map((incident, index) => (
                                        <div key={index} className="text-sm border-b pb-2">
                                            <p className="font-medium">{incident.description}</p>
                                            <p className="text-xs text-muted-foreground">{format(new Date(incident.date), 'dd/MM/yyyy HH:mm')}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-col sm:gap-2 sm:flex-row">
                                    <Input placeholder="Añadir nueva incidencia..." value={newIncident} onChange={e => setNewIncident(e.target.value)} />
                                    <Button onClick={handleAddIncident} className="mt-2 sm:mt-0">Añadir</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Estado de la Orden</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Estado Actual</Label>
                                <Select value={order.status} onValueChange={handleStatusChange}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Ingresado">Ingresado</SelectItem>
                                        <SelectItem value="En Diagnóstico">En Diagnóstico</SelectItem>
                                        <SelectItem value="Pendiente Aprobación">Pendiente Aprobación</SelectItem>
                                        <SelectItem value="En Reparación">En Reparación</SelectItem>
                                        <SelectItem value="Reparado">Reparado</SelectItem>
                                        <SelectItem value="No Reparado">No Reparado</SelectItem>
                                        <SelectItem value="Entregado">Entregado</SelectItem>
                                        <SelectItem value="Facturado" disabled>Facturado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label>Técnico Asignado</Label>
                                <Select value={order.technicianId || 'unassigned'} onValueChange={handleTechnicianChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sin asignar...">
                                            {order.technicianName || 'Sin asignar...'}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Sin asignar</SelectItem>
                                        {technicians.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><User />Cliente y Equipo</CardTitle>
                        </CardHeader>
                         <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-semibold">{order.customerName}</h4>
                                <p className="text-sm text-muted-foreground">ID Cliente: {order.customerId}</p>
                            </div>
                            <div className="border-t pt-4">
                                <h4 className="font-semibold flex items-center gap-2"><Wrench />Equipo</h4>
                                <p className="text-sm"><span className="text-muted-foreground">Tipo:</span> {order.equipment.type}</p>
                                <p className="text-sm"><span className="text-muted-foreground">Marca:</span> {order.equipment.brand}</p>
                                <p className="text-sm"><span className="text-muted-foreground">Modelo:</span> {order.equipment.model}</p>
                                <p className="text-sm"><span className="text-muted-foreground">Serie:</span> {order.equipment.serialNumber}</p>
                            </div>
                             <div className="border-t pt-4">
                                <h4 className="font-semibold">Problema Reportado</h4>
                                <p className="text-sm text-muted-foreground italic">"{order.reportedIssues}"</p>
                            </div>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><History />Historial del Equipo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {equipmentHistory.length > 0 ? (
                                <Accordion type="single" collapsible className="w-full">
                                    {equipmentHistory.map(histOrder => (
                                        <AccordionItem value={histOrder.id} key={histOrder.id}>
                                            <AccordionTrigger className="text-sm hover:no-underline">
                                                <div className="flex justify-between w-full pr-2">
                                                    <span>{histOrder.id} - {format(new Date(histOrder.creationDate), 'dd/MM/yyyy')}</span>
                                                    <Badge variant="secondary">{histOrder.status}</Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <p className="text-xs text-muted-foreground italic">"{histOrder.reportedIssues}"</p>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center p-4">No hay historial previo para este equipo.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Shield />Tipo de Servicio</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Badge variant="secondary" className="text-base">{order.serviceType}</Badge>
                             {order.serviceType === 'Garantía' && order.warrantyInfo && (
                                <div className="mt-4 text-sm space-y-2">
                                    <p><span className="font-semibold">Factura Original:</span> {order.warrantyInfo.originalInvoiceId}</p>
                                    <div>
                                        <p className="font-semibold">Notas:</p>
                                        <p className="text-muted-foreground italic">"{order.warrantyInfo.notes}"</p>
                                    </div>
                                </div>
                             )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
        <div className="absolute left-[-9999px] top-0">
                <div ref={printableRef}>
                    {order && customer && companyInfo && <PrintableDocument type="repair" data={{repair: order, customer}} companyInfo={companyInfo} />}
                </div>
            </div>
        </>
    );
}
