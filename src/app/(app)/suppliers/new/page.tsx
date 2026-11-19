
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
import { useRouter } from 'next/navigation'
import { saveSupplier } from "@/lib/supplier-service"
import { generateNewSupplierId } from "@/lib/servicios"
import type { Supplier } from "@/lib/supplier-data"
import { getPaymentMethods } from "@/lib/settings-service"
import type { PaymentMethod } from "@/lib/settings-service"

export default function NewSupplierPage() {
  const router = useRouter();
  const [supplier, setSupplier] = useState<Omit<Supplier, 'id' | 'avatar' | 'purchaseHistory'>>({
    name: "",
    contactPerson: "",
    email: "",
    phones: [],
    nit: "",
    fiscalName: "",
    creditTerms: "0",
    currentBalance: "Q0.00",
    maxPurchaseDiscount: "0%",
    usualPaymentMethod: "Efectivo",
    addresses: [],
    notes: ""
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    async function fetchData() {
        setPaymentMethods(await getPaymentMethods());
    }
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSupplier(prev => {
        const newState = { ...prev, [name]: value };
        if (name === 'name') {
            newState.fiscalName = value;
        }
        return newState;
    });
  };

  const handlePaymentMethodChange = (value: string) => {
    setSupplier(prev => ({ ...prev, usualPaymentMethod: value }));
  };

  const handlePhoneChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newPhones = [...supplier.phones];
    (newPhones[index] as any)[name] = value;
    setSupplier(prev => ({ ...prev, phones: newPhones }));
  };
  
  const addPhone = () => {
    setSupplier(prev => ({
      ...prev,
      phones: [...prev.phones, { id: Date.now(), number: '', isPrimary: prev.phones.length === 0 }]
    }));
  };
  
  const removePhone = (id: number) => {
    setSupplier(prev => ({
      ...prev,
      phones: prev.phones.filter(p => p.id !== id)
    }));
  }

  const setPrimaryPhone = (id: number) => {
    setSupplier(prev => ({
      ...prev,
      phones: prev.phones.map(p => ({ ...p, isPrimary: p.id === id }))
    }));
  }

  const handleAddressChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newAddresses = [...supplier.addresses];
    (newAddresses[index] as any)[name] = value;
    setSupplier(prev => ({ ...prev, addresses: newAddresses }));
  };

  const addAddress = () => {
    setSupplier(prev => ({
      ...prev,
      addresses: [...prev.addresses, { id: Date.now(), street: '', city: '', isPrimary: prev.addresses.length === 0 }]
    }));
  };
  
  const removeAddress = (id: number) => {
    setSupplier(prev => ({
      ...prev,
      addresses: prev.addresses.filter(addr => addr.id !== id)
    }));
  }

  const setPrimaryAddress = (id: number) => {
    setSupplier(prev => ({
      ...prev,
      addresses: prev.addresses.map(addr => ({ ...addr, isPrimary: addr.id === id }))
    }));
  }

  const handleSaveChanges = async () => {
    const newId = await generateNewSupplierId();
    const newSupplier: Supplier = {
      ...supplier,
      id: newId,
      fiscalName: supplier.fiscalName || supplier.name,
      avatar: supplier.name.substring(0,2).toUpperCase() || 'S',
      purchaseHistory: [],
    };
    await saveSupplier(newSupplier);
    router.push('/suppliers');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <Button variant="outline" size="icon" asChild>
            <Link href="/suppliers">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Cancelar y Volver</span>
            </Link>
          </Button>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Añadir Nuevo Proveedor</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSaveChanges}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Proveedor
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
                    <Input id="name" name="name" value={supplier.name} onChange={handleInputChange} placeholder="Ej: Aceros de Guatemala"/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Persona de Contacto</Label>
                    <Input id="contactPerson" name="contactPerson" value={supplier.contactPerson} onChange={handleInputChange} placeholder="Ej: Juan Pérez"/>
                  </div>
               </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" name="email" type="email" value={supplier.email} onChange={handleInputChange} placeholder="ejemplo@proveedor.com" />
              </div>
               <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="nit">NIT</Label>
                        <Input id="nit" name="nit" value={supplier.nit} onChange={handleInputChange} placeholder="1234567-8" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fiscalName">Nombre Fiscal</Label>
                        <Input id="fiscalName" name="fiscalName" value={supplier.fiscalName} onChange={handleInputChange} placeholder="Nombre legal para facturas" />
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
                    <Input id={`phone-${index}`} name="number" value={phone.number} placeholder="2233-4455" onChange={(e) => handlePhoneChange(index, e)} />
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
                <Input id="currentBalance" name="currentBalance" value={supplier.currentBalance} onChange={handleInputChange} placeholder="Q0.00" />
              </div>
               <div className="space-y-2">
                <Label htmlFor="maxPurchaseDiscount">Descuento Máximo</Label>
                <Input id="maxPurchaseDiscount" name="maxPurchaseDiscount" value={supplier.maxPurchaseDiscount} onChange={handleInputChange} placeholder="0% o '5% pronto pago'" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
