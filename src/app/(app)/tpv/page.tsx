

'use client'

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Users, Trash2, Save, PackagePlus, FilePlus, UserPlus, Wallet, Pencil, Check, ChevronsUpDown, History, Printer, HardHat, Info, Image as ImageIcon, LayoutGrid, List, FolderClock, Tag, CreditCard, Home, MapPin, Truck, Banknote, Building, Warehouse, HelpCircle, Terminal, ClipboardCheck, Loader2, ShoppingCart, Package, Flame } from "lucide-react";
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
import { WarehouseBadge, BranchBadge, getWarehouseConfig, getBranchConfig } from "@/components/location-badge";
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


type CartItem = OrderProduct & { 
  warehouseId: string; 
  warehouseName: string;
  prices?: { tierId?: number; tierName: string; price: number }[];
};
type ProductView = 'grid' | 'list';

/**
 * Normaliza nombres de tarifas ("Normal", "Mayorista", "Especial")
 * Tolera formatos antiguos como "Tarifa General", "Tarifa Mayorista", "Tarifa Profesional".
 */
function normalizeTierName(tier?: string): 'Normal' | 'Mayorista' | 'Especial' {
  const t = (tier || '').toLowerCase().trim();
  if (t.includes('mayor')) return 'Mayorista';
  if (t.includes('especial') || t.includes('profes')) return 'Especial';
  return 'Normal';
}

function getProductPriceForTier(product: Product, tierName?: string): number {
  if (!product.prices || product.prices.length === 0) return 0;
  const target = normalizeTierName(tierName);
  
  const exact = product.prices.find(p => p.tierName.toLowerCase() === (tierName || '').toLowerCase());
  if (exact) return exact.price;

  const normalized = product.prices.find(p => normalizeTierName(p.tierName) === target);
  if (normalized) return normalized.price;

  return product.prices[0]?.price || 0;
}

function getPriceFromPricesList(prices?: { tierId?: number; tierName: string; price: number }[], tierName?: string): number | null {
  if (!prices || prices.length === 0) return null;
  const target = normalizeTierName(tierName);

  const exact = prices.find(p => p.tierName.toLowerCase() === (tierName || '').toLowerCase());
  if (exact) return exact.price;

  const normalized = prices.find(p => normalizeTierName(p.tierName) === target);
  if (normalized) return normalized.price;

  return prices[0]?.price || null;
}

const defaultCustomer: Customer = {
  id: "0", name: "Cliente General", email: "", phones: [], type: "Particular", avatar: "CG", nit: "CF", fiscalName: "Consumidor Final",
  totalSpent: "Q0.00", lastPurchase: "N/A", priceTier: "Normal", creditLimit: "Q0.00", creditTerms: "0",
  currentBalance: "Q0.00", usualPaymentMethod: "Efectivo", maxSalesDiscount: "0%", addresses: [], purchaseHistory: [], notes: '',
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
  const [activePriceTier, setActivePriceTier] = useState<string>('Normal');
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [productViewMode, setProductViewMode] = useState<ProductView>('grid');
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
  const [isCompactScreen, setIsCompactScreen] = useState(false);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalNode(document.getElementById('tpv-top-actions'));
  }, []);

  useEffect(() => {
    const checkScreen = () => {
      setIsCompactScreen(window.innerWidth < 1024);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [priceTierDialogOpen, setPriceTierDialogOpen] = useState(false);
  const [parkedSalesDialogOpen, setParkedSalesDialogOpen] = useState(false);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [totalCustomerCount, setTotalCustomerCount] = useState<number>(28773);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerOffset, setCustomerOffset] = useState<number>(100);
  const [isLoadingMoreCustomers, setIsLoadingMoreCustomers] = useState(false);
  const [customerPurchases, setCustomerPurchases] = useState<Purchase[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
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

      try {
        const res = await fetch('/api/customers?limit=100&offset=0');
        if (res.ok) {
          const json = await res.json();
          setCustomers([defaultCustomer, ...(json.items || [])]);
          if (json.total !== undefined) setTotalCustomerCount(json.total);
        } else {
          const customersData = await getCustomers();
          setCustomers([defaultCustomer, ...customersData]);
        }
      } catch {
        const customersData = await getCustomers();
        setCustomers([defaultCustomer, ...customersData]);
      }

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
        handlePriceTierChange(selectedCustomer.priceTier || 'Normal', true); // Update prices silently
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
    const normalized = normalizeTierName(newTier);
    setActivePriceTier(normalized);
    if (cart.length > 0) {
      const updatedCart = cart.map(item => {
        const fromItemPrices = getPriceFromPricesList(item.prices, normalized);
        if (fromItemPrices !== null) {
          return { ...item, price: fromItemPrices };
        }
        const product = products.find(p => p.codes.some(c => c.value === item.sku));
        if (product) {
          const newPrice = getProductPriceForTier(product, normalized);
          return { ...item, price: newPrice, prices: product.prices };
        }
        return item;
      });
      setCart(updatedCart);
      if (!silent) {
        toast({
            title: "Tarifas Actualizadas",
            description: `Los precios del carrito se han actualizado a la tarifa '${normalized}'.`,
        });
      }
    }
    setPriceTierDialogOpen(false);
  };

  // Búsqueda en tiempo real contra la base de datos completa (9,479 productos)
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchTerm.trim().length >= 1) {
        const { getProducts } = await import('@/lib/servicios');
        const searchResults = await getProducts(searchTerm.trim());
        setProducts(prev => {
          const map = new Map(prev.map(p => [p.id, p]));
          searchResults.forEach(p => map.set(p.id, p));
          return Array.from(map.values());
        });
      }
    }, 180);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Búsqueda en tiempo real contra la base de datos completa (28,773 clientes)
  useEffect(() => {
    const query = customerSearch.trim();
    if (!query) {
      setIsSearchingCustomer(false);
      return;
    }

    setIsSearchingCustomer(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=100`);
        if (res.ok) {
          const json = await res.json();
          const searchResults: Customer[] = json.items || [];
          setCustomers(prev => {
            const map = new Map<string, Customer>();
            map.set(defaultCustomer.id, defaultCustomer);
            if (selectedCustomerId && selectedCustomerId !== defaultCustomer.id) {
              const current = prev.find(c => c.id === selectedCustomerId);
              if (current) map.set(current.id, current);
            }
            searchResults.forEach(c => map.set(c.id, c));
            return Array.from(map.values());
          });
          if (json.total !== undefined) {
            setTotalCustomerCount(json.total);
          }
        }
      } catch (err) {
        console.error('Error al buscar clientes:', err);
      } finally {
        setIsSearchingCustomer(false);
      }
    }, 150);

    return () => clearTimeout(handler);
  }, [customerSearch, selectedCustomerId]);

  const handleLoadMoreCustomers = async () => {
    if (isLoadingMoreCustomers) return;
    setIsLoadingMoreCustomers(true);
    try {
      const nextOffset = customerOffset;
      const res = await fetch(`/api/customers?search=${encodeURIComponent(customerSearch.trim())}&limit=100&offset=${nextOffset}`);
      if (res.ok) {
        const json = await res.json();
        const newItems: Customer[] = json.items || [];
        setCustomers(prev => {
          const map = new Map(prev.map(c => [c.id, c]));
          newItems.forEach(c => map.set(c.id, c));
          return Array.from(map.values());
        });
        setCustomerOffset(nextOffset + 100);
        if (json.total !== undefined) setTotalCustomerCount(json.total);
      }
    } catch (err) {
      console.error('Error al cargar más clientes:', err);
    } finally {
      setIsLoadingMoreCustomers(false);
    }
  };

  useEffect(() => {
    async function loadCustomerHistory() {
      if (historyDialogOpen && selectedCustomerId && selectedCustomerId !== '0') {
        setLoadingHistory(true);
        try {
          const res = await fetch(`/api/customers/${encodeURIComponent(selectedCustomerId)}`);
          if (res.ok) {
            const customerDetail: Customer = await res.json();
            setCustomerPurchases(customerDetail.purchaseHistory || []);
            setCustomers(prev => prev.map(c => c.id === selectedCustomerId ? { ...c, ...customerDetail } : c));
          }
        } catch (err) {
          console.error('Error loading customer history:', err);
        } finally {
          setLoadingHistory(false);
        }
      }
    }
    loadCustomerHistory();
  }, [historyDialogOpen, selectedCustomerId]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    // REGLA 1: Cuando NO se haya buscado ningún producto, mostrar los productos más vendidos
    if (!term) {
      return [...products].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    }

    // REGLA 2: Al buscar, filtrar coincidencias por nombre, SKU o código de barras
    const tokens = term.split(/\s+/).filter(Boolean);
    const matches = products.filter(p => {
      const name = p.name.toLowerCase();
      const sku = (p.codes.find(c => c.type === 'SKU')?.value || '').toLowerCase();
      const barcode = (p.codes.find(c => c.type === 'EAN')?.value || '').toLowerCase();
      const text = `${name} ${sku} ${barcode}`;
      return tokens.every(token => text.includes(token));
    });

    // Clasificar en los 3 niveles de prioridad solicitados:
    // 1. Primero: Productos que tienen existencia en la sucursal/bodega seleccionada actual
    // 2. Segundo: Productos con existencia en otras sucursales/bodegas
    // 3. Por último: Productos sin existencia en ninguna bodega
    const getStockTier = (p: Product): number => {
      if (p.isService) return 1;

      const currentWhStock = (p.stock.find(s => s.warehouseId.toString() === selectedWarehouseId)?.quantity || 0) - (p.reservedStock || 0);
      if (currentWhStock > 0) return 1;

      const otherWhStock = p.stock
        .filter(s => s.warehouseId.toString() !== selectedWarehouseId)
        .reduce((sum, s) => sum + s.quantity, 0);
      if (otherWhStock > 0) return 2;

      return 3;
    };

    return matches.sort((a, b) => {
      const tierA = getStockTier(a);
      const tierB = getStockTier(b);
      if (tierA !== tierB) {
        return tierA - tierB; // 1 antes que 2, y 2 antes que 3
      }

      // Dentro del mismo nivel de existencia, los más vendidos primero:
      const salesDiff = (b.salesCount || 0) - (a.salesCount || 0);
      if (salesDiff !== 0) return salesDiff;

      return a.name.localeCompare(b.name);
    });
  }, [products, searchTerm, selectedWarehouseId]);

  const filteredCustomersForSearch = useMemo(() => {
    return customers.filter(c => c.id !== '0');
  }, [customers]);

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

    const price = getProductPriceForTier(product, activePriceTier);

    if (existingItemInCart) {
        setCart(cart.map(item => item.sku === sku && item.warehouseId === selectedWarehouseId ? { ...item, qty: finalQuantity, price, prices: product.prices } : item));
    } else {
        const newItem: CartItem = { 
            sku, 
            name: product.name, 
            qty: addedQty,
            qtyDelivered: 0, 
            price, 
            warehouseId: selectedWarehouseId,
            warehouseName: warehouse.name,
            prices: product.prices,
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
    const resumedCart: CartItem[] = (sale.cart || []).map((item: any) => ({
        ...item,
        warehouseId: item.warehouseId || selectedWarehouseId,
        warehouseName: item.warehouseName || (warehouses.find(w => w.id.toString() === (item.warehouseId || selectedWarehouseId))?.name || 'Almacén'),
    }));
    setCart(resumedCart);
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
    const price = getProductPriceForTier(product, activePriceTier);

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
  const catalogCard = (
    <Card className="flex flex-col h-full m-0 rounded-xl lg:rounded-r-none border border-border/60 lg:border-0 lg:border-r">
              <div className="p-3 sm:p-4 border-b">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <Input ref={productSearchRef} placeholder="Buscar producto por nombre o SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full sm:flex-grow min-w-0 h-9 text-xs sm:text-sm"/>
                     <div className="flex items-center gap-1.5 shrink-0 justify-between sm:justify-end">
                        <Dialog open={isNewProductModalOpen} onOpenChange={setIsNewProductModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 text-xs px-2.5"><PackagePlus className="mr-1.5 h-3.5 w-3.5" /> <span className="hidden sm:inline">Añadir </span>Producto</Button>
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
                                <Button variant="outline" size="sm" className="h-8 text-xs px-2.5"><FilePlus className="mr-1.5 h-3.5 w-3.5" /> <span className="hidden sm:inline">Añadir </span>Línea</Button>
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
                        <div className="flex items-center gap-1 rounded-md bg-muted p-0.5">
                            <Button variant={productViewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => handleSetProductViewMode('grid')}>
                                <LayoutGrid className="h-3.5 w-3.5"/>
                            </Button>
                             <Button variant={productViewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => handleSetProductViewMode('list')}>
                                <List className="h-3.5 w-3.5"/>
                            </Button>
                        </div>
                    </div>
                 </div>
                 {/* Indicador de orden del catálogo */}
                 <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] pt-2 text-muted-foreground">
                   {!searchTerm.trim() ? (
                     <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                       <Flame className="h-3 w-3" />
                       Catálogo: Productos más vendidos
                     </span>
                   ) : (
                     <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300 bg-muted/60 px-2 py-0.5 rounded-full text-[10.5px]">
                       Resultados: 1º En bodega • 2º Otras sucursales • 3º Sin stock
                     </span>
                   )}
                   <span className="font-mono text-[10.5px] text-muted-foreground/80">
                     {filteredProducts.length} artículo{filteredProducts.length === 1 ? '' : 's'}
                   </span>
                 </div>
              </div>
              {productViewMode === 'grid' ? (
                <ScrollArea className="flex-grow">
                  <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {filteredProducts.map(product => {
                        const stockInSelectedWarehouse = product.stock.find(s => s.warehouseId.toString() === selectedWarehouseId)?.quantity || 0;
                        const availableForSale = stockInSelectedWarehouse - (product.reservedStock || 0);
                        const stockInOtherWarehouses = product.stock.filter(s => s.warehouseId.toString() !== selectedWarehouseId).reduce((sum, s) => sum + s.quantity, 0);
                        const hasStock = product.isService || availableForSale > 0;

                        return (
                          <Card
                            key={product.id} 
                            onClick={() => handleAddToCart(product)} 
                            className={cn(
                              "p-3 flex flex-col justify-between transition-all group rounded-2xl border-border/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)]",
                              "cursor-pointer hover:shadow-md hover:border-primary",
                              !hasStock && (stockInOtherWarehouses > 0 ? "opacity-80 border-amber-500/30" : "opacity-45")
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
                            <div className="mt-auto pt-2 border-t space-y-1.5">
                              <div className="flex justify-between items-end">
                                <div className="text-xs">
                                  <div className="font-mono text-muted-foreground">{product.codes.find(c => c.type === 'SKU')?.value}</div>
                                  {product.isService ? (
                                    <div className="font-semibold text-sky-600">Servicio</div>
                                  ) : availableForSale > 0 ? (
                                    <>
                                      <div className="font-semibold flex items-center gap-1.5 text-foreground">
                                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getWarehouseConfig(selectedWarehouseId).dot)} />
                                        <span>Disp: {availableForSale}</span>
                                      </div>
                                      {(product.reservedStock || 0) > 0 && <div className="text-amber-600">Res: {product.reservedStock}</div>}
                                    </>
                                  ) : stockInOtherWarehouses > 0 ? (
                                    <div className="font-medium flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[10.5px]" title={`Sin existencia en esta bodega. Disponible en otras sucursales: ${stockInOtherWarehouses}`}>
                                      <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-500" />
                                      <span>Otras suc: {stockInOtherWarehouses}</span>
                                    </div>
                                  ) : (
                                    <div className="font-semibold flex items-center gap-1 text-destructive text-[10.5px]">
                                      <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-destructive" />
                                      <span>Agotado</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-bold text-primary">Q{getProductPriceForTier(product, activePriceTier).toFixed(2)}</span>
                                </div>
                              </div>
                              {product.prices && product.prices.length > 0 && (
                                <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-border/40 text-center" title="Precios por tarifa: Normal / Mayorista / Especial">
                                  {[
                                    { key: 'Normal', label: 'Normal' },
                                    { key: 'Mayorista', label: 'Mayorista' },
                                    { key: 'Especial', label: 'Especial' },
                                  ].map(({ key, label }) => {
                                    const val = getProductPriceForTier(product, key);
                                    const isActive = normalizeTierName(activePriceTier) === key;
                                    return (
                                      <div
                                        key={key}
                                        className={cn(
                                          "py-0.5 px-0.5 rounded transition-all flex flex-col items-center justify-center leading-none",
                                          isActive 
                                            ? "font-bold text-primary bg-primary/10 border border-primary/30 dark:bg-primary/20 shadow-xs" 
                                            : "text-muted-foreground/80 bg-muted/40"
                                        )}
                                      >
                                        <span className="text-[7.5px] uppercase tracking-wider opacity-70 font-semibold mb-0.5">
                                          {label === 'Normal' ? 'Norm' : label === 'Mayorista' ? 'Mayo' : 'Esp'}
                                        </span>
                                        <span className="text-[9.5px] font-mono font-semibold whitespace-nowrap">
                                          Q{val.toFixed(2)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex-grow overflow-y-auto min-h-0">
                  <Table containerClassName="overflow-visible">
                    <TableHeader className="sticky top-0 z-20 bg-card">
                      <TableRow className="hover:bg-transparent border-b">
                        <TableHead className="sticky top-0 z-20 bg-card font-semibold text-foreground shadow-[0_1px_0_0_hsl(var(--border))]">Producto</TableHead>
                        <TableHead className="sticky top-0 z-20 bg-card font-semibold text-foreground shadow-[0_1px_0_0_hsl(var(--border))]">SKU</TableHead>
                        <TableHead className="sticky top-0 z-20 bg-card font-semibold text-foreground shadow-[0_1px_0_0_hsl(var(--border))]">Disp.</TableHead>
                        <TableHead className="sticky top-0 z-20 bg-card font-semibold text-foreground shadow-[0_1px_0_0_hsl(var(--border))]">Otras Suc.</TableHead>
                        <TableHead className="sticky top-0 z-20 bg-card font-semibold text-foreground text-right shadow-[0_1px_0_0_hsl(var(--border))]">Precio ({normalizeTierName(activePriceTier)})</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map(product => {
                        const stockInSelectedWarehouse = product.stock.find(s => s.warehouseId.toString() === selectedWarehouseId)?.quantity || 0;
                        const availableForSale = stockInSelectedWarehouse - (product.reservedStock || 0);
                        const price = getProductPriceForTier(product, activePriceTier);
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
                                    <span className={cn("inline-flex items-center gap-1 font-semibold", stockInOtherWarehouses > 0 ? "text-primary cursor-help" : "text-muted-foreground")}>
                                      {stockInOtherWarehouses > 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />}
                                      <span>{product.isService ? 'N/A' : stockInOtherWarehouses}</span>
                                    </span>
                                  </TooltipTrigger>
                                  {product.stock.filter(s => s.warehouseId.toString() !== selectedWarehouseId && s.quantity > 0).length > 0 && (
                                    <TooltipContent className="p-2 space-y-1.5 min-w-[190px]">
                                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                        Existencias en otras bodegas:
                                      </p>
                                      {product.stock
                                        .filter(s => s.warehouseId.toString() !== selectedWarehouseId && s.quantity > 0)
                                        .map(s => {
                                          const conf = getWarehouseConfig(s.warehouseId || s.warehouseName);
                                          const SIcon = conf.Icon;
                                          return (
                                            <div key={s.warehouseId} className="flex items-center justify-between gap-3 text-xs">
                                              <div className="flex items-center gap-1.5">
                                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", conf.dot)} />
                                                <SIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                                <span className="font-medium">{conf.shortName}:</span>
                                              </div>
                                              <span className="font-bold text-foreground">{s.quantity}</span>
                                            </div>
                                          );
                                        })}
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-primary text-sm">Q{price.toFixed(2)}</span>
                                {product.prices && product.prices.length > 0 && (
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-mono">
                                    {[
                                      { key: 'Normal', label: 'Normal' },
                                      { key: 'Mayorista', label: 'May.' },
                                      { key: 'Especial', label: 'Esp.' },
                                    ].map(({ key, label }) => {
                                      const val = getProductPriceForTier(product, key);
                                      const isActive = normalizeTierName(activePriceTier) === key;
                                      return (
                                        <span
                                          key={key}
                                          className={cn(
                                            "px-1 rounded text-[9.5px]",
                                            isActive ? "font-bold text-primary bg-primary/10" : "opacity-60"
                                          )}
                                        >
                                          {label}: Q{val.toFixed(2)}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
    </Card>
  );

  const cartCard = (
    <Card className="h-full flex flex-col rounded-xl lg:rounded-l-none border border-border/60 lg:border-0">
              <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-grow min-w-0">
                        <Users className="h-4 w-4 shrink-0 text-muted-foreground"/>
                        <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={customerPopoverOpen} className="w-full justify-between min-w-0 h-8 sm:h-9 px-2">
                                    <span className="truncate text-left font-medium text-xs sm:text-sm max-w-[110px] sm:max-w-none">{selectedCustomer.name}</span>
                                    <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[92vw] sm:w-[380px] p-0" align="end">
                                <Command shouldFilter={false}>
                                    <CommandInput 
                                        placeholder="Buscar por nombre, NIT, teléfono..." 
                                        value={customerSearch}
                                        onValueChange={setCustomerSearch} 
                                    />
                                    <div className="px-3 py-1.5 bg-muted/40 border-b flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                                        <span>
                                            {customerSearch.trim()
                                                ? (isSearchingCustomer ? "Buscando en 28,773 clientes..." : `${filteredCustomersForSearch.length} coincidencias`)
                                                : `Mostrando ${filteredCustomersForSearch.length} de ${totalCustomerCount.toLocaleString()} clientes`}
                                        </span>
                                        {isSearchingCustomer ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                        ) : (
                                            <span className="text-[10px] text-slate-400 font-mono">Total: {totalCustomerCount.toLocaleString()}</span>
                                        )}
                                    </div>
                                    <CommandList className="max-h-[340px] overflow-y-auto">
                                        <CommandEmpty>
                                            {isSearchingCustomer ? (
                                                <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                                    Buscando en la base de datos...
                                                </div>
                                            ) : (
                                                <div className="py-6 text-center text-xs text-muted-foreground">
                                                    No se encontró ningún cliente con ese criterio.
                                                </div>
                                            )}
                                        </CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem 
                                                key={defaultCustomer.id} 
                                                onSelect={() => { setSelectedCustomerId(defaultCustomer.id); setCustomerPopoverOpen(false); }}
                                                className="border-b mb-1 pb-2 cursor-pointer"
                                            >
                                                <div className="flex items-center w-full">
                                                    <Check className={cn("mr-2 h-4 w-4", selectedCustomerId === defaultCustomer.id ? "opacity-100" : "opacity-0")} />
                                                    <div className="flex-grow">
                                                        <span className="font-semibold text-primary">{defaultCustomer.name}</span>
                                                        <p className="text-[10px] text-muted-foreground">Venta rápida al mostrador</p>
                                                    </div>
                                                </div>
                                            </CommandItem>
                                            {filteredCustomersForSearch.map((c) => {
                                                const primaryPhone = c.phones.find(p => p.isPrimary)?.number || (c.phones.length > 0 ? c.phones[0].number : null);
                                                return (
                                                <CommandItem 
                                                    key={c.id} 
                                                    value={c.id} 
                                                    onSelect={() => { setSelectedCustomerId(c.id); setCustomerPopoverOpen(false); }}
                                                    className="cursor-pointer"
                                                >
                                                    <div className="flex items-start w-full">
                                                        <Check className={cn("mr-2 h-4 w-4 mt-1 shrink-0", selectedCustomerId === c.id ? "opacity-100" : "opacity-0")} />
                                                        <div className="flex-grow min-w-0">
                                                            <p className="font-medium text-sm truncate">{c.name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {primaryPhone ? `Tel: ${primaryPhone}` : 'Sin teléfono'} • NIT: <span className="font-mono">{c.nit || 'C/F'}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </CommandItem>
                                                )
                                            })}

                                            {!customerSearch.trim() && filteredCustomersForSearch.length < totalCustomerCount && (
                                                <div className="p-2 border-t mt-1">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={isLoadingMoreCustomers}
                                                        onClick={handleLoadMoreCustomers}
                                                        className="w-full text-xs font-semibold gap-1.5 h-8"
                                                    >
                                                        {isLoadingMoreCustomers ? (
                                                            <>
                                                                <Loader2 className="h-3 w-3 animate-spin" /> Cargando más clientes...
                                                            </>
                                                        ) : (
                                                            <>Cargar 100 clientes más ({filteredCustomersForSearch.length} de {totalCustomerCount.toLocaleString()})</>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                        </CommandGroup>
                                    </CommandList>
                                    <div className="p-2 border-t bg-muted/20 text-center">
                                        <p className="text-[10px] text-muted-foreground">
                                            Escribe en el buscador para localizar al instante a cualquiera de los <strong className="text-foreground">{totalCustomerCount.toLocaleString()}</strong> clientes por nombre, NIT o teléfono.
                                        </p>
                                    </div>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex items-center shrink-0 gap-0.5">
                        <TooltipProvider>
                            <Dialog open={isCustomerReservationsOpen} onOpenChange={setIsCustomerReservationsOpen}>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={selectedCustomerId === '0' || customerReservations.length === 0} className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 relative">
                                            <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4"/>
                                            {customerReservations.length > 0 && (
                                                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold">{customerReservations.length}</span>
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
                                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" asChild>
                                        <Link href={`/customers/new?redirect=/tpv`}><UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4"/></Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Añadir nuevo cliente</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" asChild disabled={selectedCustomerId === '0'}>
                                        <Link href={`/customers/${selectedCustomerId}/edit?redirect=/tpv`}><Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4"/></Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Editar cliente</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" onClick={() => setHistoryDialogOpen(true)} disabled={selectedCustomerId === '0'}>
                                        <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                             <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                                 <span className="text-muted-foreground font-medium">Tarifa: <strong className="text-primary font-bold">{normalizeTierName(activePriceTier)}</strong></span>
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
                                        {[
                                            { name: "Normal", title: "Tarifa Normal", desc: "Precio regular de mostrador (consumidor final)" },
                                            { name: "Mayorista", title: "Tarifa Mayorista", desc: "Precio con descuento para ventas al por mayor" },
                                            { name: "Especial", title: "Tarifa Especial", desc: "Tarifa preferencial para clientes frecuentes y proyectos" },
                                        ].map(tier => {
                                            const isSelected = normalizeTierName(activePriceTier) === tier.name;
                                            return (
                                                <CommandItem 
                                                    key={tier.name} 
                                                    onSelect={() => handlePriceTierChange(tier.name)}
                                                    className={cn("cursor-pointer py-2.5 px-3 flex items-center justify-between", isSelected && "bg-primary/5")}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Check className={cn("h-4 w-4 text-primary", isSelected ? "opacity-100" : "opacity-0")} />
                                                        <div className="flex flex-col text-left">
                                                            <span className={cn("text-sm font-semibold", isSelected && "text-primary font-bold")}>{tier.title}</span>
                                                            <span className="text-xs text-muted-foreground">{tier.desc}</span>
                                                        </div>
                                                    </div>
                                                    {cart.length > 0 && (
                                                        <span className="text-xs font-mono font-bold text-muted-foreground">
                                                            Total: Q{cart.reduce((sum, item) => {
                                                                const pVal = getPriceFromPricesList(item.prices, tier.name) || item.price;
                                                                return sum + (pVal * item.qty);
                                                            }, 0).toFixed(2)}
                                                        </span>
                                                    )}
                                                </CommandItem>
                                            );
                                        })}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">Cerrar</Button>
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
              <CardContent className="flex-grow overflow-y-auto p-2 sm:p-4">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="py-2 px-1 sm:px-2">Producto</TableHead>
                            <TableHead className="w-[75px] sm:w-[90px] py-2 px-1 text-center">Cant.</TableHead>
                            <TableHead className="w-[70px] sm:w-[85px] py-2 px-1 text-right">Subtotal</TableHead>
                            <TableHead className="w-[28px] py-2 px-1 text-center"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {cart.length > 0 ? cart.map(item => (
                            <TableRow key={`${item.sku}-${item.warehouseId}`}>
                                <TableCell className="font-medium text-xs leading-tight py-2 px-1 sm:px-2 min-w-0">
                                    <span className="line-clamp-2">{item.name}</span>
                                    <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] mt-0.5 flex-wrap">
                                        <span className="font-bold text-foreground">Q{item.price.toFixed(2)}</span>
                                        <Button variant="ghost" size="icon" className="h-4 w-4 shrink-0 text-muted-foreground hover:text-foreground" onClick={() => handleOpenCalculator(item.sku, item.warehouseId, 'price', item.price)}>
                                            <Calculator className="h-2.5 w-2.5" />
                                        </Button>
                                        {item.prices && item.prices.length > 1 && (
                                            <span className="text-[9.5px] font-mono text-muted-foreground/90 bg-muted/60 dark:bg-muted/30 px-1.5 py-0.5 rounded border border-border/60">
                                                N: Q{getPriceFromPricesList(item.prices, 'Normal')?.toFixed(2)} • M: Q{getPriceFromPricesList(item.prices, 'Mayorista')?.toFixed(2)} • E: Q{getPriceFromPricesList(item.prices, 'Especial')?.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                    <WarehouseBadge warehouseId={item.warehouseId} warehouseName={item.warehouseName} className="mt-1" />
                                </TableCell>
                                <TableCell className="py-2 px-1 text-center">
                                    <div className="flex items-center justify-center gap-0.5">
                                    <Input
                                        ref={el => { cartItemRefs.current.set(`${item.sku}-${item.warehouseId}`, el); }} 
                                        type="number"
                                        min="1"
                                        value={item.qty} 
                                        onChange={e => handleUpdateCartItem(item.sku, item.warehouseId, 'qty', parseInt(e.target.value, 10))} 
                                        onKeyDown={handleCartQtyKeyDown}
                                        className="h-7 w-11 sm:w-14 text-center text-xs px-0.5"/>
                                     <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => handleOpenCalculator(item.sku, item.warehouseId, 'qty', item.qty)}>
                                        <Calculator className="h-2.5 w-2.5" />
                                    </Button>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs py-2 px-1 whitespace-nowrap">Q{(item.price * item.qty).toFixed(2)}</TableCell>
                                <TableCell className="py-2 px-1 text-center">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleUpdateCartItem(item.sku, item.warehouseId, 'qty', 0)}><Trash2 className="h-3.5 w-3.5"/></Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <span>Carrito vacío</span>
                                  <Button variant="outline" size="sm" onClick={() => setMobileTab('products')} className="text-xs h-8 gap-1.5 lg:hidden">
                                    <Package className="h-3.5 w-3.5" /> Ir al Catálogo
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 border-t pt-3 p-3 sm:p-4">
                 <div className="w-full flex justify-between items-center text-lg font-bold">
                    <span>TOTAL</span>
                    <span className="font-mono">Q{cartTotal.toFixed(2)}</span>
                 </div>
                 <div className="w-full flex flex-col gap-2 pt-1">
                    <Dialog open={isFinishSaleDialogOpen} onOpenChange={setIsFinishSaleDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full h-10 font-bold text-sm shadow-sm">
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
                    <div className="grid grid-cols-3 gap-1.5 w-full">
                      <Button variant="outline" size="sm" onClick={handleParkSale} className="px-1 text-xs truncate h-8.5 font-medium justify-center" title="Aparcar venta">
                        <FolderClock className="mr-1 h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Aparcar</span>
                      </Button>
                      <Button variant="secondary" size="sm" onClick={handleCreateOrder} className="px-1 text-xs truncate h-8.5 font-medium justify-center" title="Pedido a domicilio">
                        <Truck className="mr-1 h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Domicilio</span>
                      </Button>
                      <Button variant="secondary" size="sm" onClick={handleSaveAsQuote} className="px-1 text-xs truncate h-8.5 font-medium justify-center" title="Guardar como presupuesto">
                        <FilePlus className="mr-1 h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Presupuesto</span>
                      </Button>
                    </div>
                 </div>
              </CardFooter>
    </Card>
  );



  const tpvTopActionsContent = (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Selector de Sucursal Colapsado */}
        {(() => {
          const currentBranch = branches.find(b => b.id.toString() === selectedBranchId);
          const brConfig = getBranchConfig(currentBranch?.id || currentBranch?.name);
          const BrIcon = brConfig.Icon;
          return (
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SelectTrigger className="h-8 px-2 rounded-xl border border-border/70 bg-card hover:bg-muted/60 text-foreground shadow-none transition-all duration-200 flex items-center gap-1.5 group cursor-pointer focus:ring-1 focus:ring-primary/40 [&>svg:last-child]:hidden">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", brConfig.dot)} />
                    <BrIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                    <span className="hidden group-hover:inline-block max-w-0 group-hover:max-w-[130px] overflow-hidden whitespace-nowrap transition-all duration-200 text-xs font-semibold">
                      {brConfig.shortName}
                    </span>
                  </SelectTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <span className="font-semibold">Sucursal:</span> {currentBranch?.name || brConfig.shortName}
                </TooltipContent>
              </Tooltip>
              <SelectContent>
                {branches.map(b => {
                  const bConf = getBranchConfig(b.id || b.name);
                  const BIcon = bConf.Icon;
                  return (
                    <SelectItem key={b.id} value={b.id.toString()} className="cursor-pointer">
                      <div className="flex items-center gap-2 py-0.5">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", bConf.dot)} />
                        <BIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-xs">{bConf.shortName}</span>
                          <span className="text-[10px] text-muted-foreground">{b.name}</span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          );
        })()}

        {/* Selector de Bodega Colapsado */}
        {(() => {
          const currentWh = filteredWarehouses.find(w => w.id.toString() === selectedWarehouseId);
          const whConfig = getWarehouseConfig(currentWh?.id || currentWh?.name);
          const WhIcon = whConfig.Icon;
          return (
            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId} disabled={!selectedBranchId}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SelectTrigger className="h-8 px-2 rounded-xl border border-border/70 bg-card hover:bg-muted/60 text-foreground shadow-none transition-all duration-200 flex items-center gap-1.5 group cursor-pointer focus:ring-1 focus:ring-primary/40 [&>svg:last-child]:hidden">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", whConfig.dot)} />
                    <WhIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                    <span className="hidden group-hover:inline-block max-w-0 group-hover:max-w-[150px] overflow-hidden whitespace-nowrap transition-all duration-200 text-xs font-semibold">
                      {whConfig.code}: {whConfig.shortName}
                    </span>
                  </SelectTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <span className="font-semibold">Bodega:</span> {currentWh?.name || whConfig.shortName}
                </TooltipContent>
              </Tooltip>
              <SelectContent>
                {filteredWarehouses.map(w => {
                  const wConf = getWarehouseConfig(w.id || w.name);
                  const WIcon = wConf.Icon;
                  return (
                    <SelectItem key={w.id} value={w.id.toString()} className="cursor-pointer">
                      <div className="flex items-center gap-2 py-0.5">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", wConf.dot)} />
                        <WIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="flex flex-col text-left">
                          <div className="flex items-center gap-1.5">
                            <span className={cn("px-1 py-0.2 rounded text-[9px] font-bold border", wConf.badgeClass)}>
                              {wConf.code}
                            </span>
                            <span className="font-semibold text-xs">{wConf.shortName}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{w.name}</span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          );
        })()}

        {/* Ventas Aparcadas Colapsado */}
        <Dialog open={parkedSalesDialogOpen} onOpenChange={setParkedSalesDialogOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 rounded-xl border border-border/70 bg-card hover:bg-muted/60 text-foreground shadow-none transition-all duration-200 flex items-center gap-1.5 group cursor-pointer"
                >
                  <FolderClock className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                  {parkedSales.length > 0 && (
                    <span className="flex h-3.5 min-w-[14px] px-1 items-center justify-center rounded-full bg-amber-500 text-white text-[9px] font-bold">
                      {parkedSales.length}
                    </span>
                  )}
                  <span className="hidden group-hover:inline-block max-w-0 group-hover:max-w-[110px] overflow-hidden whitespace-nowrap transition-all duration-200 text-xs font-semibold">
                    Aparcadas {parkedSales.length > 0 ? `(${parkedSales.length})` : ''}
                  </span>
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <span className="font-semibold">Ventas Aparcadas:</span> {parkedSales.length} guardadas
            </TooltipContent>
          </Tooltip>
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

        {/* Terminal Colapsado */}
        <Select value={selectedTerminalId} onValueChange={setSelectedTerminalId} disabled={!selectedBranchId}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger className="h-8 px-2 rounded-xl border border-border/70 bg-card hover:bg-muted/60 text-foreground shadow-none transition-all duration-200 flex items-center gap-1.5 group cursor-pointer focus:ring-1 focus:ring-primary/40 [&>svg:last-child]:hidden">
                <Terminal className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                <span className="hidden group-hover:inline-block max-w-0 group-hover:max-w-[120px] overflow-hidden whitespace-nowrap transition-all duration-200 text-xs font-semibold">
                  {filteredTerminals.find(t => t.id.toString() === selectedTerminalId)?.name || 'Terminal'}
                </span>
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <span className="font-semibold">Terminal:</span> {filteredTerminals.find(t => t.id.toString() === selectedTerminalId)?.name || 'Terminal Principal'}
            </TooltipContent>
          </Tooltip>
          <SelectContent>
            {filteredTerminals.map(t => (
              <SelectItem key={t.id} value={t.id.toString()} className="cursor-pointer">
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </TooltipProvider>
  );

  return (
    <>
    {portalNode && createPortal(tpvTopActionsContent, portalNode)}
    <div className="flex flex-col h-full min-h-0">
      <main className="flex-grow min-h-0 flex flex-col">
        {isCompactScreen ? (
          <div className="flex flex-col h-full gap-2.5">
            {/* Selector de pestañas móvil (< lg) */}
            <div className="flex items-center p-1 bg-muted/80 rounded-xl gap-1 shrink-0 border">
              <button
                type="button"
                onClick={() => setMobileTab('products')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all",
                  mobileTab === 'products' ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Package className="h-4 w-4" />
                <span>Catálogo ({filteredProducts.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('cart')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all relative",
                  mobileTab === 'cart' ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Carrito ({cart.length > 0 ? `${cart.length} • Q${cartTotal.toFixed(2)}` : 'Vacío'})</span>
                {cart.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            </div>

            {/* Vista activa en móvil */}
            <div className="flex-grow min-h-0 relative">
              {mobileTab === 'products' ? (
                <>
                  <div className={cn("h-full", cart.length > 0 && "pb-16")}>
                    {catalogCard}
                  </div>
                  {cart.length > 0 && (
                    <div className="fixed bottom-3 left-3 right-3 z-30">
                      <Button
                        onClick={() => setMobileTab('cart')}
                        className="w-full h-12 shadow-xl rounded-xl flex items-center justify-between px-4 bg-primary text-primary-foreground font-semibold"
                      >
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5" />
                          <span>{cart.length} {cart.length === 1 ? 'producto' : 'productos'} ({cart.reduce((sum, i) => sum + i.qty, 0)} uds)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold">Q{cartTotal.toFixed(2)}</span>
                          <span className="text-xs bg-primary-foreground/20 px-2.5 py-1 rounded-md">Ver Carrito →</span>
                        </div>
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full">
                  {cartCard}
                </div>
              )}
            </div>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={66}>
              {catalogCard}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={34}>
              {cartCard}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </main>
    </div>
      
       <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Historial de Compras: {selectedCustomer.name}
            </DialogTitle>
            <DialogDescription>
              Facturas históricas y productos comprados por este cliente en Diferacsa.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {loadingHistory ? (
              <div className="h-[280px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm">Consultando facturas históricas en la base de datos...</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-2">
                {customerPurchases.length > 0 ? (
                  <Accordion type="single" collapsible className="space-y-2">
                    {customerPurchases.map((purchase) => (
                      <AccordionItem 
                        value={purchase.invoice} 
                        key={purchase.invoice}
                        className="border rounded-xl px-3 py-1 bg-card/60 shadow-xs"
                      >
                        <AccordionTrigger className="text-sm hover:no-underline py-2.5">
                          <div className="flex items-center justify-between w-full pr-3 text-left">
                            <div>
                              <span className="font-bold text-foreground">Factura #{purchase.invoice}</span>
                              <span className="text-xs text-muted-foreground ml-2">({purchase.date})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={purchase.status === 'Pagado' ? 'secondary' : 'outline'} className="text-[10px]">
                                {purchase.status || 'Pagado'}
                              </Badge>
                              <span className="font-bold text-primary font-mono">{purchase.total}</span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-1 pb-3">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-b text-[11px] text-muted-foreground">
                                <TableHead className="h-7 py-0">Producto</TableHead>
                                <TableHead className="h-7 py-0 text-center w-20">Cant.</TableHead>
                                <TableHead className="h-7 py-0 text-right w-24">Precio</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {purchase.products.map((p, i) => (
                                <TableRow key={i} className="border-b/50">
                                  <TableCell className="py-1.5 text-xs font-medium">
                                    <p className="leading-tight">{p.name}</p>
                                    <p className="text-[10px] font-mono text-muted-foreground">{p.sku}</p>
                                  </TableCell>
                                  <TableCell className="py-1.5 text-xs text-center font-bold">{p.qty}</TableCell>
                                  <TableCell className="py-1.5 text-xs text-right font-mono">Q{Number(p.price || 0).toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <p className="font-semibold text-sm">Sin historial de compras registrado.</p>
                    <p className="text-xs mt-1">Este cliente no registra facturas previas en la base de datos.</p>
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <span className="text-xs text-muted-foreground">
              {customerPurchases.length > 0 && `${customerPurchases.length} factura(s) encontrada(s)`}
            </span>
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
                            <TableCell className="text-sm py-2">
                              <WarehouseBadge warehouseId={s.warehouseId} warehouseName={s.warehouseName} />
                            </TableCell>
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
    

