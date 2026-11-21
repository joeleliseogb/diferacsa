import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { InvoiceWithCustomer } from "@/lib/servicios"

interface RecentSalesProps {
  sales: InvoiceWithCustomer[];
}

/**
 * Componente para mostrar una lista de ventas recientes con estética limpia tipo theme.jpeg.
 */
export function RecentSales({ sales }: RecentSalesProps) {

  if (!sales || sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground gap-2">
        <p className="text-sm">No hay ventas registradas en este período.</p>
      </div>
    );
  }
  
  // Mostrar las 5 ventas más recientes
  const recentSales = sales.slice(0, 5);

  return (
    <div className="space-y-3">
      {recentSales.map((sale) => (
        <div 
          key={sale.invoice} 
          className="flex items-center justify-between p-3 rounded-2xl transition-all hover:bg-muted/50 border border-transparent hover:border-border/60"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <Avatar className="h-10 w-10 rounded-2xl border border-border/80 flex-shrink-0">
              <AvatarImage src={`https://placehold.co/40x40.png`} alt={sale.customerName} />
              <AvatarFallback className="rounded-2xl bg-primary/10 text-primary font-bold text-xs">
                {sale.customerName ? sale.customerName.substring(0, 2).toUpperCase() : 'CF'}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{sale.customerName}</p>
              <p className="text-xs text-muted-foreground">Factura #{sale.invoice}</p>
            </div>
          </div>
          <div className="text-sm font-bold text-foreground font-mono bg-muted/60 px-3 py-1.5 rounded-xl flex-shrink-0 border border-border/40">
            {sale.total}
          </div>
        </div>
      ))}
    </div>
  )
}
