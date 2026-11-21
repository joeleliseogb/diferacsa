import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const dbTiers = await prisma.productPrice.findMany({
      distinct: ['tierName'],
      select: { tierName: true },
    });

    const tierOrder = ['Normal', 'Mayorista', 'Especial'];
    const names = dbTiers.map((t: { tierName: string }) => t.tierName);
    
    const descriptions: Record<string, string> = {
      Normal: 'Precio regular de mostrador (consumidor final)',
      Mayorista: 'Precio con descuento para ventas por volumen',
      Especial: 'Tarifa preferencial para clientes frecuentes y contratistas',
    };

    const items = tierOrder.map((name, index) => ({
      id: index + 1,
      name,
      description: descriptions[name] || `Tarifa ${name}`,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error in GET /api/price-tiers:', error);
    return NextResponse.json({
      items: [
        { id: 1, name: 'Normal', description: 'Precio regular de mostrador (consumidor final)' },
        { id: 2, name: 'Mayorista', description: 'Precio con descuento para ventas por volumen' },
        { id: 3, name: 'Especial', description: 'Tarifa preferencial para clientes frecuentes y contratistas' },
      ]
    });
  }
}
