'use client'

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Plus, Search, Archive, AlertTriangle, CheckCircle, Package } from "lucide-react";
import Link from 'next/link';
import { getProducts } from '@/lib/product-service';
import type { Product } from '@/lib/product-data';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Página de inventario rediseñada con la estética limpia y moderna de Diferacsa / theme.jpeg.
 */
export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalDatabaseProducts, setTotalDatabaseProducts] = useState(9479);
  const [totalDatabaseStock, setTotalDatabaseStock] = useState(859723);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(searchTerm)}&limit=100`);
        if (res.ok) {
          const json = await res.json();
          setProducts(json.items || []);
          if (json.total !== undefined) setTotalDatabaseProducts(json.total);
          if (json.totalStock !== undefined) setTotalDatabaseStock(json.totalStock);
        }
      } catch {
        const data = await getProducts(searchTerm);
        setProducts(data);
      } finally {
        setLoading(false);
      }
    }
    const handler = setTimeout(() => {
      loadProducts();
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const filteredProducts = products;

  // Contadores para métricas de stock
  const { totalStockCount, lowStockCount, outOfStockCount } = useMemo(() => {
    let total = 0;
    let low = 0;
    let out = 0;

    products.forEach(p => {
      if (p.isService) return;
      const stock = (p.stock || []).reduce((sum, s) => sum + s.quantity, 0);
      total += stock;
      if (stock === 0) out++;
      else if (stock <= 20) low++;
    });

    return { totalStockCount: total, lowStockCount: low, outOfStockCount: out };
  }, [products]);

  const getStatusBadge = (stock: number) => {
    if (stock > 20) {
      return <Badge variant="mint">En Stock</Badge>;
    }
    if (stock > 0) {
      return <Badge variant="amber">Stock Bajo</Badge>;
    }
    return <Badge variant="destructive">Agotado</Badge>;
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-headline">
            Inventario & Stock
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium">
            Control de productos, familias y existencias en Diferacsa
          </p>
        </div>

        {/* Botón de acción rápida estilo theme.jpeg */}
        <Button asChild className="rounded-full bg-[#1E2538] hover:bg-[#151B28] text-white px-5 py-2 h-9 text-xs font-bold shadow-sm gap-1.5 transition-transform active:scale-95">
          <Link href="/inventory/new">
            <Plus className="h-4 w-4" />
            <span>Nuevo Producto</span>
          </Link>
        </Button>
      </div>

      {/* Mini-KPIs de Almacén */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Total Items</span>
            <p className="text-xl font-bold text-foreground font-headline">{totalDatabaseProducts.toLocaleString()}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Unidades Stock</span>
            <p className="text-xl font-bold text-foreground font-headline">{Math.round(totalDatabaseStock).toLocaleString()}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Stock Bajo</span>
            <p className="text-xl font-bold text-amber-600 font-headline">{lowStockCount}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <Archive className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Agotados</span>
            <p className="text-xl font-bold text-rose-600 font-headline">{outOfStockCount}</p>
          </div>
        </div>
      </div>

      {/* Tarjeta con Buscador y Tabla */}
      <Card className="rounded-3xl border border-border/70 bg-card shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <CardHeader className="p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-lg font-bold">Catálogo de Productos</CardTitle>
            <CardDescription>
              Listado completo de productos registrados con su disponibilidad actual.
            </CardDescription>
          </div>

          {/* Buscador estilo píldora */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o SKU..."
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
                <TableHead className="w-[120px] text-xs font-bold uppercase tracking-wider text-muted-foreground pl-6">SKU</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Producto</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Familia</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estado</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Stock Total</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><Skeleton className="h-4 w-20 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto rounded-md" /></TableCell>
                    <TableCell className="text-right pr-6"><Skeleton className="h-8 w-8 ml-auto rounded-xl" /></TableCell>
                  </TableRow>
                ))
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const totalStock = (product.stock || []).reduce((sum, s) => sum + s.quantity, 0);
                  const sku = (product.codes || []).find(c => c.type === 'SKU')?.value || 'N/A';
                  return (
                    <TableRow key={product.id} className="hover:bg-muted/30 transition-colors border-border/50">
                      <TableCell className="font-mono text-xs text-muted-foreground font-semibold pl-6">{sku}</TableCell>
                      <TableCell>
                        <Link href={`/inventory/${product.id}`} className="font-semibold text-foreground hover:text-primary transition-colors text-sm">
                          {product.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">{product.family.name}</TableCell>
                      <TableCell>
                        {product.isService ? (
                          <Badge variant="blue">Servicio</Badge>
                        ) : (
                          getStatusBadge(totalStock)
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground text-sm font-mono">
                        {product.isService ? '—' : totalStock}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60" asChild>
                          <Link href={`/inventory/${product.id}/edit`}>
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
                    No se encontraron productos que coincidan con la búsqueda.
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
