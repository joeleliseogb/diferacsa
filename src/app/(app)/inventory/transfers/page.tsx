
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { getAllTransfers, type StockTransfer } from '@/lib/product-service';
import { getWarehouses, type Warehouse } from '@/lib/settings-service';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function TransfersPage() {
    const [transfers, setTransfers] = useState<StockTransfer[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            setTransfers(await getAllTransfers());
            setWarehouses(await getWarehouses());
            setLoading(false);
        }
        loadData();
    }, []);

    const getWarehouseName = (id: string) => {
        return warehouses.find(w => w.id.toString() === id)?.name || 'Desconocido';
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Traslados</CardTitle>
                    <CardDescription>Vales de traslado de inventario entre almacenes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vale</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Origen</TableHead>
                                <TableHead>Destino</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Items</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : transfers.length > 0 ? (
                                transfers.map(transfer => (
                                    <TableRow key={transfer.id}>
                                        <TableCell className="font-medium">{transfer.id}</TableCell>
                                        <TableCell>{transfer.date}</TableCell>
                                        <TableCell>{getWarehouseName(transfer.originWarehouseId)}</TableCell>
                                        <TableCell>{getWarehouseName(transfer.destinationWarehouseId)}</TableCell>
                                        <TableCell><Badge variant="secondary">{transfer.status}</Badge></TableCell>
                                        <TableCell className="text-right">{transfer.items.reduce((acc, item) => acc + item.quantity, 0)}</TableCell>
                                        <TableCell className="text-right">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Detalle del Traslado: {transfer.id}</DialogTitle>
                                                        <DialogDescription>
                                                            De {getWarehouseName(transfer.originWarehouseId)} a {getWarehouseName(transfer.destinationWarehouseId)}
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Producto</TableHead>
                                                                <TableHead className="text-right">Cantidad</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {transfer.items.map(item => (
                                                                <TableRow key={item.sku}>
                                                                    <TableCell>{item.name}</TableCell>
                                                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">No hay traslados registrados.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
