
'use client';

import type { CompanyInfo, Branch } from '@/lib/settings-service';
import type { Movement } from '@/lib/servicios';
import Image from 'next/image';

export interface ReportData {
  date: string;
  initialBalance: number;
  totalSales: number;
  totalCollections: number;
  totalManualEntries: number;
  totalSupplierPayments: number;
  totalManualExpenses: number;
  finalBalance: number;
  cashInBox: number;
  difference: number;
  paymentsByMethod: { name: string; total: number }[];
  movements: Movement[];
}

interface PrintableReportProps {
  reportData: ReportData;
  companyInfo: CompanyInfo;
  branchInfo?: Branch;
}

export const PrintableCashRegisterReport = ({ reportData, companyInfo, branchInfo }: PrintableReportProps) => {
  if (!reportData || !companyInfo) {
    return null;
  }
  
  const displayInfo = {
    name: branchInfo?.name || companyInfo.name,
    address: branchInfo?.address || companyInfo.address,
    logoUrl: branchInfo?.logoUrl || companyInfo.logoUrl
  };

  const totalIngresos = reportData.totalSales + reportData.totalCollections + reportData.totalManualEntries;
  const totalEgresos = reportData.totalSupplierPayments + reportData.totalManualExpenses;

  return (
    <div className="bg-white text-black p-8 font-sans text-sm w-[210mm] min-h-[297mm]">
      <header className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
          {displayInfo.logoUrl && (
            <Image src={displayInfo.logoUrl} alt="Logo" width={80} height={80} className="object-contain" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{displayInfo.name}</h1>
            <p>{displayInfo.address}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-700">REPORTE DE CIERRE DE CAJA</h2>
          <p className="font-mono text-base">Fecha: {new Date(reportData.date).toLocaleString('es-GT')}</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="border p-4 rounded-md text-center">
          <p className="text-xs text-gray-500 uppercase">Saldo Final Esperado</p>
          <p className="text-2xl font-bold">Q{reportData.finalBalance.toFixed(2)}</p>
        </div>
        <div className="border p-4 rounded-md text-center">
          <p className="text-xs text-gray-500 uppercase">Monto Contado en Caja</p>
          <p className="text-2xl font-bold">Q{reportData.cashInBox.toFixed(2)}</p>
        </div>
        <div className={`border p-4 rounded-md text-center ${reportData.difference === 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className="text-xs text-gray-500 uppercase">Diferencia</p>
          <p className={`text-2xl font-bold ${reportData.difference === 0 ? 'text-green-700' : 'text-red-700'}`}>
            Q{reportData.difference.toFixed(2)}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="border p-4 rounded-md">
            <h3 className="font-bold text-lg mb-2 border-b pb-2">Resumen de Totales</h3>
            <table className="w-full text-sm">
                <tbody>
                    <tr><td className="py-1">Saldo Inicial del Día:</td><td className="text-right font-medium">Q{reportData.initialBalance.toFixed(2)}</td></tr>
                    <tr className="text-green-600"><td className="py-1 pl-4">Total Ingresos:</td><td className="text-right font-medium">+ Q{totalIngresos.toFixed(2)}</td></tr>
                    <tr className="text-red-600"><td className="py-1 pl-4">Total Egresos:</td><td className="text-right font-medium">- Q{totalEgresos.toFixed(2)}</td></tr>
                    <tr className="font-bold border-t"><td className="py-1">Saldo Final Calculado:</td><td className="text-right">Q{reportData.finalBalance.toFixed(2)}</td></tr>
                </tbody>
            </table>
        </div>
         <div className="border p-4 rounded-md">
            <h3 className="font-bold text-lg mb-2 border-b pb-2">Totales por Forma de Pago</h3>
            <table className="w-full text-sm">
                <tbody>
                    {reportData.paymentsByMethod.map(p => (
                         <tr key={p.name}><td className="py-1">{p.name}:</td><td className="text-right font-medium">Q{p.total.toFixed(2)}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="font-bold text-lg mb-2 border-b pb-2">Detalle de Movimientos del Día</h3>
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 w-1/4">Hora</th>
              <th className="p-2">Tipo</th>
              <th className="p-2 w-1/2">Concepto</th>
              <th className="p-2 text-right">Ingreso</th>
              <th className="p-2 text-right">Egreso</th>
            </tr>
          </thead>
          <tbody>
            {reportData.movements.map((m, i) => (
              <tr key={i} className="border-b last:border-b-0">
                <td className="p-2">{new Date(m.fecha).toLocaleTimeString('es-GT')}</td>
                <td className="p-2">{m.tipo}</td>
                <td className="p-2">{m.concepto}</td>
                <td className="p-2 text-right text-green-600">{m.ingreso > 0 ? `Q${m.ingreso.toFixed(2)}` : ''}</td>
                <td className="p-2 text-right text-red-600">{m.egreso > 0 ? `Q${m.egreso.toFixed(2)}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

       <footer className="mt-12 absolute bottom-8 left-0 right-0 px-8">
        <div className="grid grid-cols-2 gap-8 border-t pt-4">
            <div>
                <p className="font-semibold mb-1">Elaborado por:</p>
                <div className="border-b h-12"></div>
                <p className="text-xs mt-1">Nombre y Firma del Cajero</p>
            </div>
             <div>
                <p className="font-semibold mb-1">Revisado por:</p>
                 <div className="border-b h-12"></div>
                <p className="text-xs mt-1">Nombre y Firma del Supervisor</p>
            </div>
        </div>
      </footer>
    </div>
  );
};
