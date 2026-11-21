import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchCode = searchParams.get('branchCode');

    const whereClause: any = {};
    if (branchCode) {
      whereClause.branch = { code: branchCode };
    }

    const warehouses = await prisma.warehouse.findMany({
      where: whereClause,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { isDefault: 'desc' },
    });

    const formatted = warehouses.map((w, idx) => ({
      id: idx + 1,
      dbId: w.id,
      code: w.code,
      name: w.name,
      location: 'Tacaná, San Marcos',
      capacity: '2000 m²',
      manager: idx === 0 ? 'Melvin René González' : 'Seyler González',
      branch: w.branch?.name || 'Casa Matriz - Ferretería González (Tacaná)',
      isDefault: w.isDefault,
    }));

    return NextResponse.json({ items: formatted });
  } catch (error) {
    console.error('Error in GET /api/warehouses:', error);
    return NextResponse.json({ error: 'Error al consultar bodegas' }, { status: 500 });
  }
}
