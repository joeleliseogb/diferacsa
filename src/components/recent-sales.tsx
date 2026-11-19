
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { InvoiceWithCustomer } from "@/lib/servicios"

interface RecentSalesProps {
  sales: InvoiceWithCustomer[];
}
/**
 * Componente para mostrar una lista de ventas recientes.
 */
export function RecentSales({ sales }: RecentSalesProps) {

  if (!sales || sales.length === 0) {
    return <div className="flex items-center justify-center h-[350px] text-muted-foreground">No hay ventas en este período.</div>;
  }
  
  // Show only the 5 most recent sales from the filtered list
  const recentSales = sales.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Itera sobre la lista de ventas para mostrar cada una. */}
      {recentSales.map((sale) => (
        <div key={sale.invoice} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarImage src={`https://placehold.co/36x36.png`} alt="Avatar" data-ai-hint="user avatar" />
            <AvatarFallback>{sale.customerName.substring(0,2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{sale.customerName}</p>
            <p className="text-sm text-muted-foreground">Factura: {sale.invoice}</p>
          </div>
          <div className="ml-auto font-medium">{sale.total}</div>
        </div>
      ))}
    </div>
  )
}
