
'use client'

import { useState, useEffect } from 'react';
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Pencil, FileText } from "lucide-react";
import { getSuppliers } from "@/lib/servicios";
import type { Supplier } from '@/lib/supplier-data';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Página para mostrar y gestionar la lista de proveedores.
 * @returns {JSX.Element} El componente de la página de proveedores.
 */
export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadData() {
        setLoading(true);
        const data = await getSuppliers(searchTerm);
        setSuppliers(data);
        setLoading(false);
    }
    loadData();
  }, [searchTerm]);

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Proveedores</h1>
        <Button asChild>
          <Link href="/suppliers/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Proveedor
          </Link>
        </Button>
      </div>
      <p className="text-muted-foreground">Administra la información y direcciones de tus proveedores.</p>
      
      <Card>
        <CardHeader>
          <CardTitle>Listado de Proveedores</CardTitle>
          <CardDescription>Visualiza y gestiona la información de tus proveedores.</CardDescription>
          <div className="pt-4">
            <Input
              placeholder="Buscar por nombre, contacto, email o NIT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Dirección Principal</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-supplier-${i}`}>
                        <TableCell><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div></div></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div></TableCell>
                    </TableRow>
                ))
              ) : (
                suppliers.map((supplier) => {
                    const primaryAddress = (supplier.addresses || []).find(addr => addr.isPrimary) || (supplier.addresses || [])[0];
                    return (
                    <TableRow key={supplier.id}>
                        <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                            <AvatarImage src={`https://placehold.co/40x40.png`} alt={supplier.name} data-ai-hint="company logo" />
                            <AvatarFallback>{supplier.avatar}</AvatarFallback>
                            </Avatar>
                            <div>
                            <div className="font-medium">{supplier.name}</div>
                            <div className="text-sm text-muted-foreground">{supplier.contactPerson}</div>
                            </div>
                        </div>
                        </TableCell>
                        <TableCell>
                        {(supplier.phones || []).find(p => p.isPrimary)?.number || (supplier.phones || [])[0]?.number || 'N/A'}
                        </TableCell>
                        <TableCell>
                        {primaryAddress ? `${primaryAddress.street}, ${primaryAddress.city}` : 'No especificada'}
                        </TableCell>
                        <TableCell>{supplier.email}</TableCell>
                        <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={`/suppliers/${supplier.id}`}>
                            <FileText className="h-4 w-4" />
                            <span className="sr-only">Ver Ficha</span>
                            </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={`/suppliers/${supplier.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar Proveedor</span>
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
