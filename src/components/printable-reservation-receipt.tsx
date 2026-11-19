

'use client';

import type { CompanyInfo, Branch, Customer, Reservation } from '@/lib/servicios';
import Image from 'next/image';

export interface ReservationReceiptData {
    reservation: Reservation;
    customer: Customer;
    companyInfo: CompanyInfo;
    branchInfo?: Branch;
    isPaid: boolean; // Indicates if the advance payment was processed
}

export const PrintableReservationReceipt = ({ reservation, customer, companyInfo, branchInfo, isPaid }: ReservationReceiptData) => {
  if (!companyInfo) {
    return null;
  }
  
  const displayInfo = {
    name: branchInfo?.name || companyInfo.name,
    address: branchInfo?.address || companyInfo.address,
    logoUrl: branchInfo?.logoUrl || companyInfo.logoUrl
  }

  const now = new Date();
  const title = reservation.type === 'apartado' ? 'COMPROBANTE DE APARTADO' : 'COMPROBANTE DE ENCARGO';

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
        <p>Comprobante: {reservation.id}</p>
        <p>Fecha: {now.toLocaleDateString('es-GT')} {now.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</p>
        <p>Cliente: {customer.name}</p>
        <p>NIT: {customer.nit}</p>
      </div>

      <main>
        <h2 className="text-center font-bold my-2">{title}</h2>
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
            {reservation.products.map((item, index) => (
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
        <div className="space-y-1 text-base">
            <div className="flex justify-between"><span>Total:</span><span>Q{reservation.totalAmount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Anticipo:</span><span>Q{reservation.advancePayment.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold"><span>Saldo Pendiente:</span><span>Q{reservation.remainingBalance.toFixed(2)}</span></div>
        </div>
        
        <div className="text-center mt-4">
             {isPaid ? (
                <>
                    <p className="text-base font-bold">¡Anticipo Recibido!</p>
                    <div className="mt-2 h-16 w-full border-2 border-dashed border-gray-400 flex items-center justify-center">
                        <span className="text-gray-400 text-base">SELLO CANCELADO</span>
                    </div>
                </>
            ) : (
                <>
                    <p className="text-base font-bold mt-2">Pase a Caja para pagar el anticipo</p>
                    <p className="text-xs normal-case mt-2">Este comprobante no es válido sin el sello de cancelado del anticipo.</p>
                     <div className="mt-2 h-16 w-full border-2 border-dashed border-gray-400 flex items-center justify-center">
                        <span className="text-gray-400 text-base">SELLO CANCELADO</span>
                    </div>
                </>
            )}
        </div>
        <div className="text-center mt-2 text-gray-500 text-xs normal-case">
            {reservation.type === 'apartado' && reservation.expiryDate && <p>Producto apartado válido hasta {new Date(reservation.expiryDate).toLocaleDateString('es-GT')}.</p>}
            <p className="mt-2">Este negocio opera con SimplyGest</p>
        </div>
      </footer>
    </div>
  );
};
