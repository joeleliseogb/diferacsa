

'use client'

import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, DollarSign, ArrowUp, ArrowDown, Banknote, Search, FileText, Printer, LockKeyholeOpen, PiggyBank, Receipt, History, WalletCards, LogOut, HandCoins, HardHat } from "lucide-react";
import type { Branch, PaymentMethod, PurchaseOrderWithSupplier, PosTerminal, CompanyInfo, Closure, Movement, InvoiceWithCustomerAndBalance, PosSettings, Settings, Customer, BulkPaymentResult, Supplier, BulkSupplierPaymentResult, ReservationWithDetails } from "@/lib/servicios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAllInvoices, registerPayment, getCashRegisterMovements, addCashRegisterMovement, getAllPurchaseOrders, getCompanyInfo, getBranches, getPosTerminals, getClosures, saveClosure, getPaymentMethods, getSupplier, updatePurchaseOrder, getPosSettings, getSettings, getCustomers, registerBulkPayment, getSuppliers, registerBulkSupplierPayment, getAllReservations, saveReservation } from '@/lib/servicios';
import { isToday, parseISO, isPast, format, startOfToday } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { PrintableCashRegisterReport, type ReportData } from "@/components/printable-cash-register-report";
import { PrintablePaymentReceipt, type ReceiptData } from "@/components/printable-payment-receipt";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function PaginaCajero() {
    const { toast } = useToast();
    const [sucursales, setSucursales] = useState<Branch[]>([]);
    const [terminales, setTerminales] = useState<PosTerminal[]>([]);
    const [sucursalSeleccionada, setSucursalSeleccionada] = useState<string>("");
    const [terminalSeleccionada, setTerminalSeleccionada] = useState<string>("");
    const [movimientos, setMovimientos] = useState<Movement[]>([]);
    const [cierres, setCierres] = useState<Closure[]>([]);
    const [dialogoAbierto, setDialogoAbierto] = useState(false);
    const [dialogoAperturaAbierto, setDialogoAperturaAbierto] = useState(false);
    const [montoApertura, setMontoApertura] = useState('');
    const [nuevoMovimiento, setNuevoMovimiento] = useState({ tipo: 'Salida Manual', concepto: '', monto: '' });
    const [ventasPendientes, setVentasPendientes] = useState<InvoiceWithCustomerAndBalance[]>([]);
    const [ordenesPorPagar, setOrdenesPorPagar] = useState<PurchaseOrderWithSupplier[]>([]);
    const [facturaSeleccionada, setFacturaSeleccionada] = useState<InvoiceWithCustomerAndBalance | null>(null);
    const [ordenSeleccionada, setOrdenSeleccionada] = useState<PurchaseOrderWithSupplier | null>(null);
    const [dialogoPagoAbierto, setDialogoPagoAbierto] = useState(false);
    const [dialogoPagoProveedorAbierto, setDialogoPagoProveedorAbierto] = useState(false);
    const [detallesPago, setDetallesPago] = useState({ monto: '', metodo: '', documentNumber: '' });
    const [metodosPago, setMetodosPago] = useState<PaymentMethod[]>([]);
    const [terminoBusquedaCobrar, setTerminoBusquedaCobrar] = useState('');
    const [terminoBusquedaPagar, setTerminoBusquedaPagar] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    const [dialogoAbonoAbierto, setDialogoAbonoAbierto] = useState(false);
    const [clienteAbono, setClienteAbono] = useState<Customer | null>(null);
    const [montoAbono, setMontoAbono] = useState('');

    const [dialogoAbonoProveedorAbierto, setDialogoAbonoProveedorAbierto] = useState(false);
    const [proveedorAbono, setProveedorAbono] = useState<Supplier | null>(null);
    const [montoAbonoProveedor, setMontoAbonoProveedor] = useState('');

    const [dialogoCierreAbierto, setDialogoCierreAbierto] = useState(false);
    const [montoContado, setMontoContado] = useState('');
    const [datosReporte, setDatosReporte] = useState<ReportData | null>(null);
    const [infoEmpresa, setInfoEmpresa] = useState<CompanyInfo | null>(null);
    const printableRef = useRef<HTMLDivElement>(null);
    const printableReceiptRef = useRef<HTMLDivElement>(null);
    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

    
    const [settings, setSettings] = useState<Settings | null>(null);

    const [totalesDialogoCierre, setTotalesDialogoCierre] = useState({ ingresos: 0, egresos: 0 });
    const [dialogoPostCierreAbierto, setDialogoPostCierreAbierto] = useState(false);
    const [opcionPostCierre, setOpcionPostCierre] = useState<'leave' | 'withdraw'>('leave');

    const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
    const [selectedReservation, setSelectedReservation] = useState<ReservationWithDetails | null>(null);
    const [reservationPaymentAmount, setReservationPaymentAmount] = useState<number>(0);
    const [isReservationPaymentOpen, setIsReservationPaymentOpen] = useState(false);
    const [terminoBusquedaReservations, setTerminoBusquedaReservations] = useState('');


    const cargarDependencias = async () => {
        const [sucursalesData, metodosPagoData, facturasData, movimientosData, ordenesData, empresaData, terminalesData, cierresData, settingsData, customersData, suppliersData, reservationsData] = await Promise.all([
            getBranches(),
            getPaymentMethods(),
            getAllInvoices(),
            getCashRegisterMovements(),
            getAllPurchaseOrders(),
            getCompanyInfo(),
            getPosTerminals(),
            getClosures(),
            getSettings(),
            getCustomers(),
            getSuppliers(),
            getAllReservations()
        ]);
        
        setSucursales(sucursalesData);
        if (sucursalesData.length > 0 && !sucursalSeleccionada) {
            setSucursalSeleccionada(sucursalesData[0].id.toString());
        }
        
        setMetodosPago(metodosPagoData);
        setVentasPendientes(facturasData);
        setOrdenesPorPagar(ordenesData);
        setMovimientos(movimientosData);
        setCierres(cierresData);
        setInfoEmpresa(empresaData);
        setTerminales(terminalesData);
        setSettings(settingsData);
        setCustomers(customersData);
        setSuppliers(suppliersData);
        setReservations(reservationsData);
    }

    useEffect(() => {
        cargarDependencias();
        const intervalId = setInterval(cargarDependencias, 5000); // Polling every 5 seconds
        return () => {
            clearInterval(intervalId);
        };
    }, []);
    
    const cajaAbiertaHoy = useMemo(() => {
        if (!sucursalSeleccionada || !settings) return false;
        if(settings.cashRegisterWorkflow === 'flexible') return true; // Siempre abierta en modo flexible

        return movimientos.some(m => 
            m.tipo === 'Apertura' &&
            m.branchId === sucursalSeleccionada &&
            (!terminalSeleccionada || m.terminalId === terminalSeleccionada) &&
            isToday(parseISO(m.fecha))
        );
    }, [movimientos, sucursalSeleccionada, terminalSeleccionada, settings]);
    
    const modoEstrictoCaja = useMemo(() => {
        return settings?.cashRegisterWorkflow === 'strict';
    }, [settings]);

    const puedeOperarCaja = useMemo(() => {
        if (!modoEstrictoCaja) return true; // Si no es modo estricto, siempre se puede operar.
        return cajaAbiertaHoy;
    }, [modoEstrictoCaja, cajaAbiertaHoy]);

    const mostrarToastCajaCerrada = () => {
        toast({
            title: 'Caja Cerrada',
            description: 'Debes abrir la caja antes de registrar movimientos.',
            variant: 'destructive'
        });
    }

    const terminalesFiltradas = useMemo(() => {
        if (!sucursalSeleccionada) return [];
        const branch = sucursales.find(s => s.id.toString() === sucursalSeleccionada);
        if (!branch) return [];
        return terminales.filter(t => t.branch === branch.name);
    }, [terminales, sucursalSeleccionada, sucursales]);
    
    useEffect(() => {
        setTerminalSeleccionada("");
    }, [sucursalSeleccionada]);

    const movimientosFiltrados = useMemo(() => {
        let items = movimientos.filter(m => m.branchId === sucursalSeleccionada);
        if (terminalSeleccionada) {
            items = items.filter(m => m.terminalId?.toString() === terminalSeleccionada);
        }
        return items.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    }, [movimientos, sucursalSeleccionada, terminalSeleccionada]);

    const facturasFiltradas = useMemo(() => {
        const facturasPendientes = ventasPendientes.filter(f => {
            const hasRemainingBalance = f.remaining > 0;
            const isPendingStatus = ['Pendiente de Pago', 'Pago Parcial', 'Certificado', 'Pago en Obra'].includes(f.status);
            return hasRemainingBalance && isPendingStatus;
        });
    
        if (!terminoBusquedaCobrar) return facturasPendientes;
    
        const termino = terminoBusquedaCobrar.toLowerCase();
        return facturasPendientes.filter(v => 
            v.invoice.toLowerCase().includes(termino) ||
            v.customerName.toLowerCase().includes(termino) ||
            v.status.toLowerCase().includes(termino) ||
            v.date.includes(termino)
        );
    }, [ventasPendientes, terminoBusquedaCobrar]);

    const ordenesFiltradas = useMemo(() => {
        const ordenesPendientes = ordenesPorPagar.filter(o => {
            const total = parseFloat(o.total.replace(/Q|,/g, '')) || 0;
            const paid = (o.payments || []).reduce((s, p) => s + p.amount, 0);
            return total > paid;
        });

        if (!terminoBusquedaPagar) return ordenesPendientes;
        const termino = terminoBusquedaPagar.toLowerCase();
        return ordenesPendientes.filter(o => 
            (o.order.toLowerCase().includes(termino) ||
            o.supplierName.toLowerCase().includes(termino) ||
            o.status.toLowerCase().includes(termino) ||
            o.date.includes(termino))
        );
    }, [ordenesPorPagar, terminoBusquedaPagar]);
    
    const reservationsFiltradas = useMemo(() => {
        const pendingReservations = reservations.filter(r => 
            r.remainingBalance > 0 &&
            (r.status === 'Pendiente' || r.status === 'Esperando Surtido') &&
            r.warehouseId === sucursalSeleccionada
        );
        if (!terminoBusquedaReservations) return pendingReservations;
        const termino = terminoBusquedaReservations.toLowerCase();
        return pendingReservations.filter(r => 
            r.id.toLowerCase().includes(termino) ||
            r.customerName.toLowerCase().includes(termino) ||
            r.type.toLowerCase().includes(termino)
        );
    }, [reservations, terminoBusquedaReservations, sucursalSeleccionada]);


    const totalPorCobrar = useMemo(() => {
        return facturasFiltradas.reduce((sum, f) => sum + f.remaining, 0);
    }, [facturasFiltradas]);
    
    const totalPorPagar = useMemo(() => {
        return ordenesFiltradas.reduce((sum, o) => {
            const orderTotal = parseFloat(o.total.replace(/Q|,/g, '')) || 0;
            const paid = (o.payments || []).reduce((s, p) => s + p.amount, 0);
            return sum + (orderTotal - paid);
        }, 0);
    }, [ordenesFiltradas]);


    const saldoActual = useMemo(() => {
        return movimientosFiltrados.reduce((balance, m) => balance + m.ingreso - m.egreso, 0);
    }, [movimientosFiltrados]);

    const manejarAperturaCaja = async () => {
        const monto = parseFloat(montoApertura);
        if (isNaN(monto) || monto < 0 || !sucursalSeleccionada) {
            toast({ title: "Error", description: "Por favor, introduce un monto válido (incluido 0) y selecciona una sucursal.", variant: "destructive" });
            return;
        }

        const movimientoApertura: Movement = {
            id: Date.now(),
            fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
            tipo: 'Apertura',
            concepto: 'Fondo inicial de caja',
            ingreso: monto,
            egreso: 0,
            branchId: sucursalSeleccionada,
            terminalId: terminalSeleccionada || undefined,
        };
        
        await addCashRegisterMovement(movimientoApertura);
        
        setDialogoAperturaAbierto(false);
        setMontoApertura('');
        toast({ title: "Caja Abierta", description: `Se ha registrado un fondo inicial de Q${monto.toFixed(2)}.` });
        await cargarDependencias();
    };

    const manejarGuardarMovimiento = async () => {
        const monto = parseFloat(nuevoMovimiento.monto);
        if (!nuevoMovimiento.concepto || isNaN(monto) || monto <= 0 || !sucursalSeleccionada) {
            toast({ title: "Error", description: "Por favor, completa todos los campos y selecciona una sucursal.", variant: "destructive" });
            return;
        }

        const nuevaEntrada: Movement = {
            id: Date.now(),
            fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
            tipo: nuevoMovimiento.tipo as 'Entrada Manual' | 'Salida Manual',
            concepto: nuevoMovimiento.concepto,
            ingreso: nuevoMovimiento.tipo === 'Entrada Manual' ? monto : 0,
            egreso: nuevoMovimiento.tipo === 'Salida Manual' ? monto : 0,
            branchId: sucursalSeleccionada,
            terminalId: terminalSeleccionada || undefined,
        };
        
        await addCashRegisterMovement(nuevaEntrada);
        
        setDialogoAbierto(false);
        setNuevoMovimiento({ tipo: 'Salida Manual', concepto: '', monto: '' });
        toast({ title: "Movimiento Registrado", description: `Se ha registrado una ${nuevoMovimiento.tipo === 'Entrada Manual' ? 'entrada' : 'salida'} de Q${monto.toFixed(2)}.` });
        await cargarDependencias();
    };

    const manejarAbrirDialogoPago = (factura: InvoiceWithCustomerAndBalance) => {
        setFacturaSeleccionada(factura);
        setDetallesPago({
          monto: factura.remaining.toFixed(2),
          metodo: metodosPago[0]?.id.toString() || '',
          documentNumber: '',
        });
        setDialogoPagoAbierto(true);
      }
    
    const manejarRegistrarPago = async () => {
        if (!facturaSeleccionada || !detallesPago.monto || !detallesPago.metodo || !sucursalSeleccionada) {
          toast({ title: "Error", description: "Datos incompletos o sucursal no seleccionada.", variant: "destructive" });
          return;
        }
    
        const montoPago = parseFloat(detallesPago.monto);
        if (isNaN(montoPago) || montoPago <= 0 || montoPago > facturaSeleccionada.remaining + 0.001) {
          toast({ title: "Monto inválido", description: `El monto debe ser un número positivo, no mayor a Q${facturaSeleccionada.remaining.toFixed(2)}.`, variant: "destructive" });
          return;
        }
    
        const metodoPagoSeleccionado = metodosPago.find(m => m.id.toString() === detallesPago.metodo);
        if (!metodoPagoSeleccionado) return;

        await registerPayment(facturaSeleccionada.customerId, facturaSeleccionada.invoice, montoPago, metodoPagoSeleccionado.name, detallesPago.documentNumber);
        
        const nuevoMovimientoPago: Movement = {
            id: Date.now(),
            fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
            tipo: 'Pago Factura',
            concepto: `Cobro Factura ${facturaSeleccionada.invoice} a ${facturaSeleccionada.customerName}`,
            ingreso: montoPago,
            egreso: 0,
            branchId: sucursalSeleccionada,
            terminalId: facturaSeleccionada.terminalId,
            paymentMethod: metodoPagoSeleccionado.name
        };
        await addCashRegisterMovement(nuevoMovimientoPago);
        
        toast({
          title: "Pago Registrado",
          description: `Se ha registrado un pago de Q${montoPago.toFixed(2)} para la factura ${facturaSeleccionada.invoice}.`,
        });

        setDialogoPagoAbierto(false);
        setFacturaSeleccionada(null);
        await cargarDependencias();
    }
    
    const handleConfirmBulkPayment = async () => {
        if (!clienteAbono || !montoAbono || !detallesPago.metodo) {
            toast({ title: 'Error', description: 'Por favor selecciona un cliente, ingresa un monto y selecciona un método de pago.', variant: 'destructive' });
            return;
        }
        const amount = parseFloat(montoAbono);
        if(isNaN(amount) || amount <= 0) {
            toast({ title: 'Monto inválido', description: 'El monto debe ser un número positivo.', variant: 'destructive' });
            return;
        }
        
        const selectedMethod = metodosPago.find(m => m.id.toString() === detallesPago.metodo);
        if (!selectedMethod) return;

        const paymentResult = await registerBulkPayment(clienteAbono.id, amount, selectedMethod.name, detallesPago.documentNumber);
        
        await addCashRegisterMovement({
            id: Date.now(),
            fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
            tipo: 'Pago Factura',
            concepto: `Abono a cuenta de ${clienteAbono.name}`,
            ingreso: amount,
            egreso: 0,
            branchId: sucursalSeleccionada,
            terminalId: terminalSeleccionada || undefined,
            paymentMethod: selectedMethod.name
        });

        toast({
            title: 'Pago Registrado',
            description: `Se ha registrado un abono de Q${amount.toFixed(2)} a la cuenta de ${clienteAbono.name}.`,
        });
        
        setDialogoAbonoAbierto(false);
        setMontoAbono('');
        setClienteAbono(null);
        setDetallesPago(prev => ({ ...prev, documentNumber: '' }));

        // Prepare and print receipt
        const branch = sucursales.find(s => s.id.toString() === sucursalSeleccionada);
        setReceiptData({
            type: 'customerPayment',
            payment: {
                amount,
                method: selectedMethod.name,
                date: new Date().toISOString(),
                documentNumber: detallesPago.documentNumber
            },
            entity: paymentResult.customer,
            companyInfo: infoEmpresa!,
            branchInfo: branch,
            appliedTo: paymentResult.paymentApplied.map(p => ({ id: p.invoiceId, amount: p.amountApplied })),
            balance: {
                previous: paymentResult.originalBalance,
                new: paymentResult.newBalance,
            }
        });
        
        setTimeout(() => {
            const input = printableReceiptRef.current;
            if (input) {
                html2canvas(input, { scale: 2 }).then((canvas) => {
                    const imgData = canvas.toDataURL('image/png');
                    const pdfWidth = 210; // A4 width in mm
                    const canvasWidth = canvas.width;
                    const canvasHeight = canvas.height;
                    const ratio = canvasWidth / canvasHeight;
                    const pdfHeight = pdfWidth / ratio;
                    
                    const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                    pdf.autoPrint();
                    window.open(pdf.output('bloburl'), '_blank');
                });
            }
        }, 100);

        await cargarDependencias(); // Recargar datos
    };


    const manejarAbrirDialogoPagoProveedor = (orden: PurchaseOrderWithSupplier) => {
        setOrdenSeleccionada(orden);
        const total = parseFloat(orden.total.replace(/Q|,/g, '')) || 0;
        const paid = (orden.payments || []).reduce((s, p) => s + p.amount, 0);
        const remaining = total - paid;
        setDetallesPago({
          monto: remaining.toFixed(2),
          metodo: metodosPago[0]?.id.toString() || '',
          documentNumber: '',
        });
        setDialogoPagoProveedorAbierto(true);
      }
      
      const manejarRegistrarPagoProveedor = async () => {
        if (!ordenSeleccionada || !detallesPago.monto || !detallesPago.metodo || !sucursalSeleccionada) return;
        
        const supplier = await getSupplier(ordenSeleccionada.supplierId);
        if(!supplier) return;

        const newPayment = {date: new Date().toISOString(), amount: parseFloat(detallesPago.monto), method: metodosPago.find(m => m.id.toString() === detallesPago.metodo)?.name || 'Desconocido', documentNumber: detallesPago.documentNumber};
        const updatedPayments = [...(ordenSeleccionada.payments || []), newPayment];
        
        const updatedOrder = { ...ordenSeleccionada, payments: updatedPayments };
        
        const totalAmount = parseFloat(updatedOrder.total.replace(/Q|,/g, '')) || 0;
        const totalPaid = updatedOrder.payments.reduce((sum, p) => sum + p.amount, 0);

        if (totalPaid >= totalAmount - 0.001) {
            updatedOrder.status = 'Pagado';
        } else {
            updatedOrder.status = 'Pago Parcial';
        }

        await updatePurchaseOrder(supplier.id, updatedOrder);
        
        const nuevoMovimientoGasto: Movement = {
            id: Date.now(),
            fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
            tipo: 'Gasto',
            concepto: `Pago a Proveedor: ${supplier.name} (OC: ${ordenSeleccionada.order})`,
            ingreso: 0,
            egreso: parseFloat(detallesPago.monto),
            branchId: sucursalSeleccionada,
            terminalId: terminalSeleccionada || undefined,
            paymentMethod: metodosPago.find(m => m.id.toString() === detallesPago.metodo)?.name
        };
        await addCashRegisterMovement(nuevoMovimientoGasto);

        toast({ title: "Pago a Proveedor Registrado" });
        setDialogoPagoProveedorAbierto(false);
        setOrdenSeleccionada(null);
        await cargarDependencias();
      }

    const handleConfirmBulkSupplierPayment = async () => {
        if (!proveedorAbono || !montoAbonoProveedor || !detallesPago.metodo) {
            toast({ title: 'Error', description: 'Por favor selecciona un proveedor, ingresa un monto y selecciona un método de pago.', variant: 'destructive' });
            return;
        }
        const amount = parseFloat(montoAbonoProveedor);
        if(isNaN(amount) || amount <= 0) {
            toast({ title: 'Monto inválido', description: 'El monto debe ser un número positivo.', variant: 'destructive' });
            return;
        }
        
        const selectedMethod = metodosPago.find(m => m.id.toString() === detallesPago.metodo);
        if (!selectedMethod) return;

        const paymentResult = await registerBulkSupplierPayment(proveedorAbono.id, amount, selectedMethod.name, detallesPago.documentNumber);
        
        await addCashRegisterMovement({
            id: Date.now(),
            fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
            tipo: 'Gasto',
            concepto: `Abono a cuenta de proveedor ${proveedorAbono.name}`,
            ingreso: 0,
            egreso: amount,
            branchId: sucursalSeleccionada,
            terminalId: terminalSeleccionada || undefined,
            paymentMethod: selectedMethod.name
        });

        toast({
            title: 'Pago Registrado',
            description: `Se ha registrado un abono de Q${amount.toFixed(2)} a la cuenta de ${proveedorAbono.name}.`,
        });
        
        setDialogoAbonoProveedorAbierto(false);
        setMontoAbonoProveedor('');
        setProveedorAbono(null);
        setDetallesPago(prev => ({ ...prev, documentNumber: '' }));

        // Prepare and print receipt
        const branch = sucursales.find(s => s.id.toString() === sucursalSeleccionada);
        setReceiptData({
            type: 'supplierPayment',
            payment: {
                amount,
                method: selectedMethod.name,
                date: new Date().toISOString(),
                documentNumber: detallesPago.documentNumber
            },
            entity: paymentResult.supplier,
            companyInfo: infoEmpresa!,
            branchInfo: branch,
            appliedTo: paymentResult.paymentApplied.map(p => ({ id: p.orderId, amount: p.amountApplied })),
            balance: {
                previous: paymentResult.originalBalance,
                new: paymentResult.newBalance,
            }
        });
        
        setTimeout(() => {
            const input = printableReceiptRef.current;
            if (input) {
                html2canvas(input, { scale: 2 }).then((canvas) => {
                    const imgData = canvas.toDataURL('image/png');
                    const pdfWidth = 210; // A4 width in mm
                    const canvasWidth = canvas.width;
                    const canvasHeight = canvas.height;
                    const ratio = canvasWidth / canvasHeight;
                    const pdfHeight = pdfWidth / ratio;
                    
                    const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                    pdf.autoPrint();
                    window.open(pdf.output('bloburl'), '_blank');
                });
            }
        }, 100);

        await cargarDependencias();
    };

    const handleOpenReservationPaymentDialog = (reservation: ReservationWithDetails) => {
        setSelectedReservation(reservation);
        setReservationPaymentAmount(reservation.remainingBalance);
        setIsReservationPaymentOpen(true);
    };

    const handleRegisterReservationPayment = async () => {
        if (!selectedReservation || reservationPaymentAmount <= 0 || reservationPaymentAmount > selectedReservation.remainingBalance) {
            toast({ title: 'Monto inválido', description: 'El abono no puede ser cero o mayor al saldo pendiente.', variant: 'destructive' });
            return;
        }

        const updatedReservation = { ...selectedReservation };
        updatedReservation.advancePayment += reservationPaymentAmount;
        updatedReservation.remainingBalance -= reservationPaymentAmount;
        if (updatedReservation.remainingBalance <= 0.01) { // Tolerance
            updatedReservation.status = 'Listo para Recoger';
        }
        
        await saveReservation(updatedReservation.customerId, updatedReservation);
        await addCashRegisterMovement({
            id: Date.now(),
            fecha: new Date().toISOString(),
            tipo: 'Pago Factura',
            concepto: `Abono a ${updatedReservation.type} #${updatedReservation.id}`,
            ingreso: reservationPaymentAmount,
            egreso: 0,
            branchId: updatedReservation.warehouseId,
            terminalId: terminalSeleccionada || undefined,
            paymentMethod: 'Efectivo', // Assuming cash for now from cash register
        });

        toast({ title: 'Abono Registrado', description: `Se ha registrado un abono de Q${reservationPaymentAmount.toFixed(2)}.` });
        setIsReservationPaymentOpen(false);
        cargarDependencias();
    };
    
    const obtenerVarianteEstadoFactura = (estado: string, dueDate?: string): "secondary" | "outline" | "destructive" | "default" => {
        if (estado === 'Pendiente de Pago' && dueDate && isPast(new Date(dueDate))) {
            return 'destructive';
        }
        switch (estado) {
            case 'Pago en Obra':
                return 'default';
            case 'Certificado':
            case 'Pagado':
                return 'secondary';
            case 'Anulado':
                return 'destructive';
            case 'Pendiente de Pago':
            case 'Pago Parcial':
                return 'outline';
            default:
                return 'default';
        }
    };
    
    const metodoPagoActual = metodosPago.find(m => m.id.toString() === detallesPago.metodo);
    const mostrarCampoDocumento = metodoPagoActual && metodoPagoActual.name !== 'Efectivo';

    const manejarClickCierreCaja = () => {
        if (modoEstrictoCaja && !cajaAbiertaHoy) {
            toast({
                title: 'Caja Cerrada',
                description: 'Debes abrir la caja antes de poder realizar un cierre.',
                variant: 'destructive'
            });
            return;
        }
        prepararCierreCaja();
    };

    const prepararCierreCaja = () => {
        const hoy = startOfToday();
        const movimientosDelDia = movimientosFiltrados.filter(m => isToday(parseISO(m.fecha)));
        
        const ingresosDelDia = movimientosDelDia.reduce((sum, m) => sum + m.ingreso, 0);
        const egresosDelDia = movimientosDelDia.reduce((sum, m) => sum + m.egreso, 0);

        setTotalesDialogoCierre({ ingresos: ingresosDelDia, egresos: egresosDelDia });

        const saldoAnterior = saldoActual - (ingresosDelDia - egresosDelDia);

        const pagosPorMetodo = metodosPago.map(metodo => {
            const total = movimientosDelDia
                .filter(m => m.paymentMethod === metodo.name)
                .reduce((sum, m) => sum + m.ingreso, 0);
            return { name: metodo.name, total };
        }).filter(p => p.total > 0);

        setDatosReporte({
            date: new Date().toISOString(),
            initialBalance: saldoAnterior,
            totalSales: movimientosDelDia.filter(m => m.tipo === 'Venta').reduce((s, m) => s + m.ingreso, 0),
            totalCollections: movimientosDelDia.filter(m => m.tipo === 'Pago Factura').reduce((s, m) => s + m.ingreso, 0),
            totalManualEntries: movimientosDelDia.filter(m => m.tipo === 'Apertura' || m.tipo === 'Entrada Manual').reduce((s, m) => s + m.ingreso, 0),
            totalSupplierPayments: movimientosDelDia.filter(m => m.tipo === 'Gasto').reduce((s, m) => s + m.egreso, 0),
            totalManualExpenses: movimientosDelDia.filter(m => m.tipo === 'Salida Manual').reduce((s, m) => s + m.egreso, 0),
            finalBalance: saldoActual,
            cashInBox: 0,
            difference: 0,
            paymentsByMethod: pagosPorMetodo,
            movements: movimientosDelDia
        });
        setMontoContado('');
        setDialogoCierreAbierto(true);
    };

    const confirmarImprimirCierre = async () => {
        if (!datosReporte) return;
        const monto = parseFloat(montoContado);
        if (isNaN(monto)) {
            toast({ title: "Monto inválido", description: "Ingresa un número válido.", variant: "destructive" });
            return;
        }

        const reporteFinal: ReportData = {
            ...datosReporte,
            cashInBox: monto,
            difference: monto - datosReporte.finalBalance,
        };
        setDatosReporte(reporteFinal);
        
        await saveClosure({
            id: Date.now().toString(),
            date: reporteFinal.date,
            branchId: sucursalSeleccionada,
            terminalId: terminalSeleccionada,
            expectedBalance: reporteFinal.finalBalance,
            countedBalance: reporteFinal.cashInBox,
            difference: reporteFinal.difference,
        });

        setTimeout(() => {
            const input = printableRef.current;
            if (input) {
                html2canvas(input, { scale: 2 }).then((canvas) => {
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const canvasWidth = canvas.width;
                    const canvasHeight = canvas.height;
                    const ratio = canvasWidth / canvasHeight;
                    const imgWidth = pdfWidth;
                    const imgHeight = imgWidth / ratio;

                    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                    pdf.save(`CierreDeCaja-${new Date().toISOString().split('T')[0]}.pdf`);
                });
            }
        }, 100);

        setDialogoCierreAbierto(false);
        setDialogoPostCierreAbierto(true);
    };

    const finalizarProcesoCierre = async () => {
        const monto = parseFloat(montoContado);

        if (opcionPostCierre === 'withdraw') {
            await addCashRegisterMovement({
                id: Date.now(),
                fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
                tipo: 'Salida Manual',
                concepto: 'Retiro por Cierre de Caja',
                ingreso: 0,
                egreso: monto,
                branchId: sucursalSeleccionada,
                terminalId: terminalSeleccionada || undefined,
            });
            toast({ title: "Cierre Finalizado", description: `Se ha registrado un retiro de Q${monto.toFixed(2)}. La caja queda en cero.` });
        } else { // leave
            await addCashRegisterMovement({
                id: Date.now(),
                fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
                tipo: 'Apertura',
                concepto: 'Fondo de caja para siguiente turno',
                ingreso: monto,
                egreso: 0,
                branchId: sucursalSeleccionada,
                terminalId: terminalSeleccionada || undefined,
            });
            toast({ title: "Cierre Finalizado", description: `Se ha dejado un fondo de Q${monto.toFixed(2)} para la próxima apertura.` });
        }
        
        setDialogoPostCierreAbierto(false);
        await cargarDependencias();
    };

    return (
        <>
            <div className="flex flex-col gap-4 h-full">
                <header className="flex items-center justify-between flex-shrink-0">
                    <h1 className="text-xl font-bold font-headline tracking-tight">Cajero</h1>
                    <div className="flex items-center gap-2">
                         {modoEstrictoCaja && !cajaAbiertaHoy && (
                            <Button onClick={() => setDialogoAperturaAbierto(true)}>
                                <LockKeyholeOpen className="mr-2 h-4 w-4" />
                                Abrir Caja
                            </Button>
                         )}
                         {modoEstrictoCaja && cajaAbiertaHoy && (
                            <Button variant="outline" onClick={manejarClickCierreCaja}>
                                <Printer className="mr-2 h-4 w-4" />
                                Cierre de Caja
                            </Button>
                         )}
                         {!modoEstrictoCaja && (
                            <Button variant="outline" onClick={manejarClickCierreCaja}>
                                <Printer className="mr-2 h-4 w-4" />
                                Cierre de Caja
                            </Button>
                         )}
                        <Button onClick={() => puedeOperarCaja ? setDialogoAbierto(true) : mostrarToastCajaCerrada()}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nuevo Movimiento
                        </Button>
                    </div>
                </header>
                
                <div className="grid md:grid-cols-4 gap-4 flex-shrink-0">
                     <div className="md:col-span-1 grid grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                               <CardDescription>Sucursal</CardDescription>
                            </CardHeader>
                            <CardContent>
                                 <Select value={sucursalSeleccionada} onValueChange={setSucursalSeleccionada}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sucursales.map((sucursal) => (
                                            <SelectItem key={sucursal.id} value={sucursal.id.toString()}>
                                                {sucursal.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader className="pb-2">
                               <CardDescription>Terminal</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Select 
                                    value={terminalSeleccionada} 
                                    onValueChange={(value) => setTerminalSeleccionada(value === 'todas' ? '' : value)} 
                                    disabled={!sucursalSeleccionada}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todas">Todas</SelectItem>
                                        {terminalesFiltradas.map((terminal) => (
                                            <SelectItem key={terminal.id} value={terminal.id.toString()}>
                                                {terminal.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>
                     </div>
                     <div className="md:col-span-3 grid md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Saldo Actual de Caja</CardTitle>
                                <PiggyBank className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Q{saldoActual.toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground">de la selección actual</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Cuentas por Cobrar</CardTitle>
                                <Receipt className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Q{totalPorCobrar.toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground">en {facturasFiltradas.length} facturas</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Cuentas por Pagar</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Q{totalPorPagar.toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground">en {ordenesFiltradas.length} órdenes</p>
                            </CardContent>
                        </Card>
                     </div>
                </div>

                <ResizablePanelGroup direction="horizontal" className="flex-grow min-h-0">
                    <ResizablePanel defaultSize={70}>
                        <Tabs defaultValue="cobrar" className="flex-grow min-h-0 flex flex-col h-full pr-4">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="cobrar">Cuentas por Cobrar</TabsTrigger>
                                <TabsTrigger value="reservations">Apartados/Encargos</TabsTrigger>
                                <TabsTrigger value="pagar">Cuentas por Pagar</TabsTrigger>
                                <TabsTrigger value="historial">Historial de Cierres</TabsTrigger>
                            </TabsList>
                            <TabsContent value="cobrar" className="mt-4 flex-grow overflow-hidden">
                                <Card className="flex flex-col h-full">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle>Facturas Pendientes de Cobro</CardTitle>
                                                <CardDescription>Facturas de todas las sucursales con saldo pendiente.</CardDescription>
                                            </div>
                                            <Button onClick={() => setDialogoAbonoAbierto(true)} disabled={!puedeOperarCaja}>
                                                <HandCoins className="mr-2 h-4 w-4" />
                                                Abonar a Cuenta de Cliente
                                            </Button>
                                        </div>
                                        <div className="relative pt-2">
                                            <Search className="absolute left-2.5 top-4.5 h-4 w-4 text-muted-foreground" />
                                            <Input 
                                                placeholder="Buscar factura, cliente, estado..."
                                                className="pl-8"
                                                value={terminoBusquedaCobrar}
                                                onChange={e => setTerminoBusquedaCobrar(e.target.value)}
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow overflow-hidden">
                                        <ScrollArea className="h-full">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="px-4">Factura</TableHead>
                                                        <TableHead>Cliente</TableHead>
                                                        <TableHead>Estado</TableHead>
                                                        <TableHead className="text-right">Pendiente</TableHead>
                                                        <TableHead className="text-right">Acciones</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {facturasFiltradas.map((venta) => (
                                                        <TableRow key={venta.invoice}>
                                                            <TableCell className="font-medium">{venta.invoice}</TableCell>
                                                            <TableCell>{venta.customerName}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={obtenerVarianteEstadoFactura(venta.status, venta.dueDate)}>{venta.status === 'Pendiente de Pago' && venta.dueDate && isPast(new Date(venta.dueDate)) ? 'Vencida' : venta.status}</Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right font-semibold">Q{venta.remaining.toFixed(2)}</TableCell>
                                                            <TableCell className="text-right">
                                                                <Button variant="outline" size="sm" onClick={() => puedeOperarCaja ? manejarAbrirDialogoPago(venta) : mostrarToastCajaCerrada()}>
                                                                    <Banknote className="mr-2 h-4 w-4"/> Registrar Pago
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="reservations" className="mt-4 flex-grow overflow-hidden">
                                <Card className="flex flex-col h-full">
                                    <CardHeader>
                                        <CardTitle>Apartados y Encargos Pendientes</CardTitle>
                                        <CardDescription>Abona o liquida las reservaciones de los clientes.</CardDescription>
                                        <div className="relative pt-2">
                                            <Search className="absolute left-2.5 top-4.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Buscar por ID, cliente, tipo..."
                                                className="pl-8"
                                                value={terminoBusquedaReservations}
                                                onChange={e => setTerminoBusquedaReservations(e.target.value)}
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow overflow-hidden">
                                        <ScrollArea className="h-full">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>ID</TableHead>
                                                        <TableHead>Cliente</TableHead>
                                                        <TableHead>Tipo</TableHead>
                                                        <TableHead className="text-right">Saldo Pendiente</TableHead>
                                                        <TableHead className="text-right">Acciones</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {reservationsFiltradas.map((res) => (
                                                        <TableRow key={res.id}>
                                                            <TableCell className="font-medium">{res.id}</TableCell>
                                                            <TableCell>{res.customerName}</TableCell>
                                                            <TableCell><Badge variant={res.type === 'apartado' ? 'secondary' : 'outline'}>{res.type}</Badge></TableCell>
                                                            <TableCell className="text-right font-semibold">Q{res.remainingBalance.toFixed(2)}</TableCell>
                                                            <TableCell className="text-right">
                                                                <Button variant="outline" size="sm" onClick={() => puedeOperarCaja ? handleOpenReservationPaymentDialog(res) : mostrarToastCajaCerrada()}>
                                                                    <HandCoins className="mr-2 h-4 w-4"/> Registrar Abono
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="pagar" className="mt-4 flex-grow overflow-hidden">
                                <Card className="flex flex-col h-full">
                                    <CardHeader>
                                         <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle>Órdenes de Compra por Pagar</CardTitle>
                                                <CardDescription>Deudas con proveedores.</CardDescription>
                                            </div>
                                            <Button onClick={() => setDialogoAbonoProveedorAbierto(true)} disabled={!puedeOperarCaja}>
                                                <HandCoins className="mr-2 h-4 w-4" />
                                                Abonar a Cuenta de Proveedor
                                            </Button>
                                        </div>
                                        <div className="relative pt-2">
                                            <Search className="absolute left-2.5 top-4.5 h-4 w-4 text-muted-foreground" />
                                            <Input 
                                                placeholder="Buscar orden, proveedor..."
                                                className="pl-8"
                                                value={terminoBusquedaPagar}
                                                onChange={e => setTerminoBusquedaPagar(e.target.value)}
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow overflow-hidden">
                                        <ScrollArea className="h-full">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Orden</TableHead>
                                                        <TableHead>Proveedor</TableHead>
                                                        <TableHead>Pendiente</TableHead>
                                                        <TableHead className="text-right">Acciones</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {ordenesFiltradas.map((orden) => {
                                                        const total = parseFloat(orden.total.replace(/Q|,/g, '')) || 0;
                                                        const paid = (orden.payments || []).reduce((s, p) => s + p.amount, 0);
                                                        const remaining = total - paid;
                                                        return (
                                                            <TableRow key={orden.order}>
                                                                <TableCell className="font-medium">{orden.order}</TableCell>
                                                                <TableCell>{orden.supplierName}</TableCell>
                                                                <TableCell className="font-semibold">Q{remaining.toFixed(2)}</TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button variant="outline" size="sm" onClick={() => puedeOperarCaja ? manejarAbrirDialogoPagoProveedor(orden) : mostrarToastCajaCerrada()}>
                                                                        <FileText className="mr-2 h-4 w-4"/> Registrar Pago
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="historial" className="mt-4 flex-grow overflow-hidden">
                                <Card className="flex flex-col h-full">
                                    <CardHeader>
                                        <CardTitle>Historial de Cierres</CardTitle>
                                        <CardDescription>Consulta los cierres de caja anteriores.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow overflow-hidden">
                                        <ScrollArea className="h-full">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Fecha</TableHead>
                                                        <TableHead>Saldo Esperado</TableHead>
                                                        <TableHead>Monto Contado</TableHead>
                                                        <TableHead className="text-right">Diferencia</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {cierres.map((cierre) => (
                                                        <TableRow key={cierre.id}>
                                                            <TableCell className="font-medium">{format(new Date(cierre.date), 'dd/MM/yyyy HH:mm')}</TableCell>
                                                            <TableCell>Q{cierre.expectedBalance.toFixed(2)}</TableCell>
                                                            <TableCell>Q{cierre.countedBalance.toFixed(2)}</TableCell>
                                                            <TableCell className={`text-right font-semibold ${cierre.difference === 0 ? '' : 'text-destructive'}`}>
                                                                Q{cierre.difference.toFixed(2)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </ResizablePanel>
                     <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={30}>
                        <Card className="flex flex-col h-full ml-4">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><History className="h-5 w-5"/>Últimos Movimientos</CardTitle>
                                <CardDescription>Historial de transacciones de la selección.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow overflow-hidden">
                                <ScrollArea className="h-full">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Concepto</TableHead>
                                                <TableHead className="text-right">Monto</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {movimientosFiltrados.map((m) => (
                                                <TableRow key={m.id}>
                                                    <TableCell>
                                                        <div className="font-medium">{m.concepto}</div>
                                                        <div className="text-xs text-muted-foreground">{format(parseISO(m.fecha), 'dd/MM/yyyy HH:mm')} - {m.tipo}</div>
                                                    </TableCell>
                                                    <TableCell className={`text-right font-semibold ${m.ingreso > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {m.ingreso > 0 ? `+Q${m.ingreso.toFixed(2)}` : `-Q${m.egreso.toFixed(2)}`}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            {/* Dialogs */}
            <Dialog open={dialogoAperturaAbierto} onOpenChange={setDialogoAperturaAbierto}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Abrir Caja</DialogTitle>
                  <DialogDescription>
                    Introduce el fondo de caja inicial para esta terminal.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="montoApertura" className="text-right">Monto Inicial (Q)</Label>
                        <Input
                          id="montoApertura"
                          type="number"
                          value={montoApertura}
                          onChange={(e) => setMontoApertura(e.target.value)}
                          className="col-span-3"
                          placeholder="0.00"
                        />
                    </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => setDialogoAperturaAbierto(false)}>Cancelar</Button>
                  <Button type="button" onClick={manejarAperturaCaja}>Confirmar Apertura</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

             <Dialog open={dialogoAbonoAbierto} onOpenChange={setDialogoAbonoAbierto}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Abonar a Cuenta de Cliente</DialogTitle>
                  <DialogDescription>
                    Selecciona un cliente y el monto a abonar. El pago se aplicará a las facturas más antiguas primero.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="customer-select" className="text-right">Cliente</Label>
                    <Select onValueChange={(value) => setClienteAbono(customers.find(c => c.id === value) || null)}>
                        <SelectTrigger id="customer-select" className="col-span-3">
                            <SelectValue placeholder="Seleccionar cliente..." />
                        </SelectTrigger>
                        <SelectContent>
                            {customers.filter(c => c.id !== '0' && parseFloat(c.currentBalance.replace(/[Q,]/g,'')) > 0).map(customer => (
                                <SelectItem key={customer.id} value={customer.id.toString()}>
                                    {customer.name} (Deuda: {customer.currentBalance})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="monto-abono" className="text-right">Monto a Pagar</Label>
                    <Input id="monto-abono" type="number" value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)} className="col-span-3" placeholder="0.00"/>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="metodo-abono" className="text-right">Método</Label>
                     <Select value={detallesPago.metodo} onValueChange={(value) => setDetallesPago(prev => ({...prev, metodo: value}))}>
                        <SelectTrigger id="metodo-abono" className="col-span-3"><SelectValue placeholder="Seleccionar método..."/></SelectTrigger>
                        <SelectContent>{metodosPago.map(metodo => (<SelectItem key={metodo.id} value={metodo.id.toString()}>{metodo.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  {mostrarCampoDocumento && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="documentNumber-abono" className="text-right">No. Doc. / Ref.</Label>
                            <Input
                                id="documentNumber-abono"
                                value={detallesPago.documentNumber}
                                onChange={(e) => setDetallesPago(prev => ({...prev, documentNumber: e.target.value}))}
                                className="col-span-3"
                                placeholder="Ej: Cheque 12345, Transf. 67890"
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setDialogoAbonoAbierto(false)}>Cancelar</Button>
                  <Button onClick={handleConfirmBulkPayment}>Confirmar Abono</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogoAbonoProveedorAbierto} onOpenChange={setDialogoAbonoProveedorAbierto}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Abonar a Cuenta de Proveedor</DialogTitle>
                  <DialogDescription>
                    Selecciona un proveedor y el monto a abonar. El pago se aplicará a las órdenes de compra más antiguas.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="supplier-select" className="text-right">Proveedor</Label>
                    <Select onValueChange={(value) => setProveedorAbono(suppliers.find(s => s.id === value) || null)}>
                        <SelectTrigger id="supplier-select" className="col-span-3">
                            <SelectValue placeholder="Seleccionar proveedor..." />
                        </SelectTrigger>
                        <SelectContent>
                            {suppliers.filter(s => parseFloat(s.currentBalance.replace(/[Q,]/g,'')) > 0).map(supplier => (
                                <SelectItem key={supplier.id} value={supplier.id}>
                                    {supplier.name} (Deuda: {supplier.currentBalance})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="monto-abono-prov" className="text-right">Monto a Pagar</Label>
                    <Input id="monto-abono-prov" type="number" value={montoAbonoProveedor} onChange={(e) => setMontoAbonoProveedor(e.target.value)} className="col-span-3" placeholder="0.00"/>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="metodo-abono-prov" className="text-right">Método</Label>
                     <Select value={detallesPago.metodo} onValueChange={(value) => setDetallesPago(prev => ({...prev, metodo: value}))}>
                        <SelectTrigger id="metodo-abono-prov" className="col-span-3"><SelectValue placeholder="Seleccionar método..."/></SelectTrigger>
                        <SelectContent>{metodosPago.map(metodo => (<SelectItem key={metodo.id} value={metodo.id.toString()}>{metodo.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  {mostrarCampoDocumento && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="documentNumber-abono-prov" className="text-right">No. Doc. / Ref.</Label>
                            <Input
                                id="documentNumber-abono-prov"
                                value={detallesPago.documentNumber}
                                onChange={(e) => setDetallesPago(prev => ({...prev, documentNumber: e.target.value}))}
                                className="col-span-3"
                                placeholder="Ej: Cheque 12345, Transf. 67890"
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setDialogoAbonoProveedorAbierto(false)}>Cancelar</Button>
                  <Button onClick={handleConfirmBulkSupplierPayment}>Confirmar Abono</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>


            <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo Movimiento de Caja</DialogTitle>
                  <DialogDescription>
                    Registra una entrada o salida de efectivo manual.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">Tipo</Label>
                        <Select
                          value={nuevoMovimiento.tipo}
                          onValueChange={(value) => setNuevoMovimiento(prev => ({ ...prev, tipo: value }))}
                        >
                          <SelectTrigger id="type" className="col-span-3">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Salida Manual">Salida de Efectivo (Gasto)</SelectItem>
                            <SelectItem value="Entrada Manual">Entrada de Efectivo</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="monto" className="text-right">Monto (Q)</Label>
                        <Input
                          id="monto"
                          type="number"
                          value={nuevoMovimiento.monto}
                          onChange={(e) => setNuevoMovimiento(prev => ({...prev, monto: e.target.value}))}
                          className="col-span-3"
                          placeholder="0.00"
                        />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="concepto" className="text-right">Concepto</Label>
                        <Textarea
                          id="concepto"
                          value={nuevoMovimiento.concepto}
                          onChange={(e) => setNuevoMovimiento(prev => ({...prev, concepto: e.target.value}))}
                          className="col-span-3"
                          placeholder="Ej: Compra de agua purificada"
                        />
                    </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => setDialogoAbierto(false)}>Cancelar</Button>
                  <Button type="button" onClick={manejarGuardarMovimiento}>Guardar Movimiento</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

             <Dialog open={dialogoPagoAbierto} onOpenChange={setDialogoPagoAbierto}>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Registrar Pago: Factura {facturaSeleccionada?.invoice}</DialogTitle>
                    <DialogDescription>
                        Total: <span className="font-bold">{facturaSeleccionada?.total}</span>. 
                        Pendiente: <span className="font-bold">Q{facturaSeleccionada?.remaining.toFixed(2)}</span>.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="monto" className="text-right">Monto a Pagar</Label>
                        <Input
                            id="monto"
                            type="number"
                            value={detallesPago.monto}
                            onChange={(e) => setDetallesPago(prev => ({...prev, monto: e.target.value}))}
                            className="col-span-3"
                            placeholder="0.00"
                            max={facturaSeleccionada?.remaining.toFixed(2)}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="metodo" className="text-right">Método</Label>
                        <Select
                            value={detallesPago.metodo}
                            onValueChange={(value) => setDetallesPago(prev => ({...prev, metodo: value}))}
                        >
                            <SelectTrigger id="metodo" className="col-span-3">
                            <SelectValue placeholder="Seleccionar método..."/>
                            </SelectTrigger>
                            <SelectContent>
                            {metodosPago.map(metodo => (
                                <SelectItem key={metodo.id} value={metodo.id.toString()}>
                                {metodo.name}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {mostrarCampoDocumento && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="documentNumber" className="text-right">No. Doc. / Ref.</Label>
                            <Input
                                id="documentNumber"
                                value={detallesPago.documentNumber}
                                onChange={(e) => setDetallesPago(prev => ({...prev, documentNumber: e.target.value}))}
                                className="col-span-3"
                                placeholder="Ej: Cheque 12345, Transf. 67890"
                            />
                        </div>
                    )}
                    </div>
                    <DialogFooter>
                    <Button variant="secondary" onClick={() => setDialogoPagoAbierto(false)}>Cancelar</Button>
                    <Button onClick={manejarRegistrarPago}>Confirmar Pago</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={dialogoPagoProveedorAbierto} onOpenChange={setDialogoPagoProveedorAbierto}>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Registrar Pago: Orden {ordenSeleccionada?.order}</DialogTitle>
                    <DialogDescription>
                        Proveedor: {ordenSeleccionada?.supplierName}. Total: <span className="font-bold">{ordenSeleccionada?.total}</span>.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="monto-prov" className="text-right">Monto a Pagar</Label>
                        <Input
                            id="monto-prov"
                            type="number"
                            value={detallesPago.monto}
                            onChange={(e) => setDetallesPago(prev => ({...prev, monto: e.target.value}))}
                            className="col-span-3"
                            placeholder="0.00"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="metodo-prov" className="text-right">Método</Label>
                        <Select
                            value={detallesPago.metodo}
                            onValueChange={(value) => setDetallesPago(prev => ({...prev, metodo: value}))}
                        >
                            <SelectTrigger id="metodo-prov" className="col-span-3">
                            <SelectValue placeholder="Seleccionar método..."/>
                            </SelectTrigger>
                            <SelectContent>
                            {metodosPago.map(metodo => (
                                <SelectItem key={metodo.id} value={metodo.id.toString()}>
                                {metodo.name}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {mostrarCampoDocumento && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="documentNumber-prov" className="text-right">No. Doc. / Ref.</Label>
                            <Input
                                id="documentNumber-prov"
                                value={detallesPago.documentNumber}
                                onChange={(e) => setDetallesPago(prev => ({...prev, documentNumber: e.target.value}))}
                                className="col-span-3"
                                placeholder="Ej: Cheque 12345, Transf. 67890"
                            />
                        </div>
                    )}
                    </div>
                    <DialogFooter>
                    <Button variant="secondary" onClick={() => setDialogoPagoProveedorAbierto(false)}>Cancelar</Button>
                    <Button onClick={manejarRegistrarPagoProveedor}>Confirmar Pago</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isReservationPaymentOpen} onOpenChange={setIsReservationPaymentOpen}>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Registrar Abono a Reservación</DialogTitle>
                    <DialogDescription>
                        ID: {selectedReservation?.id} | Saldo Pendiente: Q{selectedReservation?.remainingBalance.toFixed(2)}
                    </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reservation-payment-amount" className="text-right">Monto</Label>
                            <Input
                                id="reservation-payment-amount"
                                type="number"
                                value={reservationPaymentAmount}
                                onChange={(e) => setReservationPaymentAmount(parseFloat(e.target.value) || 0)}
                                className="col-span-3"
                                placeholder="0.00"
                                max={selectedReservation?.remainingBalance.toFixed(2)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setIsReservationPaymentOpen(false)}>Cancelar</Button>
                        <Button onClick={handleRegisterReservationPayment}>Confirmar Abono</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={dialogoCierreAbierto} onOpenChange={setDialogoCierreAbierto}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cierre de Caja</DialogTitle>
                        <DialogDescription>
                            Verifica los totales del día e ingresa el monto contado en caja para generar el reporte.
                        </DialogDescription>
                    </DialogHeader>
                    {datosReporte && (
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Saldo Esperado en Caja:</span> <span className="font-bold">Q{datosReporte.finalBalance.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-green-600">Ingresos del Día:</span> <span className="text-green-600">+ Q{totalesDialogoCierre.ingresos.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-red-600">Egresos del Día:</span> <span className="text-red-600">- Q{totalesDialogoCierre.egresos.toFixed(2)}</span></div>
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4 pt-4">
                                <Label htmlFor="montoContado" className="text-right">Monto Contado</Label>
                                <Input
                                    id="montoContado"
                                    type="number"
                                    value={montoContado}
                                    onChange={(e) => setMontoContado(e.target.value)}
                                    className="col-span-3"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setDialogoCierreAbierto(false)}>Cancelar</Button>
                        <Button onClick={confirmarImprimirCierre}>Confirmar e Imprimir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={dialogoPostCierreAbierto} onOpenChange={setDialogoPostCierreAbierto}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Acción Final del Cierre</DialogTitle>
                        <DialogDescription>
                            ¿Qué deseas hacer con el dinero contado en caja?
                        </DialogDescription>
                    </DialogHeader>
                    <RadioGroup 
                        value={opcionPostCierre} 
                        onValueChange={(val: 'leave' | 'withdraw') => setOpcionPostCierre(val)}
                        className="py-4 space-y-4"
                    >
                        <Label htmlFor="leave" className="flex items-center gap-3 border rounded-md p-3 cursor-pointer has-[:checked]:border-primary">
                             <RadioGroupItem value="leave" id="leave" className="mt-1" />
                             <div>
                                <p className="font-medium flex items-center gap-2"><WalletCards />Dejar el dinero en caja</p>
                                <p className="text-sm text-muted-foreground">El monto contado (Q{parseFloat(montoContado).toFixed(2)}) se registrará como fondo inicial para el siguiente turno.</p>
                             </div>
                        </Label>
                        <Label htmlFor="withdraw" className="flex items-center gap-3 border rounded-md p-3 cursor-pointer has-[:checked]:border-primary">
                             <RadioGroupItem value="withdraw" id="withdraw" className="mt-1" />
                             <div>
                                <p className="font-medium flex items-center gap-2"><LogOut />Retirar todo el dinero</p>
                                <p className="text-sm text-muted-foreground">Se registrará una salida por el total del dinero contado, dejando la caja en cero.</p>
                             </div>
                        </Label>
                    </RadioGroup>
                    <DialogFooter>
                        <Button onClick={finalizarProcesoCierre}>Confirmar Acción</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="absolute left-[-9999px] top-0">
                <div ref={printableRef}>
                    {datosReporte && infoEmpresa && (
                        <PrintableCashRegisterReport 
                            reportData={datosReporte} 
                            companyInfo={infoEmpresa}
                            branchInfo={sucursales.find(s => s.id.toString() === sucursalSeleccionada)}
                        />
                    )}
                </div>
                <div ref={printableReceiptRef}>
                    {receiptData && <PrintablePaymentReceipt {...receiptData} />}
                </div>
            </div>
        </>
    );
}
