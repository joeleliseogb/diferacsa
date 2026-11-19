

'use client';

import type { Order, Customer } from '@/lib/data';
import type { CompanyInfo } from '@/lib/settings-service';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getCompanyInfo } from '@/lib/servicios';


interface PrintableOrderProps {
  order: Order;
  customer: Customer;
}

export const PrintableOrder = ({ order, customer }: PrintableOrderProps) => {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  useEffect(() => {
    async function fetchData() {
        setCompanyInfo(await getCompanyInfo());
    }
    fetchData();
  }, []);

  if (!companyInfo) {
    return null;
  }
  
  const primaryCustomerAddress = customer.addresses.find(a => a.isPrimary) || customer.addresses[0];
  const primaryCustomerPhone = customer.phones.find(p => p.isPrimary) || customer.phones[0];

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
          <h2 className="text-2xl font-bold text-gray-700">PEDIDO</h2>
          <p className="font-mono text-lg">{order.id}</p>
        </div>
      </header>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="border p-4 rounded-md">
          <h3 className="font-bold mb-2 border-b pb-1">Cliente</h3>
          <p className="font-bold">{customer.name}</p>
          <p>{primaryCustomerAddress?.street}, {primaryCustomerAddress?.city}</p>
          <p>{customer.email}</p>
          <p>{primaryCustomerPhone?.number}</p>
          <p>NIT: {customer.nit}</p>
        </div>
        <div className="border p-4 rounded-md">
           <h3 className="font-bold mb-2 border-b pb-1">Detalles del Pedido</h3>
           <p><span className="font-semibold">Fecha de Emisión:</span> {new Date(order.date).toLocaleDateString('es-GT')}</p>
           <p><span className="font-semibold">Estado:</span> {order.status}</p>
        </div>
      </div>

      <main>
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">SKU</th>
              <th className="p-2 w-1/2">Descripción</th>
              <th className="p-2 text-right">Cant.</th>
              <th className="p-2 text-right">Precio Unit.</th>
              <th className="p-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.products.map((product, index) => (
              <tr key={index} className="border-b">
                <td className="p-2 font-mono">{product.sku}</td>
                <td className="p-2">{product.name}</td>
                <td className="p-2 text-right">{product.qty}</td>
                <td className="p-2 text-right">Q{product.price.toFixed(2)}</td>
                <td className="p-2 text-right">Q{(product.qty * product.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>

      <footer className="mt-8 absolute bottom-8 left-0 right-0 px-8">
        <div className="flex justify-end">
          <div className="w-1/3">
            <div className="flex justify-between font-bold text-lg border-t-2 border-gray-800 pt-2">
              <span>TOTAL</span>
              <span>{order.total}</span>
            </div>
          </div>
        </div>
        <div className="mt-12 text-center text-xs text-gray-500">
          <p>Precios expresados en Quetzales. Impuestos incluidos.</p>
          <p>Gracias por su preferencia.</p>
           <p className="mt-2">Este negocio opera con <a href="https://simplygest.cai.gt" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">SimplyGest</a></p>
        </div>
      </footer>
    </div>
  );
};
