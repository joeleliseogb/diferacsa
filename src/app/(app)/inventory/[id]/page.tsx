
'use client'

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getProduct } from '@/lib/product-service';
import type { Product } from '@/lib/product-data';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Edit,
  Box,
  DollarSign,
  Barcode,
  Tag,
  Warehouse,
  Users,
  History,
  ShoppingCart,
  Receipt,
  ImageIcon,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from '@/components/ui/skeleton';


export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null | undefined>(undefined);

  useEffect(() => {
    if (id) {
        async function loadProduct() {
            const data = await getProduct(id);
            setProduct(data);
        }
        loadProduct();
    }
  }, [id]);


  if (product === undefined) {
    return <ProductDetailSkeleton />;
  }
  
  if (!product) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Producto no encontrado</h2>
        <p className="text-muted-foreground">
          El producto que buscas no existe.
        </p>
        <Button asChild className="mt-4">
          <Link href="/inventory">Volver al Inventario</Link>
        </Button>
      </div>
    );
  }

  const totalStock =
    (product.stock || []).reduce((sum, s) => sum + s.quantity, 0) || 0;
  const primaryImage =
    (product.images || []).find((img) => img.isPrimary)?.url ||
    (product.images || [])[0]?.url ||
    '/placeholder.svg';

  const primarySupplier = (product.suppliers || []).find(s => s.isPrimary) || (product.suppliers || [])?.[0];
  const referenceCost = primarySupplier?.cost || 0;
  const taxRate = (product.tax?.rate ?? 0) / 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/inventory">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Ficha de Artículo
          </h1>
        </div>
        <Button asChild>
          <Link href={`/inventory/${id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar Artículo
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Image
              src={primaryImage}
              alt={product.name}
              width={400}
              height={400}
              className="rounded-lg object-cover aspect-square"
              data-ai-hint="product image"
            />
          </div>
          <div className="md:col-span-2 space-y-3">
            <div className="flex gap-2 items-center">
              <Badge variant="outline">{product.family?.name ?? 'Sin Familia'}</Badge>
              {product.isService && <Badge variant="secondary">Servicio</Badge>}
            </div>
            <CardTitle className="text-3xl font-bold">
              {product.name}
            </CardTitle>
            <CardDescription className="text-base">
              {product.description}
            </CardDescription>
            {!product.isService && (
              <div className="flex items-center gap-4 pt-4">
                <div className="flex items-center gap-2">
                  <Box className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold text-lg">{totalStock}</span>
                  <span className="text-muted-foreground">en stock</span>
                </div>
                <div className="flex items-center gap-2">
                  <Barcode className="h-5 w-5 text-muted-foreground" />
                  <span className="font-mono text-sm">
                    {(product.codes || []).find((c) => c.type === 'SKU')?.value || 'N/A'}
                  </span>
                </div>
              </div>
            )}
             {product.isService && (
                <div className="flex items-center gap-2 pt-4">
                    <Barcode className="h-5 w-5 text-muted-foreground" />
                    <span className="font-mono text-sm">
                        {(product.codes || []).find((c) => c.type === 'SKU')?.value || 'N/A'}
                    </span>
                </div>
             )}
            <div className="flex flex-wrap gap-2 pt-2">
              {product.attributes?.color && <Badge>{product.attributes.color}</Badge>}
              {product.attributes?.size && <Badge>{product.attributes.size}</Badge>}
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <Tabs defaultValue="stock" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stock">Stock y Proveedores</TabsTrigger>
            <TabsTrigger value="pricing">Precios e Impuestos</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
            <TabsTrigger value="details">Fotos y Códigos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="stock" className="space-y-6">
          {!product.isService && (
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Warehouse/>Stock por Almacén</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Almacén</TableHead>
                                <TableHead className="text-right">Cantidad en Stock</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(product.stock || []).map(s => (
                                <TableRow key={s.warehouseId}>
                                    <TableCell className="font-medium">{s.warehouseName}</TableCell>
                                    <TableCell className="text-right font-semibold">{s.quantity}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
          )}
             <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Users/>Proveedores</CardTitle></CardHeader>
                <CardContent>
                   {(product.suppliers || []).length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Proveedor</TableHead>
                                <TableHead>Última Compra</TableHead>
                                <TableHead className="text-right">Costo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(product.suppliers || []).map(s => (
                                <TableRow key={s.relId}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                      {s.name}
                                      {s.isPrimary && (
                                        <Badge variant="outline" className="flex items-center gap-1">
                                          <Star className="h-3 w-3 fill-primary text-primary" />
                                          Principal
                                        </Badge>
                                      )}
                                      </TableCell>
                                    <TableCell>{s.lastPurchaseDate}</TableCell>
                                    <TableCell className="text-right">Q{s.cost.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                   ) : (
                    <p className="text-sm text-center text-muted-foreground p-4">No hay proveedores asignados a este producto.</p>
                   )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><DollarSign/>Tarifas de Precios</CardTitle>
                     <CardDescription>
                        Análisis de precios y márgenes de ganancia por tarifa. El costo de referencia (Q{referenceCost.toFixed(2)}) se basa en el proveedor principal asignado.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {(product.prices || []).length > 0 ? (
                        <Accordion type="multiple" className="w-full">
                            {(product.prices || []).map(p => {
                                const priceWithTax = p.price;
                                const priceWithoutTax = taxRate > 0 ? priceWithTax / (1 + taxRate) : priceWithTax;
                                const profitValueWithoutTax = priceWithoutTax - referenceCost;
                                const profitMarginWithoutTax = referenceCost > 0 ? (profitValueWithoutTax / referenceCost) * 100 : Infinity;

                                return (
                                    <AccordionItem value={`price-${p.tierId}`} key={p.tierId}>
                                        <AccordionTrigger className="hover:no-underline text-left">
                                            <div className="flex justify-between items-center w-full pr-4">
                                                <div className="flex-1">
                                                    <p className="font-semibold">{p.tierName}</p>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                        <span>Ganancia (s/IVA):</span>
                                                        <span className="font-medium text-green-600">
                                                            Q{profitValueWithoutTax.toFixed(2)}
                                                            {isFinite(profitMarginWithoutTax) && ` (${profitMarginWithoutTax.toFixed(1)}%)`}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right pl-4">
                                                    <p className="font-bold text-lg">Q{priceWithTax.toFixed(2)}</p>
                                                    <p className="text-xs text-muted-foreground">Venta (c/IVA)</p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="px-4 pt-4 pb-2 border-t text-sm space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted-foreground">Precio Venta (sin IVA)</span>
                                                    <span className="font-medium">Q{priceWithoutTax.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted-foreground">Costo de Referencia</span>
                                                    <span className="font-medium">Q{referenceCost.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted-foreground">Impuesto ({product.tax?.name ?? 'N/A'} {product.tax?.rate ?? 0}%)</span>
                                                    <span className="font-medium">Q{(priceWithTax - priceWithoutTax).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                    ) : (
                        <p className="text-sm text-center text-muted-foreground p-4">No hay precios definidos para este producto.</p>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Tag/>Impuestos</CardTitle></CardHeader>
                <CardContent>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Impuesto aplicado por defecto</span>
                        <span className="font-semibold">{product.tax?.name ?? 'N/A'} ({product.tax?.rate ?? 0}%)</span>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="history">
             <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><History/>Historial de Movimientos</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Documento</TableHead>
                                <TableHead className="text-right">Cantidad</TableHead>
                                <TableHead className="text-right">Precio/Costo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(product.history || []).map((h, i) => (
                                <TableRow key={i}>
                                    <TableCell>{h.date}</TableCell>
                                    <TableCell>
                                        <Badge variant={h.type === 'Venta' ? 'secondary' : 'outline'} className="gap-1.5 pl-1.5">
                                            {h.type === 'Venta' ? <ShoppingCart className="h-3.5 w-3.5" /> : <Receipt className="h-3.5 w-3.5" />}
                                            {h.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{h.document}</TableCell>
                                    <TableCell className={`text-right font-medium ${h.type === 'Venta' ? 'text-destructive' : 'text-green-600'}`}>{h.quantity}</TableCell>
                                    <TableCell className="text-right">Q{h.price.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="details" className="space-y-6">
            <Card>
                 <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon/>Galería de Fotos</CardTitle></CardHeader>
                 <CardContent>
                   {(product.images || []).length > 0 ? (
                    <Carousel className="w-full max-w-xs mx-auto">
                        <CarouselContent>
                            {(product.images || []).map(image => (
                                <CarouselItem key={image.id}>
                                    <Image src={image.url} alt={product.name} width={400} height={400} className="rounded-lg object-cover aspect-square" data-ai-hint="product image" />
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious/>
                        <CarouselNext/>
                    </Carousel>
                   ) : (
                     <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                        <ImageIcon className="mx-auto h-10 w-10"/>
                        <p className="mt-2">No hay imágenes para este producto.</p>
                     </div>
                   )}
                 </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Barcode/>Códigos Adicionales</CardTitle></CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(product.codes || []).map(c => (
                                <TableRow key={c.id}>
                                    <TableCell>{c.type}</TableCell>
                                    <TableCell className="font-mono">{c.value}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}


function ProductDetailSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            <Card>
                <CardHeader className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <Skeleton className="rounded-lg aspect-square w-full" />
                    </div>
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex gap-2">
                           <Skeleton className="h-6 w-24 rounded-full" />
                           <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-2/3" />
                         <div className="flex items-center gap-4 pt-4">
                            <Skeleton className="h-7 w-40" />
                            <Skeleton className="h-7 w-40" />
                         </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="space-y-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    )
}
