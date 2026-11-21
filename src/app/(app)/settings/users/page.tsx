

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { getUsers, saveUser, deleteUser, type User, type UserRole } from '@/lib/user-service';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PlusCircle, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getSettings, saveSettings, type Settings } from '@/lib/servicios';
import { allPermissions, type Permission } from '@/lib/auth-service';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export default function UsersPage() {
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<UserRole>('Vendedor');

    async function loadData() {
        setLoading(true);
        const [usersData, settingsData] = await Promise.all([
            getUsers(),
            getSettings()
        ]);
        setUsers(usersData);
        setSettings(settingsData);
        setLoading(false);
    }

    useEffect(() => {
        loadData();
    }, []);

    const handleAddNewUser = () => {
        setEditingUser({ name: '', email: '', role: 'Vendedor' });
        setIsDialogOpen(true);
    };

    const handleEditUser = (user: User) => {
        setEditingUser({ ...user });
        setIsDialogOpen(true);
    };

    const handleDeleteUser = async (userId: string) => {
        await deleteUser(userId);
        toast({ title: 'Usuario Eliminado', description: 'El usuario ha sido eliminado correctamente.' });
        loadData();
    };

    const handleSaveUser = async () => {
        if (!editingUser || !editingUser.name || !editingUser.email || !editingUser.role) {
            toast({ title: "Datos incompletos", description: "Por favor, rellena todos los campos.", variant: "destructive" });
            return;
        }

        const userToSave: User = {
            id: editingUser.id || Date.now().toString(),
            name: editingUser.name,
            email: editingUser.email,
            role: editingUser.role as UserRole,
        };

        await saveUser(userToSave);
        toast({ title: 'Usuario Guardado', description: 'Los datos del usuario se han guardado correctamente.' });
        setIsDialogOpen(false);
        setEditingUser(null);
        loadData();
    };

    const handlePermissionChange = (permission: Permission, checked: boolean) => {
        if (!settings) return;
        const currentPermissions = new Set(settings.permissionsByRole[selectedRoleForPermissions]);
        if (checked) {
            currentPermissions.add(permission);
        } else {
            currentPermissions.delete(permission);
        }
        setSettings(prev => prev ? {
            ...prev,
            permissionsByRole: {
                ...prev.permissionsByRole,
                [selectedRoleForPermissions]: Array.from(currentPermissions)
            }
        } : null);
    };
    
    const permissionGroups = allPermissions.reduce((acc, permission) => {
        const group = permission.split('-')[0];
        if (!acc[group]) {
            acc[group] = [];
        }
        acc[group].push(permission);
        return acc;
    }, {} as Record<string, Permission[]>);

    const handleSaveSettings = () => {
        if(settings) {
            saveSettings(settings);
            toast({
                title: "Configuración Guardada",
                description: "Los permisos han sido actualizados.",
            });
        }
    }

    const userRoles: UserRole[] = [
        'Admin', 'Gerente General', 'Gerente de Ventas', 'Gerente de Compras', 'Gerente de Almacen', 'Jefe de Bodega',
        'Vendedor', 'Bodeguero', 'Digitador de Compras', 'Cajero', 'Contable', 'Rutero'
    ];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Gestión de Usuarios</CardTitle>
                            <CardDescription>Crea, visualiza y gestiona los usuarios del sistema y sus roles asignados.</CardDescription>
                        </div>
                         <Button onClick={handleAddNewUser}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Añadir Usuario
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Sucursal</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div></TableCell>
                                    </TableRow>
                                ))
                            ) : users.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">{user.branchName || 'Casa Matriz'}</span></TableCell>
                                    <TableCell><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground">{user.role}</span></TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Estás seguro de eliminar a {user.name}?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta acción no se puede deshacer y eliminará permanentemente al usuario del sistema.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>Sí, Eliminar</AlertDialogAction>
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingUser?.id ? 'Editar Usuario' : 'Añadir Nuevo Usuario'}</DialogTitle>
                        <DialogDescription>
                           Completa los datos y asigna un rol al usuario.
                        </DialogDescription>
                    </DialogHeader>
                    {editingUser && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Nombre</Label>
                                <Input id="name" value={editingUser.name || ''} onChange={e => setEditingUser(prev => ({...prev, name: e.target.value}))} className="col-span-3"/>
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">Email</Label>
                                <Input id="email" type="email" value={editingUser.email || ''} onChange={e => setEditingUser(prev => ({...prev, email: e.target.value}))} className="col-span-3"/>
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="role" className="text-right">Rol</Label>
                                <Select value={editingUser.role} onValueChange={value => setEditingUser(prev => ({...prev, role: value as UserRole}))}>
                                    <SelectTrigger id="role" className="col-span-3">
                                        <SelectValue placeholder="Seleccionar rol..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {userRoles.map(role => (
                                            <SelectItem key={role} value={role}>{role}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveUser}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary"/>Gestión de Permisos por Rol</CardTitle>
                    <CardDescription>Define qué puede hacer cada rol dentro del sistema.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {settings && (
                        <>
                        <div className="space-y-2">
                            <Label htmlFor="role-select">Selecciona un rol para editar sus permisos:</Label>
                            <Select value={selectedRoleForPermissions} onValueChange={(value: UserRole) => setSelectedRoleForPermissions(value)}>
                                <SelectTrigger id="role-select" className="w-[250px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.keys(settings.permissionsByRole).map(role => (
                                        <SelectItem key={role} value={role}>{role}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-4 pt-4 border-t">
                            {Object.entries(permissionGroups).map(([group, permissions]) => (
                                <Collapsible key={group} defaultOpen>
                                    <CollapsibleTrigger className="w-full">
                                    <h4 className="font-semibold text-lg capitalize text-left py-2 border-b">{group}</h4>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
                                        {permissions.map(permission => (
                                            <div key={permission} className="flex items-center space-x-2">
                                                <Checkbox 
                                                    id={`${selectedRoleForPermissions}-${permission}`} 
                                                    checked={(settings.permissionsByRole[selectedRoleForPermissions] || []).includes(permission)}
                                                    onCheckedChange={(checked) => handlePermissionChange(permission, !!checked)}
                                                />
                                                <label htmlFor={`${selectedRoleForPermissions}-${permission}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    {permission.replace(/-/g, ' ')}
                                                </label>
                                            </div>
                                        ))}
                                    </CollapsibleContent>
                                </Collapsible>
                            ))}
                        </div>
                        </>
                    )}
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button onClick={handleSaveSettings}>Guardar Permisos</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
