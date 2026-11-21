import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const customerId = searchParams.get('customerId');

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { invoiceNumber: { contains: search } },
        { id: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { nit: { contains: search } } },
      ];
    }
    if (customerId) {
      whereClause.customerId = customerId;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              nit: true,
            },
          },
          items: {
            take: 10,
          },
        },
        take: limit,
        skip: offset,
        orderBy: { date: 'desc' },
      }),
      prisma.invoice.count({ where: whereClause }),
    ]);

    const formatted = invoices.map((inv) => ({
      invoice: inv.invoiceNumber || inv.id,
      id: inv.id,
      date: inv.date ? inv.date.toISOString().split('T')[0] : '',
      customerName: inv.customer?.name || 'Consumidor Final',
      customerId: inv.customerId || 'CF',
      customerNit: inv.customer?.nit || 'CF',
      total: `Q${inv.total.toFixed(2)}`,
      totalNumber: inv.total,
      remaining: inv.balance,
      status: inv.isCancelled ? 'Anulado' : inv.balance > 0 ? 'Pendiente' : 'Pagado',
      paymentMethod: inv.isCredit ? 'Crédito' : 'Efectivo',
      itemsCount: inv.items.length,
    }));

    return NextResponse.json({
      items: formatted,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in GET /api/invoices:', error);
    return NextResponse.json({ error: 'Error al consultar facturas' }, { status: 500 });
  }
}
