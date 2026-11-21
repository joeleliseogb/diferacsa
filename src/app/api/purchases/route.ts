import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');

    const whereClause: any = {};
    if (search.trim()) {
      const term = search.trim();
      whereClause.OR = [
        { orderNumber: { contains: term } },
        { id: { contains: term } },
        { notes: { contains: term } },
        { supplier: { name: { contains: term } } },
      ];
    }

    if (supplierId) {
      whereClause.supplierId = supplierId;
    }

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where: whereClause,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              nit: true,
              phone: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { date: 'desc' },
      }),
      prisma.purchase.count({ where: whereClause }),
    ]);

    const formatted = purchases.map((p) => ({
      order: p.orderNumber,
      id: p.id,
      date: p.date ? p.date.toISOString().split('T')[0] : '',
      supplierId: p.supplierId,
      supplierName: p.supplier?.name || 'Proveedor General',
      total: `Q${p.total.toFixed(2)}`,
      totalNumber: p.total,
      status: p.status,
      isCredit: p.isCredit,
      notes: p.notes,
      products: p.items.map((it) => ({
        sku: it.product?.sku || it.productId,
        name: it.product?.name || it.productId,
        qty: it.quantity,
        cost: it.unitCost,
        total: it.total,
      })),
    }));

    return NextResponse.json({
      items: formatted,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in GET /api/purchases:', error);
    return NextResponse.json({ error: 'Error al consultar compras' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id || `compra-${Date.now()}`;
    const branchId = body.branchId || 'branch-matriz';

    const created = await prisma.purchase.create({
      data: {
        id,
        branchId,
        orderNumber: body.order || `OC-${Date.now()}`,
        supplierId: body.supplierId,
        date: body.date ? new Date(body.date) : new Date(),
        total: typeof body.total === 'number' ? body.total : parseFloat(String(body.total).replace(/[^0-9.]/g, '')) || 0,
        isCredit: body.isCredit ?? false,
        status: body.status || 'Recibido',
        notes: body.notes || '',
        items: {
          create: (body.products || []).map((prod: any) => ({
            productId: prod.productId || prod.sku,
            quantity: prod.qty || 1,
            unitCost: prod.cost || 0,
            total: (prod.qty || 1) * (prod.cost || 0),
          })),
        },
      },
      include: {
        supplier: true,
        items: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/purchases:', error);
    return NextResponse.json({ error: 'Error al registrar compra' }, { status: 500 });
  }
}
