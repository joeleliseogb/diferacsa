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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
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
import { useAuth } from "@/context/auth-context"

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
 * Componente de navegación principal que se muestra en la barra lateral con estilo moderno inspirado en theme.jpeg.
 */
export function MainNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const currentUserRole: UserRole = user?.role || 'Admin';
  const { hasPermission, hasAnyPermission, loading } = usePermissions(currentUserRole);

  const mainMenuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, permission: 'ver-dashboard' as Permission },
    { href: "/workflow", label: "Flujo Operativo", icon: DatabaseZap, permission: 'ver-dashboard' as Permission },
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

  const operationsItems = [
    { href: "/invoicing", label: "Facturación", icon: FileText, permission: 'acceder-facturacion' as Permission },
    { href: "/purchases", label: "Compras", icon: Receipt, permission: 'ver-compras' as Permission },
  ];

  const managementItems = [
    { href: "/inventory", label: "Inventario", icon: Archive, permission: 'ver-inventario' as Permission },
    { href: "/suppliers", label: "Proveedores", icon: Building2, permission: 'ver-proveedores' as Permission },
    { href: "/repairs", label: "Taller", icon: Wrench, permission: 'acceder-taller' as Permission },
  ];

  const settingsSubItems = [
    { href: "/settings/users", label: "Usuarios y Permisos", icon: UserCog, permission: 'gestionar-usuarios' as Permission },
    { href: "/settings/maintenance", label: "Mantenimiento", icon: DatabaseZap, permission: 'ejecutar-mantenimiento' as Permission },
  ];
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
    return null;
  }

  return (
    <div className="flex flex-col gap-1 px-1">
      {/* Grupo: Menú Principal */}
      <SidebarGroup className="p-0">
        <SidebarGroupLabel>Menú Principal</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            {mainMenuItems.map((item) => (
              hasPermission(item.permission) && (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)}
                  >
                    <Link href={item.href}>
                      <item.icon className="w-4.5 h-4.5" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Grupo: Operaciones y Ventas */}
      <SidebarGroup className="p-0 mt-3">
        <SidebarGroupLabel>Ventas y Finanzas</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            {/* Módulo Desplegable de Ventas */}
            {hasAnyPermission(salesPermissions) && (
              <Collapsible asChild open={isSalesOpen} onOpenChange={setIsSalesOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isSalesActive}
                      className="justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <ShoppingCart className="w-4.5 h-4.5" />
                        <span>Ventas</span>
                      </div>
                      <ChevronRight className={cn("h-4 w-4 transition-transform duration-200 text-muted-foreground", isSalesOpen && "rotate-90 text-primary")} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="my-1 border-l-2 border-primary/20">
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

            {/* Facturación y Compras */}
            {operationsItems.map((item) => (
              hasPermission(item.permission) && (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                  >
                    <Link href={item.href}>
                      <item.icon className="w-4.5 h-4.5" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Grupo: Gestión y Almacén */}
      <SidebarGroup className="p-0 mt-3">
        <SidebarGroupLabel>Gestión y Stock</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            {managementItems.map((item) => (
              hasPermission(item.permission) && (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                  >
                    <Link href={item.href}>
                      <item.icon className="w-4.5 h-4.5" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Grupo: Sistema y Ajustes */}
      <SidebarGroup className="p-0 mt-3">
        <SidebarGroupLabel>Sistema</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            {hasAnyPermission(settingsPermissions) && (
              <Collapsible asChild open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isSettingsActive}
                      className="justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <Settings className="w-4.5 h-4.5" />
                        <span>Configuración</span>
                      </div>
                      <ChevronRight className={cn("h-4 w-4 transition-transform duration-200 text-muted-foreground", isSettingsOpen && "rotate-90 text-primary")} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="my-1 border-l-2 border-primary/20">
                      {hasPermission('acceder-configuracion') && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={pathname === '/settings'}>
                            <Link href="/settings">
                              <span>General</span>
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
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
}
