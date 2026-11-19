
'use client';

import type { CompanyInfo, Branch } from '@/lib/settings-service';
import type { Customer, Supplier } from '@/lib/servicios';
import { format } from 'date-fns';
import Image from 'next/image';

export interface ReceiptData {
    type: 'customerPayment' | 'supplierPayment';
    payment: {
        amount: number;
        method: string;
        date: string;
        documentNumber?: string;
    },
    entity: Customer | Supplier,
    companyInfo: CompanyInfo,
    branchInfo?: Branch,
    appliedTo: {
        id: string; // invoiceId or orderId
        amount: number;
    }[],
    balance: {
        previous: number;
        new: number;
    }
}

export const PrintablePaymentReceipt = ({ type, payment, entity, companyInfo, branchInfo, appliedTo, balance }: ReceiptData) => {
  if (!companyInfo) {
    return null;
  }
  
  const displayInfo = {
    name: branchInfo?.name || companyInfo.name,
    address: branchInfo?.address || companyInfo.address,
    logoUrl: branchInfo?.logoUrl || companyInfo.logoUrl
  };

  const isCustomerPayment = type === 'customerPayment';

  return (
    <div className="bg-white text-black p-8 font-sans text-sm w-[210mm] min-h-[297mm]">
      <header className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
          {displayInfo.logoUrl && (
            <Image src={displayInfo.logoUrl} alt="Logo" width={80} height={80} className="object-contain" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{displayInfo.name}</h1>
            <p className="text-sm">{displayInfo.address}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-700">{isCustomerPayment ? 'RECIBO DE CAJA' : 'COMPROBANTE DE EGRESO'}</h2>
          <p className="font-mono text-base">Fecha: {new Date(payment.date).toLocaleString('es-GT')}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border p-4 rounded-md">
            <h3 className="font-bold mb-2 border-b pb-1">{isCustomerPayment ? 'Recibimos de:' : 'Pagado a:'}</h3>
            <p className="font-semibold text-lg">{entity.name}</p>
            <p>NIT: {entity.nit}</p>
        </div>
        <div className="border p-4 rounded-md">
            <h3 className="font-bold mb-2 border-b pb-1">Detalle del Pago</h3>
            <p><span className="font-semibold">{isCustomerPayment ? 'Monto Recibido:' : 'Monto Pagado:'}</span> <span className="font-bold text-lg">Q{payment.amount.toFixed(2)}</span></p>
            <p><span className="font-semibold">Forma de Pago:</span> {payment.method}</p>
             {payment.documentNumber && <p><span className="font-semibold">No. Doc./Ref.:</span> {payment.documentNumber}</p>}
          </div>
      </div>
      
      <main className="mb-8">
        <h3 className="font-bold text-lg mb-2 border-b pb-2">Aplicación del Pago</h3>
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 w-1/2">{isCustomerPayment ? 'Factura Aplicada' : 'Orden de Compra Aplicada'}</th>
              <th className="p-2 text-right">Monto Abonado</th>
            </tr>
          </thead>
          <tbody>
            {appliedTo.map((item, index) => (
              <tr key={index} className="border-b last:border-b-0">
                <td className="p-2 font-mono">{item.id}</td>
                <td className="p-2 text-right font-medium">Q{item.amount.toFixed(2)}</td>
              </tr>
            ))}
             <tr className="border-t-2 border-black font-bold">
                <td className="p-2 text-lg">Total Abonado</td>
                <td className="p-2 text-right text-lg">Q{payment.amount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </main>

      <div className="border p-4 rounded-md">
            <h3 className="font-bold text-lg mb-2 border-b pb-2">Resumen de Cuenta</h3>
             <table className="w-full text-base">
                <tbody>
                    <tr><td className="py-1">Saldo Anterior:</td><td className="text-right font-medium">Q{balance.previous.toFixed(2)}</td></tr>
                    <tr className={isCustomerPayment ? 'text-green-600' : 'text-red-600'}><td className="py-1">{isCustomerPayment ? '(+) Este Abono:' : '(-) Este Abono:'}</td><td className="text-right font-medium">Q{payment.amount.toFixed(2)}</td></tr>
                    <tr className="font-bold border-t text-lg"><td className="py-2">Nuevo Saldo Pendiente:</td><td className="text-right">Q{balance.new.toFixed(2)}</td></tr>
                </tbody>
            </table>
        </div>
        
        <div className="mt-24 grid grid-cols-2 gap-16">
            <div className="text-center border-t border-black pt-2">
                <p>Firma del Cliente / Proveedor</p>
            </div>
             <div className="text-center border-t border-black pt-2">
                <p>Firma y Sello del Cajero</p>
            </div>
        </div>
    </div>
  );
};
