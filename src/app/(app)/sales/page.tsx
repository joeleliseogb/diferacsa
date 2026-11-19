import { redirect } from 'next/navigation';

/**
 * La página de Ventas ha sido dividida en módulos independientes.
 * Esta página redirige a /tpv como punto de entrada principal para evitar enlaces rotos.
 */
export default function SalesPage() {
  redirect('/tpv');
}
