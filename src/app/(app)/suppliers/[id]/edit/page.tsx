
'use client'

import { useState, useEffect, useRef } from "react"
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
import { useRouter, useParams } from "next/navigation"
import { getSupplier, saveSupplier, getPaymentMethods } from "@/lib/servicios"
import type { Supplier } from "@/lib/supplier-data"
import { Skeleton } from "@/components/ui/skeleton"
import type { PaymentMethod } from "@/lib/settings-service"

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
        if (id) {
            const supplierData = await getSupplier(id);
            if (supplierData) {
                setSupplier(supplierData);
            }
        }
        setPaymentMethods(await getPaymentMethods());
        setLoading(false);
    }
    fetchData();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!supplier) return;
    const { name, value } = e.target;
    setSupplier(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handlePaymentMethodChange = (value: string) => {
    if (!supplier) return;
    setSupplier(prev => prev ? { ...prev, usualPaymentMethod: value } : null);
  };

  const handlePhoneChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!supplier) return;
    const { name, value } = e.target;
    const newPhones = [...(supplier.phones || [])];
    (newPhones[index] as any)[name] = value;
    setSupplier(prev => prev ? { ...prev, phones: newPhones } : null);
  };
  
  const addPhone = () => {
    if (!supplier) return;
    setSupplier(prev => prev ? {
      ...prev,
      phones: [...(prev.phones || []), { id: Date.now(), number: '', isPrimary: (prev.phones || []).length === 0 }]
    } : null);
  };
  
  const removePhone = (id: number) => {
    if (!supplier) return;
    setSupplier(prev => prev ? {
      ...prev,
      phones: (supplier.phones || []).filter(p => p.id !== id)
    } : null);
  }

  const setPrimaryPhone = (id: number) => {
    if (!supplier) return;
    setSupplier(prev => prev ? {
      ...prev,
      phones: (supplier.phones || []).map(p => ({ ...p, isPrimary: p.id === id }))
    } : null);
  }

  const handleAddressChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!supplier) return;
    const { name, value } = e.target;
    const newAddresses = [...(supplier.addresses || [])];
    (newAddresses[index] as any)[name] = value;
    setSupplier(prev => prev ? { ...prev, addresses: newAddresses } : null);
  };
  
  const addAddress = () => {
    if (!supplier) return;
    setSupplier(prev => prev ? {
      ...prev,
      addresses: [...(prev.addresses || []), { id: Date.now(), street: '', city: '', isPrimary: (prev.addresses || []).length === 0 }]
    } : null);
  };
  
  const removeAddress = (id: number) => {
    if (!supplier) return;
    setSupplier(prev => prev ? {
      ...prev,
      addresses: (supplier.addresses || []).filter(addr => addr.id !== id)
    } : null);
  }

  const setPrimaryAddress = (id: number) => {
    if (!supplier) return;
    setSupplier(prev => prev ? {
      ...prev,
      addresses: (supplier.addresses || []).map(addr => ({ ...addr, isPrimary: addr.id === id }))
    } : null);
  }

  const handleSaveChanges = async () => {
    if (supplier) {
      await saveSupplier(supplier as Supplier);
      router.push(`/suppliers/${id}`);
    }
  };

  if (loading) {
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
                    <CardContent className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-10 w-1/3 mx-auto" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                    <CardContent>
                    <Skeleton className="h-32 w-full" />
                    </CardContent>
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
    );
  }

  if (!supplier) {
     return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Proveedor no encontrado</h2>
        <p className="text-muted-foreground">No se puede editar un proveedor que no existe.</p>
        <Button asChild className="mt-4">
          <Link href="/suppliers">Volver a Proveedores</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <Button variant="outline" size="icon" asChild>
            <Link href={`/suppliers/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Cancelar y Volver</span>
            </Link>
          </Button>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Editar Ficha de Proveedor</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSaveChanges}>
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
                    <Label htmlFor="name">Nombre Comercial</Label>
                    <Input id="name" name="name" value={supplier.name} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="contactPerson">Persona de Contacto</Label>
                    <Input id="contactPerson" name="contactPerson" value={supplier.contactPerson} onChange={handleInputChange} />
                </div>
               </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" name="email" type="email" value={supplier.email} onChange={handleInputChange} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="nit">NIT</Label>
                    <Input id="nit" name="nit" value={supplier.nit} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="fiscalName">Nombre Fiscal</Label>
                    <Input id="fiscalName" name="fiscalName" value={supplier.fiscalName} onChange={handleInputChange} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Direcciones</CardTitle>
              <CardDescription>Gestiona las direcciones del proveedor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(supplier.addresses || []).map((addr, index) => (
                <div key={addr.id} className="p-4 border rounded-lg space-y-3 relative">
                   {addr.isPrimary && (
                      <span className="absolute top-2 right-2 text-xs flex items-center font-semibold text-primary">
                        <Home className="h-3 w-3 mr-1.5" />
                        Principal
                      </span>
                    )}
                  <div className="space-y-2">
                    <Label htmlFor={`street-${index}`}>Dirección</Label>
                    <Input id={`street-${index}`} name="street" value={addr.street} onChange={(e) => handleAddressChange(index, e)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`city-${index}`}>Ciudad / Municipio</Label>
                    <Input id={`city-${index}`} name="city" value={addr.city} onChange={(e) => handleAddressChange(index, e)} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                     <Button variant="outline" size="sm" onClick={() => setPrimaryAddress(addr.id)} disabled={addr.isPrimary}>
                       Hacer Principal
                     </Button>
                     <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => removeAddress(addr.id)}>
                       <Trash2 className="h-4 w-4" />
                       <span className="sr-only">Eliminar Dirección</span>
                     </Button>
                  </div>
                </div>
              ))}
               <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={addAddress}>
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
              <Label htmlFor="notes" className="sr-only">Notas</Label>
              <Textarea
                id="notes"
                name="notes"
                value={supplier.notes}
                onChange={handleInputChange}
                className="min-h-[120px]"
                placeholder="Añade cualquier información relevante sobre el proveedor..."
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
              {(supplier.phones || []).map((phone, index) => (
                <div key={phone.id} className="p-3 border rounded-lg space-y-2 relative">
                   {phone.isPrimary && (
                      <span className="absolute top-2 right-2 text-xs flex items-center font-semibold text-primary">
                        <Phone className="h-3 w-3 mr-1.5" />
                        Principal
                      </span>
                    )}
                   <div className="space-y-1">
                    <Label htmlFor={`phone-${index}`} className="text-xs">Número de Teléfono</Label>
                    <Input id={`phone-${index}`} name="number" value={phone.number} onChange={(e) => handlePhoneChange(index, e)} />
                  </div>
                   <div className="flex justify-end gap-2 pt-1">
                     <Button variant="outline" size="sm" onClick={() => setPrimaryPhone(phone.id)} disabled={phone.isPrimary}>
                       Hacer Principal
                     </Button>
                     <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => removePhone(phone.id)}>
                       <Trash2 className="h-4 w-4" />
                     </Button>
                  </div>
                </div>
              ))}
               <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={addPhone}>
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
                <Label htmlFor="creditTerms">Plazo de Crédito (días)</Label>
                <Input id="creditTerms" name="creditTerms" type="number" value={supplier.creditTerms} onChange={handleInputChange} placeholder="0 para contado" />
              </div>
               <div className="space-y-2">
                <Label htmlFor="usualPaymentMethod">Método de Pago Habitual</Label>
                <Select name="usualPaymentMethod" value={supplier.usualPaymentMethod} onValueChange={handlePaymentMethodChange}>
                  <SelectTrigger id="usualPaymentMethod">
                    <SelectValue placeholder="Selecciona un método" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.name}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentBalance">Saldo Actual</Label>
                <Input id="currentBalance" name="currentBalance" value={supplier.currentBalance} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPurchaseDiscount">Descuento Máximo</Label>
                <Input id="maxPurchaseDiscount" name="maxPurchaseDiscount" value={supplier.maxPurchaseDiscount} onChange={handleInputChange} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
