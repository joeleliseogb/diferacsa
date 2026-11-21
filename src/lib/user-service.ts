

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
  password?: string;
  pin?: string;
}

// --- IN-MEMORY DATA STORE ---
const USERS_KEY = 'users';
const defaultUsers: User[] = [
  { id: '1', name: 'Joel Eliseo (Admin)', email: 'admin@simplygest.com', role: 'Admin', password: 'admin', pin: '1234' },
  { id: '5', name: 'Laura Méndez', email: 'gerente.general@simplygest.com', role: 'Gerente General', password: 'admin', pin: '5555' },
  { id: '6', name: 'Ricardo Salas', email: 'gerente.ventas@simplygest.com', role: 'Gerente de Ventas', password: 'admin', pin: '6666' },
  { id: '7', name: 'Marcela Pineda', email: 'gerente.compras@simplygest.com', role: 'Gerente de Compras', password: 'admin', pin: '7777' },
  { id: '8', name: 'Luis Gutierrez', email: 'gerente.almacen@simplygest.com', role: 'Gerente de Almacen', password: 'admin', pin: '8888' },
  { id: '12', name: 'Roberto Almacén', email: 'jefe.bodega@simplygest.com', role: 'Jefe de Bodega', password: 'admin', pin: '1212' },
  { id: '2', name: 'Ana Ventas', email: 'ana.ventas@simplygest.com', role: 'Vendedor', password: 'admin', pin: '2222' },
  { id: '3', name: 'Juan Bodega', email: 'juan.bodega@simplygest.com', role: 'Bodeguero', password: 'admin', pin: '3333' },
  { id: '4', name: 'Carlos Compras', email: 'carlos.compras@simplygest.com', role: 'Digitador de Compras', password: 'admin', pin: '4444' },
  { id: '9', name: 'Sofia Cobros', email: 'sofia.caja@simplygest.com', role: 'Cajero', password: 'admin', pin: '9999' },
  { id: '10', name: 'Ernesto Cuentas', email: 'ernesto.conta@simplygest.com', role: 'Contable', password: 'admin', pin: '1010' },
  { id: '11', name: 'Pedro Morales', email: 'pedro.rutas@simplygest.com', role: 'Rutero', password: 'admin', pin: '1111' },
];

let memoryUsers: User[] = loadStore<User[]>(USERS_KEY, defaultUsers);
const persistUsers = () => saveStore(USERS_KEY, memoryUsers);

export async function authenticateUser(emailOrName: string, passwordInput: string): Promise<User | null> {
  const query = emailOrName.trim().toLowerCase();
  const user = memoryUsers.find(u => 
    u.email.toLowerCase() === query || 
    u.name.toLowerCase() === query ||
    (query === 'admin' && u.role === 'Admin')
  );

  if (!user) return null;
  // Si tiene password configurada, validar; si no tiene o coincide 'admin' o la guardada
  const validPassword = user.password || 'admin';
  if (passwordInput === validPassword || passwordInput === 'admin') {
    return JSON.parse(JSON.stringify(user));
  }
  return null;
}

export async function authenticateWithPin(userId: string, pinInput: string): Promise<User | null> {
  const user = memoryUsers.find(u => u.id === userId);
  if (!user) return null;
  const validPin = user.pin || '1234';
  if (pinInput === validPin) {
    return JSON.parse(JSON.stringify(user));
  }
  return null;
}

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
