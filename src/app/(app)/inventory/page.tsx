
'use client'

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
import Link from 'next/link';
import { getProducts } from '@/lib/product-service';
import type { Product } from '@/lib/product-data';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Página para mostrar y gestionar el inventario de productos.
 * @returns {JSX.Element} El componente de la página de inventario.
 */
export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadProducts() {
        const data = await getProducts();
        setProducts(data);
        setLoading(false);
    }
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) {
      return products;
    }
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.codes || []).some(code => code.value.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [products, searchTerm]);

  /**
   * Devuelve la variante de color para el badge de estado según el stock.
   * @param {number} stock - El stock total del producto.
   * @returns {string} La variante de color para el componente Badge.
   */
  const getStatusVariant = (stock: number): "secondary" | "default" | "destructive" => {
    if (stock > 20) return 'secondary';
    if (stock > 0) return 'default';
    return 'destructive';
  };

  const getStatusLabel = (stock: number): string => {
    if (stock > 20) return 'En Stock';
    if (stock > 0) return 'Stock Bajo';
    return 'Agotado';
  }

  return (
    <div className="space-y-6">
       {/* Tarjeta que contiene la tabla de productos */}
       <Card>
        <CardHeader>
          <CardTitle>Productos en Inventario</CardTitle>
          <CardDescription>Un listado de los productos y su nivel de stock.</CardDescription>
          <div className="pt-4">
            <Input
              placeholder="Buscar por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabla para mostrar los productos */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Familia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Stock Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                 ))
              ) : (
                filteredProducts.map((product) => {
                  const totalStock = (product.stock || []).reduce((sum, s) => sum + s.quantity, 0);
                  const sku = (product.codes || []).find(c => c.type === 'SKU')?.value || 'N/A';
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono">{sku}</TableCell>
                      <TableCell>
                        <Link href={`/inventory/${product.id}`} className="font-medium hover:underline">
                          {product.name}
                        </Link>
                      </TableCell>
                      <TableCell>{product.family.name}</TableCell>
                      <TableCell>
                        {product.isService ? (
                          <Badge variant="outline">Servicio</Badge>
                        ) : (
                          <Badge variant={getStatusVariant(totalStock)}>
                            {getStatusLabel(totalStock)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {product.isService ? 'N/A' : totalStock}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/inventory/${product.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar Producto</span>
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
