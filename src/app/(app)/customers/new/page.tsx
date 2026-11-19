
'use client'

import { useState, useEffect, useRef, Suspense } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Save, Trash2, Home, PlusCircle, Phone } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from 'next/navigation'
import type { Customer as Cliente, Order as Pedido, Quote as Presupuesto, Purchase as Compra } from "@/lib/data"
import type { PriceTier as TarifaPrecio, PaymentMethod as MetodoPago } from "@/lib/settings-service"
import { Skeleton } from "@/components/ui/skeleton"
import { getPriceTiers, getPaymentMethods, saveCustomer, generateNewCustomerId } from "@/lib/servicios";


function FormularioNuevoCliente() {
  const enrutador = useRouter();
  const parametrosBusqueda = useSearchParams();
  const urlRedireccion = parametrosBusqueda.get('redirect');

  const [cliente, setCliente] = useState<Omit<Cliente, 'id' | 'avatar' | 'totalSpent' | 'lastPurchase' | 'purchaseHistory'>>({
    name: "",
    email: "",
    phones: [],
    type: "Particular",
    nit: "CF",
    fiscalName: "",
    priceTier: "Tarifa General",
    creditLimit: "Q0.00",
    creditTerms: "0",
    currentBalance: "Q0.00",
    usualPaymentMethod: "Efectivo",
    maxSalesDiscount: "0%",
    addresses: [],
    notes: ""
  });
  const [tarifas, setTarifas] = useState<TarifaPrecio[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);

  useEffect(() => {
    async function fetchData() {
        setTarifas(await getPriceTiers());
        setMetodosPago(await getPaymentMethods());
    }
    fetchData();
  }, []);

  const manejarCambioInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCliente(prev => {
        const newState = { ...prev, [name]: value };
        if(name === 'name') {
            newState.fiscalName = value;
        }
        return newState;
    });
  };

  const manejarCambioTarifa = (value: string) => {
    setCliente(prev => ({ ...prev, priceTier: value }));
  };

  const manejarCambioMetodoPago = (value: string) => {
    setCliente(prev => ({ ...prev, usualPaymentMethod: value }));
  };
  
  const manejarCambioTelefono = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const nuevosTelefonos = [...cliente.phones];
    (nuevosTelefonos[index] as any)[name] = value;
    setCliente(prev => ({ ...prev, phones: nuevosTelefonos }));
  };
  
  const anadirTelefono = () => {
    setCliente(prev => ({
      ...prev,
      phones: [...prev.phones, { id: Date.now() + Math.random(), number: '', isPrimary: prev.phones.length === 0 }]
    }));
  };
  
  const eliminarTelefono = (id: number) => {
    setCliente(prev => ({
      ...prev,
      phones: prev.phones.filter(p => p.id !== id)
    }));
  }

  const establecerTelefonoPrincipal = (id: number) => {
    setCliente(prev => ({
      ...prev,
      phones: prev.phones.map(p => ({ ...p, isPrimary: p.id === id }))
    }));
  }

  const manejarCambioDireccion = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const nuevasDirecciones = [...cliente.addresses];
    (nuevasDirecciones[index] as any)[name] = value;
    setCliente(prev => ({ ...prev, addresses: nuevasDirecciones }));
  };

  const anadirDireccion = () => {
    setCliente(prev => ({
      ...prev,
      addresses: [...prev.addresses, { id: Date.now() + Math.random(), street: '', city: '', isPrimary: prev.addresses.length === 0 }]
    }));
  };
  
  const eliminarDireccion = (id: number) => {
    setCliente(prev => ({
      ...prev,
      addresses: prev.addresses.filter(addr => addr.id !== id)
    }));
  }

  const establecerDireccionPrincipal = (id: number) => {
    setCliente(prev => ({
      ...prev,
      addresses: prev.addresses.map(addr => ({ ...addr, isPrimary: addr.id === id }))
    }));
  }

  const manejarGuardarCambios = async () => {
    const newId = await generateNewCustomerId();
    const newCustomer: Cliente = {
      ...cliente,
      id: newId,
      fiscalName: cliente.fiscalName || cliente.name,
      avatar: cliente.name.substring(0,2).toUpperCase() || 'CF',
      totalSpent: "Q0.00",
      lastPurchase: "N/A",
      purchaseHistory: [],
    };
    await saveCustomer(newCustomer);
    if (urlRedireccion) {
      enrutador.push(`${urlRedireccion}?customerId=${newId}`);
    } else {
      enrutador.push('/customers');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <Button variant="outline" size="icon" asChild>
            <Link href={urlRedireccion || "/customers"}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Cancelar y Volver</span>
            </Link>
          </Button>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Añadir Nuevo Cliente</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={manejarGuardarCambios}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Cliente
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos Principales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre Completo</Label>
                    <Input id="nombre" name="name" value={cliente.name} onChange={manejarCambioInput} placeholder="Ej: Juan Pérez"/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo de Cliente</Label>
                    <Input id="tipo" name="type" value={cliente.type} onChange={manejarCambioInput} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" name="email" type="email" value={cliente.email} onChange={manejarCambioInput} placeholder="ejemplo@correo.com" />
              </div>
               <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="nit">NIT</Label>
                    <Input id="nit" name="nit" value={cliente.nit} onChange={manejarCambioInput} placeholder="CF o 1234567-8" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="nombreFiscal">Nombre Fiscal</Label>
                    <Input id="nombreFiscal" name="fiscalName" value={cliente.fiscalName} onChange={manejarCambioInput} placeholder="Nombre para la factura" />
                </div>
               </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Direcciones</CardTitle>
              <CardDescription>Gestiona las direcciones del cliente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(cliente.addresses || []).map((addr, index) => (
                <div key={addr.id} className="p-4 border rounded-lg space-y-3 relative">
                   {addr.isPrimary && (
                      <span className="absolute top-2 right-2 text-xs flex items-center font-semibold text-primary">
                        <Home className="h-3 w-3 mr-1.5" />
                        Principal
                      </span>
                    )}
                  <div className="space-y-2">
                    <Label htmlFor={`calle-${index}`}>Dirección</Label>
                    <Input id={`calle-${index}`} name="street" value={addr.street} onChange={(e) => manejarCambioDireccion(index, e)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`ciudad-${index}`}>Ciudad / Municipio</Label>
                    <Input id={`ciudad-${index}`} name="city" value={addr.city} onChange={(e) => manejarCambioDireccion(index, e)} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                     <Button variant="outline" size="sm" onClick={() => establecerDireccionPrincipal(addr.id)} disabled={addr.isPrimary}>
                       Hacer Principal
                     </Button>
                     <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => eliminarDireccion(addr.id)}>
                       <Trash2 className="h-4 w-4" />
                       <span className="sr-only">Eliminar Dirección</span>
                     </Button>
                  </div>
                </div>
              ))}
               <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={anadirDireccion}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Dirección
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notas Internas</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="notas" className="sr-only">Notas</Label>
              <Textarea
                id="notas"
                name="notes"
                value={cliente.notes}
                onChange={manejarCambioInput}
                className="min-h-[120px]"
                placeholder="Añade cualquier información relevante sobre el cliente..."
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
           <Card>
            <CardHeader>
              <CardTitle>Teléfonos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(cliente.phones || []).map((phone, index) => (
                <div key={phone.id} className="p-3 border rounded-lg space-y-2 relative">
                   {phone.isPrimary && (
                      <span className="absolute top-2 right-2 text-xs flex items-center font-semibold text-primary">
                        <Phone className="h-3 w-3 mr-1.5" />
                        Principal
                      </span>
                    )}
                   <div className="space-y-1">
                    <Label htmlFor={`phone-${index}`} className="text-xs">Número de Teléfono</Label>
                    <Input id={`phone-${index}`} name="number" value={phone.number} placeholder="5555-1234" onChange={(e) => manejarCambioTelefono(index, e)} />
                  </div>
                   <div className="flex justify-end gap-2 pt-1">
                     <Button variant="outline" size="sm" onClick={() => establecerTelefonoPrincipal(phone.id)} disabled={phone.isPrimary}>
                       Hacer Principal
                     </Button>
                     <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => eliminarTelefono(phone.id)}>
                       <Trash2 className="h-4 w-4" />
                     </Button>
                  </div>
                </div>
              ))}
               <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={anadirTelefono}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Teléfono
                </Button>
              </div>
            </CardContent>
          </Card>
          
           <Card>
            <CardHeader>
              <CardTitle>Condiciones Comerciales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                <Label htmlFor="tarifaPrecio">Tarifa Asignada</Label>
                <Select name="priceTier" value={cliente.priceTier} onValueChange={manejarCambioTarifa}>
                  <SelectTrigger id="tarifaPrecio">
                    <SelectValue placeholder="Selecciona una tarifa" />
                  </SelectTrigger>
                  <SelectContent>
                    {tarifas.map((tier) => (
                      <SelectItem key={tier.id} value={tier.name}>
                        {tier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="limiteCredito">Límite de Crédito</Label>
                <Input id="limiteCredito" name="creditLimit" value={cliente.creditLimit} onChange={manejarCambioInput} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plazoCredito">Plazo de Crédito (días)</Label>
                <Input id="plazoCredito" name="creditTerms" type="number" value={cliente.creditTerms} onChange={manejarCambioInput} placeholder="0 para contado" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saldoActual">Saldo Actual</Label>
                <Input id="saldoActual" name="currentBalance" value={cliente.currentBalance} onChange={manejarCambioInput} placeholder="Q0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descuentoMaxVentas">Descuento Máximo en Ventas</Label>
                <Input id="descuentoMaxVentas" name="maxSalesDiscount" value={cliente.maxSalesDiscount || ''} onChange={manejarCambioInput} placeholder="0%" />
              </div>
               <div className="space-y-2">
                <Label htmlFor="metodoPagoHabitual">Método de Pago Habitual</Label>
                <Select name="usualPaymentMethod" value={cliente.usualPaymentMethod} onValueChange={manejarCambioMetodoPago}>
                  <SelectTrigger id="metodoPagoHabitual">
                    <SelectValue placeholder="Selecciona un método" />
                  </SelectTrigger>
                  <SelectContent>
                    {metodosPago.map((method) => (
                      <SelectItem key={method.id} value={method.name}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/**
 * Componente contenedor que añade el Suspense Boundary para la página de nuevo cliente.
 * @returns {JSX.Element}
 */
export default function PaginaNuevoCliente() {
  return (
    <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
      <FormularioNuevoCliente />
    </Suspense>
  )
}
