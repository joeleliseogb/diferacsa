import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Supplier } from '@/lib/supplier-data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const s = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchases: {
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, name: true, sku: true },
                },
              },
            },
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!s) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
    }

    const initials = s.name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'PV';

    const purchases = (s.purchases || []).map((p) => ({
      order: p.orderNumber,
      date: p.date ? p.date.toISOString().split('T')[0] : '',
      total: `Q${p.total.toFixed(2)}`,
      status: p.status as any,
      products: p.items.map((it) => ({
        sku: it.product?.sku || it.productId,
        name: it.product?.name || it.productId,
        qty: it.quantity,
        cost: it.unitCost,
      })),
    }));

    const supplier: Supplier = {
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
      purchaseHistory: purchases,
    };

    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier by id:', error);
    return NextResponse.json({ error: 'Error al consultar proveedor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        name: body.name,
        contactPerson: body.contactPerson || '',
        nit: body.nit || '',
        phone: body.phones?.[0]?.number || body.phone || '',
        email: body.email || '',
        address: body.addresses?.[0]?.street || body.address || '',
        hasCredit: body.creditTerms?.includes('Crédito') ?? false,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating supplier:', error);
    return NextResponse.json({ error: 'Error al actualizar proveedor' }, { status: 500 });
  }
}
