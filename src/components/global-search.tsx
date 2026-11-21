'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Calculator,
  Users,
  Archive,
  FileText,
  Receipt,
  Building2,
  Settings,
  Package,
  ClipboardList,
  Truck,
  HardHat,
  Banknote,
  Wrench,
  UserCog,
  DatabaseZap,
  Plus,
  ArrowRight,
  Loader2,
  LayoutGrid,
} from 'lucide-react';

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/product-data';
import type { Customer } from '@/lib/data';

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  keywords: string[];
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    title: 'Punto de Venta (TPV)',
    href: '/tpv',
    icon: Calculator,
    description: 'Cobro rápido en mostrador y gestión de tickets',
    keywords: ['tpv', 'pos', 'caja', 'vender', 'mostrador', 'cobrar', 'ventas'],
  },
  {
    title: 'Inventario & Stock',
    href: '/inventory',
    icon: Archive,
    description: 'Catálogo de 9,478 productos, existencias y precios',
    keywords: ['inventario', 'stock', 'productos', 'articulos', 'bodegas', 'precios', 'materiales'],
  },
  {
    title: 'Clientes',
    href: '/customers',
    icon: Users,
    description: 'Directorio de 28,773 clientes, crédito y saldos',
    keywords: ['clientes', 'contactos', 'personas', 'credito', 'saldos', 'nit'],
  },
  {
    title: 'Facturación',
    href: '/invoicing',
    icon: FileText,
    description: 'Facturas electrónicas DTE y documentos tributarios',
    keywords: ['facturacion', 'facturas', 'dte', 'fel', 'sat', 'tributaria'],
  },
  {
    title: 'Compras',
    href: '/purchases',
    icon: Receipt,
    description: 'Registro de compras, gastos y facturas recibidas',
    keywords: ['compras', 'gastos', 'proveedor', 'adquisiciones'],
  },
  {
    title: 'Proveedores',
    href: '/suppliers',
    icon: Building2,
    description: 'Gestión y catálogo de proveedores comerciales',
    keywords: ['proveedores', 'distribuidores', 'marcas', 'fabricantes'],
  },
  {
    title: 'Pedidos',
    href: '/orders',
    icon: Package,
    description: 'Control de pedidos de clientes y despachos',
    keywords: ['pedidos', 'ordenes', 'pedir', 'envios'],
  },
  {
    title: 'Presupuestos / Cotizaciones',
    href: '/quotes',
    icon: ClipboardList,
    description: 'Cotizaciones comerciales para clientes y proyectos',
    keywords: ['presupuestos', 'cotizaciones', 'cotizar', 'estimaciones'],
  },
  {
    title: 'Entregas',
    href: '/deliveries',
    icon: Truck,
    description: 'Despachos, rutas y control de entregas a domicilio',
    keywords: ['entregas', 'despachos', 'rutas', 'camion', 'flete'],
  },
  {
    title: 'Apartados y Encargos',
    href: '/reservations',
    icon: HardHat,
    description: 'Reservas de producto con anticipos',
    keywords: ['apartados', 'encargos', 'anticipos', 'reservas'],
  },
  {
    title: 'Caja y Turnos',
    href: '/cash-register',
    icon: Banknote,
    description: 'Apertura, arqueos, cortes y cierre de turnos',
    keywords: ['caja', 'cajero', 'arqueo', 'corte', 'efectivo', 'turno'],
  },
  {
    title: 'Taller / Reparaciones',
    href: '/repairs',
    icon: Wrench,
    description: 'Mantenimiento de herramientas y servicios de taller',
    keywords: ['taller', 'reparaciones', 'herramientas', 'mantenimiento'],
  },
  {
    title: 'Dashboard General',
    href: '/dashboard',
    icon: LayoutGrid,
    description: 'Indicadores globales de rendimiento, ventas y métricas',
    keywords: ['dashboard', 'inicio', 'resumen', 'metricas', 'graficos', 'dasbor'],
  },
  {
    title: 'Configuración del Sistema',
    href: '/settings',
    icon: Settings,
    description: 'Parámetros generales de la empresa, sucursales e impresoras',
    keywords: ['configuracion', 'ajustes', 'parametros', 'empresa', 'sucursales'],
  },
  {
    title: 'Usuarios y Permisos',
    href: '/settings/users',
    icon: UserCog,
    description: 'Roles, credenciales y control de accesos',
    keywords: ['usuarios', 'roles', 'permisos', 'seguridad', 'accesos'],
  },
  {
    title: 'Mantenimiento de Datos',
    href: '/settings/maintenance',
    icon: DatabaseZap,
    description: 'Copias de seguridad, sincronización y auditoría',
    keywords: ['mantenimiento', 'backup', 'base de datos', 'sql', 'copias'],
  },
];

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isMac, setIsMac] = React.useState(false);
  const router = useRouter();

  // Detectar plataforma para mostrar ⌘K o Ctrl+K
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent));
    }
  }, []);

  // Escuchar atajo global de teclado (Ctrl+K o ⌘K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Búsqueda en vivo con debounce cuando el usuario escribe
  React.useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setProducts([]);
      setCustomers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const [prodRes, custRes] = await Promise.all([
          fetch(`/api/products?search=${encodeURIComponent(trimmed)}&limit=6`, {
            signal: controller.signal,
          }),
          fetch(`/api/customers?search=${encodeURIComponent(trimmed)}&limit=5`, {
            signal: controller.signal,
          }),
        ]);

        if (prodRes.ok) {
          const prodJson = await prodRes.json();
          setProducts(prodJson.items || []);
        }

        if (custRes.ok) {
          const custJson = await custRes.json();
          setCustomers(custJson.items || []);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error en búsqueda global:', err);
        }
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  // Filtrar módulos del sistema por texto
  const filteredNavItems = React.useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      // Si está vacío, mostrar los módulos más comunes
      return NAVIGATION_ITEMS.slice(0, 6);
    }
    return NAVIGATION_ITEMS.filter((item) => {
      if (item.title.toLowerCase().includes(trimmed)) return true;
      if (item.description.toLowerCase().includes(trimmed)) return true;
      return item.keywords.some((k) => k.includes(trimmed));
    });
  }, [query]);

  return (
    <>
      {/* Botón cápsula disparador en el Header (Escritorio / Tablet) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "hidden sm:flex w-full items-center justify-between gap-2 px-3.5 h-8 text-xs rounded-full",
          "bg-[#F4F6F9] dark:bg-muted/50 text-muted-foreground hover:text-foreground",
          "border border-transparent hover:border-border/80 transition-all shadow-none",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 font-medium"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/90" />
          <span className="truncate text-muted-foreground/80">
            Buscar productos, clientes, módulos...
          </span>
        </div>
        <kbd className="hidden md:inline-flex items-center gap-0.5 pointer-events-none select-none rounded bg-muted/80 dark:bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground border border-border/60 shrink-0">
          {isMac ? '⌘K' : 'Ctrl K'}
        </kbd>
      </button>

      {/* Botón icono para móviles pequeños */}
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => setOpen(true)}
        className="sm:hidden h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0"
        title="Buscar (Ctrl+K)"
      >
        <Search className="h-4 w-4" />
      </Button>

      {/* Diálogo del buscador global (Command Dialog) */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="flex items-center border-b px-3 bg-card" cmdk-input-wrapper="">
          <Search className="mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe un producto (SKU, nombre), cliente o módulo..."
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
            autoFocus
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground ml-2" />}
        </div>

        <CommandList className="max-h-[380px] overflow-y-auto p-2">
          {/* Mensaje cuando no hay resultados */}
          {query.trim() && !loading && products.length === 0 && customers.length === 0 && filteredNavItems.length === 0 && (
            <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
              No se encontraron coincidencias para <strong className="text-foreground">"{query}"</strong>.
            </CommandEmpty>
          )}

          {/* Grupo: Acciones Rápidas (visible cuando query está vacío) */}
          {!query.trim() && (
            <CommandGroup heading="Acciones Frecuentes">
              <CommandItem
                onSelect={() => handleSelect('/tpv')}
                className="flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer hover:bg-accent"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Calculator className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-foreground block">Abrir Punto de Venta (TPV)</span>
                    <span className="text-[11px] text-muted-foreground">Iniciar una nueva venta en mostrador</span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect('/customers/new')}
                className="flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer hover:bg-accent"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-foreground block">Crear Nuevo Cliente</span>
                    <span className="text-[11px] text-muted-foreground">Registrar un cliente con NIT o C/F</span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect('/inventory')}
                className="flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer hover:bg-accent"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Archive className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-foreground block">Consultar Inventario Maestro</span>
                    <span className="text-[11px] text-muted-foreground">9,478 productos y 859,723 unidades en stock</span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </CommandItem>
            </CommandGroup>
          )}

          {/* Grupo: Productos coincidentes de la base de datos */}
          {products.length > 0 && (
            <CommandGroup heading={`Productos en Inventario (${products.length})`}>
              {products.map((prod) => {
                const sku = prod.codes.find((c) => c.type === 'SKU')?.value || prod.id;
                const totalStock = prod.stock.reduce((acc, s) => acc + s.quantity, 0);
                const normalPrice = prod.prices?.find((p) => p.tierName.toLowerCase().includes('normal'))?.price ?? prod.prices?.[0]?.price ?? 0;

                return (
                  <CommandItem
                    key={prod.id}
                    onSelect={() => handleSelect(`/inventory?search=${encodeURIComponent(sku)}`)}
                    className="flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer hover:bg-accent"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold text-[10px]">
                        📦
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-foreground block truncate">
                          {prod.name}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span className="font-mono bg-muted/60 px-1 py-0.2 rounded border border-border/40">
                            SKU: {sku}
                          </span>
                          <span>•</span>
                          <span className={cn(totalStock > 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-500 font-medium')}>
                            {totalStock > 0 ? `Stock: ${totalStock}` : 'Agotado'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-xs text-primary font-mono block">
                        Q{normalPrice.toFixed(2)}
                      </span>
                      <span className="text-[9px] text-muted-foreground">Ver en stock</span>
                    </div>
                  </CommandItem>
                );
              })}

              {query.trim() && (
                <CommandItem
                  onSelect={() => handleSelect(`/inventory?search=${encodeURIComponent(query.trim())}`)}
                  className="py-1.5 px-2.5 text-xs text-primary font-medium cursor-pointer hover:bg-primary/10 rounded-md mt-1 flex items-center justify-between"
                >
                  <span>Ver todos los productos que coinciden con "{query}" en Inventario</span>
                  <ArrowRight className="h-3 w-3 shrink-0" />
                </CommandItem>
              )}
            </CommandGroup>
          )}

          {/* Grupo: Clientes coincidentes de la base de datos */}
          {customers.length > 0 && (
            <CommandGroup heading={`Clientes Encontrados (${customers.length})`}>
              {customers.map((cust) => {
                const phone = cust.phones?.[0]?.number || 'Sin teléfono';
                return (
                  <CommandItem
                    key={cust.id}
                    onSelect={() => handleSelect(`/customers?search=${encodeURIComponent(cust.name)}`)}
                    className="flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer hover:bg-accent"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
                        {cust.avatar || 'CL'}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-foreground block truncate">
                          {cust.name}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span className="font-mono">NIT: {cust.nit || 'C/F'}</span>
                          <span>•</span>
                          <span>Tel: {phone}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {cust.type}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}

              {query.trim() && (
                <CommandItem
                  onSelect={() => handleSelect(`/customers?search=${encodeURIComponent(query.trim())}`)}
                  className="py-1.5 px-2.5 text-xs text-primary font-medium cursor-pointer hover:bg-primary/10 rounded-md mt-1 flex items-center justify-between"
                >
                  <span>Ver todos los clientes con "{query}" en Clientes</span>
                  <ArrowRight className="h-3 w-3 shrink-0" />
                </CommandItem>
              )}
            </CommandGroup>
          )}

          {/* Separador visual si hay resultados mixtos */}
          {(products.length > 0 || customers.length > 0) && filteredNavItems.length > 0 && (
            <CommandSeparator className="my-1.5" />
          )}

          {/* Grupo: Módulos y Páginas del Sistema */}
          {filteredNavItems.length > 0 && (
            <CommandGroup heading={query.trim() ? "Módulos y Páginas" : "Módulos Principales"}>
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.href}
                    onSelect={() => handleSelect(item.href)}
                    className="flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer hover:bg-accent"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="font-semibold text-xs text-foreground block">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground line-clamp-1">
                          {item.description}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>

        {/* Barra inferior con atajos y ayuda */}
        <div className="flex items-center justify-between px-3.5 py-2 border-t bg-muted/30 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono bg-muted px-1 py-0.5 rounded border text-[10px]">↑</kbd> <kbd className="font-mono bg-muted px-1 py-0.5 rounded border text-[10px]">↓</kbd> navegar</span>
            <span><kbd className="font-mono bg-muted px-1 py-0.5 rounded border text-[10px]">Enter</kbd> seleccionar</span>
            <span><kbd className="font-mono bg-muted px-1 py-0.5 rounded border text-[10px]">Esc</kbd> cerrar</span>
          </div>
          <span className="font-medium text-foreground/80">Diferacsa v2.0</span>
        </div>
      </CommandDialog>
    </>
  );
}
