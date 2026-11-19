

'use client'

import { useState, useEffect } from 'react';
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil, Truck } from "lucide-react";
import type { DeliveryRoute } from '@/lib/delivery-service';
import { Skeleton } from '@/components/ui/skeleton';
import { getDeliveryRoutes } from '@/lib/servicios';

/**
 * Página para la gestión de entregas a domicilio y rutas.
 * @returns {JSX.Element} El componente de la página de entregas.
 */
export default function DeliveriesPage() {
    const [deliveries, setDeliveries] = useState<DeliveryRoute[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDeliveries() {
            setLoading(true);
            const data = await getDeliveryRoutes();
            setDeliveries(data);
            setLoading(false);
        }
        loadDeliveries();
    }, []);

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Completada':
                return 'secondary';
            case 'En Ruta':
                return 'outline';
            case 'Programada':
                return 'default';
            default:
                return 'destructive';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Entregas a Domicilio</h1>
                 <Button asChild>
                  <Link href="/deliveries/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nueva Ruta de Entrega
                  </Link>
                </Button>
            </div>
            <p className="text-muted-foreground">Gestiona y planifica tus rutas de entrega a clientes.</p>
            <Card>
                <CardHeader>
                    <CardTitle>Rutas de Entrega</CardTitle>
                    <CardDescription>Rutas de entrega programadas y activas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Ruta</TableHead>
                            <TableHead>Conductor</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Paradas</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : deliveries.length > 0 ? (
                                deliveries.map((delivery) => (
                                    <TableRow key={delivery.id}>
                                    <TableCell className="font-medium">{delivery.id}</TableCell>
                                    <TableCell>{delivery.driver}</TableCell>
                                    <TableCell>{delivery.date}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(delivery.status)}>{delivery.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{delivery.stops}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/deliveries/${delivery.id}/edit`}>
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">Editar Entrega</span>
                                            </Link>
                                        </Button>
                                    </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                                            <Truck className="w-12 h-12 text-muted-foreground" />
                                            <h3 className="mt-4 text-lg font-semibold">No hay rutas activas</h3>
                                            <p className="mt-2 text-sm text-muted-foreground">Crea una nueva ruta para empezar a planificar tus entregas.</p>
                                            <Button asChild className="mt-4">
                                                <Link href="/deliveries/new">
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                Crear Ruta
                                                </Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
