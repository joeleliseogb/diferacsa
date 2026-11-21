'use client'

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Pencil, 
  Plus, 
  Search, 
  Archive, 
  AlertTriangle, 
  CheckCircle, 
  Package, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Filter,
  Layers,
  ArrowUpDown
} from "lucide-react";
import Link from 'next/link';
import type { Product } from '@/lib/product-data';
import { Skeleton } from '@/components/ui/skeleton';

interface CategoryOption {
  id: number;
  name: string;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(9479);
  const [totalDatabaseStock, setTotalDatabaseStock] = useState(859723);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatus, setStockStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('stock_desc');
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  // Global KPIs exactos del inventario
  const [globalStats, setGlobalStats] = useState({
    totalProducts: 9479,
    totalStockUnits: 859723,
    inStockCount: 932,
    lowStockCount: 4542,
    outOfStockCount: 3997,
  });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchTerm.trim(),
        limit: pageSize.toString(),
        page: page.toString(),
      });
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('categoryId', selectedCategory);
      }
      if (stockStatus && stockStatus !== 'all') {
        params.append('stockStatus', stockStatus);
      }
      params.append('sortBy', sortBy);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setProducts(json.items || []);
        setTotalItems(json.total || 0);
        setTotalPages(json.totalPages || 1);
        if (json.totalStock !== undefined) setTotalDatabaseStock(json.totalStock);
        if (json.globalStats) setGlobalStats(json.globalStats);
        if (json.categories && json.categories.length > 0) {
          setCategories(json.categories);
        }
      }
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, page, pageSize, selectedCategory, stockStatus, sortBy]);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadProducts();
    }, 200);
    return () => clearTimeout(handler);
  }, [loadProducts]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPage(1); // Reset to first page on search
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    setPage(1);
  };

  const handleStockStatusChange = (status: string) => {
    setStockStatus(status);
    setPage(1);
  };

  const getStatusBadge = (stock: number) => {
    if (stock > 20) {
      return <Badge variant="mint">En Stock ({stock})</Badge>;
    }
    if (stock > 0) {
      return <Badge variant="amber">Stock Bajo ({stock})</Badge>;
    }
    return <Badge variant="destructive">Agotado (0)</Badge>;
  };

  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalItems);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-headline">
            Inventario & Stock
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium">
            Control integral del catálogo maestro (9,479 artículos) en Casa Matriz
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

      {/* Mini-KPIs Globales de Almacén */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => handleStockStatusChange('all')}
          className={`cursor-pointer rounded-2xl border p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-3 transition-all ${
            stockStatus === 'all' ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' : 'border-border/70 bg-card hover:bg-muted/40'
          }`}
        >
          <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Total Catálogo</span>
            <p className="text-xl font-bold text-foreground font-headline">{globalStats.totalProducts.toLocaleString()}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Unidades Físicas</span>
            <p className="text-xl font-bold text-foreground font-headline">{Math.round(totalDatabaseStock).toLocaleString()}</p>
          </div>
        </div>

        <div 
          onClick={() => handleStockStatusChange(stockStatus === 'low_stock' ? 'all' : 'low_stock')}
          className={`cursor-pointer rounded-2xl border p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-3 transition-all ${
            stockStatus === 'low_stock' ? 'border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/30' : 'border-border/70 bg-card hover:bg-muted/40'
          }`}
        >
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Stock Bajo (1-20)</span>
            <p className="text-xl font-bold text-amber-600 font-headline">{globalStats.lowStockCount.toLocaleString()}</p>
          </div>
        </div>

        <div 
          onClick={() => handleStockStatusChange(stockStatus === 'out_of_stock' ? 'all' : 'out_of_stock')}
          className={`cursor-pointer rounded-2xl border p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-3 transition-all ${
            stockStatus === 'out_of_stock' ? 'border-rose-500/50 bg-rose-500/10 ring-1 ring-rose-500/30' : 'border-border/70 bg-card hover:bg-muted/40'
          }`}
        >
          <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <Archive className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Agotados (0)</span>
            <p className="text-xl font-bold text-rose-600 font-headline">{globalStats.outOfStockCount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Tarjeta con Filtros y Tabla */}
      <Card className="rounded-3xl border border-border/70 bg-card shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <CardHeader className="p-5 pb-3 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-headline text-lg font-bold">Catálogo de Productos</CardTitle>
              <CardDescription>
                Mostrando {totalItems.toLocaleString()} productos según los filtros seleccionados.
              </CardDescription>
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Buscador inteligente */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, SKU, código..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-full bg-[#F4F6F9] dark:bg-muted/50 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-primary/40 font-medium"
                />
              </div>

              {/* Selector de Categoría / Familia */}
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="h-9 text-xs rounded-full bg-[#F4F6F9] dark:bg-muted/50 border-0 shadow-none font-medium w-[170px]">
                  <Layers className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Familia..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Familias</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Selector de Estado de Stock */}
              <Select value={stockStatus} onValueChange={handleStockStatusChange}>
                <SelectTrigger className="h-9 text-xs rounded-full bg-[#F4F6F9] dark:bg-muted/50 border-0 shadow-none font-medium w-[150px]">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Estado..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Estados</SelectItem>
                  <SelectItem value="in_stock">En Stock (&gt;20)</SelectItem>
                  <SelectItem value="low_stock">Stock Bajo (1-20)</SelectItem>
                  <SelectItem value="out_of_stock">Agotados (0)</SelectItem>
                </SelectContent>
              </Select>

              {/* Selector de Ordenamiento */}
              <Select value={sortBy} onValueChange={(val) => { setSortBy(val); setPage(1); }}>
                <SelectTrigger className="h-9 text-xs rounded-full bg-[#F4F6F9] dark:bg-muted/50 border-0 shadow-none font-medium w-[160px]">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Ordenar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock_desc">Mayor Existencia</SelectItem>
                  <SelectItem value="name_asc">Nombre (A - Z)</SelectItem>
                  <SelectItem value="name_desc">Nombre (Z - A)</SelectItem>
                </SelectContent>
              </Select>

              {/* Selector de Tamaño de Página */}
              <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-9 text-xs rounded-full bg-[#F4F6F9] dark:bg-muted/50 border-0 shadow-none font-medium w-[110px]">
                  <SelectValue placeholder="Por pág." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 / pág.</SelectItem>
                  <SelectItem value="50">50 / pág.</SelectItem>
                  <SelectItem value="100">100 / pág.</SelectItem>
                  <SelectItem value="200">200 / pág.</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="w-[120px] text-xs font-bold uppercase tracking-wider text-muted-foreground pl-6">SKU / ID</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Producto</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Familia</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estado</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Precio Normal</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Stock Total</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><Skeleton className="h-4 w-20 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-64 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto rounded-md" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto rounded-md" /></TableCell>
                    <TableCell className="text-right pr-6"><Skeleton className="h-8 w-8 ml-auto rounded-xl" /></TableCell>
                  </TableRow>
                ))
              ) : products.length > 0 ? (
                products.map((product) => {
                  const totalStock = (product.stock || []).reduce((sum, s) => sum + s.quantity, 0);
                  const sku = (product.codes || []).find(c => c.type === 'SKU')?.value || product.id;
                  const normalPrice = (product.prices || []).find(p => p.tierName === 'Normal' || p.tierId === 1)?.price || 0;
                  return (
                    <TableRow key={product.id} className="hover:bg-muted/30 transition-colors border-border/50">
                      <TableCell className="font-mono text-xs text-muted-foreground font-semibold pl-6">{sku}</TableCell>
                      <TableCell>
                        <Link href={`/inventory/${product.id}`} className="font-semibold text-foreground hover:text-primary transition-colors text-sm block">
                          {product.name}
                        </Link>
                        <span className="text-[11px] text-muted-foreground font-mono">{product.id}</span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary">
                          {product.family?.name || 'General'}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(totalStock)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                        Q{normalPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-sm text-foreground">
                        {totalStock.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg hover:bg-muted">
                          <Link href={`/inventory/${product.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-sm">
                    No se encontraron productos coincidentes con los filtros actuales.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Paginación Completa */}
        <CardFooter className="p-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground font-medium">
            {totalItems > 0 ? (
              <>
                Mostrando <span className="font-bold text-foreground">{startIndex}</span> a <span className="font-bold text-foreground">{endIndex}</span> de <span className="font-bold text-foreground">{totalItems.toLocaleString()}</span> artículos
              </>
            ) : (
              '0 artículos encontrados'
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(1)}
              disabled={page <= 1 || loading}
              className="h-8 w-8 rounded-lg"
              title="Primera Página"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page <= 1 || loading}
              className="h-8 w-8 rounded-lg"
              title="Página Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-xs font-semibold text-foreground px-3">
              Página {page} de {Math.max(totalPages, 1)}
            </span>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || loading}
              className="h-8 w-8 rounded-lg"
              title="Página Siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages || loading}
              className="h-8 w-8 rounded-lg"
              title="Última Página"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
