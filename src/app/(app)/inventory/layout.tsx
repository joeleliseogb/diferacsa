'use client';

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Package, ArrowRightLeft } from "lucide-react";

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const getActiveTab = () => {
    if (pathname.includes('/inventory/transfers')) {
      return 'transfers';
    }
    return 'products';
  };
  
  const activeTab = getActiveTab();

  // If viewing a specific product detail or edit or new, render children directly without tab headers
  const isSubPage = pathname.match(/\/inventory\/[^\/]+/);
  if (isSubPage && !pathname.endsWith('/inventory/transfers')) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-4">
      <div className="border-b border-border/60 pb-1">
        <Tabs value={activeTab} onValueChange={(value) => router.push(`/inventory${value === 'products' ? '' : '/' + value}`)} className="w-auto">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="products" asChild className="rounded-lg text-xs font-semibold">
              <Link href="/inventory" className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                <span>Catálogo de Productos</span>
              </Link>
            </TabsTrigger>
            <TabsTrigger value="transfers" asChild className="rounded-lg text-xs font-semibold">
              <Link href="/inventory/transfers" className="flex items-center gap-1.5">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span>Traslados entre Bodegas</span>
              </Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {children}
    </div>
  );
}
