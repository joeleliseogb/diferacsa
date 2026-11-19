

'use client'

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Truck, Package, User, DollarSign, Printer } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getCompanyInfo, getDeliveryRoute, updateDeliveryRoute } from '@/lib/servicios';
import type { DeliveryRoute } from '@/lib/delivery-service';
import type { CompanyInfo } from '@/lib/settings-service';
import { PrintableDocument } from '@/components/printable-document';


export default function EditDeliveryPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [route, setRoute] = useState<DeliveryRoute | null>(null);
    const [originalStatus, setOriginalStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const printableRef = useRef<HTMLDivElement>(null);
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);


    useEffect(() => {
        async function loadData() {
            setLoading(true);
            setCompanyInfo(await getCompanyInfo());
            if(id) {
                const routeData = await getDeliveryRoute(id);
                if(routeData) {
                    setRoute(routeData);
                    setOriginalStatus(routeData.status);
                }
            }
            setLoading(false);
        }
        loadData();
    }, [id]);

    const handleStatusChange = (newStatus: 'Programada' | 'En Ruta' | 'Completada') => {
        if(!route) return;
        setRoute(prev => prev ? {...prev, status: newStatus} : null);
    }
    
    const handleSave = async () => {
        if (!route) return;

        await updateDeliveryRoute(route);
        router.push('/deliveries');
    }
    
    const handlePrintManifest = () => {
        const input = printableRef.current;
        if (input && route) {
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
                pdf.save(`Manifiesto-${route.id}.pdf`);
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
    
    if (!route) {
        return <div>Ruta de entrega no encontrada.</div>
    }
    
    const isRouteCompleted = route.status === 'Completada';

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" asChild>
                            <Link href="/deliveries"><ArrowLeft className="h-4 w-4" /></Link>
                        </Button>
                        <h1 className="text-3xl font-bold font-headline tracking-tight">Editar Ruta: {route.id}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handlePrintManifest}><Printer className="mr-2 h-4 w-4" />Imprimir Manifiesto</Button>
                        <Button onClick={handleSave} disabled={isRouteCompleted}>
                            <Save className="mr-2 h-4 w-4" />
                            Guardar Cambios
                        </Button>
                    </div>
                </div>

                {isRouteCompleted && (
                    <Alert>
                        <Truck className="h-4 w-4" />
                        <AlertTitle>Ruta Completada</AlertTitle>
                        <AlertDescription>
                            Esta ruta ya ha sido marcada como completada y los pedidos asociados han sido actualizados.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Pedidos en esta Ruta</CardTitle>
                                <CardDescription>Listado de los pedidos incluidos en esta entrega.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {route.orders.map(order => (
                                    <Card key={order.id}>
                                        <CardHeader>
                                            <div className="flex justify-between items-center">
                                                <CardTitle className="text-lg">{order.id}</CardTitle>
                                                <Badge variant={order.status === 'Entregado' ? 'secondary' : 'outline'}>{order.status}</Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="list-disc pl-5 mt-2 text-sm text-muted-foreground">
                                                {order.products.map(p => (
                                                    <li key={p.sku}>{p.qty} x {p.name}</li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Detalles de la Ruta</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="driver">Conductor</Label>
                                    <Input id="driver" value={route.driver} disabled />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="date">Fecha</Label>
                                    <Input id="date" value={route.date} disabled />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Estado de la Ruta</Label>
                                    <Select value={route.status} onValueChange={handleStatusChange} disabled={isRouteCompleted}>
                                        <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Programada">Programada</SelectItem>
                                            <SelectItem value="En Ruta">En Ruta</SelectItem>
                                            <SelectItem value="Completada">Completada</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Resumen</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-2"><User className="h-4 w-4"/> Paradas (Clientes)</span>
                                    <span className="font-semibold">{route.stops}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-2"><Package className="h-4 w-4"/> Items Totales</span>
                                    <span className="font-semibold">{route.totalItems}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4"/> Valor Total (Pedidos)</span>
                                    <span className="font-semibold">Q{route.totalValue.toFixed(2)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            <div className="absolute left-[-9999px] top-0">
                <div ref={printableRef}>
                    {route && companyInfo && <PrintableDocument type="manifest" data={{route}} companyInfo={companyInfo} />}
                </div>
            </div>
        </>
    );
}
