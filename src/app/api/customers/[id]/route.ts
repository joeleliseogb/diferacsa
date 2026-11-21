import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Customer } from '@/lib/data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const c = await prisma.customer.findUnique({
      where: { id },
      include: {
        invoices: {
          take: 50,
          orderBy: { date: 'desc' },
          include: { items: true },
        },
      },
    });

    if (!c) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const allProductIds = Array.from(
      new Set(
        (c.invoices || []).flatMap((inv) => (inv.items || []).map((it) => it.productId))
      )
    );

    const products = allProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: allProductIds } },
          select: { id: true, name: true, sku: true },
        })
      : [];

    const productMap = new Map(products.map((p) => [p.id, p]));

    const purchases = (c.invoices || []).map((inv) => ({
      invoice: inv.invoiceNumber,
      date: inv.date.toISOString().split('T')[0],
      total: `Q${inv.total.toFixed(2)}`,
      status: inv.isCancelled ? ('Anulado' as const) : inv.isCredit ? ('Pendiente de Pago' as const) : ('Pagado' as const),
      products: (inv.items || []).map((it) => {
        const prod = productMap.get(it.productId);
        return {
          sku: prod?.sku || it.productId,
          name: prod?.name || it.productId,
          qty: it.quantity,
          price: it.price,
        };
      }),
      branchId: inv.branchId,
    }));

    const formatted: Customer = {
      id: c.id,
      name: c.name,
      email: c.email || '',
      phones: c.phone ? [{ id: 1, number: c.phone, isPrimary: true }] : [],
      type: c.hasCredit ? 'Mayorista' : 'Minorista',
      avatar: c.name.substring(0, 2).toUpperCase(),
      nit: c.nit || 'CF',
      fiscalName: c.fiscalName || c.name,
      totalSpent: `Q${(c.invoices || []).reduce((sum, inv) => sum + inv.total, 0).toFixed(2)}`,
      lastPurchase: c.invoices && c.invoices[0] ? c.invoices[0].date.toISOString().split('T')[0] : 'N/A',
      priceTier: c.priceTier,
      creditLimit: `Q${c.creditLimit.toFixed(2)}`,
      creditTerms: c.hasCredit ? 'Crédito 30 días' : 'Contado',
      currentBalance: `Q${c.currentBalance.toFixed(2)}`,
      usualPaymentMethod: c.hasCredit ? 'Crédito' : 'Efectivo',
      maxSalesDiscount: `${c.maxDiscount}%`,
      addresses: c.address ? [{ id: 1, street: c.address, city: 'Tacaná', isPrimary: true }] : [],
      purchaseHistory: purchases,
      notes: '',
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error in GET /api/customers/[id]:', error);
    return NextResponse.json({ error: 'Error al obtener cliente' }, { status: 500 });
  }
}
