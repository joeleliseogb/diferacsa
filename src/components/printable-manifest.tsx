

'use client';

import type { DeliveryRoute } from '@/lib/delivery-service';
import type { CompanyInfo } from '@/lib/settings-service';
import { getCompanyInfo, getCustomer } from '@/lib/servicios';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface PrintableManifestProps {
  route: DeliveryRoute;
}

interface CustomerAddress {
    street: string;
    city: string;
}

export const ManifiestoImprimible = ({ route }: PrintableManifestProps) => {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [customerDetails, setCustomerDetails] = useState<Record<string, {name: string, address: CustomerAddress | undefined}>>({});

  useEffect(() => {
    async function fetchDetails() {
        setCompanyInfo(await getCompanyInfo());
        const details: Record<string, {name: string, address: CustomerAddress | undefined}> = {};
        for(const order of route.orders) {
            // Since delivery orders don't have customerId, we need to find it differently.
            // This is a placeholder, as the current data model for DeliveryOrder is incomplete.
            // Assuming order has customerId for now.
            const customer = await getCustomer((order as any).customerId);
            const address = customer?.addresses.find(a => a.isPrimary) || customer?.addresses[0];
            if (customer) {
                details[(order as any).customerId] = { name: customer.name, address };
            }
        }
        setCustomerDetails(details);
    }
    fetchDetails();
  }, [route]);

  if (!companyInfo) {
    return null;
  }
  
  return (
    <div className="bg-white text-black p-8 font-sans text-sm w-[210mm] min-h-[297mm] relative">
      <header className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
          {companyInfo.logoUrl && (
            <Image src={companyInfo.logoUrl} alt="Company Logo" width={80} height={80} className="object-contain" />
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{companyInfo.name}</h1>
            <p>{companyInfo.address}</p>
            <p>NIT: {companyInfo.nit}</p>
            <p>Tel: {companyInfo.phone}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-gray-700">MANIFIESTO DE ENTREGA</h2>
          <p className="font-mono text-lg">{route.id}</p>
        </div>
      </header>
      
      <div className="border p-4 rounded-md mb-8">
         <h3 className="font-bold mb-2 border-b pb-1">Detalles de la Ruta</h3>
         <div className="grid grid-cols-2 gap-x-4">
            <p><span className="font-semibold">Fecha de Ruta:</span> {new Date(route.date).toLocaleDateString('es-GT')}</p>
            <p><span className="font-semibold">Conductor:</span> {route.driver}</p>
            <p><span className="font-semibold">Total de Paradas:</span> {route.stops}</p>
            <p><span className="font-semibold">Total de Artículos:</span> {route.totalItems}</p>
         </div>
      </div>

      <main>
        <div className="space-y-6">
            {route.orders.map((order, index) => {
                const details = customerDetails[(order as any).customerId];
                return (
                    <div key={order.id} className="border rounded-md break-inside-avoid">
                        <div className="bg-gray-100 p-2 border-b">
                            <h3 className="font-bold">PARADA {index + 1}: {details?.name}</h3>
                            <p className="text-xs">Pedido: {order.id} | Dirección: {details?.address?.street}, {details?.address?.city}</p>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-2 w-16">Cant.</th>
                                    <th className="p-2 w-32">SKU</th>
                                    <th className="p-2">Descripción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.products.map((product, productIndex) => (
                                <tr key={productIndex} className="border-b last:border-b-0">
                                    <td className="p-2 text-center font-semibold">{product.qty}</td>
                                    <td className="p-2 font-mono">{product.sku}</td>
                                    <td className="p-2">{product.name}</td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            })}
        </div>
      </main>

      <footer className="mt-12 absolute bottom-8 left-0 right-0 px-8">
        <div className="grid grid-cols-2 gap-8 border-t pt-4">
            <div>
                <p className="font-semibold mb-1">Recibido por:</p>
                <div className="border-b h-12"></div>
                <p className="text-xs mt-1">Nombre y Firma</p>
            </div>
             <div>
                <p className="font-semibold mb-1">Entregado por:</p>
                <p className="font-medium h-12 border-b flex items-end pb-1">{route.driver}</p>
                <p className="text-xs mt-1">Nombre y Firma del Conductor</p>
            </div>
        </div>
         <div className="mt-4 text-center text-xs text-gray-500">
            <p>Este negocio opera con <a href="https://simplygest.cai.gt" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">SimplyGest</a></p>
        </div>
      </footer>
    </div>
  );
};
