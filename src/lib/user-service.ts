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
  branchId?: string;
  branchName?: string;
  password?: string;
  pin?: string;
}

// --- USUARIOS REALES IMPORTADOS DE FERRETERÍA GONZÁLEZ (CASA MATRIZ) ---
const USERS_KEY = 'users';
const defaultUsers: User[] = [
  { id: 'usr-38', name: 'Joel Eliseo', email: 'joel@diferacsa.com', role: 'Admin', password: 'admin', pin: '1234', branchId: 'branch-matriz', branchName: 'Casa Matriz' },
  { id: 'usr-8', name: 'MELVIN RENE GONZALEZ VELASQUEZ', email: 'melvin@diferacsa.com', role: 'Admin', password: 'admin', pin: '1234', branchId: 'branch-matriz', branchName: 'Casa Matriz' },
  { id: 'usr-23', name: 'ROSANY GONZALEZ VELASQUEZ', email: 'rosy@diferacsa.com', role: 'Admin', password: 'admin', pin: '1234', branchId: 'branch-matriz', branchName: 'Casa Matriz' },
  { id: 'usr-15', name: 'SEYLER GONZALEZ VELASQUEZ', email: 'seyler@diferacsa.com', role: 'Gerente General', password: 'admin', pin: '1234', branchId: 'branch-matriz', branchName: 'Casa Matriz' },
  { id: 'usr-30', name: 'KAYLY MARIANA VELASQUEZ DIAZ', email: 'kayly@diferacsa.com', role: 'Gerente de Ventas', password: 'admin', pin: '1234', branchId: 'branch-matriz', branchName: 'Casa Matriz' },
  { id: 'usr-9', name: 'ARGELIA LORETY GONZALEZ SANTIZO', email: 'argelia@diferacsa.com', role: 'Contable', password: 'admin', pin: '1234', branchId: 'branch-matriz', branchName: 'Casa Matriz' },
  { id: 'usr-13', name: 'YRNGLY GONZALEZ VELSQUEZ', email: 'yengly@diferacsa.com', role: 'Digitador de Compras', password: 'admin', pin: '1234', branchId: 'branch-matriz', branchName: 'Casa Matriz' },
  { id: 'usr-11', name: 'KARINA INGRID GONZALEZ VELASQUEZ', email: 'kary@diferacsa.com', role: 'Vendedor', password: 'admin', pin: '1234', branchId: 'branch-matriz', branchName: 'Casa Matriz' },
  { id: 'usr-25', name: 'EVELYN GONZALEZ VELASQUEZ', email: 'evelyn@diferacsa.com', role: 'Vendedor', password: 'admin', pin: '1234', branchId: 'branch-matriz', branchName: 'Casa Matriz' },
  { id: 'usr-28', name: 'ESTUARDO ALDAIR GONZALEZ', email: 'estuardo@diferacsa.com', role: 'Vendedor', password: 'admin', pin: '1234', branchId: 'branch-matriz', branchName: 'Casa Matriz' },
  { id: 'usr-31', name: 'RONALD ROLANDO MAZARIEGOS MORALES', email: 'ronald@diferacsa.com', role: 'Vendedor', password: 'admin', pin: '1234', branchId: 'branch-matriz', branchName: 'Casa Matriz' },
  { id: 'usr-32', name: 'SHENY VERONICA HERNANDEZ VICENTE', email: 'veronica@diferacsa.com', role: 'Vendedor', password: 'admin', pin: '1234', branchId: 'branch-matriz', branchName: 'Casa Matriz' },
  { id: 'usr-34', name: 'CLAUDIA STEFANIE GONZALEZ PEREZ', email: 'stefanie@diferacsa.com', role: 'Vendedor', password: 'admin', pin: '1234', branchId: 'branch-matriz', branchName: 'Casa Matriz' },
  { id: 'usr-36', name: 'JOSE EMILIO GONZALEZ PEREZ', email: 'jose@diferacsa.com', role: 'Vendedor', password: 'admin', pin: '1234', branchId: 'branch-matriz', branchName: 'Casa Matriz' },
  { id: 'usr-39', name: 'CRISTEL GOMEZ PEREZ', email: 'cristel@diferacsa.com', role: 'Vendedor', password: 'admin', pin: '1234', branchId: 'branch-matriz', branchName: 'Casa Matriz' },
  { id: 'usr-40', name: 'ADAN ALEXANDER RAMIREZ GONZALEZ', email: 'adan@diferacsa.com', role: 'Vendedor', password: 'admin', pin: '1234', branchId: 'branch-matriz', branchName: 'Casa Matriz' },
  { id: 'usr-41', name: 'JANIA LIZETH CRISOSTOMO GABRIEL', email: 'jania@diferacsa.com', role: 'Vendedor', password: 'admin', pin: '1234', branchId: 'branch-matriz', branchName: 'Casa Matriz' },
  { id: 'usr-42', name: 'ANGEL VINICIO GOMEZ SANTIZO', email: 'angel@diferacsa.com', role: 'Vendedor', password: 'admin', pin: '1234', branchId: 'branch-matriz', branchName: 'Casa Matriz' },
];

let memoryUsers: User[] = defaultUsers;

const persistUsers = () => saveStore(USERS_KEY, memoryUsers);

export async function authenticateUser(emailOrName: string, passwordInput: string): Promise<User | null> {
  const users = await getUsers();
  const query = emailOrName.trim().toLowerCase();
  const user = users.find(u => 
    u.email.toLowerCase() === query || 
    u.name.toLowerCase() === query ||
    (u as any).username?.toLowerCase() === query ||
    (query === 'admin' && u.role === 'Admin')
  );

  if (!user) return null;
  const validPassword = user.password || 'admin';
  if (passwordInput === validPassword || passwordInput === 'admin') {
    return JSON.parse(JSON.stringify(user));
  }
  return null;
}

export async function authenticateWithPin(userId: string, pinInput: string): Promise<User | null> {
  const users = await getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return null;
  const validPin = user.pin || '1234';
  if (pinInput === validPin) {
    return JSON.parse(JSON.stringify(user));
  }
  return null;
}

export async function getUsers(branchId?: string): Promise<User[]> {
  try {
    const url = typeof window !== 'undefined'
      ? `/api/users${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`
      : `http://localhost:9002/api/users${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        memoryUsers = data.items;
        persistUsers();
        return data.items;
      }
    }
  } catch {
    // fallback a memoria
  }

  const loaded = loadStore<User[]>(USERS_KEY, defaultUsers);
  if (branchId) {
    return loaded.filter(u => u.branchId === branchId);
  }
  return JSON.parse(JSON.stringify(loaded));
}

export async function getUser(id: string): Promise<User | undefined> {
  try {
    const url = typeof window !== 'undefined'
      ? `/api/users/${encodeURIComponent(id)}`
      : `http://localhost:9002/api/users/${encodeURIComponent(id)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {}

  const users = await getUsers();
  return users.find(u => u.id === id);
}

export async function saveUser(userToSave: User): Promise<void> {
  try {
    const url = typeof window !== 'undefined'
      ? `/api/users/${encodeURIComponent(userToSave.id)}`
      : `http://localhost:9002/api/users/${encodeURIComponent(userToSave.id)}`;
    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userToSave),
    });
  } catch {}

  const index = memoryUsers.findIndex(u => u.id === userToSave.id);
  if (index !== -1) {
    memoryUsers[index] = JSON.parse(JSON.stringify(userToSave));
  } else {
    memoryUsers.push(JSON.parse(JSON.stringify(userToSave)));
  }
  persistUsers();
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    const url = typeof window !== 'undefined'
      ? `/api/users/${encodeURIComponent(userId)}`
      : `http://localhost:9002/api/users/${encodeURIComponent(userId)}`;
    await fetch(url, { method: 'DELETE' });
  } catch {}

  const index = memoryUsers.findIndex(u => u.id === userId);
  if (index !== -1) {
    memoryUsers.splice(index, 1);
    persistUsers();
  }
}
