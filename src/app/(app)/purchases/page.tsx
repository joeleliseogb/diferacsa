
'use client'

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil } from "lucide-react";
import Link from "next/link";
import { getAllPurchaseOrders, type PurchaseOrderWithSupplier } from "@/lib/servicios";
import { Skeleton } from '@/components/ui/skeleton';


/**
 * Página para mostrar y gestionar las órdenes de compra.
 * @returns {JSX.Element} El componente de la página de compras.
 */
export default function PurchasesPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderWithSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
      setLoading(true);
      const data = await getAllPurchaseOrders();
      setPurchaseOrders(data);
      setLoading(false);
  }

  useEffect(() => {
    loadData();

    // Recargar datos cuando la ventana vuelve a tener foco.
    window.addEventListener('focus', loadData);
    return () => {
      window.removeEventListener('focus', loadData);
    };
  }, []);

  /**
   * Devuelve la variante de color para el badge de estado según el estado de la orden.
   * @param {string} status - El estado de la orden de compra.
   * @returns {string} La variante de color para el componente Badge.
   */
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

  return (
    <div className="space-y-6">
      {/* Cabecera de la página con título y botón de acción */}
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Compras</h1>
        <Button asChild>
          <Link href="/purchases/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Orden de Compra
          </Link>
        </Button>
      </div>
      <p className="text-muted-foreground">Gestiona tus órdenes de compra a proveedores.</p>
       
       {/* Tarjeta que contiene la tabla de órdenes de compra */}
       <Card>
        <CardHeader>
          <CardTitle>Órdenes de Compra</CardTitle>
          <CardDescription>Un listado de las órdenes de compra recientes.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tabla para mostrar las órdenes de compra */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Proveedor</TableHead>
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
                purchaseOrders.map((order) => (
                  <TableRow key={order.order}>
                    <TableCell className="font-medium">{order.order}</TableCell>
                    <TableCell>{order.supplierName}</TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{order.total}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/purchases/${order.order}/edit`}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Editar Compra</span>
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
