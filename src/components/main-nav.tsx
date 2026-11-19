

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import {
  LayoutGrid,
  ShoppingCart,
  Archive,
  Users,
  FileText,
  Receipt,
  Building2,
  Settings,
  Package,
  ClipboardList,
  Truck,
  ChevronRight,
  Banknote,
  Calculator,
  DatabaseZap,
  HardHat,
  UserCog,
  Wrench,
} from 'lucide-react'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type { Permission } from "@/lib/auth-service"
import { getPermissionsForRole } from "@/lib/servicios"
import { UserRole } from "@/lib/user-service"

// Mock current user - in a real app, this would come from an auth context
const currentUserRole: UserRole = 'Admin';

const usePermissions = (role: UserRole) => {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPermissions() {
            const userPermissions = await getPermissionsForRole(role);
            setPermissions(userPermissions);
            setLoading(false);
        }
        fetchPermissions();
    }, [role]);

    const hasPermission = (permission: Permission) => permissions.includes(permission);
    
    const hasAnyPermission = (perms: Permission[]) => perms.some(p => permissions.includes(p));

    return { permissions, hasPermission, hasAnyPermission, loading };
}

/**
 * Componente de navegación principal que se muestra en la barra lateral.
 */
export function MainNav() {
  const pathname = usePathname();
  const { hasPermission, hasAnyPermission, loading } = usePermissions(currentUserRole);

  const topLevelItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, permission: 'ver-dashboard' as Permission },
    { href: "/tpv", label: "Punto de Venta", icon: Calculator, permission: 'acceder-tpv' as Permission },
    { href: "/customers", label: "Clientes", icon: Users, permission: 'ver-clientes' as Permission },
  ];

  const salesSubItems = [
      { href: "/orders", label: "Pedidos", icon: Package, permission: 'ver-pedidos' as Permission },
      { href: "/quotes", label: "Presupuestos", icon: ClipboardList, permission: 'ver-presupuestos' as Permission },
      { href: "/deliveries", label: "Entregas", icon: Truck, permission: 'ver-entregas' as Permission },
      { href: "/reservations", label: "Apartados y Encargos", icon: HardHat, permission: 'crear-apartados-encargos' as Permission },
      { href: "/cash-register", label: "Cajero", icon: Banknote, permission: 'acceder-caja' as Permission },
  ];
  const salesPermissions = salesSubItems.map(item => item.permission);


  const bottomLevelItems = [
    { href: "/invoicing", label: "Facturación", icon: FileText, permission: 'acceder-facturacion' as Permission },
    { href: "/purchases", label: "Compras", icon: Receipt, permission: 'ver-compras' as Permission },
    { href: "/repairs", label: "Taller", icon: Wrench, permission: 'acceder-taller' as Permission },
    { href: "/inventory", label: "Inventario", icon: Archive, permission: 'ver-inventario' as Permission },
    { href: "/suppliers", label: "Proveedores", icon: Building2, permission: 'ver-proveedores' as Permission },
  ];

  const settingsSubItems = [
      { href: "/settings/users", label: "Usuarios y Permisos", icon: UserCog, permission: 'gestionar-usuarios' as Permission },
      { href: "/settings/maintenance", label: "Mantenimiento", icon: DatabaseZap, permission: 'ejecutar-mantenimiento' as Permission },
  ]
  const settingsPermissions = ['acceder-configuracion' as Permission, ...settingsSubItems.map(item => item.permission)];


  const isSalesActive = salesSubItems.some(item => pathname.startsWith(item.href));
  const isSettingsActive = pathname.startsWith('/settings');
  
  const [isSalesOpen, setIsSalesOpen] = useState(isSalesActive);
  const [isSettingsOpen, setIsSettingsOpen] = useState(isSettingsActive);

  useEffect(() => {
    if (isSalesActive) setIsSalesOpen(true);
  }, [isSalesActive]);

  useEffect(() => {
    if (isSettingsActive) setIsSettingsOpen(true);
  }, [isSettingsActive]);

  if (loading) {
      return null; // or a loading skeleton
  }

  return (
    <SidebarMenu>
      {/* Elementos de primer nivel */}
      {topLevelItems.map((item) => (
        hasPermission(item.permission) && (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
            >
              <Link href={item.href}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      ))}

      {/* Módulo de Ventas Desplegable */}
      {hasAnyPermission(salesPermissions) && (
        <Collapsible asChild open={isSalesOpen} onOpenChange={setIsSalesOpen}>
          <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                  isActive={isSalesActive}
                  className="justify-between"
                  >
                      <div className="flex items-center gap-2">
                          <ShoppingCart className="w-5 h-5" />
                          <span>Ventas</span>
                      </div>
                      <ChevronRight className={cn("h-4 w-4 transition-transform duration-200", isSalesOpen && "rotate-90")} />
                  </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                  <SidebarMenuSub>
                      {salesSubItems.map((item) => (
                        hasPermission(item.permission) && (
                          <SidebarMenuSubItem key={item.href}>
                              <SidebarMenuSubButton asChild isActive={pathname.startsWith(item.href)}>
                                  <Link href={item.href}>
                                      <item.icon className="w-4 h-4" />
                                      <span>{item.label}</span>
                                  </Link>
                              </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      ))}
                  </SidebarMenuSub>
              </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      )}

      {/* Resto de elementos */}
      {bottomLevelItems.map((item) => (
        hasPermission(item.permission) && (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith(item.href)}
            >
              <Link href={item.href}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      ))}

        {/* Módulo de Configuración Desplegable */}
        {hasAnyPermission(settingsPermissions) && (
          <Collapsible asChild open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                      isActive={isSettingsActive}
                      className="justify-between"
                      >
                          <div className="flex items-center gap-2">
                              <Settings className="w-5 h-5" />
                              <span>Configuración</span>
                          </div>
                          <ChevronRight className={cn("h-4 w-4 transition-transform duration-200", isSettingsOpen && "rotate-90")} />
                      </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                      <SidebarMenuSub>
                          {hasPermission('acceder-configuracion') && (
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={pathname === '/settings'}>
                                  <Link href="/settings">
                                      <span className="ml-6">General</span>
                                  </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )}
                          {settingsSubItems.map((item) => (
                              hasPermission(item.permission) && (
                                <SidebarMenuSubItem key={item.href}>
                                    <SidebarMenuSubButton asChild isActive={pathname.startsWith(item.href)}>
                                        <Link href={item.href}>
                                            <item.icon className="w-4 h-4" />
                                            <span>{item.label}</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )
                          ))}
                      </SidebarMenuSub>
                  </CollapsibleContent>
              </SidebarMenuItem>
          </Collapsible>
        )}
    </SidebarMenu>
  );
}
