
'use client'

import { useState, useEffect, Fragment }from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ArrowLeft, Save, Calendar as CalendarIcon, Users, Package2, ChevronDown, PlusCircle, Trash2 } from "lucide-react"
import Link from "next/link"
import { getPendingDeliveryOrders, type OrderWithCustomer, updateOrder, saveDeliveryRoute, generateNewDeliveryRouteId, type Order, getDrivers, type Driver } from "@/lib/servicios";
import { format } from "date-fns"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

type StagedItem = {
    orderId: string;
    customerId: string;
    customerName: string;
    products: {
        sku: string;
        name: string;
        qty: number;
        price: number;
    }[];
    deliveryAddress?: Order['deliveryAddress'];
}

export default function NewDeliveryPage() {
    const router = useRouter();
    const [pendingOrders, setPendingOrders] = useState<OrderWithCustomer[]>([]);
    const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
    const [routeDate, setRouteDate] = useState<Date | undefined>();
    const [driver, setDriver] = useState<string>('');
    const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
    const [quantitiesToDeliver, setQuantitiesToDeliver] = useState<Record<string, number>>({});
    
    useEffect(() => {
        async function loadData() {
            setPendingOrders(await getPendingDeliveryOrders());
            setAvailableDrivers(await getDrivers());
        }
        loadData();
        setRouteDate(new Date());
    }, []);
    
    const handleQuantityChange = (orderId: string, sku: string, qty: number) => {
        const key = `${orderId}-${sku}`;
        setQuantitiesToDeliver(prev => ({ ...prev, [key]: qty }));
    }

    const handleStageOrderItems = (order: OrderWithCustomer) => {
        const itemsToStage = order.products
            .map(p => {
                const key = `${order.id}-${p.sku}`;
                const qtyToDeliver = quantitiesToDeliver[key] || 0;
                const qtyPending = p.qty - p.qtyDelivered;
                return {
                    ...p,
                    qty: Math.min(qtyToDeliver, qtyPending) // Ensure not to deliver more than pending
                };
            })
            .filter(p => p.qty > 0);

        if (itemsToStage.length === 0) return;

        const existingStage = stagedItems.find(item => item.orderId === order.id);

        if (existingStage) {
            // Update existing staged order
            setStagedItems(stagedItems.map(item => item.orderId === order.id ? { ...item, products: itemsToStage } : item));
        } else {
            // Add new order to stage
            setStagedItems([...stagedItems, {
                orderId: order.id,
                customerId: order.customerId,
                customerName: order.customerName,
                products: itemsToStage,
                deliveryAddress: order.deliveryAddress
            }]);
        }
    };
    
    const handleUnstageOrder = (orderId: string) => {
        setStagedItems(stagedItems.filter(item => item.orderId !== orderId));
    };


    const totalItems = stagedItems.reduce((acc, order) => acc + order.products.reduce((sum, p) => sum + p.qty, 0), 0);
    const totalValue = stagedItems.reduce((acc, order) => acc + order.products.reduce((sum, p) => sum + p.price * p.qty, 0), 0);
    
    const handleSaveRoute = async () => {
        if (stagedItems.length === 0 || !driver || !routeDate) {
            alert("Por favor, añade pedidos a la ruta, selecciona una fecha y un conductor.");
            return;
        }
        
        const deliveryOrders: Order[] = await Promise.all(stagedItems.map(async (item) => {
            const originalOrderData = await getPendingDeliveryOrders();
            const originalOrder = originalOrderData.find(o => o.id === item.orderId)!;
            return {
                ...originalOrder,
                products: item.products.map(p => ({
                    ...p,
                    qtyDelivered: 0, // This is qty for this specific delivery, not total delivered
                })),
                deliveryAddress: item.deliveryAddress
            };
        }));


        const newRoute = {
            id: await generateNewDeliveryRouteId(),
            driver,
            date: format(routeDate, "yyyy-MM-dd"),
            status: 'Programada' as const,
            stops: [...new Set(stagedItems.map(o => o.customerId))].length,
            totalValue,
            totalItems,
            orders: deliveryOrders,
        };

        await saveDeliveryRoute(newRoute);
        router.push('/deliveries');
    }

    return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/deliveries"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Nueva Ruta de Entrega</h1>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" asChild><Link href="/deliveries">Cancelar</Link></Button>
                <Button onClick={handleSaveRoute}><Save className="mr-2 h-4 w-4" />Guardar Ruta</Button>
            </div>
      </div>

       <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <Card>
                <CardHeader>
                    <CardTitle>Pedidos Pendientes de Entrega</CardTitle>
                    <CardDescription>Selecciona los productos de cada pedido para añadir a la ruta.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {pendingOrders.length > 0 ? pendingOrders.map(order => (
                            <Collapsible key={order.id} className="border rounded-lg">
                                <CollapsibleTrigger className="w-full p-4 hover:bg-muted/50 rounded-t-lg">
                                    <div className="flex justify-between items-center">
                                        <div className="text-left">
                                            <p className="font-semibold">{order.id} - {order.customerName}</p>
                                            <p className="text-sm text-muted-foreground">Estado: {order.status}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm">Productos Pendientes: <Badge variant="outline">{order.products.reduce((acc, p) => acc + (p.qty - p.qtyDelivered), 0)}</Badge></span>
                                            <ChevronDown className="h-4 w-4"/>
                                        </div>
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="p-4 border-t bg-muted/50">
                                        <h4 className="font-semibold mb-2">Seleccionar productos para esta ruta:</h4>
                                        {order.products.filter(p => p.qty > p.qtyDelivered).map(p => (
                                            <div key={p.sku} className="flex items-center justify-between gap-4 mb-2">
                                                <div>
                                                    <p className="font-medium">{p.name}</p>
                                                    <p className="text-xs text-muted-foreground">SKU: {p.sku} | Pendientes: {p.qty - p.qtyDelivered}</p>
                                                </div>
                                                <Input 
                                                    type="number"
                                                    className="w-24 h-9"
                                                    placeholder="0"
                                                    max={p.qty - p.qtyDelivered}
                                                    min={0}
                                                    onChange={(e) => handleQuantityChange(order.id, p.sku, parseInt(e.target.value, 10))}
                                                />
                                            </div>
                                        ))}
                                        <div className="text-right mt-4">
                                            <Button size="sm" onClick={() => handleStageOrderItems(order)}>
                                                <PlusCircle className="mr-2 h-4 w-4"/>Añadir a Ruta
                                            </Button>
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        )) : (
                           <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
                                No hay pedidos listos para entrega en este momento.
                           </div>
                        )}
                    </div>
                </CardContent>
           </Card>

           <Card>
            <CardHeader>
                <CardTitle>Manifiesto de Ruta</CardTitle>
                <CardDescription>Pedidos y productos incluidos en esta entrega.</CardDescription>
            </CardHeader>
            <CardContent>
                {stagedItems.length > 0 ? (
                    <div className="space-y-4">
                    {stagedItems.map(order => (
                        <div key={order.orderId} className="border p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold">{order.orderId} - {order.customerName}</h4>
                                    <p className="text-sm text-muted-foreground">{order.products.map(p => `${p.qty}x ${p.name}`).join(', ')}</p>
                                </div>
                                <Button size="sm" variant="destructive" onClick={() => handleUnstageOrder(order.orderId)}>
                                    <Trash2 className="mr-2 h-4 w-4"/> Quitar
                                </Button>
                            </div>
                        </div>
                    ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Aún no has añadido ningún pedido a la ruta.</p>
                )}
            </CardContent>
           </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Información de la Ruta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="routeDate">Fecha de la Ruta</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className="w-full justify-start text-left font-normal"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {routeDate ? format(routeDate, "PPP") : <span>Elige una fecha</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={routeDate} onSelect={setRouteDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="driver">Conductor Asignado</Label>
                        <Select value={driver} onValueChange={setDriver}>
                            <SelectTrigger id="driver">
                                <SelectValue placeholder="Seleccionar conductor..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableDrivers.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Totales Consolidados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Paradas</span>
                        <span className="font-bold text-lg">{[...new Set(stagedItems.map(o => o.customerId))].length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2"><Package2 className="h-4 w-4" /> Items Totales</span>
                        <span className="font-bold text-lg">{totalItems}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Valor Total (Pedidos)</span>
                        <span className="font-bold text-lg">Q{totalValue.toFixed(2)}</span>
                    </div>
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-muted-foreground">Esta información es para uso logístico.</p>
                </CardFooter>
            </Card>
        </div>
       </div>
    </div>
  )
}
