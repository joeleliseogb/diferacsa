
'use client'

import { useState, useEffect } from "react"
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
import { useRouter, useParams, useSearchParams } from "next/navigation"
import type { Customer as ClienteType } from "@/lib/servicios"
import { Skeleton } from "@/components/ui/skeleton"
import type { PriceTier as TarifaPrecio, PaymentMethod as MetodoPago } from "@/lib/servicios"
import { getCustomer, saveCustomer, getPriceTiers, getPaymentMethods } from "@/lib/servicios";

/**
 * Página para editar la ficha de un cliente específico.
 * @returns {JSX.Element} El componente de la página de edición del cliente.
 */
export default function PaginaEditarCliente() {
  const enrutador = useRouter();
  const parametros = useParams();
  const parametrosBusqueda = useSearchParams();
  const urlRedireccion = parametrosBusqueda.get('redirect');

  const id = parametros.id as string;
  const [cliente, setCliente] = useState<ClienteType | null>(null);
  const [tarifas, setTarifas] = useState<TarifaPrecio[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    /**
     * Carga los datos del cliente y las configuraciones necesarias.
     */
    async function cargarDatos() {
      setCargando(true);
      const [clienteData, tarifasData, metodosPagoData] = await Promise.all([
        id ? getCustomer(id) : Promise.resolve(null),
        getPriceTiers(),
        getPaymentMethods()
      ]);
      
      if (clienteData) {
        setCliente(clienteData);
      }
      setTarifas(tarifasData);
      setMetodosPago(metodosPagoData);
      setCargando(false);
    }
    cargarDatos();
  }, [id]);


  /**
   * Maneja los cambios en los campos de entrada de texto.
   * @param {React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>} e - El evento de cambio.
   */
  const manejarCambioInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!cliente) return;
    const { name, value } = e.target;
    setCliente(prev => prev ? { ...prev, [name]: value } : null);
  };

  /**
   * Maneja el cambio de la tarifa de precios asignada.
   * @param {string} valor - El nuevo valor de la tarifa.
   */
  const manejarCambioTarifa = (valor: string) => {
    if (!cliente) return;
    setCliente(prev => prev ? { ...prev, priceTier: valor } : null);
  };
  
  /**
   * Maneja el cambio del método de pago habitual.
   * @param {string} valor - El nuevo método de pago.
   */
  const manejarCambioMetodoPago = (valor: string) => {
    if (!cliente) return;
    setCliente(prev => prev ? { ...prev, usualPaymentMethod: valor } : null);
  };
  
  /**
   * Maneja los cambios en los campos de teléfono.
   * @param {number} indice - El índice del teléfono en el array.
   * @param {React.ChangeEvent<HTMLInputElement>} e - El evento de cambio.
   */
  const manejarCambioTelefono = (indice: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!cliente) return;
    const { name, value } = e.target;
    const nuevosTelefonos = [...(cliente.phones || [])];
    (nuevosTelefonos[indice] as any)[name] = value;
    setCliente(prev => prev ? { ...prev, phones: nuevosTelefonos } : null);
  };
  
  /**
   * Añade un nuevo campo de teléfono al cliente.
   */
  const anadirTelefono = () => {
    if (!cliente) return;
    setCliente(prev => prev ? {
      ...prev,
      phones: [...(prev.phones || []), { id: Date.now() + Math.random(), number: '', isPrimary: (prev.phones || []).length === 0 }]
    } : null);
  };
  
  /**
   * Elimina un campo de teléfono del cliente.
   * @param {number} id - El ID del teléfono a eliminar.
   */
  const eliminarTelefono = (id: number) => {
    if (!cliente) return;
    setCliente(prev => prev ? {
      ...prev,
      phones: (prev.phones || []).filter(p => p.id !== id)
    } : null);
  }

  /**
   * Establece un teléfono como principal.
   * @param {number} id - El ID del teléfono a establecer como principal.
   */
  const establecerTelefonoPrincipal = (id: number) => {
    if (!cliente) return;
    setCliente(prev => prev ? {
      ...prev,
      phones: (prev.phones || []).map(p => ({ ...p, isPrimary: p.id === id }))
    } : null);
  }

  /**
   * Maneja los cambios en los campos de dirección.
   * @param {number} indice - El índice de la dirección en el array.
   * @param {React.ChangeEvent<HTMLInputElement>} e - El evento de cambio.
   */
  const manejarCambioDireccion = (indice: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!cliente) return;
    const { name, value } = e.target;
    const nuevasDirecciones = [...(cliente.addresses || [])];
    (nuevasDirecciones[indice] as any)[name] = value;
    setCliente(prev => prev ? { ...prev, addresses: nuevasDirecciones } : null);
  };
  
  /**
   * Añade un nuevo campo de dirección al cliente.
   */
  const anadirDireccion = () => {
    if (!cliente) return;
    setCliente(prev => prev ? {
      ...prev,
      addresses: [...(prev.addresses || []), { id: Date.now() + Math.random(), street: '', city: '', isPrimary: (prev.addresses || []).length === 0 }]
    } : null);
  };
  
  /**
   * Elimina un campo de dirección del cliente.
   * @param {number} id - El ID de la dirección a eliminar.
   */
  const eliminarDireccion = (id: number) => {
    if (!cliente) return;
    setCliente(prev => prev ? {
      ...prev,
      addresses: (prev.addresses || []).filter(addr => addr.id !== id)
    } : null);
  }

  /**
   * Establece una dirección como principal.
   * @param {number} id - El ID de la dirección a establecer como principal.
   */
  const establecerDireccionPrincipal = (id: number) => {
    if (!cliente) return;
    setCliente(prev => prev ? {
      ...prev,
      addresses: (prev.addresses || []).map(addr => ({ ...addr, isPrimary: addr.id === id }))
    } : null);
  }

  /**
   * Guarda todos los cambios realizados en la ficha del cliente.
   */
  const manejarGuardarCambios = async () => {
    if (cliente) {
      await saveCustomer(cliente as ClienteType);
      if (urlRedireccion) {
        enrutador.push(`${urlRedireccion}?customerId=${cliente.id}`);
      } else {
        enrutador.push(`/customers/${id}`);
      }
    }
  };

  if (cargando) {
    return <EsqueletoEditarCliente />;
  }

  if (!cliente) {
     return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Cliente no encontrado</h2>
        <p className="text-muted-foreground">No se puede editar un cliente que no existe.</p>
        <Button asChild className="mt-4">
          <Link href="/customers">Volver a Clientes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <Button variant="outline" size="icon" asChild>
            <Link href={urlRedireccion || `/customers/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Cancelar y Volver</span>
            </Link>
          </Button>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Editar Ficha de Cliente</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={manejarGuardarCambios}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Cambios
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
                  <Input id="nombre" name="name" value={cliente.name} onChange={manejarCambioInput} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Cliente</Label>
                  <Input id="tipo" name="type" value={cliente.type} onChange={manejarCambioInput} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" name="email" type="email" value={cliente.email} onChange={manejarCambioInput} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nit">NIT</Label>
                  <Input id="nit" name="nit" value={cliente.nit} onChange={manejarCambioInput} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombreFiscal">Nombre Fiscal</Label>
                  <Input id="nombreFiscal" name="fiscalName" value={cliente.fiscalName} onChange={manejarCambioInput} />
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
                    <Input id={`phone-${index}`} name="number" value={phone.number} onChange={(e) => manejarCambioTelefono(index, e)} />
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
                <Input id="plazoCredito" name="creditTerms" type="number" value={cliente.creditTerms || '0'} onChange={manejarCambioInput} placeholder="0 para contado" />
              </div>
               <div className="space-y-2">
                <Label htmlFor="saldoActual">Saldo Actual</Label>
                <Input id="saldoActual" name="currentBalance" value={cliente.currentBalance || ''} onChange={manejarCambioInput} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="descuentoMaxVentas">Descuento Máximo en Ventas</Label>
                <Input id="descuentoMaxVentas" name="maxSalesDiscount" value={cliente.maxSalesDiscount || ''} onChange={manejarCambioInput} />
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
 * Componente que muestra un esqueleto de carga para la página de edición de cliente.
 * @returns {JSX.Element}
 */
function EsqueletoEditarCliente() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="h-24 w-full" /></CardContent>
          </Card>
           <Card>
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="h-32 w-full" /></CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
             <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
