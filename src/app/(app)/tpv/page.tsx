

'use client'

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Users, Trash2, Save, PackagePlus, FilePlus, UserPlus, Wallet, Pencil, Check, ChevronsUpDown, History, Printer, HardHat, Info, Image as ImageIcon, LayoutGrid, List, FolderClock, Tag, CreditCard, Home, MapPin, Truck, Banknote, Building, Warehouse, HelpCircle, Terminal, ClipboardCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Customer, Order, Quote, Purchase, OrderProduct, QuoteProduct, Address, PaymentMethod, PriceTier, PurchaseProduct, ProductFamily, Tax, Reservation } from "@/lib/servicios";
import type { Product } from "@/lib/product-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { PosTerminal, CompanyInfo, PosSettings, Branch, Settings, Warehouse as WarehouseType } from "@/lib/settings-service";
import { Skeleton } from "@/components/ui/skeleton";
import { AdvancedCalculator } from '@/components/advanced-calculator';
import Image from 'next/image';
import { Badge } from "@/components/ui/badge";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getParkedSales, saveParkedSale, deleteParkedSale, type ParkedSale, addCashRegisterMovement, sellStock, saveProduct, generateNewProductId, saveReservation } from '@/lib/servicios';
import { isPast, parseISO, format, addDays } from "date-fns";
import NewProductForm from "./new-product-form";
import { PrintableReceipt, type ReceiptData } from "@/components/printable-receipt";
import { PrintableReservationReceipt, type ReservationReceiptData } from "@/components/printable-reservation-receipt";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';


type CartItem = OrderProduct & { warehouseId: string; warehouseName: string };
type ProductView = 'grid' | 'list';

const defaultCustomer: Customer = {
  id: "0", name: "Cliente General", email: "", phones: [], type: "Particular", avatar: "CG", nit: "CF", fiscalName: "Consumidor Final",
  totalSpent: "Q0.00", lastPurchase: "N/A", priceTier: "Tarifa General", creditLimit: "Q0.00", creditTerms: "0",
  currentBalance: "Q0.00", usualPaymentMethod: "Efectivo", addresses: [], purchaseHistory: [], notes: '',
};

type CalculatorContext = {
    itemSku: string;
    itemWarehouseId: string;
    field: 'qty' | 'price';
    initialValue: number;
} | null;

type SaleOptions = {
    isElectronic: boolean;
};

type ReservationState = {
    product: Product | null;
    type: 'apartado' | 'encargo';
    quantity: number;
    price: number;
    advancePayment: number;
};

function TPVContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [terminals, setTerminals] = useState<PosTerminal[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [parkedSales, setParkedSales] = useState<ParkedSale[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [posSettings, setPosSettings] = useState<PosSettings | null>(null);
  const [currentUser, setCurrentUser] = useState({ name: 'Usuario Admin' }); // Mocked current user
  const [settings, setSettings] = useState<Settings | null>(null);
  const [nextInvoiceId, setNextInvoiceId] = useState('');


  // TPV states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(defaultCustomer.id);
  const [activePriceTier, setActivePriceTier] = useState<string>('');
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [productViewMode, setProductViewMode] = useState<ProductView>('grid');
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [priceTierDialogOpen, setPriceTierDialogOpen] = useState(false);
  const [parkedSalesDialogOpen, setParkedSalesDialogOpen] = useState(false);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [calculatorContext, setCalculatorContext] = useState<CalculatorContext>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [productDetailModalOpen, setProductDetailModalOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [isFinishSaleDialogOpen, setIsFinishSaleDialogOpen] = useState(false);
  
  // New Product Modal State
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  
  // Generic Line Modal State
  const [isGenericLineModalOpen, setIsGenericLineModalOpen] = useState(false);
  const [genericLineData, setGenericLineData] = useState({
      description: '',
      qty: '1',
      price: ''
  });

  // Delivery Address Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [selectedDeliveryAddressId, setSelectedDeliveryAddressId] = useState<string>('');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ street: '', city: '' });
  
  // Reservation/Special Order Modal State
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [reservationState, setReservationState] = useState<ReservationState | null>(null);

  // Customer Reservations Modal State
  const [isCustomerReservationsOpen, setIsCustomerReservationsOpen] = useState(false);


  // Receipt Printing State
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [reservationReceiptData, setReservationReceiptData] = useState<ReservationReceiptData | null>(null);
  const printableReceiptRef = useRef<HTMLDivElement>(null);
  const printableReservationReceiptRef = useRef<HTMLDivElement>(null);


  const productSearchRef = useRef<HTMLInputElement>(null);
  const cartItemRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());
  


  async function loadParkedSales() {
    const { getParkedSales, getPosSettings } = await import('@/lib/servicios');
    const settingsData = await getPosSettings();
    setPosSettings(settingsData);

    if (settingsData.parkedSalesMode === 'individual') {
        setParkedSales(await getParkedSales(currentUser.name));
    } else {
        setParkedSales(await getParkedSales());
    }
  }

  useEffect(() => {
    async function loadInitialData() {
      const { 
        getProducts, 
        getCustomers, 
        getPosTerminals, 
        getWarehouses,
        getBranches, 
        getPriceTiers,
        getPaymentMethods,
        getCompanyInfo,
        getPosSettings,
        getSettings,
      } = await import('@/lib/servicios');

      setCompanyInfo(await getCompanyInfo());
      setPosSettings(await getPosSettings());
      const branchesData = await getBranches();
      setBranches(branchesData);
      if(branchesData.length > 0) setSelectedBranchId(branchesData[0].id.toString());
      const settingsData = await getSettings();
      setSettings(settingsData);

      const productsData = await getProducts();
      setProducts(productsData);

      const customersData = await getCustomers();
      setCustomers([defaultCustomer, ...customersData]);

      const terminalsData = await getPosTerminals();
      setTerminals(terminalsData);
      
      const warehousesData = await getWarehouses();
      setWarehouses(warehousesData);
      
      const priceTiersData = await getPriceTiers();
      setPriceTiers(priceTiersData);
      
      const paymentMethodsData = await getPaymentMethods();
      setPaymentMethods(paymentMethodsData);

      const savedView = localStorage.getItem('tpvProductView') as ProductView;
      if (savedView) {
        setProductViewMode(savedView);
      }
      await loadParkedSales();
    }

    loadInitialData();
  }, [currentUser.name]);
  
  useEffect(() => {
    if (settings && selectedTerminalId) {
        const terminal = settings.posTerminals.find(t => t.id.toString() === selectedTerminalId);
        if (terminal) {
            const series = settings.documentSeries.find(s => s.series === terminal.invoiceSeries);
            if (series) {
                setNextInvoiceId(`${series.series}-${(series.currentNumber + 1).toString().padStart(3, '0')}`);
            } else {
                 setNextInvoiceId('');
            }
        }
    }
  }, [selectedTerminalId, settings]);
  
  const filteredTerminals = useMemo(() => {
    if (!selectedBranchId) return [];
    const selectedBranch = branches.find(b => b.id.toString() === selectedBranchId);
    if (!selectedBranch) return [];
    return terminals.filter(t => t.branch === selectedBranch.name);
  }, [selectedBranchId, branches, terminals]);

  const filteredWarehouses = useMemo(() => {
    if (!selectedBranchId) return warehouses;
    const selectedBranchName = branches.find(b => b.id.toString() === selectedBranchId)?.name;
    return warehouses.filter(w => w.branch === selectedBranchName);
  }, [selectedBranchId, branches, warehouses]);
  
  useEffect(() => {
    if(filteredTerminals.length > 0) {
        setSelectedTerminalId(filteredTerminals[0].id.toString());
    } else {
        setSelectedTerminalId('');
    }
  }, [filteredTerminals]);

  useEffect(() => {
    if (filteredWarehouses.length > 0) {
        setSelectedWarehouseId(filteredWarehouses[0].id.toString());
    } else {
        setSelectedWarehouseId('');
    }
  }, [filteredWarehouses]);
  
  const handleSetProductViewMode = (mode: ProductView) => {
    setProductViewMode(mode);
    localStorage.setItem('tpvProductView', mode);
  };

  useEffect(() => {
    const customerId = searchParams.get('customerId');
    if (customerId && customers.some(c => c.id === customerId)) {
        setSelectedCustomerId(customerId);
    }
  }, [searchParams, customers]);

  const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId) || defaultCustomer, [customers, selectedCustomerId]);
  const hasCredit = useMemo(() => (parseInt(selectedCustomer.creditTerms) || 0) > 0, [selectedCustomer]);
  const customerReservations = useMemo(() => {
    return (selectedCustomer?.reservations || []).filter(r => r.status === 'Pendiente' || r.status === 'Listo para Recoger');
  }, [selectedCustomer]);

  useEffect(() => {
    if (selectedCustomer) {
        handlePriceTierChange(selectedCustomer.priceTier, true); // Update prices silently
        // Pre-select primary address when opening the modal
        const primaryAddress = selectedCustomer.addresses.find(a => a.isPrimary);
        if (primaryAddress) {
            setSelectedDeliveryAddressId(primaryAddress.id.toString());
        } else if (selectedCustomer.addresses.length > 0) {
            setSelectedDeliveryAddressId(selectedCustomer.addresses[0].id.toString());
        } else {
            setSelectedDeliveryAddressId('');
        }
    }
  }, [selectedCustomer]);

  const handlePriceTierChange = (newTier: string, silent = false) => {
    setActivePriceTier(newTier);
    if (cart.length > 0) {
      const updatedCart = cart.map(item => {
        const product = products.find(p => p.codes.some(c => c.value === item.sku));
        if (product) {
          const newPrice = product.prices.find(p => p.tierName === newTier)?.price || item.price;
          return { ...item, price: newPrice };
        }
        return item;
      });
      setCart(updatedCart);
      if (!silent) {
        toast({
            title: "Tarifas Actualizadas",
            description: `Los precios del carrito se han actualizado a la tarifa '${newTier}'.`,
        });
      }
    }
    setPriceTierDialogOpen(false);
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products.slice(0, 50); // Show first 50 products by default
    return products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codes.some(c => c.value.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [products, searchTerm]);

  const filteredCustomersForSearch = useMemo(() => {
    const lowercasedTerm = customerSearch.toLowerCase();
    if (!lowercasedTerm) return customers.filter(c => c.id !== '0');
    return customers.filter(c => {
      if (c.id === '0') return false;
      const searchInString = (str: string | undefined | null) => str?.toLowerCase().includes(lowercasedTerm);
      
      const inName = searchInString(c.name);
      const inEmail = searchInString(c.email);
      const inNit = searchInString(c.nit);
      
      const inPhones = c.phones.some(phone => searchInString(phone.number));
      const inAddresses = c.addresses.some(addr => searchInString(addr.street) || searchInString(addr.city));
      
      return inName || inEmail || inNit || inPhones || inAddresses;
    });
  }, [customers, customerSearch]);

  const cartTotal = useMemo(() => cart.reduce((total, item) => total + item.price * item.qty, 0), [cart]);

  const handleAddToCart = (product: Product, quantityToAdd = 1) => {
    const sku = product.codes.find(c => c.type === 'SKU')?.value;
    if (!sku) {
        toast({ title: "Error", description: "El producto no tiene SKU.", variant: "destructive" });
        return;
    }

    const warehouse = warehouses.find(w => w.id.toString() === selectedWarehouseId);
    if (!warehouse) {
        toast({ title: "Error", description: "Selecciona un almacén válido.", variant: "destructive" });
        return;
    }

    const stockInSelectedWarehouse = product.stock.find(s => s.warehouseId.toString() === selectedWarehouseId)?.quantity || 0;
    const availableForSale = stockInSelectedWarehouse - (product.reservedStock || 0);

    if (availableForSale <= 0 && !product.isService) {
        const totalStock = product.stock.reduce((sum, s) => sum + s.quantity, 0);
        if (totalStock > 0) {
            toast({ title: "Sin Stock Disponible", description: `No hay stock libre en ${warehouse.name}. Hay ${totalStock} unidades en total (${product.reservedStock || 0} reservadas).`, variant: 'destructive' });
        } else {
            toast({ title: "Producto Agotado", description: `${product.name} no tiene stock.`, variant: 'destructive' });
            if (selectedCustomer.id !== '0') {
                 setTimeout(() => {
                    handleOpenReservationModal(product, { stopPropagation: () => {} } as React.MouseEvent);
                }, 100);
            }
        }
        return;
    }

    const existingItemInCart = cart.find(item => item.sku === sku && item.warehouseId === selectedWarehouseId);
    const currentQtyInCart = existingItemInCart?.qty || 0;
    const finalQuantity = product.isService ? currentQtyInCart + quantityToAdd : Math.min(availableForSale, currentQtyInCart + quantityToAdd);
    const addedQty = finalQuantity - currentQtyInCart;

    if (addedQty <= 0 && !product.isService) {
        toast({ title: "Límite de Stock", description: `No hay más stock disponible en ${warehouse.name}.`, variant: "destructive" });
        return;
    }

    const price = product.prices.find(p => p.tierName === activePriceTier)?.price || product.prices[0]?.price || 0;

    if (existingItemInCart) {
        setCart(cart.map(item => item.sku === sku && item.warehouseId === selectedWarehouseId ? { ...item, qty: finalQuantity } : item));
    } else {
        const newItem: CartItem = { 
            sku, 
            name: product.name, 
            qty: addedQty,
            qtyDelivered: 0, 
            price, 
            warehouseId: selectedWarehouseId,
            warehouseName: warehouse.name
        };
        setCart(prevCart => [...prevCart, newItem]);
    }

    if (!product.isService && finalQuantity < (currentQtyInCart + quantityToAdd)) {
        toast({
            title: "Stock limitado",
            description: `Solo se pudieron añadir ${addedQty} unidades. Stock máximo disponible alcanzado en este almacén.`,
        });
    }

    setTimeout(() => {
        const inputRef = cartItemRefs.current.get(`${sku}-${selectedWarehouseId}`);
        inputRef?.select();
    }, 0);
  };
    
  const handleUpdateCartItem = (sku: string, warehouseId: string, field: 'qty' | 'price', value: number) => {
    const product = products.find(p => p.codes.some(c => c.value === sku));
    if (!product && !sku.startsWith('GEN-')) return;
    
    if (field === 'qty') {
        let newQuantity = Math.max(1, Math.floor(value) || 1);
        
        if (newQuantity <= 0) {
            setCart(cart.filter(item => !(item.sku === sku && item.warehouseId === warehouseId)));
            return;
        }

        if (product && !product.isService) {
            const stockAtWarehouse = (product.stock.find(s => s.warehouseId.toString() === warehouseId)?.quantity || 0) - (product.reservedStock || 0);
            if (newQuantity > stockAtWarehouse) {
                toast({ title: "Stock insuficiente", description: `Máximo ${stockAtWarehouse} unidades disponibles en este almacén.`, variant: "destructive" });
                newQuantity = stockAtWarehouse;
            }
        }
        setCart(cart.map(item => (item.sku === sku && item.warehouseId === warehouseId) ? { ...item, qty: newQuantity } : item));
    } else { // 'price'
        if (product) {
          const primarySupplier = product.suppliers.find(s => s.isPrimary);
          const cost = primarySupplier?.cost || 0;
          const taxRate = (product.tax?.rate || 0) / 100;
          const minPrice = cost * (1 + taxRate);
          
          if (value < minPrice) {
              toast({ title: 'Precio no permitido', description: `El precio no puede ser inferior al costo más impuestos (Mínimo: Q${minPrice.toFixed(2)}).`, variant: 'destructive' });
              setCart(cart.map(item => (item.sku === sku && item.warehouseId === warehouseId) ? { ...item, price: minPrice } : item));
          } else {
              setCart(cart.map(item => (item.sku === sku && item.warehouseId === warehouseId) ? { ...item, price: value } : item));
          }
        } else {
             setCart(cart.map(item => (item.sku === sku && item.warehouseId === warehouseId) ? { ...item, price: value } : item));
        }
    }
  };

  const handleCartQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          productSearchRef.current?.focus();
          productSearchRef.current?.select();
      }
  };

  const handleClearCart = () => {
    setCart([]);
    setSelectedCustomerId(defaultCustomer.id);
    toast({
        title: "Carrito Vaciado",
        description: "La venta ha sido cancelada y el carrito está listo para un nuevo cliente.",
    });
  };
  
  const handleOpenCalculator = (itemSku: string, itemWarehouseId: string, field: 'qty' | 'price', initialValue: number) => {
      setCalculatorContext({ itemSku, itemWarehouseId, field, initialValue });
      setIsCalculatorOpen(true);
  };

  const handleCalculatorResult = (result: number) => {
      if (calculatorContext) {
          handleUpdateCartItem(calculatorContext.itemSku, calculatorContext.itemWarehouseId, calculatorContext.field, result);
      }
      setIsCalculatorOpen(false);
      setCalculatorContext(null);
  };

  const triggerPrint = (type: 'sale' | 'reservation') => {
      const ref = type === 'sale' ? printableReceiptRef : printableReservationReceiptRef;
      const targetElement = ref.current;
  
      if (targetElement) {
          html2canvas(targetElement, { scale: 2 }).then((canvas) => {
              const imgData = canvas.toDataURL('image/png');
              const ticketWidthMm = 80;
              const canvasWidth = canvas.width;
              const canvasHeight = canvas.height;
              const ratio = canvasWidth / canvasHeight;
              const ticketHeightMm = ticketWidthMm / ratio;

              const pdf = new jsPDF({
                  orientation: 'portrait',
                  unit: 'mm',
                  format: [ticketWidthMm, ticketHeightMm]
              });

              pdf.addImage(imgData, 'PNG', 0, 0, ticketWidthMm, ticketHeightMm);
              pdf.autoPrint();
              window.open(pdf.output('bloburl'), '_blank');

              if (type === 'sale') setReceiptData(null);
              if (type === 'reservation') setReservationReceiptData(null);
          });
      }
  };
  
  const handleSaveSale = async (type: 'credit' | 'delivery_payment' | 'pending') => {
    const { generateNewInvoiceId, sellStock, addPurchaseToHistory, saveOrder, generateNewOrderId } = await import('@/lib/servicios');
    if (cart.length === 0) {
        toast({ title: "Carrito vacío", description: "Añade productos para guardar la venta.", variant: "destructive" });
        return;
    }

    let saleStatus: Purchase['status'] = 'Pendiente de Pago';
    let notes = '';

    if (type === 'credit') {
        const creditLimit = parseFloat(selectedCustomer.creditLimit.replace(/Q|,/g, '')) || 0;
        const currentBalance = parseFloat(selectedCustomer.currentBalance.replace(/Q|,/g, '')) || 0;
        const newPotentialBalance = currentBalance + cartTotal;

        if (newPotentialBalance > creditLimit) {
            toast({ title: "Límite de crédito excedido", description: `El saldo (Q${newPotentialBalance.toFixed(2)}) excedería el límite (Q${creditLimit.toFixed(2)}).`, variant: "destructive" });
            return;
        }
        
        const hasOverdueInvoices = selectedCustomer.purchaseHistory.some(inv => 
            (inv.status === 'Pendiente de Pago' || inv.status === 'Pago Parcial') && inv.dueDate && isPast(parseISO(inv.dueDate))
        );
        
        if(hasOverdueInvoices) {
            toast({ title: "Cliente con facturas vencidas", description: "No se puede otorgar más crédito.", variant: "destructive" });
            return;
        }
        notes = 'Venta al crédito.';
        saleStatus = 'Pendiente de Pago';
    } else if (type === 'delivery_payment') {
        notes = 'Pago en obra.';
        saleStatus = 'Pago en Obra';
    } else { // 'pending'
        notes = 'Venta pendiente de cobro en caja.';
        saleStatus = 'Pendiente de Pago';
    }
    
    const invoiceId = await generateNewInvoiceId(selectedTerminalId);
    
    const itemsByWarehouse: Record<string, OrderProduct[]> = {};
    for (const item of cart) {
        if (!itemsByWarehouse[item.warehouseId]) itemsByWarehouse[item.warehouseId] = [];
        itemsByWarehouse[item.warehouseId].push(item);
    }

    for (const warehouseId in itemsByWarehouse) {
        if(warehouseId === 'N/A') continue;
        await sellStock(itemsByWarehouse[warehouseId], invoiceId, parseInt(warehouseId));
    }
    
    const purchase: Omit<Purchase, 'products'> & { products: PurchaseProduct[] } = {
        invoice: invoiceId,
        date: new Date().toISOString().split('T')[0],
        total: `Q${cartTotal.toFixed(2)}`,
        status: saleStatus,
        notes: notes,
        products: cart.map(item => ({ sku: item.sku, name: item.name, qty: item.qty, price: item.price })),
        dueDate: hasCredit ? new Date(Date.now() + (parseInt(selectedCustomer.creditTerms) || 0) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        branchId: selectedBranchId,
        terminalId: selectedTerminalId,
    };
    
    await addPurchaseToHistory(selectedCustomer.id, purchase);

    if (type === 'delivery_payment') {
        const newOrder: Order = {
            id: await generateNewOrderId(),
            date: new Date().toISOString().split('T')[0],
            status: 'Listo para Entrega',
            total: `Q${cartTotal.toFixed(2)}`,
            products: cart,
            invoiceId: invoiceId,
            notes: `Proviene de la venta TPV ${invoiceId} (Pago en obra).`
        };
        await saveOrder(selectedCustomer.id, newOrder);
        toast({ title: "Venta y Pedido Creados", description: `Se generó la factura ${invoiceId} y el pedido ${newOrder.id}.`});
    } else {
        toast({ title: "Venta Guardada", description: `La venta ${invoiceId} ha sido registrada.`});
    }

    const branchInfo = branches.find(b => b.id.toString() === selectedBranchId);
    setReceiptData({
        cart: cart, total: cartTotal, customer: selectedCustomer, companyInfo: companyInfo!, branchInfo: branchInfo,
        invoiceId: invoiceId, paymentMethod: type === 'credit' ? 'Crédito' : 'Pendiente',
    });
    
    setTimeout(() => triggerPrint('sale'), 100);

    setCart([]);
    setSelectedCustomerId(defaultCustomer.id);
    setIsFinishSaleDialogOpen(false);
  };
  
  const handleCashSale = async () => {
    const { generateNewInvoiceId, sellStock, addPurchaseToHistory } = await import('@/lib/servicios');
    if (cart.length === 0) {
        toast({ title: "Carrito vacío", description: "Añade productos para cobrar.", variant: "destructive" });
        return;
    }

    const invoiceId = await generateNewInvoiceId(selectedTerminalId);

    const itemsByWarehouse: Record<string, OrderProduct[]> = {};
    for (const item of cart) {
        if (!itemsByWarehouse[item.warehouseId]) itemsByWarehouse[item.warehouseId] = [];
        itemsByWarehouse[item.warehouseId].push(item);
    }
    
    for (const warehouseId in itemsByWarehouse) {
        if(warehouseId === 'N/A') continue;
        await sellStock(itemsByWarehouse[warehouseId], invoiceId, parseInt(warehouseId));
    }
    
    const purchase: Omit<Purchase, 'products'> & { products: PurchaseProduct[] } = {
        invoice: invoiceId,
        date: new Date().toISOString().split('T')[0],
        total: `Q${cartTotal.toFixed(2)}`,
        status: 'Pagado',
        notes: 'Venta cobrada en terminal.',
        products: cart.map(item => ({ sku: item.sku, name: item.name, qty: item.qty, price: item.price })),
        branchId: selectedBranchId,
        terminalId: selectedTerminalId,
    };
    
    await addPurchaseToHistory(selectedCustomer.id, purchase);

    const branchInfo = branches.find(b => b.id.toString() === selectedBranchId);
    setReceiptData({
        cart: cart, total: cartTotal, customer: selectedCustomer, companyInfo: companyInfo!, branchInfo: branchInfo,
        invoiceId: invoiceId, paymentMethod: 'Efectivo',
    });
    
    setTimeout(() => triggerPrint('sale'), 100);

    await addCashRegisterMovement({
        id: Date.now(),
        fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
        tipo: 'Venta',
        concepto: `Venta TPV - Factura ${invoiceId} a ${selectedCustomer.name}`,
        ingreso: cartTotal,
        egreso: 0,
        branchId: selectedBranchId,
        terminalId: selectedTerminalId,
        paymentMethod: "Efectivo"
    });

    toast({ title: "Venta Cobrada", description: `La venta ${invoiceId} ha sido registrada y el pago ingresado en caja.`});
    setCart([]);
    setSelectedCustomerId(defaultCustomer.id);
    setIsFinishSaleDialogOpen(false);
  };


  const handleCreateOrder = () => {
     if (cart.length === 0 || selectedCustomer.id === "0") {
        toast({ title: "Error", description: "Selecciona un cliente y añade productos para crear un pedido.", variant: "destructive" });
        return;
    }
    setIsAddressModalOpen(true);
  };

  const confirmSaveOrder = async () => {
    const { saveOrder, generateNewOrderId, saveCustomer } = await import('@/lib/servicios');

    let deliveryAddress: Address | undefined;
    let finalCustomer = selectedCustomer;
    
    if (isAddingNewAddress) {
        if (!newAddress.street || !newAddress.city) {
            toast({ title: "Error", description: "Completa la nueva dirección.", variant: "destructive" });
            return;
        }
        const newAddressObject: Address = {
            id: Date.now(),
            ...newAddress,
            isPrimary: finalCustomer.addresses.length === 0,
        };
        finalCustomer.addresses.push(newAddressObject);
        deliveryAddress = newAddressObject;
        await saveCustomer(finalCustomer);
    } else {
        deliveryAddress = finalCustomer.addresses.find(a => a.id.toString() === selectedDeliveryAddressId);
    }

    if (!deliveryAddress) {
        toast({ title: "Error", description: "Por favor, selecciona o añade una dirección de entrega.", variant: "destructive" });
        return;
    }

    const newOrder: Order = {
      id: await generateNewOrderId(),
      date: new Date().toISOString().split('T')[0],
      status: 'En Preparación',
      total: `Q${cartTotal.toFixed(2)}`,
      products: cart,
      deliveryAddress,
    };

    await saveOrder(selectedCustomer.id, newOrder);
    toast({ title: "Pedido Guardado", description: `Se ha creado el pedido ${newOrder.id}.`});
    
    setCart([]);
    setSelectedCustomerId(defaultCustomer.id);
    setIsAddressModalOpen(false);
    setIsAddingNewAddress(false);
    setNewAddress({ street: '', city: '' });
  };


  const handleSaveAsQuote = async () => {
     const { saveQuote, generateNewQuoteId } = await import('@/lib/servicios');
     if (cart.length === 0 || selectedCustomer.id === "0") {
        toast({ title: "Error", description: "Selecciona un cliente y añade productos para crear un presupuesto.", variant: "destructive" });
        return;
    }
     const newQuote: Quote = {
      id: await generateNewQuoteId(),
      date: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days expiry
      status: 'Borrador',
      total: `Q${cartTotal.toFixed(2)}`,
      products: cart as QuoteProduct[],
    };
    await saveQuote(selectedCustomer.id, newQuote);
    toast({ title: "Presupuesto Guardado", description: `Se ha creado el presupuesto ${newQuote.id}.`});
    setCart([]);
    setSelectedCustomerId(defaultCustomer.id);
  }

  const handleParkSale = async () => {
    if (cart.length === 0) {
      toast({ title: "Carrito vacío", description: "Añade productos para aparcar la venta.", variant: "destructive" });
      return;
    }

    const saleToPark: Omit<ParkedSale, 'id' | 'timestamp'> = {
        customerId: selectedCustomerId,
        customerName: selectedCustomer.name,
        salespersonName: currentUser.name,
        terminalId: selectedTerminalId,
        cart: cart,
        total: cartTotal,
    };

    await saveParkedSale(saleToPark);
    toast({ title: "Venta Aparcada", description: `La venta para ${selectedCustomer.name} ha sido guardada.`});
    setCart([]);
    setSelectedCustomerId(defaultCustomer.id);
    await loadParkedSales();
  }
  
  const handleResumeSale = async (sale: ParkedSale) => {
    if (cart.length > 0) {
        const confirm = window.confirm("Tienes una venta en curso. ¿Estás seguro que quieres descartarla y retomar la venta aparcada?");
        if (!confirm) return;
    }
    setSelectedCustomerId(sale.customerId);
    setCart(sale.cart);
    await deleteParkedSale(sale.id);
    toast({ title: "Venta Retomada", description: `Se ha cargado la venta de ${sale.customerName}.` });
    setParkedSalesDialogOpen(false);
    await loadParkedSales();
  }

  const handleShowProductDetail = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que se añada al carrito
    setSelectedProductForDetail(product);
    setProductDetailModalOpen(true);
  }
  
  const handleProductCreated = (newProduct: Product) => {
    setProducts(prev => [...prev, newProduct]); // Update local state
    handleAddToCart(newProduct);
    setIsNewProductModalOpen(false);
  };
  
  const handleConfirmGenericLine = () => {
    const { description, qty, price } = genericLineData;
    if (!description || !qty || parseInt(qty) <= 0 || !price || parseFloat(price) < 0) {
        toast({ title: "Datos incompletos o inválidos", description: "Todos los campos son requeridos y los números deben ser positivos.", variant: "destructive" });
        return;
    }

    const newItem: CartItem = {
        sku: `GEN-${Date.now()}`,
        name: description,
        qty: parseInt(qty, 10),
        price: parseFloat(price),
        qtyDelivered: 0,
        warehouseId: 'N/A',
        warehouseName: 'Genérico'
    };

    setCart(prev => [...prev, newItem]);
    setIsGenericLineModalOpen(false);
    setGenericLineData({ description: '', qty: '1', price: '' });
  };
  
  const handleOpenReservationModal = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if(selectedCustomerId === '0') {
        toast({ title: "Seleccione un Cliente", description: "Debe seleccionar un cliente antes de crear un apartado o encargo.", variant: "destructive" });
        return;
    }
    
    const stockInSelectedWarehouse = product.stock.find(s => s.warehouseId.toString() === selectedWarehouseId)?.quantity || 0;
    const price = product.prices.find(p => p.tierName === activePriceTier)?.price || product.prices[0]?.price || 0;

    setReservationState({
        product,
        type: stockInSelectedWarehouse > 0 ? 'apartado' : 'encargo',
        quantity: 1,
        price,
        advancePayment: 0
    });
    setIsReservationModalOpen(true);
  };

  const handleConfirmReservation = async () => {
    if (!reservationState || !reservationState.product) return;
    const { product, type, quantity, price, advancePayment } = reservationState;

    if (quantity <= 0) {
        toast({ title: "Cantidad inválida", variant: "destructive" });
        return;
    }
    
    const sku = product.codes.find(c => c.type === 'SKU')?.value || `prod-${product.id}`;

    const newReservation: Omit<Reservation, 'id'> = {
        type: type,
        customerId: selectedCustomerId,
        date: new Date().toISOString().split('T')[0],
        expiryDate: type === 'apartado' ? addDays(new Date(), 30).toISOString().split('T')[0] : undefined,
        status: type === 'apartado' ? 'Pendiente' : 'Esperando Surtido',
        products: [{ sku, name: product.name, qty: quantity, price }],
        totalAmount: quantity * price,
        advancePayment,
        remainingBalance: (quantity * price) - advancePayment,
        warehouseId: selectedWarehouseId,
        notes: `Creado desde TPV por ${currentUser.name}`
    };
    
    const savedReservation = await saveReservation(selectedCustomerId, newReservation);

    let isPaid = false;
    if (advancePayment > 0 && settings?.posSettings.allowTerminalCharging) {
        await addCashRegisterMovement({
            id: Date.now(),
            fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
            tipo: 'Pago Factura',
            concepto: `Anticipo ${type} #${savedReservation.id}`,
            ingreso: advancePayment,
            egreso: 0,
            branchId: selectedBranchId,
            terminalId: selectedTerminalId,
            paymentMethod: 'Efectivo'
        });
        isPaid = true;
    }
    
    setReservationReceiptData({
        reservation: savedReservation,
        customer: selectedCustomer,
        companyInfo: companyInfo!,
        branchInfo: branches.find(b => b.id.toString() === selectedBranchId),
        isPaid
    });

    setTimeout(() => triggerPrint('reservation'), 100);

    toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Creado`, description: `Se ha guardado el ${type} para ${selectedCustomer.name}` });
    setIsReservationModalOpen(false);
    setReservationState(null);
  };

  const addReservationToCart = (reservation: Reservation) => {
    const productsToAdd = reservation.products.map(p => {
        const productData = products.find(prod => prod.codes.some(c => c.value === p.sku));
        return {
            sku: p.sku,
            name: p.name,
            qty: p.qty,
            price: p.price,
            qtyDelivered: 0,
            warehouseId: reservation.warehouseId,
            warehouseName: warehouses.find(w => w.id.toString() === reservation.warehouseId)?.name || 'Desconocido',
        }
    });

    const advanceLine: CartItem = {
      sku: `ADV-${reservation.id}`,
      name: `Anticipo ${reservation.type} #${reservation.id}`,
      qty: 1,
      price: -reservation.advancePayment, // Negative price for discount
      qtyDelivered: 0,
      warehouseId: 'N/A',
      warehouseName: 'Abono'
    };

    setCart([...productsToAdd, advanceLine]);
    setIsCustomerReservationsOpen(false);
  }


  return (
    <>
    <div className="flex flex-col gap-4 h-full">
      <header className="flex-shrink-0 border-b pb-4">
        <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
                {companyInfo?.logoUrl ? (
                    <Image src={companyInfo.logoUrl} alt={companyInfo.name} width={40} height={40} className="rounded-md object-contain" />
                ) : (
                    <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-primary text-primary-foreground font-bold text-xl font-headline rounded-md">
                        {companyInfo?.name.charAt(0) || 'S'}
                    </div>
                )}
                <div>
                    <h1 className="text-xl font-bold font-headline tracking-tight">{companyInfo?.name || 'SimplyGest'}</h1>
                    <span className="font-mono text-sm text-muted-foreground">{nextInvoiceId}</span>
                </div>
            </div>
             <div className="flex items-center gap-2 flex-wrap justify-end">
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                    <SelectTrigger className="w-[180px] shadow-sculpted"><Building className="h-4 w-4 mr-2" /><SelectValue placeholder="Sucursal..."/></SelectTrigger>
                    <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
                 <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId} disabled={!selectedBranchId}>
                    <SelectTrigger className="w-[180px] shadow-sculpted"><Warehouse className="h-4 w-4 mr-2" /><SelectValue placeholder="Almacén..."/></SelectTrigger>
                    <SelectContent>{filteredWarehouses.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
                 <Dialog open={parkedSalesDialogOpen} onOpenChange={setParkedSalesDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="shadow-sculpted relative">
                           <FolderClock className="mr-2 h-4 w-4" /> 
                           Ventas Aparcadas {parkedSales.length > 0 && `(${parkedSales.length})`}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ventas Aparcadas</DialogTitle>
                            <DialogDescription>Selecciona una venta para retomarla.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <ScrollArea className="h-64">
                                <Table>
                                    <TableHeader>
                                        <TableRow><TableHead>Cliente</TableHead><TableHead>Vendedor</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Acción</TableHead></TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parkedSales.length > 0 ? parkedSales.map(sale => (
                                            <TableRow key={sale.id}>
                                                <TableCell className="font-medium">{sale.customerName}</TableCell>
                                                <TableCell>{sale.salespersonName}</TableCell>
                                                <TableCell className="text-right">Q{sale.total.toFixed(2)}</TableCell>
                                                <TableCell className="text-right"><Button size="sm" onClick={() => handleResumeSale(sale)}>Retomar</Button></TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay ventas aparcadas.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </DialogContent>
                </Dialog>
                <Select value={selectedTerminalId} onValueChange={setSelectedTerminalId} disabled={!selectedBranchId}>
                    <SelectTrigger className="w-[180px] shadow-sculpted"><Terminal className="h-4 w-4 mr-2" /><SelectValue placeholder="Terminal..." /></SelectTrigger>
                    <SelectContent>{filteredTerminals.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
            </div>
        </div>
      </header>
      <main className="flex-grow min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={66}>
            <Card className="flex flex-col h-full m-0 rounded-r-none border-0 border-r">
              <div className="p-4 border-b">
                 <div className="flex justify-between items-center gap-4">
                    <Input ref={productSearchRef} placeholder="Buscar producto por nombre o SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-grow"/>
                     <div className="flex items-center gap-2">
                        <Dialog open={isNewProductModalOpen} onOpenChange={setIsNewProductModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline"><PackagePlus className="mr-2 h-4 w-4" /> Añadir Producto</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
                                <DialogHeader>
                                    <DialogTitle>Añadir Nuevo Producto</DialogTitle>
                                    <DialogDescription>Completa la ficha para crear un nuevo artículo en el inventario.</DialogDescription>
                                </DialogHeader>
                                <ScrollArea className="flex-grow">
                                  <div className="p-1">
                                    <NewProductForm 
                                      onProductCreated={handleProductCreated}
                                      warehouses={warehouses}
                                      priceTiers={priceTiers}
                                    />
                                  </div>
                                </ScrollArea>
                            </DialogContent>
                        </Dialog>
                        <Dialog open={isGenericLineModalOpen} onOpenChange={setIsGenericLineModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline"><FilePlus className="mr-2 h-4 w-4" /> Añadir Línea</Button>
                            </DialogTrigger>
                             <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Añadir Línea Genérica</DialogTitle>
                                    <DialogDescription>Añade un artículo o servicio no catalogado a la venta actual.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <Input placeholder="Descripción del artículo o servicio" value={genericLineData.description} onChange={e => setGenericLineData({...genericLineData, description: e.target.value})}/>
                                    <Input type="number" min="1" placeholder="Cantidad" value={genericLineData.qty} onChange={e => setGenericLineData({...genericLineData, qty: e.target.value})}/>
                                    <Input type="number" min="0" placeholder="Precio Unitario (Q)" value={genericLineData.price} onChange={e => setGenericLineData({...genericLineData, price: e.target.value})}/>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsGenericLineModalOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleConfirmGenericLine}>Añadir al Carrito</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                        <Button variant={productViewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => handleSetProductViewMode('grid')}>
                            <LayoutGrid className="h-4 w-4"/>
                        </Button>
                         <Button variant={productViewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => handleSetProductViewMode('list')}>
                            <List className="h-4 w-4"/>
                        </Button>
                    </div>
                 </div>
              </div>
              <ScrollArea className="flex-grow">
                 <div className="p-4">
                 {productViewMode === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {filteredProducts.map(product => {
                            const stockInSelectedWarehouse = product.stock.find(s => s.warehouseId.toString() === selectedWarehouseId)?.quantity || 0;
                            const availableForSale = stockInSelectedWarehouse - (product.reservedStock || 0);
                            const hasStock = product.isService || availableForSale > 0;

                            return (
                                <Card
                                    key={product.id} 
                                    onClick={() => handleAddToCart(product)} 
                                    className={cn(
                                        "p-3 flex flex-col justify-between transition-all group shadow-sculpted",
                                        "cursor-pointer hover:shadow-md hover:border-primary",
                                        !hasStock && "opacity-50"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-sm font-semibold leading-tight flex-grow pr-2">{product.name}</p>
                                        <div className="flex-shrink-0 flex items-center">
                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => handleOpenReservationModal(product, e)}>
                                                <HardHat className="h-4 w-4"/>
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => handleShowProductDetail(product, e)}>
                                                <Info className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end mt-auto pt-2 border-t">
                                        <div className="text-xs">
                                            <div className="font-mono text-muted-foreground">{product.codes.find(c => c.type === 'SKU')?.value}</div>
                                            {product.isService ? (
                                                <div className="font-semibold text-sky-600">Servicio</div>
                                            ) : (
                                                <>
                                                    <div className={cn("font-semibold", !hasStock && "text-destructive")}>Disp: {availableForSale}</div>
                                                    {(product.reservedStock || 0) > 0 && <div className="text-amber-600">Res: {product.reservedStock}</div>}
                                                </>
                                            )}
                                        </div>
                                        <span className="text-sm font-bold text-primary">Q{(product.prices.find(p => p.tierName === activePriceTier)?.price || product.prices[0]?.price || 0).toFixed(2)}</span>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                 ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Disp.</TableHead>
                          <TableHead>Otras Suc.</TableHead>
                          <TableHead className="text-right">Precio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map(product => {
                          const stockInSelectedWarehouse = product.stock.find(s => s.warehouseId.toString() === selectedWarehouseId)?.quantity || 0;
                          const availableForSale = stockInSelectedWarehouse - (product.reservedStock || 0);
                          const price = (product.prices.find(p => p.tierName === activePriceTier)?.price || product.prices[0]?.price || 0);
                          const stockInOtherWarehouses = product.stock
                            .filter(s => s.warehouseId.toString() !== selectedWarehouseId)
                            .reduce((sum, s) => sum + s.quantity, 0);
                          const otherWarehousesStockDetails = product.stock
                            .filter(s => s.warehouseId.toString() !== selectedWarehouseId && s.quantity > 0)
                            .map(s => `${s.warehouseName}: ${s.quantity}`)
                            .join('\n');

                          return (
                            <TableRow key={product.id} onClick={() => handleAddToCart(product)} className={cn("cursor-pointer")}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell className="font-mono text-xs">{product.codes.find(c => c.type === 'SKU')?.value}</TableCell>
                              <TableCell className="font-semibold">{product.isService ? 'N/A' : availableForSale}</TableCell>
                              <TableCell>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className={cn(stockInOtherWarehouses > 0 ? "font-semibold text-blue-600" : "text-muted-foreground")}>
                                              {product.isService ? 'N/A' : stockInOtherWarehouses}
                                            </span>
                                        </TooltipTrigger>
                                        {otherWarehousesStockDetails && (
                                            <TooltipContent>
                                                <pre className="text-xs">{otherWarehousesStockDetails}</pre>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell className="text-right font-bold text-primary">Q{price.toFixed(2)}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                 )}
                 </div>
               </ScrollArea>
            </Card>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={34}>
            <Card className="h-full flex flex-col rounded-l-none border-0">
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-grow">
                        <Users className="h-5 w-5"/>
                        <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={customerPopoverOpen} className="w-full justify-between">
                                    <span className="truncate">{selectedCustomer.name}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[350px] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar por nombre, NIT, teléfono..." onValueChange={setCustomerSearch} />
                                    <CommandEmpty>No se encontró ningún cliente.</CommandEmpty>
                                    <CommandList>
                                        <CommandGroup>
                                            <CommandItem key={defaultCustomer.id} onSelect={() => { setSelectedCustomerId(defaultCustomer.id); setCustomerPopoverOpen(false); }}>
                                                <div className="flex items-center">
                                                    <Check className={cn("mr-2 h-4 w-4", selectedCustomerId === defaultCustomer.id ? "opacity-100" : "opacity-0")} />
                                                    <span>{defaultCustomer.name}</span>
                                                </div>
                                            </CommandItem>
                                            {filteredCustomersForSearch.map((c) => {
                                                const primaryPhone = c.phones.find(p => p.isPrimary)?.number || (c.phones.length > 0 ? c.phones[0].number : null);
                                                return (
                                                <CommandItem key={c.id} value={`${c.name} ${c.nit} ${primaryPhone}`} onSelect={() => { setSelectedCustomerId(c.id); setCustomerPopoverOpen(false); }}>
                                                    <div className="flex items-start w-full">
                                                        <Check className={cn("mr-2 h-4 w-4 mt-1", selectedCustomerId === c.id ? "opacity-100" : "opacity-0")} />
                                                        <div className="flex-grow">
                                                            <p>{c.name}</p>
                                                            <p className="text-xs text-muted-foreground">Tel: {primaryPhone || 'N/A'} | NIT: {c.nit}</p>
                                                        </div>
                                                    </div>
                                                </CommandItem>
                                                )
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex items-center pl-1">
                        <TooltipProvider>
                            <Dialog open={isCustomerReservationsOpen} onOpenChange={setIsCustomerReservationsOpen}>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={selectedCustomerId === '0' || customerReservations.length === 0} className="relative">
                                            <ClipboardCheck className="h-4 w-4"/>
                                            {customerReservations.length > 0 && (
                                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">{customerReservations.length}</span>
                                            )}
                                        </Button>
                                    </DialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent><p>Ver Apartados/Encargos del Cliente</p></TooltipContent>
                                </Tooltip>
                                <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Apartados y Encargos de {selectedCustomer.name}</DialogTitle>
                                </DialogHeader>
                                <div className="py-4">
                                    {customerReservations.map(res => (
                                        <div key={res.id} className="p-2 border-b flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">{res.products[0].name} <span className="font-normal">({res.products[0].qty} uds)</span></p>
                                                <p className="text-xs text-muted-foreground">{res.id} - {res.type}</p>
                                            </div>
                                            <Button size="sm" onClick={() => addReservationToCart(res)}>Añadir al Carrito</Button>
                                        </div>
                                    ))}
                                </div>
                                </DialogContent>
                            </Dialog>
                        </TooltipProvider>
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" asChild><Link href={`/customers/new?redirect=/tpv`}><UserPlus className="h-4 w-4"/></Link></Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Añadir nuevo cliente</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" asChild disabled={selectedCustomerId === '0'}>
                                        <Link href={`/customers/${selectedCustomerId}/edit?redirect=/tpv`}><Pencil className="h-4 w-4"/></Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Editar cliente</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setHistoryDialogOpen(true)} disabled={selectedCustomerId === '0'}>
                                        <History className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Ver historial del cliente</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
                 <div className="text-sm mt-3 flex justify-between items-center p-2">
                     <Dialog open={priceTierDialogOpen} onOpenChange={setPriceTierDialogOpen}>
                        <DialogTrigger asChild>
                             <div className="flex items-center gap-2 cursor-pointer">
                                 <span className="text-muted-foreground">Tarifa: {activePriceTier}</span>
                                <Tag className="h-4 w-4 text-primary" />
                            </div>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Seleccionar Tarifa de Venta</DialogTitle>
                                <DialogDescription>Elige la tarifa de precios que se aplicará a todos los productos en el carrito actual.</DialogDescription>
                            </DialogHeader>
                            <Command className="rounded-lg border shadow-md mt-4">
                                <CommandList>
                                    <CommandGroup>
                                        {priceTiers.map(tier => (
                                            <CommandItem key={tier.id} onSelect={() => handlePriceTierChange(tier.name)}>
                                                <Check className={cn("mr-2 h-4 w-4", activePriceTier === tier.name ? "opacity-100" : "opacity-0")} />
                                                <span>{tier.name}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                                <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">Cancelar</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <TooltipProvider>
                        <Tooltip>
                            <AlertDialog>
                                <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={cart.length === 0}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent><p>Vaciar Carrito</p></TooltipContent>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Vaciar el carrito?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción eliminará todos los productos del carrito actual. No se puede deshacer.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleClearCart}>Sí, Vaciar Carrito</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </Tooltip>
                    </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent className="flex-grow overflow-y-auto p-4">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead className="w-[100px]">Cant.</TableHead>
                            <TableHead className="w-[100px] text-right">Subtotal</TableHead>
                            <TableHead className="w-[20px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {cart.length > 0 ? cart.map(item => (
                            <TableRow key={`${item.sku}-${item.warehouseId}`}>
                                <TableCell className="font-medium text-xs leading-tight py-2">
                                    {item.name}
                                    <div className="text-muted-foreground flex items-center gap-1">
                                        Q{item.price.toFixed(2)}
                                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleOpenCalculator(item.sku, item.warehouseId, 'price', item.price)}>
                                            <Calculator className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <Badge variant="outline" className="mt-1">{item.warehouseName}</Badge>
                                </TableCell>
                                <TableCell className="py-2">
                                    <div className="flex items-center gap-1">
                                    <Input
                                        ref={el => cartItemRefs.current.set(`${item.sku}-${item.warehouseId}`, el)} 
                                        type="number"
                                        min="1"
                                        value={item.qty} 
                                        onChange={e => handleUpdateCartItem(item.sku, item.warehouseId, 'qty', parseInt(e.target.value, 10))} 
                                        onKeyDown={handleCartQtyKeyDown}
                                        className="h-8 w-20 text-center"/>
                                     <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleOpenCalculator(item.sku, item.warehouseId, 'qty', item.qty)}>
                                        <Calculator className="h-3 w-3" />
                                    </Button>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs py-2">Q{(item.price * item.qty).toFixed(2)}</TableCell>
                                <TableCell className="py-2">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUpdateCartItem(item.sku, item.warehouseId, 'qty', 0)}><Trash2 className="h-3 w-3"/></Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Carrito vacío</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 border-t pt-4 p-4">
                 <div className="w-full flex justify-between items-center text-lg font-bold">
                    <span>TOTAL</span>
                    <span className="font-mono">Q{cartTotal.toFixed(2)}</span>
                 </div>
                 <div className="w-full grid grid-cols-3 gap-2 pt-2">
                    <Dialog open={isFinishSaleDialogOpen} onOpenChange={setIsFinishSaleDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="col-span-3">
                                <Wallet className="mr-2 h-4 w-4"/>Guardar Venta
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Finalizar Venta</DialogTitle>
                                <DialogDescription>Elige cómo procesar esta venta.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                {settings?.posSettings.allowTerminalCharging && (
                                    <Button onClick={handleCashSale} className="w-full justify-start h-auto py-3" variant="outline">
                                        <div>
                                            <p className="font-semibold flex items-center gap-2"><Banknote />Cobrar en Terminal (Efectivo)</p>
                                            <p className="text-xs text-muted-foreground text-left">Registra el pago y marca la factura como pagada.</p>
                                        </div>
                                    </Button>
                                )}
                                <Button onClick={() => handleSaveSale('pending')} className="w-full justify-start h-auto py-3" variant="outline">
                                    <div>
                                        <p className="font-semibold">Generar Factura Pendiente</p>
                                        <p className="text-xs text-muted-foreground text-left">La factura se enviará a caja para su cobro posterior.</p>
                                    </div>
                                </Button>
                                {hasCredit && (
                                    <>
                                        <Button onClick={() => handleSaveSale('credit')} className="w-full justify-start h-auto py-3" variant="outline">
                                            <div>
                                                <p className="font-semibold flex items-center gap-2"><CreditCard />Venta al Crédito</p>
                                                <p className="text-xs text-muted-foreground text-left">Afecta el saldo disponible del cliente.</p>
                                            </div>
                                        </Button>
                                        <Button onClick={() => handleSaveSale('delivery_payment')} className="w-full justify-start h-auto py-3" variant="outline">
                                             <div>
                                                <p className="font-semibold flex items-center gap-2"><Truck />Pago en Obra</p>
                                                <p className="text-xs text-muted-foreground text-left">Registra la venta como pendiente y crea un pedido para logística.</p>
                                            </div>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" onClick={handleParkSale}><FolderClock className="mr-2 h-4 w-4"/>Aparcar</Button>
                    <Button variant="secondary" onClick={handleCreateOrder}>P. a Domicilio</Button>
                    <Button variant="secondary" onClick={handleSaveAsQuote}><FilePlus className="mr-2 h-4 w-4"/>Presupuesto</Button>
                 </div>
              </CardFooter>
            </Card>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
      
       <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historial de Compras: {selectedCustomer.name}</DialogTitle>
            <DialogDescription>
              Aquí puedes ver todas las facturas y productos comprados por este cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
              <ScrollArea className="h-[400px] px-4">
                {(selectedCustomer.purchaseHistory?.length ?? 0) > 0 ? (
                  <Accordion type="single" collapsible>
                    {selectedCustomer.purchaseHistory.map(purchase => (
                      <AccordionItem value={purchase.invoice} key={purchase.invoice}>
                        <AccordionTrigger className="text-sm hover:no-underline py-2">
                          <div className="flex justify-between w-full pr-2">
                              <span>{purchase.invoice} - {format(new Date(purchase.date), 'dd/MM/yyyy')}</span>
                              <span>{purchase.total}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Table>
                            <TableBody>
                              {purchase.products.map((p, i) => (
                                <TableRow key={i}>
                                  <TableCell className="py-1 text-xs">{p.name}</TableCell>
                                  <TableCell className="py-1 text-xs text-right">{p.qty}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin historial de compras.</p>
                )}
              </ScrollArea>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setHistoryDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
        <DialogContent className="sm:max-w-sm p-0 border-0 bg-transparent shadow-none">
          <DialogHeader>
            <DialogTitle className="sr-only">Calculadora Avanzada</DialogTitle>
          </DialogHeader>
            <AdvancedCalculator onResult={handleCalculatorResult} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={productDetailModalOpen} onOpenChange={setProductDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedProductForDetail && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProductForDetail.name}</DialogTitle>
                <DialogDescription>
                  SKU: {selectedProductForDetail.codes.find(c => c.type === 'SKU')?.value || 'N/A'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="flex items-center justify-center">
                   <Image
                      src={selectedProductForDetail.images[0]?.url || 'https://placehold.co/400x400.png'}
                      alt={selectedProductForDetail.name}
                      width={250}
                      height={250}
                      className="rounded-lg object-cover aspect-square"
                      data-ai-hint="product image"
                    />
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Descripción</h4>
                    <p className="text-sm text-muted-foreground">{selectedProductForDetail.description}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                        {selectedProductForDetail.attributes?.color && <Badge>{selectedProductForDetail.attributes.color}</Badge>}
                        {selectedProductForDetail.attributes?.size && <Badge>{selectedProductForDetail.attributes.size}</Badge>}
                    </div>
                  </div>

                   <div>
                    <h4 className="font-semibold mb-2">Precios</h4>
                    <Table>
                      <TableBody>
                        {selectedProductForDetail.prices.map(p => (
                          <TableRow key={p.tierId}>
                            <TableCell className="text-sm">{p.tierName}</TableCell>
                            <TableCell className="text-right font-semibold">Q{p.price.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Existencias</h4>
                    <Table>
                      <TableBody>
                        {selectedProductForDetail.stock.map(s => (
                          <TableRow key={s.warehouseId}>
                            <TableCell className="text-sm">{s.warehouseName}</TableCell>
                            <TableCell className="text-right font-semibold">{s.quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => setProductDetailModalOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Dirección de Entrega</DialogTitle>
                <DialogDescription>Selecciona o añade una dirección para enviar el pedido.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <RadioGroup value={selectedDeliveryAddressId} onValueChange={setSelectedDeliveryAddressId} className="space-y-2">
                    {selectedCustomer.addresses.map(addr => (
                        <Label key={addr.id} htmlFor={`addr-${addr.id}`} className="flex items-start gap-3 border rounded-md p-3 cursor-pointer has-[:checked]:border-primary">
                             <RadioGroupItem value={addr.id.toString()} id={`addr-${addr.id}`} className="mt-1" />
                             <div>
                                <p className="font-medium">{addr.street}</p>
                                <p className="text-sm text-muted-foreground">{addr.city}</p>
                                {addr.isPrimary && <Badge variant="outline" className="mt-1">Principal</Badge>}
                             </div>
                        </Label>
                    ))}
                </RadioGroup>
                
                <Button variant="outline" size="sm" onClick={() => setIsAddingNewAddress(!isAddingNewAddress)}>
                    <MapPin className="mr-2 h-4 w-4" />
                    {isAddingNewAddress ? 'Cancelar' : 'Añadir Nueva Dirección'}
                </Button>

                {isAddingNewAddress && (
                    <div className="p-4 border rounded-lg space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-street">Dirección</Label>
                            <Input id="new-street" value={newAddress.street} onChange={e => setNewAddress({...newAddress, street: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-city">Ciudad / Municipio</Label>
                            <Input id="new-city" value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} />
                        </div>
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setIsAddressModalOpen(false)}>Cancelar Pedido</Button>
                <Button onClick={confirmSaveOrder}>Confirmar Pedido</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="absolute left-[-9999px] top-0">
          <div ref={printableReceiptRef}>
              {receiptData && <PrintableReceipt {...receiptData} />}
          </div>
          <div ref={printableReservationReceiptRef}>
              {reservationReceiptData && <PrintableReservationReceipt {...reservationReceiptData} />}
          </div>
      </div>
      <Dialog open={isReservationModalOpen} onOpenChange={setIsReservationModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Crear Apartado o Encargo</DialogTitle>
                    <DialogDescription>
                        Para: {reservationState?.product?.name}
                    </DialogDescription>
                </DialogHeader>
                {reservationState && (
                    <div className="py-4 space-y-4">
                        <Badge>{reservationState.type === 'apartado' ? 'Apartado (en stock)' : 'Encargo (sin stock)'}</Badge>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="res-qty">Cantidad</Label>
                                <Input id="res-qty" type="number" min="1" value={reservationState.quantity} onChange={(e) => setReservationState({ ...reservationState, quantity: parseInt(e.target.value) || 1 })}/>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="res-price">Precio Unitario (Q)</Label>
                                <Input id="res-price" type="number" min="0" value={reservationState.price} onChange={(e) => setReservationState({ ...reservationState, price: parseFloat(e.target.value) || 0 })}/>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="res-advance">Anticipo (Q)</Label>
                            <Input id="res-advance" type="number" min="0" value={reservationState.advancePayment} onChange={(e) => setReservationState({ ...reservationState, advancePayment: parseFloat(e.target.value) || 0 })}/>
                        </div>
                        <div className="font-bold text-lg text-right">
                            Total: Q{(reservationState.quantity * reservationState.price).toFixed(2)}
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsReservationModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmReservation}>Confirmar</Button>
                </DialogFooter>
            </DialogContent>
      </Dialog>
    </>
  );
}

function TpvSkeleton() {
  return (
      <div className="h-screen flex flex-col p-4 gap-4 bg-background/95">
          <header className="flex-shrink-0">
              <Skeleton className="h-16 w-full" />
          </header>
          <main className="flex-grow min-h-0">
              <div className="flex h-full gap-4">
                  <Skeleton className="flex-grow h-full" />
                  <Skeleton className="w-1/3 h-full" />
              </div>
          </main>
      </div>
  );
}

export default function TPVPage() {
  return (
    <Suspense fallback={<TpvSkeleton />}>
      <TPVContent />
    </Suspense>
  )
}
    

