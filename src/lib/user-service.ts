

'use client';
import { loadStore, saveStore } from './local-store';

export type UserRole = 
  'Admin' 
  | 'Gerente General' 
  | 'Gerente de Ventas'
  | 'Gerente de Compras'
  | 'Gerente de Almacen'
  | 'Jefe de Bodega'
  | 'Vendedor' 
  | 'Bodeguero' 
  | 'Digitador de Compras'
  | 'Cajero'
  | 'Contable'
  | 'Rutero';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// --- IN-MEMORY DATA STORE ---
const USERS_KEY = 'users';
const defaultUsers: User[] = [
  { id: '1', name: 'Usuario Admin', email: 'admin@simplygest.com', role: 'Admin' },
  { id: '5', name: 'Laura Méndez', email: 'gerente.general@simplygest.com', role: 'Gerente General' },
  { id: '6', name: 'Ricardo Salas', email: 'gerente.ventas@simplygest.com', role: 'Gerente de Ventas' },
  { id: '7', name: 'Marcela Pineda', email: 'gerente.compras@simplygest.com', role: 'Gerente de Compras' },
  { id: '8', name: 'Luis Gutierrez', email: 'gerente.almacen@simplygest.com', role: 'Gerente de Almacen' },
  { id: '12', name: 'Roberto Almacén', email: 'jefe.bodega@simplygest.com', role: 'Jefe de Bodega' },
  { id: '2', name: 'Ana Ventas', email: 'ana.ventas@simplygest.com', role: 'Vendedor' },
  { id: '3', name: 'Juan Bodega', email: 'juan.bodega@simplygest.com', role: 'Bodeguero' },
  { id: '4', name: 'Carlos Compras', email: 'carlos.compras@simplygest.com', role: 'Digitador de Compras' },
  { id: '9', name: 'Sofia Cobros', email: 'sofia.caja@simplygest.com', role: 'Cajero' },
  { id: '10', name: 'Ernesto Cuentas', email: 'ernesto.conta@simplygest.com', role: 'Contable' },
  { id: '11', name: 'Pedro Morales', email: 'pedro.rutas@simplygest.com', role: 'Rutero' },
];

let memoryUsers: User[] = loadStore<User[]>(USERS_KEY, defaultUsers);
const persistUsers = () => saveStore(USERS_KEY, memoryUsers);

export async function getUsers(): Promise<User[]> {
    return JSON.parse(JSON.stringify(memoryUsers));
}

export async function getUser(id: string): Promise<User | undefined> {
    const user = memoryUsers.find(u => u.id === id);
    return user ? JSON.parse(JSON.stringify(user)) : undefined;
}

export async function saveUser(userToSave: User): Promise<void> {
    const index = memoryUsers.findIndex(u => u.id === userToSave.id);
    if (index !== -1) {
        memoryUsers[index] = JSON.parse(JSON.stringify(userToSave));
    } else {
        memoryUsers.push(JSON.parse(JSON.stringify(userToSave)));
    }
    persistUsers();
}

export async function deleteUser(userId: string): Promise<void> {
    const index = memoryUsers.findIndex(u => u.id === userId);
    if (index !== -1) {
        memoryUsers.splice(index, 1);
        persistUsers();
    }
}
