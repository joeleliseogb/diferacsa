import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const u = await prisma.user.findUnique({
      where: { id },
      include: { branch: true },
    });

    if (!u) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      role: u.role,
      branchId: u.branchId,
      branchName: u.branch?.name || 'Casa Matriz',
      pin: u.pin,
      password: u.password,
    });
  } catch (error) {
    console.error('Error in GET /api/users/[id]:', error);
    return NextResponse.json({ error: 'Error al consultar usuario' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const username = (body.username || body.name.split(' ')[0]).toLowerCase().replace(/\s+/g, '_');
    const email = body.email || `${username}@diferacsa.com`;

    const user = await prisma.user.upsert({
      where: { id },
      update: {
        name: body.name,
        role: body.role,
        email,
        pin: body.pin || '1234',
        password: body.password || 'admin',
      },
      create: {
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

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error in PUT /api/users/[id]:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.user.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'Usuario eliminado' });
  } catch (error) {
    console.error('Error in DELETE /api/users/[id]:', error);
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
