
'use client';

import type { Customer, OrderProduct } from '@/lib/data';
import type { CompanyInfo, Branch } from '@/lib/settings-service';
import Image from 'next/image';

export interface ReceiptData {
  cart: OrderProduct[];
  total: number;
  customer: Customer;
  companyInfo: CompanyInfo;
  branchInfo?: Branch;
  invoiceId: string;
  paymentMethod: string; // "Efectivo", "Crédito", "Pendiente"
}


export const PrintableReceipt = ({ cart, total, customer, companyInfo, branchInfo, invoiceId, paymentMethod }: ReceiptData) => {
  if (!companyInfo) {
    return null;
  }
  
  const displayInfo = {
    name: branchInfo?.name || companyInfo.name,
    address: branchInfo?.address || companyInfo.address,
    logoUrl: branchInfo?.logoUrl || companyInfo.logoUrl
  }

  const now = new Date();
  const showPaymentDetails = paymentMethod === 'Efectivo';

  return (
    <div className="bg-white text-black font-mono text-sm w-[80mm] p-2">
      <header className="text-center mb-2 uppercase">
        {displayInfo.logoUrl && (
          <Image src={displayInfo.logoUrl} alt="Logo" width={60} height={60} className="object-contain mx-auto mb-1" data-ai-hint="company logo" />
        )}
        <h1 className="font-bold text-base">{displayInfo.name}</h1>
        <p className="text-xs">{displayInfo.address}</p>
        <p className="text-xs">NIT: {companyInfo.nit} | Tel: {companyInfo.phone}</p>
      </header>

      <div className="border-y border-dashed border-black py-1 my-2 text-xs uppercase">
        <p>Factura: {invoiceId}</p>
        <p>Fecha: {now.toLocaleDateString('es-GT')} {now.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</p>
        <p>Cliente: {customer.name}</p>
        <p>NIT: {customer.nit}</p>
      </div>

      <main>
        <table className="w-full text-sm">
          <thead className="uppercase">
            <tr className="border-b border-dashed border-black">
              <th className="text-left py-1">Cant</th>
              <th className="text-left w-2/5 py-1">Producto</th>
              <th className="text-right py-1">P. Unit</th>
              <th className="text-right py-1">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item, index) => (
              <tr key={index} className="align-top uppercase">
                <td className="pr-1">{item.qty}</td>
                <td className="pr-1">{item.name}</td>
                <td className="text-right pr-1">Q{item.price.toFixed(2)}</td>
                <td className="text-right">Q{(item.qty * item.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>

      <footer className="mt-2 border-t border-dashed border-black pt-2 uppercase">
        <div className="flex justify-between font-bold text-xl">
          <span>Total:</span>
          <span>Q{total.toFixed(2)}</span>
        </div>
         <div className="mt-2 text-sm">
            <p>Forma de Pago: {paymentMethod}</p>
        </div>
        <div className="text-center mt-2">
            <p className="text-base font-bold">¡Gracias por su compra!</p>
            {showPaymentDetails ? (
                <>
                    <p className="text-xs mt-2">
                        <b>No se aceptan cambios ni devoluciones</b>
                    </p>
                    <div className="mt-2 h-20 w-full border-2 border-dashed border-gray-400 flex items-center justify-center">
                        <span className="text-gray-400 text-base">SELLO CANCELADO</span>
                    </div>
                </>
            ) : (
                <>
                    <p className="text-base font-bold mt-2">Pase a Caja para realizar su pago</p>
                    <p className="text-xs normal-case mt-4">Nota: Esta venta no se considera pagada si no cuenta con el sello de cancelado.</p>
                     <div className="mt-2 h-20 w-full border-2 border-dashed border-gray-400 flex items-center justify-center">
                        <span className="text-gray-400 text-base">SELLO CANCELADO</span>
                    </div>
                </>
            )}
        </div>
        <div className="text-center mt-2 text-gray-500 text-xs normal-case">
          <p>Este negocio opera con SimplyGest</p>
        </div>
      </footer>
    </div>
  );
};
