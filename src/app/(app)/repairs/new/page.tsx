

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, UserPlus, ChevronsUpDown, Check, Wrench } from 'lucide-react';
import { getCustomers, saveRepairOrder, generateNewRepairOrderId, type Customer } from '@/lib/servicios';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { RepairOrder } from '@/lib/data';

export default function NewRepairOrderPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [equipment, setEquipment] = useState({ type: '', brand: '', model: '', serialNumber: '' });
    const [reportedIssues, setReportedIssues] = useState('');
    const [serviceType, setServiceType] = useState<RepairOrder['serviceType']>('Reparación');
    const [warrantyInfo, setWarrantyInfo] = useState({ originalInvoiceId: '', notes: '' });
    const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');

    useEffect(() => {
        async function loadCustomers() {
            setCustomers(await getCustomers());
        }
        loadCustomers();
    }, []);

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    
    const handleEquipmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEquipment(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleWarrantyInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setWarrantyInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async () => {
        if (!selectedCustomerId || !equipment.type || !equipment.brand || !reportedIssues) {
            toast({ title: "Datos Incompletos", description: "Por favor, selecciona un cliente, completa los detalles del equipo y describe el problema.", variant: "destructive" });
            return;
        }

        const newOrderId = await generateNewRepairOrderId();
        
        const newOrder: RepairOrder = {
            id: newOrderId,
            creationDate: new Date().toISOString(),
            customerId: selectedCustomerId,
            customerName: selectedCustomer?.name || 'Desconocido',
            equipment,
            reportedIssues,
            status: 'Ingresado',
            incidents: [{ date: new Date().toISOString(), description: `Orden creada por el usuario.` }],
            serviceType: serviceType,
        };

        if (serviceType === 'Garantía') {
            newOrder.warrantyInfo = warrantyInfo;
        }

        await saveRepairOrder(newOrder);

        toast({ title: "Orden Creada", description: `Se ha creado la orden de reparación ${newOrderId}.` });
        router.push('/repairs');
    };
    
    const filteredCustomers = customers.filter(c => 
        c.id !== '0' && (
            c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
            c.nit.toLowerCase().includes(customerSearch.toLowerCase())
        )
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/repairs"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Nueva Orden de Reparación</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild><Link href="/repairs">Cancelar</Link></Button>
                    <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" />Crear Orden</Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalles del Equipo y Problema</CardTitle>
                            <CardDescription>Especifica qué equipo se está recibiendo y cuál es el problema reportado por el cliente.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type">Tipo de Equipo</Label>
                                    <Input id="type" name="type" placeholder="Ej: Taladro, Motosierra" value={equipment.type} onChange={handleEquipmentChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="brand">Marca</Label>
                                    <Input id="brand" name="brand" placeholder="Ej: DeWalt, Stihl" value={equipment.brand} onChange={handleEquipmentChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="model">Modelo</Label>
                                    <Input id="model" name="model" value={equipment.model} onChange={handleEquipmentChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="serialNumber">Número de Serie</Label>
                                    <Input id="serialNumber" name="serialNumber" value={equipment.serialNumber} onChange={handleEquipmentChange} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reportedIssues">Problemas Reportados por el Cliente</Label>
                                <Textarea id="reportedIssues" placeholder="Describe el problema que el cliente ha notado. Ej: 'No enciende', 'Hace un ruido extraño', etc." value={reportedIssues} onChange={e => setReportedIssues(e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Información del Cliente</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="space-y-2">
                                <Label>Cliente</Label>
                                <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" aria-expanded={customerPopoverOpen} className="w-full justify-between">
                                            <span className="truncate">{selectedCustomer ? selectedCustomer.name : "Seleccionar cliente..."}</span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar cliente..." onValueChange={setCustomerSearch} />
                                            <CommandEmpty>No se encontró cliente.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandList>
                                                {filteredCustomers.map(c => (
                                                    <CommandItem key={c.id} onSelect={() => { setSelectedCustomerId(c.id); setCustomerPopoverOpen(false); }}>
                                                        <Check className={cn("mr-2 h-4 w-4", selectedCustomerId === c.id ? "opacity-100" : "opacity-0")} />
                                                        <span>{c.name}</span>
                                                    </CommandItem>
                                                ))}
                                                </CommandList>
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                             </div>
                             <Button variant="outline" size="sm" asChild className="w-full">
                                <Link href="/customers/new?redirect=/repairs/new"><UserPlus className="mr-2 h-4 w-4"/>Crear Nuevo Cliente</Link>
                             </Button>
                             {selectedCustomer && (
                                <div className="text-sm text-muted-foreground border-t pt-4 mt-4">
                                    <p><strong>NIT:</strong> {selectedCustomer.nit}</p>
                                    <p><strong>Teléfono:</strong> {selectedCustomer.phones.find(p => p.isPrimary)?.number || 'N/A'}</p>
                                </div>
                             )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Tipo de Servicio</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <Select value={serviceType} onValueChange={(value: RepairOrder['serviceType']) => setServiceType(value)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Reparación">Reparación</SelectItem>
                                    <SelectItem value="Garantía">Garantía</SelectItem>
                                    <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                                </SelectContent>
                            </Select>
                            {serviceType === 'Garantía' && (
                                <div className="p-4 border rounded-md space-y-4 bg-muted/50">
                                    <div className="space-y-2">
                                        <Label htmlFor="originalInvoiceId">Factura de Compra Original</Label>
                                        <Input id="originalInvoiceId" name="originalInvoiceId" placeholder="Ej: FACA-1234" value={warrantyInfo.originalInvoiceId} onChange={handleWarrantyInfoChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="warrantyNotes">Notas de Garantía</Label>
                                        <Textarea id="warrantyNotes" name="notes" placeholder="Ej: Cubre solo partes, no mano de obra." value={warrantyInfo.notes} onChange={handleWarrantyInfoChange} />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
