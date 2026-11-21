'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Calculator, Search, Settings, ChevronDown, CheckCircle2, User as UserIcon } from 'lucide-react';
import { MainNav } from '@/components/main-nav';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { Toaster } from "@/components/ui/toaster";
import { ClientOnly } from '@/components/client-only';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdvancedCalculator } from '@/components/advanced-calculator';
import { NotificationsPanel } from '@/components/notifications-panel';
import { useAuth } from '@/context/auth-context';

/**
 * Layout principal fiel a la estructura de theme.jpeg:
 * - Sidebar blanco con logo navy/coral, navegación limpia y footer con ajustes/logout/status-pill
 * - Header superior blanco con breadcrumb, buscador ovalado, iconos y chip de usuario conectado a sesión
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const isSpecialView = pathname.startsWith('/tpv');
  const isSidebarDefaultOpen = !isSpecialView;

  // Proteger rutas del módulo (app) si no hay sesión activa
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  // Si está cargando o no autenticado, mostrar pantalla limpia de espera
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9] dark:bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1E2538] text-white flex items-center justify-center font-black text-xl shadow-md animate-pulse">
            D
          </div>
          <span className="text-xs text-muted-foreground font-semibold">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  // Obtener iniciales del usuario actual
  const userInitials = user?.name 
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'JE';

  // Obtener nombre de la sección actual para el breadcrumb del header
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dasbor';
    if (pathname === '/workflow') return 'Flujo Operativo';
    if (pathname.startsWith('/tpv')) return 'Punto de Venta';
    if (pathname.startsWith('/customers')) return 'Clientes';
    if (pathname.startsWith('/orders')) return 'Pedidos';
    if (pathname.startsWith('/quotes')) return 'Presupuestos';
    if (pathname.startsWith('/deliveries')) return 'Entregas';
    if (pathname.startsWith('/reservations')) return 'Apartados';
    if (pathname.startsWith('/cash-register')) return 'Caja';
    if (pathname.startsWith('/invoicing')) return 'Facturación';
    if (pathname.startsWith('/purchases')) return 'Compras';
    if (pathname.startsWith('/inventory')) return 'Inventario';
    if (pathname.startsWith('/suppliers')) return 'Proveedores';
    if (pathname.startsWith('/repairs')) return 'Taller';
    if (pathname.startsWith('/settings')) return 'Configuración';
    return 'Diferacsa';
  };

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <ClientOnly>
        <SidebarProvider defaultOpen={isSidebarDefaultOpen}>
          {/* Barra Lateral Blanca Limpia (Idéntica a theme.jpeg) */}
          <Sidebar className="border-r border-border/70 bg-card">
            {/* Logo de la empresa: Bloque Navy con letra A/D y texto AcaDigi / Diferacsa */}
            <SidebarHeader className="p-4 pb-3 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
              <Link href="/dashboard" className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
                <div className="w-10 h-10 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:h-9 flex-shrink-0 flex items-center justify-center bg-[#1E2538] text-white font-black text-xl group-data-[collapsible=icon]:text-lg rounded-2xl group-data-[collapsible=icon]:rounded-xl shadow-sm">
                  D
                </div>
                <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                  <div className="flex items-center">
                    <span className="font-extrabold text-base tracking-tight text-foreground">Difer</span>
                    <span className="font-extrabold text-base tracking-tight text-primary">acsa</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium -mt-0.5">Sistemas de Gestión</span>
                </div>
              </Link>
            </SidebarHeader>

            {/* Lista de navegación principal */}
            <SidebarContent className="px-3 py-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2">
              <MainNav />
            </SidebarContent>

            {/* Pie del Sidebar: Configuración, Cerrar Sesión y Badge de Estado (como en theme.jpeg) */}
            <SidebarFooter className="p-3 pt-2 border-t border-border/50 space-y-1 group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
              <Link 
                href="/settings" 
                title="Configuración"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:p-0"
              >
                <Settings className="w-4.5 h-4.5 flex-shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">Configuración</span>
              </Link>

              <button 
                onClick={logout}
                title="Cerrar sesión"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:p-0"
              >
                <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">Cerrar sesión</span>
              </button>

              {/* Modo Offline / En Línea Activo (Píldora idéntica a theme.jpeg) */}
              <div className="pt-2 group-data-[collapsible=icon]:hidden">
                <div className="px-3 py-2 rounded-full bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">Mode offline aktif</span>
                  </div>
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          {/* Área Principal */}
          <SidebarInset className="bg-[#F4F6F9] dark:bg-background">
            <div className="flex flex-col h-svh">
              {/* Header Superior Blanco (Idéntico a la cabecera de theme.jpeg) */}
              <header className="sticky top-0 z-20 px-4 lg:px-8 py-2.5 flex items-center justify-between gap-4 bg-card border-b border-border/70 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                {/* Lado Izquierdo: Trigger + Título de sección + Buscador ovalado */}
                <div className="flex items-center gap-4 flex-1 max-w-lg">
                  <SidebarTrigger className="h-9 w-9 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground" />
                  
                  {/* Título de la página actual */}
                  <span className="font-headline font-bold text-base text-foreground hidden sm:inline-block">
                    {getPageTitle()}
                  </span>

                  {/* Buscador ovalado tipo "Q Cari..." de theme.jpeg */}
                  <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      type="search"
                      placeholder="Buscar..." 
                      className="w-full pl-9 pr-4 h-8 text-xs rounded-full bg-[#F4F6F9] dark:bg-muted/50 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-primary/40 placeholder:text-muted-foreground/80 font-medium"
                    />
                  </div>
                </div>

                {/* Lado Derecho: Toggle modo oscuro, Notificaciones, Calculadora y Chip de Usuario */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <ThemeToggle />

                  <NotificationsPanel />

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60" title="Calculadora rápida">
                        <Calculator className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm p-0 border-0 bg-transparent shadow-none">
                      <AdvancedCalculator />
                    </DialogContent>
                  </Dialog>

                  {/* Separador fino */}
                  <div className="h-6 w-px bg-border/60 mx-1 hidden sm:block" />

                  {/* Chip de Perfil de Usuario con Menú Desplegable (Exacto a theme.jpeg: [NA] Nadia Ananta / Admin v) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="flex items-center gap-2.5 pl-1 cursor-pointer hover:opacity-85 transition-opacity outline-none">
                        <Avatar className="h-8 w-8 rounded-full bg-[#1E2538] text-white flex items-center justify-center font-bold text-xs">
                          <AvatarImage src="" alt={user?.name || 'Usuario'} />
                          <AvatarFallback className="bg-[#1E2538] text-white text-[11px] font-bold">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col text-left hidden md:block">
                          <span className="text-xs font-bold leading-tight text-foreground block">
                            {user?.name || 'Joel Eliseo'}
                          </span>
                          <span className="text-[10px] text-muted-foreground leading-tight block">
                            {user?.role || 'Admin'}
                          </span>
                        </div>
                        <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-lg border-border/80">
                      <DropdownMenuLabel className="font-normal p-2">
                        <div className="flex flex-col space-y-1">
                          <p className="text-xs font-bold leading-none text-foreground">{user?.name}</p>
                          <p className="text-[11px] leading-none text-muted-foreground">{user?.email}</p>
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary w-fit mt-1">
                            {user?.role}
                          </span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="rounded-xl text-xs font-medium cursor-pointer">
                        <Link href="/settings/users" className="flex items-center gap-2">
                          <UserIcon className="h-3.5 w-3.5" />
                          <span>Gestionar Usuarios</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-xl text-xs font-medium cursor-pointer">
                        <Link href="/settings" className="flex items-center gap-2">
                          <Settings className="h-3.5 w-3.5" />
                          <span>Configuración</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={logout}
                        className="rounded-xl text-xs font-medium text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40 cursor-pointer flex items-center gap-2"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Cerrar sesión</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </header>

              {/* Contenido de la página */}
              <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
                {children}
              </main>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ClientOnly>
      <Toaster />
    </ThemeProvider>
  );
}
