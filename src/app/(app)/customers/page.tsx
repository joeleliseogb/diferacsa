
'use client'

import { useState, useEffect, useMemo } from 'react';
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Pencil, FileText } from "lucide-react";
import type { Customer as CustomerType } from "@/lib/data";
import { Skeleton } from '@/components/ui/skeleton';
import { getCustomers } from '@/lib/servicios';

/**
 * Página para mostrar y gestionar la lista de clientes, incluyendo sus direcciones.
 * @returns {JSX.Element} El componente de la página de clientes.
 */
export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadCustomers() {
      setLoading(true);
      const data = await getCustomers(searchTerm);
      setCustomers(data);
      setLoading(false);
    }
    loadCustomers();
  }, [searchTerm]);

  return (
    <div className="space-y-6">
       {/* Cabecera de la página con título y botón de acción */}
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Clientes</h1>
        <Button asChild>
          <Link href="/customers/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Cliente
          </Link>
        </Button>
      </div>
      <p className="text-muted-foreground">Gestiona tus clientes, sus direcciones y su historial de compras.</p>
      
      {/* Tarjeta que contiene la tabla de clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Clientes</CardTitle>
          <CardDescription>Visualiza y gestiona la información de tus clientes. Puedes buscar por cualquier campo.</CardDescription>
           <div className="pt-4">
            <Input
              placeholder="Buscar por nombre, NIT, teléfono, dirección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabla para mostrar los clientes */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Dirección Principal</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Gasto Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div></div></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                        <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div></TableCell>
                    </TableRow>
                ))
              ) : (
                customers.map((customer) => {
                  const primaryAddress = (customer.addresses || []).find(addr => addr.isPrimary) || (customer.addresses || [])[0];
                  return (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={`https://placehold.co/40x40.png`} alt={customer.name} data-ai-hint="user avatar" />
                            <AvatarFallback>{customer.avatar}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-muted-foreground">{customer.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {primaryAddress ? `${primaryAddress.street}, ${primaryAddress.city}` : 'No especificada'}
                      </TableCell>
                      <TableCell>{customer.type}</TableCell>
                      <TableCell className="text-right">{customer.totalSpent}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/customers/${customer.id}`}>
                            <FileText className="h-4 w-4" />
                            <span className="sr-only">Ver Ficha</span>
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/customers/${customer.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar Cliente</span>
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
