

'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil } from "lucide-react";
import Link from "next/link";
import { getAllRepairOrders, type RepairOrder } from '@/lib/servicios';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function RepairsPage() {
    const [repairOrders, setRepairOrders] = useState<RepairOrder[]>([]);
    const [loading, setLoading] = useState(true);

    async function loadData() {
        setLoading(true);
        const data = await getAllRepairOrders();
        setRepairOrders(data);
        setLoading(false);
    }

    useEffect(() => {
        loadData();
    }, []);

    const getStatusVariant = (status: RepairOrder['status']) => {
        switch (status) {
            case 'Entregado':
            case 'Reparado':
            case 'Facturado':
                return 'secondary';
            case 'En Diagnóstico':
            case 'En Reparación':
            case 'Pendiente Aprobación':
                return 'outline';
            case 'Ingresado':
                return 'default';
            case 'No Reparado':
                return 'destructive';
            default:
                return 'default';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Taller de Reparaciones</h1>
                    <p className="text-muted-foreground mt-1">Gestiona el ciclo completo de reparaciones de equipos y herramientas.</p>
                </div>
                <Button asChild>
                    <Link href="/repairs/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nueva Orden de Reparación
                    </Link>
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Listado de Órdenes de Reparación</CardTitle>
                    <CardDescription>Órdenes de trabajo activas y completadas en el taller.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-20 w-full" />
                            ))}
                        </div>
                    ) : repairOrders.length > 0 ? (
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Orden</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Equipo</TableHead>
                                        <TableHead>Fecha Ingreso</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {repairOrders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">{order.id}</TableCell>
                                            <TableCell>{order.customerName}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{order.equipment.brand} {order.equipment.model}</div>
                                                <div className="text-sm text-muted-foreground">{order.equipment.type}</div>
                                            </TableCell>
                                            <TableCell>{format(new Date(order.creationDate), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={`/repairs/${order.id}/edit`}>
                                                        <Pencil className="h-4 w-4" />
                                                        <span className="sr-only">Editar Orden</span>
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                         <div className="text-center py-12 text-muted-foreground">
                            <p>No hay órdenes de reparación registradas.</p>
                        </div>
                    )}
                    
                    {/* Mobile View */}
                    <div className="md:hidden space-y-4">
                        {repairOrders.map(order => (
                            <Card key={order.id} className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold">{order.id}</p>
                                        <p className="text-sm text-muted-foreground">{order.customerName}</p>
                                    </div>
                                    <Link href={`/repairs/${order.id}/edit`}>
                                        <Button variant="outline" size="sm">
                                            <Pencil className="h-4 w-4 mr-2" /> Editar
                                        </Button>
                                    </Link>
                                </div>
                                <div className="mt-2 text-sm">
                                    <p><span className="font-semibold">Equipo:</span> {order.equipment.brand} {order.equipment.model}</p>
                                    <p><span className="font-semibold">Fecha:</span> {format(new Date(order.creationDate), 'dd/MM/yyyy')}</p>
                                </div>
                                <div className="mt-2">
                                     <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                                </div>
                            </Card>
                        ))}
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
