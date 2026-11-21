import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Customer } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { nit: { contains: search } },
        { id: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [dbCustomers, total] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: { name: 'asc' },
      }),
      prisma.customer.count({ where: whereClause }),
    ]);

    const formatted: Customer[] = dbCustomers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email || '',
      phones: c.phone ? [{ id: 1, number: c.phone, isPrimary: true }] : [],
      type: c.hasCredit ? 'Mayorista' : 'Minorista',
      avatar: c.name.substring(0, 2).toUpperCase(),
      nit: c.nit || 'CF',
      fiscalName: c.fiscalName || c.name,
      totalSpent: '0.00',
      lastPurchase: c.createdAt.toISOString().split('T')[0],
      priceTier: c.priceTier,
      creditLimit: c.creditLimit.toFixed(2),
      creditTerms: c.hasCredit ? 'Crédito 30 días' : 'Contado',
      currentBalance: c.currentBalance.toFixed(2),
      usualPaymentMethod: c.hasCredit ? 'Crédito' : 'Efectivo',
      maxSalesDiscount: c.maxDiscount.toFixed(2),
      addresses: c.address ? [{ id: 1, street: c.address, city: 'Tacaná', isPrimary: true }] : [],
      purchaseHistory: [],
      notes: '',
    }));

    return NextResponse.json({
      items: formatted,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in GET /api/customers:', error);
    return NextResponse.json({ error: 'Error al consultar clientes' }, { status: 500 });
  }
}
