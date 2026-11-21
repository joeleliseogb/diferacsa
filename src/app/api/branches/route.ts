import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        warehouses: true,
      },
      orderBy: { isMain: 'desc' },
    });

    const formatted = branches.map((b, idx) => ({
      id: idx + 1,
      dbId: b.id,
      code: b.code,
      name: b.name,
      address: b.address || '',
      phone: b.phone || '',
      isMain: b.isMain,
    }));

    return NextResponse.json({ items: formatted });
  } catch (error) {
    console.error('Error in GET /api/branches:', error);
    return NextResponse.json({ error: 'Error al consultar sucursales' }, { status: 500 });
  }
}
