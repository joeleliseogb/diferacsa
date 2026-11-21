
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>Listado de Proveedores</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {loading ? 'Cargando...' : `${suppliers.length} proveedores`}
                </span>
              </CardTitle>
              <CardDescription>Visualiza y gestiona la información de tus proveedores registrados.</CardDescription>
            </div>
          </div>
          <div className="pt-2">
            <Input
              placeholder="Buscar por nombre, contacto, email o NIT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md w-full"
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Vista móvil: Tarjetas limpias y responsivas */}
          <div className="space-y-3 md:hidden">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={`skeleton-card-${i}`} className="p-3 border rounded-xl space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))
            ) : suppliers.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No se encontraron proveedores que coincidan con la búsqueda.
              </div>
            ) : (
              suppliers.map((supplier) => {
                const primaryAddress = (supplier.addresses || []).find(addr => addr.isPrimary) || (supplier.addresses || [])[0];
                const primaryPhone = (supplier.phones || []).find(p => p.isPrimary)?.number || (supplier.phones || [])[0]?.number;
                return (
                  <div key={`mobile-${supplier.id}`} className="p-3.5 border rounded-xl space-y-2 bg-card shadow-2xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-9 w-9 bg-primary/10 text-primary font-bold text-xs">
                          <AvatarFallback>{supplier.avatar}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm leading-tight">{supplier.name}</p>
                          <p className="text-xs text-muted-foreground">{supplier.contactPerson || 'Sin contacto'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <Link href={`/suppliers/${supplier.id}`}>
                            <FileText className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <Link href={`/suppliers/${supplier.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs space-y-1 text-muted-foreground pt-1 border-t">
                      <div className="flex items-center justify-between">
                        <span>NIT: <strong className="text-foreground font-mono">{supplier.nit}</strong></span>
                        {primaryPhone && <span className="font-semibold text-primary">{primaryPhone}</span>}
                      </div>
                      {primaryAddress && (
                        <p className="text-[11px] truncate">{primaryAddress.street}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Vista escritorio: Tabla completa con desplazamiento horizontal seguro */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Dirección Principal</TableHead>
                  <TableHead>Email / NIT</TableHead>
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
                      const primaryPhone = (supplier.phones || []).find(p => p.isPrimary)?.number || (supplier.phones || [])[0]?.number;
                      return (
                      <TableRow key={supplier.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell>
                          <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 bg-primary/10 text-primary font-bold text-xs">
                              <AvatarFallback>{supplier.avatar}</AvatarFallback>
                              </Avatar>
                              <div>
                              <div className="font-semibold text-sm leading-tight">{supplier.name}</div>
                              <div className="text-xs text-muted-foreground">{supplier.contactPerson || 'Sin contacto directo'}</div>
                              </div>
                          </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <div className="font-semibold">{primaryPhone || 'Sin teléfono'}</div>
                              <div className="text-muted-foreground font-mono text-[11px]">NIT: {supplier.nit}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                            {primaryAddress ? `${primaryAddress.street}` : 'No especificada'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {supplier.email || <span className="text-muted-foreground italic">Sin correo</span>}
                          </TableCell>
                          <TableCell className="text-right">
                          <Button variant="ghost" size="icon" asChild title="Ver Ficha">
                              <Link href={`/suppliers/${supplier.id}`}>
                              <FileText className="h-4 w-4" />
                              <span className="sr-only">Ver Ficha</span>
                              </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Editar Proveedor">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
