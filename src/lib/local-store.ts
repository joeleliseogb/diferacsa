// Persistencia local de los almacenes en memoria.
//
// Mientras no exista una configuración de Firebase, todos los servicios guardan
// sus datos en memoria. Este módulo los sincroniza con `localStorage` para que
// la información (ventas, clientes, inventario, etc.) sobreviva a recargas de
// página y reinicios del servidor.
//
// En el servidor (SSR) `window` no existe: se devuelven los datos iniciales y no
// se escribe nada.

const PREFIX = 'simplygest:';
const SCHEMA_VERSION = '2';
const VERSION_KEY = `${PREFIX}__version`;

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

function ensureSchema(): void {
  if (!isBrowser()) return;
  try {
    const current = window.localStorage.getItem(VERSION_KEY);
    if (current !== SCHEMA_VERSION) {
      clearAllStores();
      window.localStorage.setItem(VERSION_KEY, SCHEMA_VERSION);
    }
  } catch {
    // localStorage no disponible (modo privado, cuota, etc.)
  }
}

/**
 * Carga un almacén desde localStorage. Si no existe o está corrupto,
 * devuelve una copia profunda de los datos iniciales.
 */
export function loadStore<T>(key: string, initial: T): T {
  const fallback = (): T => JSON.parse(JSON.stringify(initial)) as T;
  if (!isBrowser()) return fallback();
  ensureSchema();
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`No se pudo leer el almacén local "${key}". Se usarán los datos iniciales.`, error);
  }
  return fallback();
}

/** Guarda un almacén en localStorage. */
export function saveStore<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.error(`No se pudo guardar el almacén local "${key}".`, error);
  }
}

/** Elimina todos los datos guardados por la aplicación (restablecer a datos de ejemplo). */
export function clearAllStores(): void {
  if (!isBrowser()) return;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(PREFIX) && k !== VERSION_KEY) keys.push(k);
  }
  keys.forEach(k => window.localStorage.removeItem(k));
}
