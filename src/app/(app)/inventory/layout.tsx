
'use client';

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Package, PlusCircle, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Determina la pestaña activa basada en la URL.
  const getActiveTab = () => {
    if (pathname.includes('/inventory/transfers')) {
      return 'transfers';
    }
    // Asume que cualquier otra ruta dentro de /inventory es para productos
    return 'products';
  };
  
  const activeTab = getActiveTab();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Inventario</h1>
        {activeTab === 'products' && (
            <Button asChild>
                <Link href="/inventory/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Producto
                </Link>
            </Button>
        )}
         {activeTab === 'transfers' && (
            <Button asChild>
                <Link href="/inventory/transfers/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nuevo Traslado
                </Link>
            </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => router.push(`/inventory${value === 'products' ? '' : '/' + value}`)} className="w-full">
        <TabsList>
            <TabsTrigger value="products" asChild>
                <Link href="/inventory" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>Productos</span>
                </Link>
            </TabsTrigger>
            <TabsTrigger value="transfers" asChild>
                <Link href="/inventory/transfers" className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4" />
                    <span>Traslados</span>
                </Link>
            </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {children}
    </div>
  );
}
