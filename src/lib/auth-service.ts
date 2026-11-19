

'use client';

import type { UserRole } from './user-service';
import { getSettings } from './servicios';

export const allPermissions = [
    'ver-dashboard', 'usar-asistente-ia',
    'acceder-tpv', 'crear-apartados-encargos',
    'ver-clientes', 'crear-clientes', 'editar-clientes',
    'ver-pedidos', 'crear-pedidos', 'editar-pedidos',
    'ver-presupuestos', 'crear-presupuestos', 'editar-presupuestos',
    'ver-entregas', 'crear-entregas', 'editar-entregas',
    'acceder-caja',
    'ver-compras', 'crear-compras', 'editar-compras',
    'ver-inventario', 'crear-productos', 'editar-productos', 'realizar-traslados',
    'ver-proveedores', 'crear-proveedores', 'editar-proveedores',
    'acceder-facturacion', 'anular-facturas',
    'acceder-configuracion', 'gestionar-usuarios', 'ejecutar-mantenimiento',
    'acceder-taller', 'crear-reparaciones', 'editar-reparaciones',
] as const;


export type Permission = typeof allPermissions[number];

export async function hasPermission(role: UserRole, permission: Permission): Promise<boolean> {
    const settings = await getSettings();
    const permissionsForRole = settings.permissionsByRole[role] || [];
    return permissionsForRole.includes(permission);
}

export async function getPermissionsForRole(role: UserRole): Promise<Permission[]> {
    const settings = await getSettings();
    return settings.permissionsByRole[role] || [];
}
