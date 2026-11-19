
'use client'

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil } from "lucide-react";
import Link from "next/link";
import type { QuoteWithCustomer } from "@/lib/customer-service";
import { Skeleton } from '@/components/ui/skeleton';


/**
 * Página para la gestión de presupuestos o cotizaciones.
 * @returns {JSX.Element} El componente de la página de presupuestos.
 */
export default function QuotesPage() {
    const [quotes, setQuotes] = useState<QuoteWithCustomer[]>([]);
    const [loading, setLoading] = useState(true);

    async function loadData() {
        setLoading(true);
        const { getAllQuotes } = await import('@/lib/servicios');
        const data = await getAllQuotes();
        setQuotes(data);
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
            case 'Aceptado':
            case 'Convertido':
                return 'secondary';
            case 'Enviado':
            case 'Borrador':
                return 'outline';
            case 'Vencido':
            case 'Rechazado':
                return 'destructive';
            default:
                return 'default';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Gestión de Presupuestos</h1>
                <Button asChild>
                    <Link href="/quotes/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nuevo Presupuesto
                    </Link>
                </Button>
            </div>
            <p className="text-muted-foreground">Crea, envía y gestiona presupuestos para tus clientes.</p>
            <Card>
                <CardHeader>
                    <CardTitle>Listado de Presupuestos</CardTitle>
                    <CardDescription>Presupuestos enviados a clientes.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Presupuesto</TableHead>
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
                            quotes.map((quote) => (
                                <TableRow key={quote.id}>
                                <TableCell className="font-medium">{quote.id}</TableCell>
                                <TableCell>{quote.customerName}</TableCell>
                                <TableCell>{quote.date}</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">{quote.total}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link href={`/quotes/${quote.id}/edit`}>
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">Editar Presupuesto</span>
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
