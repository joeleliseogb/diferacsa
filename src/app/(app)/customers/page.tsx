'use client'

import { useState, useEffect } from 'react';
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Search, Users, Phone, Mail } from "lucide-react";
import type { Customer as CustomerType } from "@/lib/data";
import { Skeleton } from '@/components/ui/skeleton';
import { getCustomers } from '@/lib/servicios';

/**
 * Página de gestión de clientes rediseñada con la estética de Diferacsa / theme.jpeg.
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
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Cabecera de la página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-headline">
            Cartera de Clientes
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium">
            Gestión de clientes, historial de compras y cuentas de Diferacsa
          </p>
        </div>

        <Button asChild className="rounded-full bg-[#1E2538] hover:bg-[#151B28] text-white px-5 py-2 h-9 text-xs font-bold shadow-sm gap-1.5 transition-transform active:scale-95">
          <Link href="/customers/new">
            <Plus className="h-4 w-4" />
            <span>Nuevo Cliente</span>
          </Link>
        </Button>
      </div>

      {/* Tarjeta con Buscador y Tabla */}
      <Card className="rounded-3xl border border-border/70 bg-card shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <CardHeader className="p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-lg font-bold">Listado de Clientes</CardTitle>
            <CardDescription>
              Directorio de clientes registrados con sus datos de contacto y facturación.
            </CardDescription>
          </div>

          {/* Buscador estilo píldora */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, NIT, teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs rounded-full bg-[#F4F6F9] dark:bg-muted/50 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-primary/40 font-medium"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-6">Cliente</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contacto</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dirección Principal</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Gasto Total</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-28 rounded-md" />
                          <Skeleton className="h-3 w-36 rounded-md" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-32 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto rounded-md" /></TableCell>
                    <TableCell className="text-right pr-6"><Skeleton className="h-8 w-8 ml-auto rounded-xl" /></TableCell>
                  </TableRow>
                ))
              ) : customers.length > 0 ? (
                customers.map((customer) => {
                  const primaryAddress = (customer.addresses || []).find(addr => addr.isPrimary) || (customer.addresses || [])[0];
                  const mainPhone = (customer.phones || [])[0]?.number;
                  return (
                    <TableRow key={customer.id} className="hover:bg-muted/30 transition-colors border-border/50">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex-shrink-0">
                            <AvatarImage src={`https://placehold.co/40x40.png`} alt={customer.name} />
                            <AvatarFallback>{customer.avatar || customer.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Link href={`/customers/${customer.id}`} className="font-semibold text-foreground hover:text-primary transition-colors text-sm truncate block">
                              {customer.name}
                            </Link>
                            <span className="text-xs text-muted-foreground">NIT: {customer.nit || 'C/F'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          {mainPhone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3" />
                              <span>{mainPhone}</span>
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{customer.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium max-w-[200px] truncate">
                        {primaryAddress ? `${primaryAddress.street}, ${primaryAddress.city}` : 'No registrada'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.type === 'Empresa' ? 'blue' : 'peach'}>
                          {customer.type || 'Individual'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground text-sm font-mono">
                        {customer.totalSpent || 'Q0.00'}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60" asChild>
                          <Link href={`/customers/${customer.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">Editar</span>
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    No se encontraron clientes que coincidan con la búsqueda.
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
