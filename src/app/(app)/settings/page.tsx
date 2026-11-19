

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Pencil, Trash2, UploadCloud, ImageIcon, User, Share2, Workflow, Banknote, ShieldCheck, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getSettings, saveSettings } from '@/lib/servicios';
import { allPermissions, getPermissionsForRole, type Permission } from '@/lib/auth-service';
import type { CompanyInfo, Branch, PriceTier, DocumentSeries, PosTerminal, Warehouse, PaymentMethod, Tax, ProductFamily, Driver, PosSettings, Settings } from '@/lib/settings-service';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from '@/components/ui/switch';
import { UserRole } from '@/lib/user-service';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';


/**
 * Página de configuración para administrar los parámetros de la aplicación.
 * @returns {JSX.Element} El componente de la página de configuración.
 */
export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [isWarehouseDialogOpen, setIsWarehouseDialogOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<DocumentSeries | null>(null);
  const [isSeriesDialogOpen, setIsSeriesDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<PriceTier | null>(null);
  const [isTierDialogOpen, setIsTierDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [isMethodDialogOpen, setIsMethodDialogOpen] = useState(false);
  const [editingPosTerminal, setEditingPosTerminal] = useState<PosTerminal | null>(null);
  const [isPosTerminalDialogOpen, setIsPosTerminalDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [isTaxDialogOpen, setIsTaxDialogOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<ProductFamily | null>(null);
  const [isFamilyDialogOpen, setIsFamilyDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);
  
  const companyLogoInputRef = useRef<HTMLInputElement>(null);
  const branchLogoInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    async function loadSettings() {
      setSettings(await getSettings());
    }
    loadSettings();
  }, []);


  const handleCompanyInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    const { name, value } = e.target;
    setSettings(prev => prev ? { ...prev, companyInfo: { ...prev.companyInfo, [name]: value } } : null);
  };
  
  const handleCompanyLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && settings) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => prev ? { ...prev, companyInfo: { ...prev.companyInfo, logoUrl: reader.result as string } } : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSettingsChange = (field: keyof Settings, value: any) => {
    setSettings(prev => prev ? { ...prev, [field]: value } : null);
  }

  const handleSaveAllSettings = () => {
    if(settings) {
      saveSettings(settings);
       toast({
        title: "Configuración Guardada",
        description: "Todos los cambios han sido guardados exitosamente.",
      });
    }
  }

  const handleDeleteItem = <T extends {id: number | string, name?: string}>(
    itemType: keyof Settings,
    itemId: number | string,
    usageCheck: () => { inUse: boolean, message: string }
  ) => {
    const check = usageCheck();
    if (check.inUse) {
      toast({
        title: `No se puede eliminar: ${check.message}`,
        variant: 'destructive',
      });
      return;
    }

    setSettings(prev => {
        if (!prev) return null;
        const items = prev[itemType] as T[];
        const updatedItems = items.filter(item => item.id !== itemId);
        return { ...prev, [itemType]: updatedItems };
    });

    toast({
        title: 'Elemento eliminado',
        description: 'El registro ha sido eliminado. Guarda los cambios para confirmar.'
    });
  }
  
  // --- Branch Handlers ---
  const handleBranchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingBranch) return;
    const { name, value } = e.target;
    setEditingBranch({ ...editingBranch, [name]: value });
  };
  const handleEditBranch = (branch: Branch) => {
    setEditingBranch({ ...branch });
    setIsBranchDialogOpen(true);
  };
  const handleAddNewBranch = () => {
    setEditingBranch({ id: Date.now(), name: '', address: '', logoUrl: '' });
    setIsBranchDialogOpen(true);
  };
  const handleSaveBranch = () => {
    if (!editingBranch || !settings) return;
    let updatedBranches;
    const existing = settings.branches.find(b => b.id === editingBranch.id);
    if (existing) {
        updatedBranches = settings.branches.map(b => b.id === editingBranch.id ? editingBranch : b);
    } else {
        updatedBranches = [...settings.branches, editingBranch];
    }
    setSettings(prev => prev ? { ...prev, branches: updatedBranches } : null);
    setEditingBranch(null);
    setIsBranchDialogOpen(false);
  };
  const handleBranchLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && editingBranch) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            setEditingBranch(prev => prev ? { ...prev, logoUrl: reader.result as string } : null);
        };
        reader.readAsDataURL(file);
    }
  };

  // --- Warehouse Handlers ---
  const handleWarehouseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingWarehouse) return;
    const { name, value } = e.target;
    setEditingWarehouse({ ...editingWarehouse, [name]: value });
  };
  const handleWarehouseSelectChange = (value: string) => {
    if (!editingWarehouse) return;
    setEditingWarehouse({ ...editingWarehouse, branch: value });
  };
  const handleEditWarehouse = (warehouse: Warehouse) => {
    setEditingWarehouse({ ...warehouse });
    setIsWarehouseDialogOpen(true);
  };
  const handleAddNewWarehouse = () => {
    setEditingWarehouse({ id: Date.now(), name: '', location: '', capacity: '', manager: '', branch: '' });
    setIsWarehouseDialogOpen(true);
  }
  const handleSaveWarehouse = () => {
    if (!editingWarehouse || !settings) return;
    let updatedWarehouses;
    const existing = settings.warehouses.find(w => w.id === editingWarehouse.id);
    if (existing) {
      updatedWarehouses = settings.warehouses.map(w => w.id === editingWarehouse.id ? editingWarehouse : w);
    } else {
      updatedWarehouses = [...settings.warehouses, editingWarehouse];
    }
    setSettings(prev => prev ? { ...prev, warehouses: updatedWarehouses } : null);
    setEditingWarehouse(null);
    setIsWarehouseDialogOpen(false);
  };

  // --- Document Series Handlers ---
  const handleSeriesInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!editingSeries) return;
      const { name, value } = e.target;
      const isNumberField = name === 'currentNumber';
      setEditingSeries({ ...editingSeries, [name]: isNumberField ? parseInt(value, 10) || 0 : value });
  };
  const handleSeriesSelectChange = (name: 'documentType' | 'branch', value: string) => {
      if (!editingSeries) return;
      setEditingSeries({ ...editingSeries, [name]: value });
  };
  const handleAddNewSeries = () => {
      setEditingSeries({ id: Date.now(), documentType: 'Factura', branch: '', series: '', currentNumber: 1 });
      setIsSeriesDialogOpen(true);
  };
  const handleEditSeries = (series: DocumentSeries) => {
      setEditingSeries({ ...series });
      setIsSeriesDialogOpen(true);
  };
  const handleSaveSeries = () => {
      if (!editingSeries || !settings) return;
      let updatedSeries;
      const existing = settings.documentSeries.find(s => s.id === editingSeries.id);
      if (existing) {
          updatedSeries = settings.documentSeries.map(s => s.id === editingSeries.id ? editingSeries : s);
      } else {
          updatedSeries = [...settings.documentSeries, editingSeries];
      }
      setSettings(prev => prev ? { ...prev, documentSeries: updatedSeries } : null);
      setEditingSeries(null);
      setIsSeriesDialogOpen(false);
  };

  // --- Price Tier Handlers ---
  const handleTierInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!editingTier) return;
      setEditingTier({ ...editingTier, name: e.target.value });
  };
  const handleAddNewTier = () => {
      setEditingTier({ id: Date.now(), name: '' });
      setIsTierDialogOpen(true);
  };
  const handleEditTier = (tier: PriceTier) => {
      setEditingTier({ ...tier });
      setIsTierDialogOpen(true);
  };
  const handleSaveTier = () => {
      if (!editingTier || !settings) return;
      let updatedTiers;
      const existing = settings.priceTiers.find(t => t.id === editingTier.id);
      if (existing) {
          updatedTiers = settings.priceTiers.map(t => t.id === editingTier.id ? editingTier : t);
      } else {
          updatedTiers = [...settings.priceTiers, editingTier];
      }
      setSettings(prev => prev ? { ...prev, priceTiers: updatedTiers } : null);
      setEditingTier(null);
      setIsTierDialogOpen(false);
  };

  // --- Payment Method Handlers ---
  const handleMethodInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!editingMethod) return;
      setEditingMethod({ ...editingMethod, name: e.target.value });
  };
  const handleAddNewMethod = () => {
      setEditingMethod({ id: Date.now(), name: '' });
      setIsMethodDialogOpen(true);
  };
  const handleEditMethod = (method: PaymentMethod) => {
      setEditingMethod({ ...method });
      setIsMethodDialogOpen(true);
  };
  const handleSaveMethod = () => {
      if (!editingMethod || !settings) return;
      let updatedMethods;
      const existing = settings.paymentMethods.find(m => m.id === editingMethod.id);
      if (existing) {
          updatedMethods = settings.paymentMethods.map(m => m.id === editingMethod.id ? editingMethod : m);
      } else {
          updatedMethods = [...settings.paymentMethods, editingMethod];
      }
      setSettings(prev => prev ? { ...prev, paymentMethods: updatedMethods } : null);
      setEditingMethod(null);
      setIsMethodDialogOpen(false);
  };

  // --- POS Terminal Handlers ---
  const handlePosTerminalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!editingPosTerminal) return;
      setEditingPosTerminal({ ...editingPosTerminal, name: e.target.value });
  };
  const handlePosTerminalSelectChange = (name: 'branch' | 'invoiceSeries', value: string) => {
      if (!editingPosTerminal) return;

      const newTerminalState = { ...editingPosTerminal, [name]: value };

      if (name === 'branch') {
          newTerminalState.invoiceSeries = '';
      }
      
      setEditingPosTerminal(newTerminalState);
  };
  const handleAddNewPosTerminal = () => {
      setEditingPosTerminal({ id: Date.now(), name: '', branch: '', invoiceSeries: '' });
      setIsPosTerminalDialogOpen(true);
  };
  const handleEditPosTerminal = (terminal: PosTerminal) => {
      setEditingPosTerminal({ ...terminal });
      setIsPosTerminalDialogOpen(true);
  };
  const handleSavePosTerminal = () => {
      if (!editingPosTerminal || !settings) return;
      let updatedTerminals;
      const existing = settings.posTerminals.find(t => t.id === editingPosTerminal.id);
      if (existing) {
          updatedTerminals = settings.posTerminals.map(t => (t.id === editingPosTerminal.id ? editingPosTerminal : t));
      } else {
          updatedTerminals = [...settings.posTerminals, editingPosTerminal];
      }
      setSettings(prev => prev ? { ...prev, posTerminals: updatedTerminals } : null);
      setEditingPosTerminal(null);
      setIsPosTerminalDialogOpen(false);
  };

  // --- Tax Handlers ---
  const handleTaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!editingTax) return;
      const { name, value } = e.target;
      const isNumberField = name === 'rate';
      setEditingTax({ ...editingTax, [name]: isNumberField ? parseFloat(value) || 0 : value });
  };
  const handleAddNewTax = () => {
      setEditingTax({ id: Date.now(), name: '', rate: 0 });
      setIsTaxDialogOpen(true);
  };
  const handleEditTax = (tax: Tax) => {
      setEditingTax({ ...tax });
      setIsTaxDialogOpen(true);
  };
  const handleSaveTax = () => {
      if (!editingTax || !settings) return;
      let updatedTaxes;
      const existing = settings.taxes.find(t => t.id === editingTax.id);
      if (existing) {
          updatedTaxes = settings.taxes.map(t => (t.id === editingTax.id ? editingTax : t));
      } else {
          updatedTaxes = [...settings.taxes, editingTax];
      }
      setSettings(prev => prev ? { ...prev, taxes: updatedTaxes } : null);
      setEditingTax(null);
      setIsTaxDialogOpen(false);
  };

  // --- Product Family Handlers ---
  const handleFamilyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!editingFamily) return;
      setEditingFamily({ ...editingFamily, name: e.target.value });
  };
  const handleAddNewFamily = () => {
      setEditingFamily({ id: Date.now(), name: '' });
      setIsFamilyDialogOpen(true);
  };
  const handleEditFamily = (family: ProductFamily) => {
      setEditingFamily({ ...family });
      setIsFamilyDialogOpen(true);
  };
  const handleSaveFamily = () => {
      if (!editingFamily || !settings) return;
      let updatedFamilies;
      const existing = settings.productFamilies.find(f => f.id === editingFamily.id);
      if (existing) {
          updatedFamilies = settings.productFamilies.map(f => (f.id === editingFamily.id ? editingFamily : f));
      } else {
          updatedFamilies = [...settings.productFamilies, editingFamily];
      }
      setSettings(prev => prev ? { ...prev, productFamilies: updatedFamilies } : null);
      setEditingFamily(null);
      setIsFamilyDialogOpen(false);
  };

    // --- Driver Handlers ---
    const handleDriverInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingDriver) return;
        const { name, value } = e.target;
        setEditingDriver({ ...editingDriver, [name]: value });
    };
    const handleAddNewDriver = () => {
        setEditingDriver({ id: Date.now(), name: '', license: '' });
        setIsDriverDialogOpen(true);
    };
    const handleEditDriver = (driver: Driver) => {
        setEditingDriver({ ...driver });
        setIsDriverDialogOpen(true);
    };
    const handleSaveDriver = () => {
        if (!editingDriver || !settings) return;
        let updatedDrivers;
        const existing = settings.drivers.find(d => d.id === editingDriver.id);
        if (existing) {
            updatedDrivers = settings.drivers.map(d => (d.id === editingDriver.id ? editingDriver : d));
        } else {
            updatedDrivers = [...settings.drivers, editingDriver];
        }
        setSettings(prev => prev ? { ...prev, drivers: updatedDrivers } : null);
        setEditingDriver(null);
        setIsDriverDialogOpen(false);
    };

  if (!settings) {
    return <div>Cargando...</div>
  }

  const availableSeriesForTerminal = editingPosTerminal && settings ? settings.documentSeries.filter(s => s.branch === editingPosTerminal.branch && s.documentType === 'Factura') : [];


  return (
    <div className="space-y-6">
      
      {/* Tarjeta para los Datos de la Empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Datos de la Empresa (Grupo)</CardTitle>
          <CardDescription>Información general que aparecerá en tus documentos oficiales.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Empresa</Label>
                <Input id="name" name="name" value={settings.companyInfo.name} onChange={handleCompanyInfoChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nit">NIT</Label>
                <Input id="nit" name="nit" value={settings.companyInfo.nit} onChange={handleCompanyInfoChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección Fiscal</Label>
                <Input id="address" name="address" value={settings.companyInfo.address} onChange={handleCompanyInfoChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" name="phone" value={settings.companyInfo.phone} onChange={handleCompanyInfoChange} />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50" onClick={() => companyLogoInputRef.current?.click()}>
            <Input ref={companyLogoInputRef} type="file" accept="image/*" className="hidden" onChange={handleCompanyLogoChange} />
            {settings.companyInfo.logoUrl ? (
                <Image src={settings.companyInfo.logoUrl} alt="Logo de la Empresa" width={128} height={128} className="object-contain rounded-lg h-32 w-32" />
            ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground text-center">
                    <UploadCloud className="w-12 h-12" />
                    <span className="mt-2 text-sm">Subir Logotipo</span>
                </div>
            )}
             <Button variant="outline" size="sm" type="button">Seleccionar Archivo</Button>
          </div>
        </CardContent>
         <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSaveAllSettings}>Guardar Cambios</Button>
         </CardFooter>
      </Card>
      
       <Card>
          <CardHeader>
              <CardTitle>Funcionalidades Adicionales</CardTitle>
              <CardDescription>Activa o desactiva módulos y características especiales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Asistente de IA en Dashboard</Label>
                <div className="flex items-center space-x-3 mt-2">
                    <Switch 
                        id="ai-assistant-toggle" 
                        checked={settings.showDashboardAssistant} 
                        onCheckedChange={(checked) => handleSettingsChange('showDashboardAssistant', checked)}
                    />
                    <Label htmlFor="ai-assistant-toggle" className="font-normal flex flex-col">
                        <span>{settings.showDashboardAssistant ? 'Asistente Habilitado' : 'Asistente Deshabilitado'}</span>
                        <span className="text-xs text-muted-foreground">
                            Muestra u oculta el asistente de IA en el panel principal.
                        </span>
                    </Label>
                </div>
            </div>
          </CardContent>
           <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSaveAllSettings}>Guardar Cambios</Button>
         </CardFooter>
      </Card>

       <Card>
          <CardHeader>
              <CardTitle>Flujo de Trabajo de Caja</CardTitle>
              <CardDescription>Define cómo se debe gestionar la caja y los cobros en los terminales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Apertura y Cierre de Caja</Label>
              <RadioGroup 
                  value={settings.cashRegisterWorkflow}
                  onValueChange={(value) => handleSettingsChange('cashRegisterWorkflow', value)}
                  className="mt-2"
              >
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="flexible" id="flexible" />
                      <Label htmlFor="flexible" className="font-normal">
                        <p>Flexible (Flujo Continuo)</p>
                        <p className="text-xs text-muted-foreground">Permite registrar pagos y movimientos en cualquier momento sin un ciclo de apertura/cierre.</p>
                      </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="strict" id="strict" />
                      <Label htmlFor="strict" className="font-normal">
                        <p>Estricto (Requiere Apertura/Cierre)</p>
                        <p className="text-xs text-muted-foreground">Obliga a abrir la caja con un fondo inicial antes de registrar movimientos y a realizar un cierre al final del día.</p>
                      </Label>
                  </div>
              </RadioGroup>
            </div>
            <div className='border-t pt-6'>
                <Label>Cobros en Terminal</Label>
                 <div className="flex items-center space-x-3 mt-2">
                    <Switch 
                        id="terminal-charging" 
                        checked={settings.posSettings.allowTerminalCharging} 
                        onCheckedChange={(checked) => handleSettingsChange('posSettings', {...settings.posSettings, allowTerminalCharging: checked})}
                    />
                    <Label htmlFor="terminal-charging" className="font-normal flex flex-col">
                        <span>Habilitar cobro en terminal</span>
                        <span className="text-xs text-muted-foreground">
                            Permite registrar cobros en efectivo directamente desde el TPV, sin pasar por el módulo de Caja.
                        </span>
                    </Label>
                </div>
            </div>
          </CardContent>
           <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSaveAllSettings}>Guardar Cambios</Button>
         </CardFooter>
      </Card>

      <Card>
          <CardHeader>
              <CardTitle>Configuración del Punto de Venta (TPV)</CardTitle>
              <CardDescription>Define el comportamiento de las ventas aparcadas.</CardDescription>
          </CardHeader>
          <CardContent>
          <Label>Visibilidad de Ventas Aparcadas</Label>
          <RadioGroup 
              value={settings.posSettings.parkedSalesMode}
              onValueChange={(value) => handleSettingsChange('posSettings', {...settings.posSettings, parkedSalesMode: value as 'individual' | 'shared'})}
              className="mt-2"
          >
              <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual" className="font-normal">Por Vendedor (Individual)</Label>
              </div>
              <div className="flex items-center space-x-2">
                  <RadioGroupItem value="shared" id="shared" />
                  <Label htmlFor="shared" className="font-normal">Compartidas (Global)</Label>
              </div>
          </RadioGroup>
          </CardContent>
           <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSaveAllSettings}>Guardar Cambios</Button>
         </CardFooter>
      </Card>

       {/* Tarjeta para Gestión de Sucursales */}
       <Card>
        <CardHeader>
          <CardTitle>Gestión de Sucursales / Empresas</CardTitle>
          <CardDescription>Administra las diferentes empresas o sucursales de tu grupo.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button onClick={handleAddNewBranch}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Sucursal
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Logo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell>
                    {branch.logoUrl ? (
                      <Image src={branch.logoUrl} alt={`Logo de ${branch.name}`} width={40} height={40} className="rounded-md object-contain bg-muted" />
                    ) : (
                      <div className="h-10 w-10 flex items-center justify-center bg-muted rounded-md text-muted-foreground">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{branch.name}</TableCell>
                  <TableCell>{branch.address}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditBranch(branch)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará la sucursal "{branch.name}".</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteItem('branches', branch.id, () => ({inUse: false, message: ''}))}>
                                    Eliminar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tarjeta para Gestión de Almacenes */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Almacenes</CardTitle>
          <CardDescription>Administra la información y el estado de tus almacenes por sucursal.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button onClick={handleAddNewWarehouse}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Almacén
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Encargado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.warehouses.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell className="font-medium">{warehouse.name}</TableCell>
                  <TableCell>{warehouse.location}</TableCell>
                  <TableCell>{warehouse.branch}</TableCell>
                  <TableCell>{warehouse.manager}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditWarehouse(warehouse)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                <AlertDialogDescription>Se eliminará el almacén "{warehouse.name}".</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteItem('warehouses', warehouse.id, () => ({inUse: false, message: ''}))}>
                                    Eliminar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       {/* Tarjeta para las Series de Documentos */}
       <Card>
        <CardHeader>
          <CardTitle>Numeración y Series de Documentos</CardTitle>
          <CardDescription>Configura los números de serie para tus facturas, presupuestos, etc., por cada sucursal.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button onClick={handleAddNewSeries}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Nueva Serie
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo de Documento</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Serie</TableHead>
                <TableHead>Número Actual</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.documentSeries.map((series) => (
                <TableRow key={series.id}>
                  <TableCell className="font-medium">{series.documentType}</TableCell>
                  <TableCell>{series.branch}</TableCell>
                  <TableCell>{series.series}</TableCell>
                  <TableCell>{series.currentNumber}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditSeries(series)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                <AlertDialogDescription>Se eliminará la serie "{series.series}".</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteItem('documentSeries', series.id, () => ({inUse: false, message: ''}))}>
                                    Eliminar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Columna Izquierda */}
        <div className="space-y-6">
           {/* Tarjeta para Tarifas de Precios */}
          <Card>
            <CardHeader>
              <CardTitle>Tarifas de Precios</CardTitle>
              <CardDescription>Gestiona las diferentes tarifas que asignas a tus clientes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Button onClick={handleAddNewTier}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Tarifa
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre de la Tarifa</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.priceTiers.map((tier) => (
                    <TableRow key={tier.id}>
                      <TableCell className="font-medium">{tier.name}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditTier(tier)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                    <AlertDialogDescription>Se eliminará la tarifa "{tier.name}".</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteItem('priceTiers', tier.id, () => ({inUse: false, message: ''}))}>
                                        Eliminar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tarjeta para Impuestos */}
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Impuestos</CardTitle>
              <CardDescription>Configura los impuestos aplicables a tus productos.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Button onClick={handleAddNewTax}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Impuesto
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tasa (%)</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.taxes.map((tax) => (
                    <TableRow key={tax.id}>
                      <TableCell className="font-medium">{tax.name}</TableCell>
                      <TableCell>{tax.rate}%</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditTax(tax)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                    <AlertDialogDescription>Se eliminará el impuesto "{tax.name}".</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteItem('taxes', tax.id, () => ({inUse: false, message: ''}))}>
                                        Eliminar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha */}
        <div className="space-y-6">
            {/* Tarjeta para Métodos de Pago */}
            <Card>
              <CardHeader>
                <CardTitle>Métodos de Pago</CardTitle>
                <CardDescription>Configura los métodos de pago aceptados en tu negocio.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-4">
                  <Button onClick={handleAddNewMethod}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Método
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre del Método</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settings.paymentMethods.map((method) => (
                      <TableRow key={method.id}>
                        <TableCell className="font-medium">{method.name}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditMethod(method)}>
                              <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                    <AlertDialogDescription>Se eliminará el método de pago "{method.name}".</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteItem('paymentMethods', method.id, () => ({inUse: false, message: ''}))}>
                                        Eliminar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Tarjeta para Familias de Productos */}
            <Card>
              <CardHeader>
                <CardTitle>Familias de Productos</CardTitle>
                <CardDescription>
                  Clasifica tus productos en familias o categorías. Para crear sub-familias, usa el símbolo "&gt;" como separador (ej: Herramientas &gt; Eléctricas).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-4">
                  <Button onClick={handleAddNewFamily}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Familia
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settings.productFamilies.map((family) => (
                      <TableRow key={family.id}>
                        <TableCell className="font-medium">{family.name}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditFamily(family)}>
                              <Pencil className="h-4 w-4" />
                          </Button>
                           <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                    <AlertDialogDescription>Se eliminará la familia "{family.name}".</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteItem('productFamilies', family.id, () => ({inUse: false, message: ''}))}>
                                        Eliminar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        </div>
      </div>

       {/* Tarjeta para Gestión de Conductores */}
        <Card>
            <CardHeader>
                <CardTitle>Gestión de Conductores</CardTitle>
                <CardDescription>Administra los conductores para las rutas de entrega.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-end mb-4">
                    <Button onClick={handleAddNewDriver}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Conductor
                    </Button>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>No. Licencia</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {settings.drivers.map((driver) => (
                            <TableRow key={driver.id}>
                                <TableCell className="font-medium">{driver.name}</TableCell>
                                <TableCell>{driver.license}</TableCell>
                                <TableCell className="text-right space-x-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditDriver(driver)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                                <AlertDialogDescription>Se eliminará al conductor "{driver.name}".</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteItem('drivers', driver.id, () => ({inUse: false, message: ''}))}>
                                                    Eliminar
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      
      {/* Tarjeta para Terminales de Punto de Venta */}
      <Card>
        <CardHeader>
          <CardTitle>Terminales de Punto de Venta</CardTitle>
          <CardDescription>Configura las terminales que se usarán para procesar ventas en el TPV.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button onClick={handleAddNewPosTerminal}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Nueva Terminal
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre de la Terminal</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Serie de Factura</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.posTerminals.map((terminal) => (
                <TableRow key={terminal.id}>
                  <TableCell className="font-medium">{terminal.name}</TableCell>
                  <TableCell>{terminal.branch}</TableCell>
                  <TableCell>{terminal.invoiceSeries}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditPosTerminal(terminal)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                <AlertDialogDescription>Se eliminará la terminal "{terminal.name}".</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteItem('posTerminals', terminal.id, () => ({inUse: false, message: ''}))}>
                                    Eliminar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* --- DIALOGS --- */}

      {/* Dialog for adding/editing branches */}
      <Dialog open={isBranchDialogOpen} onOpenChange={setIsBranchDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>{editingBranch && settings.branches.some(b => b.id === editingBranch.id) ? 'Editar Sucursal' : 'Añadir Nueva Sucursal'}</DialogTitle>
                <DialogDescription>Completa la información de la sucursal y haz clic en guardar.</DialogDescription>
            </DialogHeader>
            {editingBranch && (
                <div className="grid md:grid-cols-3 gap-6 py-4">
                  <div className="md:col-span-2 grid gap-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Nombre</Label>
                        <Input id="name" name="name" value={editingBranch.name} onChange={handleBranchInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="address" className="text-right">Dirección</Label>
                        <Input id="address" name="address" value={editingBranch.address} onChange={handleBranchInputChange} className="col-span-3" />
                    </div>
                  </div>
                   <div className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50" onClick={() => branchLogoInputRef.current?.click()}>
                    <Input ref={branchLogoInputRef} type="file" accept="image/*" className="hidden" onChange={handleBranchLogoChange} />
                    {editingBranch.logoUrl ? (
                        <Image src={editingBranch.logoUrl} alt="Logo de Sucursal" width={96} height={96} className="object-contain rounded-lg h-24 w-24" />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground text-center">
                            <UploadCloud className="w-10 h-10" />
                            <span className="mt-2 text-xs">Subir Logotipo</span>
                        </div>
                    )}
                     <Button variant="outline" size="sm" type="button">Seleccionar Archivo</Button>
                  </div>
                </div>
            )}
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsBranchDialogOpen(false)}>Cancelar</Button>
                <Button type="button" onClick={handleSaveBranch}>Guardar Cambios</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for adding/editing warehouses */}
      <Dialog open={isWarehouseDialogOpen} onOpenChange={setIsWarehouseDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingWarehouse && settings.warehouses.some(w => w.id === editingWarehouse.id) ? 'Editar Almacén' : 'Añadir Nuevo Almacén'}</DialogTitle>
                <DialogDescription>Completa la información del almacén y haz clic en guardar.</DialogDescription>
            </DialogHeader>
            {editingWarehouse && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">Nombre</Label>
                      <Input id="name" name="name" value={editingWarehouse.name} onChange={handleWarehouseInputChange} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="location" className="text-right">Ubicación</Label>
                      <Input id="location" name="location" value={editingWarehouse.location} onChange={handleWarehouseInputChange} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="branch" className="text-right">Sucursal</Label>
                      <Select value={editingWarehouse.branch} onValueChange={handleWarehouseSelectChange}>
                          <SelectTrigger id="branch" className="col-span-3"><SelectValue placeholder="Selecciona una sucursal" /></SelectTrigger>
                          <SelectContent>
                              {settings.branches.map((branch) => (<SelectItem key={branch.id} value={branch.name}>{branch.name}</SelectItem>))}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="capacity" className="text-right">Capacidad</Label>
                      <Input id="capacity" name="capacity" value={editingWarehouse.capacity} onChange={handleWarehouseInputChange} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="manager" className="text-right">Encargado</Label>
                      <Input id="manager" name="manager" value={editingWarehouse.manager} onChange={handleWarehouseInputChange} className="col-span-3" />
                  </div>
                </div>
            )}
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsWarehouseDialogOpen(false)}>Cancelar</Button>
                <Button type="button" onClick={handleSaveWarehouse}>Guardar Cambios</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for adding/editing document series */}
      <Dialog open={isSeriesDialogOpen} onOpenChange={setIsSeriesDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingSeries && settings.documentSeries.some(s => s.id === editingSeries.id) ? 'Editar Serie' : 'Añadir Nueva Serie'}</DialogTitle>
                <DialogDescription>Configura los detalles de la serie de documentos.</DialogDescription>
            </DialogHeader>
            {editingSeries && (
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="documentType" className="text-right">Tipo</Label>
                        <Select value={editingSeries.documentType} onValueChange={(value) => handleSeriesSelectChange('documentType', value)}>
                          <SelectTrigger id="documentType" className="col-span-3"><SelectValue placeholder="Tipo de documento" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Factura">Factura</SelectItem>
                            <SelectItem value="Presupuesto">Presupuesto</SelectItem>
                            <SelectItem value="Nota de Crédito">Nota de Crédito</SelectItem>
                            <SelectItem value="Pedido">Pedido</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="branch" className="text-right">Sucursal</Label>
                      <Select value={editingSeries.branch} onValueChange={(value) => handleSeriesSelectChange('branch', value)}>
                        <SelectTrigger id="branch" className="col-span-3"><SelectValue placeholder="Selecciona una sucursal" /></SelectTrigger>
                        <SelectContent>
                          {settings.branches.map((branch) => (<SelectItem key={branch.id} value={branch.name}>{branch.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="series" className="text-right">Serie</Label>
                        <Input id="series" name="series" value={editingSeries.series} onChange={handleSeriesInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="currentNumber" className="text-right">Número Actual</Label>
                        <Input id="currentNumber" name="currentNumber" type="number" value={editingSeries.currentNumber} onChange={handleSeriesInputChange} className="col-span-3" />
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsSeriesDialogOpen(false)}>Cancelar</Button>
                <Button type="button" onClick={handleSaveSeries}>Guardar Cambios</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
       {/* Dialog for adding/editing price tiers */}
       <Dialog open={isTierDialogOpen} onOpenChange={setIsTierDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{editingTier && settings.priceTiers.some(t => t.id === editingTier.id) ? 'Editar Tarifa' : 'Añadir Nueva Tarifa'}</DialogTitle>
              </DialogHeader>
              {editingTier && (
                  <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">Nombre</Label>
                          <Input id="name" name="name" value={editingTier.name} onChange={handleTierInputChange} className="col-span-3" />
                      </div>
                  </div>
              )}
              <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => setIsTierDialogOpen(false)}>Cancelar</Button>
                  <Button type="button" onClick={handleSaveTier}>Guardar</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Dialog for adding/editing payment methods */}
      <Dialog open={isMethodDialogOpen} onOpenChange={setIsMethodDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{editingMethod && settings.paymentMethods.some(m => m.id === editingMethod.id) ? 'Editar Método de Pago' : 'Añadir Nuevo Método de Pago'}</DialogTitle>
              </DialogHeader>
              {editingMethod && (
                  <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">Nombre</Label>
                          <Input id="name" name="name" value={editingMethod.name} onChange={handleMethodInputChange} className="col-span-3" />
                      </div>
                  </div>
              )}
              <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => setIsMethodDialogOpen(false)}>Cancelar</Button>
                  <Button type="button" onClick={handleSaveMethod}>Guardar</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Dialog for adding/editing POS Terminals */}
      <Dialog open={isPosTerminalDialogOpen} onOpenChange={setIsPosTerminalDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{editingPosTerminal && settings.posTerminals.some(t => t.id === editingPosTerminal.id) ? 'Editar Terminal' : 'Añadir Nueva Terminal'}</DialogTitle>
                  <DialogDescription>Completa la información de la terminal y haz clic en guardar.</DialogDescription>
              </DialogHeader>
              {editingPosTerminal && (
                  <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">Nombre</Label>
                          <Input id="name" name="name" value={editingPosTerminal.name} onChange={handlePosTerminalInputChange} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="branch" className="text-right">Sucursal</Label>
                          <Select value={editingPosTerminal.branch} onValueChange={(value) => handlePosTerminalSelectChange('branch', value)}>
                              <SelectTrigger id="branch" className="col-span-3"><SelectValue placeholder="Selecciona una sucursal" /></SelectTrigger>
                              <SelectContent>
                                  {settings.branches.map((branch) => (<SelectItem key={branch.id} value={branch.name}>{branch.name}</SelectItem>))}
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="invoiceSeries" className="text-right">Serie Factura</Label>
                          <Select 
                              value={editingPosTerminal.invoiceSeries} 
                              onValueChange={(value) => handlePosTerminalSelectChange('invoiceSeries', value)}
                              disabled={!editingPosTerminal.branch}
                          >
                              <SelectTrigger id="invoiceSeries" className="col-span-3">
                                <SelectValue placeholder="Selecciona una serie" />
                              </SelectTrigger>
                              <SelectContent>
                                  {availableSeriesForTerminal.map((series) => (
                                      <SelectItem key={series.id} value={series.series}>
                                          {series.series}
                                      </SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
              )}
              <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => setIsPosTerminalDialogOpen(false)}>Cancelar</Button>
                  <Button type="button" onClick={handleSavePosTerminal}>Guardar Cambios</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
       {/* Dialog for adding/editing Taxes */}
       <Dialog open={isTaxDialogOpen} onOpenChange={setIsTaxDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingTax?.id ? 'Editar Impuesto' : 'Añadir Nuevo Impuesto'}</DialogTitle>
            </DialogHeader>
            {editingTax && (
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tax-name" className="text-right">Nombre</Label>
                        <Input id="tax-name" name="name" value={editingTax.name} onChange={handleTaxInputChange} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tax-rate" className="text-right">Tasa (%)</Label>
                        <Input id="tax-rate" name="rate" type="number" value={editingTax.rate} onChange={handleTaxInputChange} className="col-span-3" />
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsTaxDialogOpen(false)}>Cancelar</Button>
                <Button type="button" onClick={handleSaveTax}>Guardar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for adding/editing Product Families */}
      <Dialog open={isFamilyDialogOpen} onOpenChange={setIsFamilyDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{editingFamily?.id ? 'Editar Familia' : 'Añadir Nueva Familia'}</DialogTitle>
              </DialogHeader>
              {editingFamily && (
                  <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="family-name" className="text-right">Nombre</Label>
                          <Input id="family-name" name="name" value={editingFamily.name} onChange={handleFamilyInputChange} className="col-span-3" />
                      </div>
                  </div>
              )}
              <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => setIsFamilyDialogOpen(false)}>Cancelar</Button>
                  <Button type="button" onClick={handleSaveFamily}>Guardar</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Dialog for adding/editing Drivers */}
      <Dialog open={isDriverDialogOpen} onOpenChange={setIsDriverDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{editingDriver?.id && settings.drivers.some(d => d.id === editingDriver.id) ? 'Editar Conductor' : 'Añadir Nuevo Conductor'}</DialogTitle>
              </DialogHeader>
              {editingDriver && (
                  <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="driver-name" className="text-right">Nombre</Label>
                          <Input id="driver-name" name="name" value={editingDriver.name} onChange={handleDriverInputChange} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="driver-license" className="text-right">Licencia</Label>
                          <Input id="driver-license" name="license" value={editingDriver.license} onChange={handleDriverInputChange} className="col-span-3" />
                      </div>
                  </div>
              )}
              <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => setIsDriverDialogOpen(false)}>Cancelar</Button>
                  <Button type="button" onClick={handleSaveDriver}>Guardar</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
