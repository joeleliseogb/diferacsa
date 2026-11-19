
'use client';

import type { Order, Customer, Quote, RepairOrder } from '@/lib/data';
import type { CompanyInfo } from '@/lib/settings-service';
import type { DeliveryRoute } from '@/lib/delivery-service';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';

type DocumentType = 'order' | 'quote' | 'manifest' | 'repair';

interface PrintableDocumentProps {
  type: DocumentType;
  data: {
    order?: Order;
    quote?: Quote;
    route?: DeliveryRoute;
    repair?: RepairOrder;
    customer?: Customer;
  };
  companyInfo: CompanyInfo;
}

export const PrintableDocument = ({ type, data, companyInfo }: PrintableDocumentProps) => {

  if (!companyInfo) return null;

  const renderFooter = () => (
     <footer className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
        <p>Gracias por su preferencia.</p>
        <p className="mt-2">Este negocio opera con <a href="https://simplygest.cai.gt" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">SimplyGest</a></p>
    </footer>
  );

  const renderOrder = (order: Order, customer: Customer) => {
    const primaryCustomerAddress = customer.addresses.find(a => a.isPrimary) || customer.addresses[0];
    const primaryCustomerPhone = customer.phones.find(p => p.isPrimary) || customer.phones[0];
    return (
        <>
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
         <div className="mt-8">
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
            </div>
        </div>
        </>
    )
  };

  const renderQuote = (quote: Quote, customer: Customer) => {
    const primaryCustomerAddress = customer.addresses.find(a => a.isPrimary) || customer.addresses[0];
    const primaryCustomerPhone = customer.phones.find(p => p.isPrimary) || customer.phones[0];
    return (
        <>
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
                <h2 className="text-2xl font-bold text-gray-700">PRESUPUESTO</h2>
                <p className="font-mono text-lg">{quote.id}</p>
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
                    <h3 className="font-bold mb-2 border-b pb-1">Detalles del Presupuesto</h3>
                    <p><span className="font-semibold">Fecha de Emisión:</span> {new Date(quote.date).toLocaleDateString('es-GT')}</p>
                    <p><span className="font-semibold">Fecha de Vencimiento:</span> {new Date(quote.expiryDate).toLocaleDateString('es-GT')}</p>
                    <p><span className="font-semibold">Estado:</span> {quote.status}</p>
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
                    {quote.products.map((product, index) => (
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
            <div className="mt-8">
                <div className="flex justify-end">
                <div className="w-1/3">
                    <div className="flex justify-between font-bold text-lg border-t-2 border-gray-800 pt-2">
                    <span>TOTAL</span>
                    <span>{quote.total}</span>
                    </div>
                </div>
                </div>
                 <div className="mt-12 text-center text-xs text-gray-500">
                <p>Precios expresados en Quetzales. Este presupuesto es válido hasta la fecha de vencimiento.</p>
                </div>
            </div>
        </>
    )
  };

  const renderManifest = (route: DeliveryRoute) => {
    return (
        <>
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
                    {route.orders.map((order, index) => (
                    <div key={order.id} className="border rounded-md break-inside-avoid">
                        <div className="bg-gray-100 p-2 border-b">
                        <h3 className="font-bold">PARADA {index + 1}: {(order as any).customerName || 'Cliente Desconocido'}</h3>
                        <p className="text-xs">Pedido: {order.id} | Dirección: {order.deliveryAddress?.street}, {order.deliveryAddress?.city}</p>
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
                    ))}
                </div>
            </main>
            <div className="mt-12 absolute bottom-8 left-0 right-0 px-8">
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
            </div>
        </>
    )
  };
  
    const renderRepairOrder = (repair: RepairOrder, customer: Customer) => {
    return (
      <>
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
            <h2 className="text-2xl font-bold text-gray-700">ORDEN DE REPARACIÓN</h2>
            <p className="font-mono text-lg">{repair.id}</p>
          </div>
        </header>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="border p-4 rounded-md">
            <h3 className="font-bold mb-2 border-b pb-1">Cliente</h3>
            <p className="font-bold">{customer.name}</p>
            <p>{customer.addresses.find(a => a.isPrimary)?.street || customer.addresses[0]?.street}</p>
            <p>{customer.email}</p>
            <p>{customer.phones.find(p => p.isPrimary)?.number || customer.phones[0]?.number}</p>
            <p>NIT: {customer.nit}</p>
          </div>
          <div className="border p-4 rounded-md">
            <h3 className="font-bold mb-2 border-b pb-1">Equipo</h3>
            <p><span className="font-semibold">Tipo:</span> {repair.equipment.type}</p>
            <p><span className="font-semibold">Marca/Modelo:</span> {repair.equipment.brand} {repair.equipment.model}</p>
            <p><span className="font-semibold">Serie:</span> {repair.equipment.serialNumber}</p>
             <div className="mt-2 pt-2 border-t">
              <p className="font-semibold">Problema Reportado:</p>
              <p className="text-sm italic">"{repair.reportedIssues}"</p>
            </div>
          </div>
        </div>
        <main>
          {repair.diagnosis && (
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-2 border-b pb-1">Diagnóstico Técnico</h3>
              <p className="text-sm p-2 bg-gray-50 rounded-md">{repair.diagnosis}</p>
            </div>
          )}
          {repair.quote && (repair.quote.parts.length > 0 || repair.quote.laborCost > 0) && (
             <div className="mb-6">
              <h3 className="font-bold text-lg mb-2 border-b pb-1">Cotización</h3>
              <table className="w-full text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 w-1/2">Descripción</th>
                    <th className="p-2 text-right">Cant.</th>
                    <th className="p-2 text-right">Precio Unit.</th>
                    <th className="p-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(repair.quote.parts || []).map((part, index) => (
                    <tr key={index} className="border-b"><td className="p-2">{part.name}</td><td className="p-2 text-right">{part.qty}</td><td className="p-2 text-right">Q{part.price.toFixed(2)}</td><td className="p-2 text-right">Q{(part.qty * part.price).toFixed(2)}</td></tr>
                  ))}
                  {repair.quote.laborCost > 0 && (
                     <tr className="border-b"><td className="p-2">Mano de Obra</td><td className="p-2 text-right">1</td><td className="p-2 text-right">Q{repair.quote.laborCost.toFixed(2)}</td><td className="p-2 text-right">Q{repair.quote.laborCost.toFixed(2)}</td></tr>
                  )}
                </tbody>
              </table>
              <div className="flex justify-end mt-2">
                <div className="w-1/3">
                    <div className="flex justify-between font-bold text-lg border-t-2 border-gray-800 pt-2">
                    <span>TOTAL</span>
                    <span>Q{repair.quote.total.toFixed(2)}</span>
                    </div>
                </div>
              </div>
            </div>
          )}

          {repair.incidents && repair.incidents.length > 0 && (
            <div className="mb-6 break-inside-avoid">
              <h3 className="font-bold text-lg mb-2 border-b pb-1">Bitácora de Seguimiento</h3>
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 w-1/4">Fecha</th>
                    <th className="p-2">Evento / Incidencia</th>
                  </tr>
                </thead>
                <tbody>
                  {repair.incidents.map((incident, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="p-2">{format(new Date(incident.date), 'dd/MM/yyyy HH:mm')}</td>
                      <td className="p-2">{incident.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

           <div className="text-sm mt-8 border p-2 rounded-md bg-gray-50 break-inside-avoid">
            <h3 className="font-bold mb-1">Términos y Condiciones</h3>
            <p className="text-[10px] leading-tight">El equipo se recibe para diagnóstico. No nos hacemos responsables por la pérdida de datos o accesorios no reportados. Los presupuestos tienen una validez de 15 días. Equipos no reclamados en 60 días serán considerados abandonados.</p>
           </div>
        </main>
        <footer className="mt-12 absolute bottom-8 left-0 right-0 px-8">
            <div className="grid grid-cols-2 gap-8 border-t pt-4">
                <div>
                    <p className="font-semibold mb-1">Firma de Aceptación del Cliente:</p>
                    <div className="border-b h-12"></div>
                    <p className="text-xs mt-1 text-center">{customer.name}</p>
                </div>
                <div>
                    <p className="font-semibold mb-1">Recibido por (Taller):</p>
                    <div className="border-b h-12"></div>
                    <p className="text-xs mt-1 text-center">{companyInfo.name}</p>
                </div>
            </div>
        </footer>
      </>
    );
  };


  const renderContent = () => {
    switch (type) {
      case 'order':
        if (data.order && data.customer) return renderOrder(data.order, data.customer);
        return null;
      case 'quote':
        if (data.quote && data.customer) return renderQuote(data.quote, data.customer);
        return null;
      case 'manifest':
        if (data.route) return renderManifest(data.route);
        return null;
      case 'repair':
        if (data.repair && data.customer) return renderRepairOrder(data.repair, data.customer);
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white text-black p-8 font-sans text-sm w-[210mm] min-h-[297mm] relative">
      {renderContent()}
      {renderFooter()}
    </div>
  );
};
