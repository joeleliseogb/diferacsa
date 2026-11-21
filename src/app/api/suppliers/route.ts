import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Supplier } from '@/lib/supplier-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const whereClause: any = {};
    if (search.trim()) {
      const term = search.trim();
      whereClause.OR = [
        { name: { contains: term } },
        { contactPerson: { contains: term } },
        { nit: { contains: term } },
        { phone: { contains: term } },
        { email: { contains: term } },
        { address: { contains: term } },
      ];
    }

    const [dbSuppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
      }),
      prisma.supplier.count({ where: whereClause }),
    ]);

    const items: Supplier[] = dbSuppliers.map((s) => {
      const initials = s.name
        .split(' ')
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'PV';

      return {
        id: s.id,
        name: s.name,
        avatar: initials,
        contactPerson: s.contactPerson || 'N/A',
        email: s.email || '',
        phones: s.phone ? [{ id: 1, number: s.phone, isPrimary: true }] : [],
        addresses: s.address
          ? [{ id: 1, street: s.address, city: 'Guatemala', isPrimary: true }]
          : [],
        nit: s.nit || 'C/F',
        fiscalName: s.name,
        creditTerms: s.hasCredit ? 'Crédito 30 días' : 'Contado',
        currentBalance: `Q${(s.currentBalance || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        maxPurchaseDiscount: '0%',
        usualPaymentMethod: 'Transferencia Bancaria',
        notes: '',
        purchaseHistory: [],
      };
    });

    return NextResponse.json({
      items,
      total,
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json({ error: 'Error al consultar proveedores' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id || String(Date.now());

    const created = await prisma.supplier.create({
      data: {
        id,
        name: body.name,
        contactPerson: body.contactPerson || '',
        nit: body.nit || '',
        phone: body.phones?.[0]?.number || body.phone || '',
        email: body.email || '',
        address: body.addresses?.[0]?.street || body.address || '',
        currentBalance: typeof body.currentBalance === 'number' ? body.currentBalance : 0,
        hasCredit: body.creditTerms?.includes('Crédito') ?? false,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json({ error: 'Error al crear proveedor' }, { status: 500 });
  }
}
