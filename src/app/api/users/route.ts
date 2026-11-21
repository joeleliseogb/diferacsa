import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    const whereClause: any = {};
    if (branchId) {
      whereClause.branchId = branchId;
    }

    const users = await prisma.user.findMany({
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
      orderBy: { name: 'asc' },
    });

    const formatted = users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      role: u.role,
      branchId: u.branchId,
      branchName: u.branch?.name || 'Casa Matriz',
      pin: u.pin,
      password: u.password,
    }));

    return NextResponse.json({ items: formatted, total: formatted.length });
  } catch (error) {
    console.error('Error in GET /api/users:', error);
    return NextResponse.json({ error: 'Error al consultar usuarios' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id || `usr-${Date.now()}`;
    const username = (body.username || body.name.split(' ')[0]).toLowerCase().replace(/\s+/g, '_');
    const email = body.email || `${username}@diferacsa.com`;

    const user = await prisma.user.create({
      data: {
        id,
        username,
        name: body.name,
        email,
        role: body.role || 'Vendedor',
        branchId: body.branchId || 'branch-matriz',
        pin: body.pin || '1234',
        password: body.password || 'admin',
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/users:', error);
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}
