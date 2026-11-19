
'use client'

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil } from "lucide-react";
import Link from "next/link";
import type { OrderWithCustomer } from "@/lib/customer-service";
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Página para la gestión de pedidos de clientes.
 * @returns {JSX.Element} El componente de la página de pedidos.
 */
export default function OrdersPage() {
    const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
    const [loading, setLoading] = useState(true);

    async function loadData() {
        setLoading(true);
        const { getAllOrders } = await import('@/lib/servicios');
        const data = await getAllOrders();
        setOrders(data);
        setLoading(false);
    }

    useEffect(() => {
        loadData();
        window.addEventListener('focus', loadData);
        return () => {
          window.removeEventListener('focus', loadData);
        };
    }, []);


    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Entregado':
            case 'Facturado':
                return 'secondary';
            case 'En Preparación':
            case 'Listo para Entrega':
            case 'En Ruta':
            case 'Parcialmente Entregado':
                return 'outline';
            case 'Cancelado':
                return 'destructive';
            default:
                return 'default';
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Gestión de Pedidos</h1>
                <Button asChild>
                    <Link href="/orders/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nuevo Pedido
                    </Link>
                </Button>
            </div>
            <p className="text-muted-foreground">Administra los pedidos de clientes para preparar y entregar.</p>
            <Card>
                <CardHeader>
                    <CardTitle>Listado de Pedidos</CardTitle>
                    <CardDescription>Pedidos de clientes para preparar y entregar.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Pedido</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Total</TableHead>
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
                                        <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                             ) : (
                                orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.id}</TableCell>
                                        <TableCell>{order.customerName}</TableCell>
                                        <TableCell>{order.date}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{order.total}</TableCell>
                                        <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/orders/${order.id}/edit`}>
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">Editar Pedido</span>
                                            </Link>
                                        </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                             )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
