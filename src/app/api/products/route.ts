import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Product } from '@/lib/product-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const categoryId = searchParams.get('categoryId');

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { id: { contains: search } },
      ];
    }
    if (categoryId) {
      whereClause.categoryId = parseInt(categoryId, 10);
    }

    const [dbProducts, total, stockAgg] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          category: true,
          stocks: true,
          prices: true,
        },
        take: limit,
        skip: offset,
        orderBy: { name: 'asc' },
      }),
      prisma.product.count({ where: whereClause }),
      prisma.productStock.aggregate({
        _sum: { quantity: true },
      }),
    ]);

    const formatted: Product[] = dbProducts.map((p) => {
      const stockList = p.stocks.map((s) => ({
        warehouseId: 1, // Casa Matriz Bodega 1
        warehouseName: 'Bodega Principal / Sala de Ventas',
        quantity: s.quantity,
      }));

      const priceList = p.prices.map((pr, idx) => ({
        tierId: idx + 1,
        tierName: pr.tierName,
        price: pr.price,
      }));

      // Si no tiene precios explícitos, agregar precio normal por defecto
      if (priceList.length === 0) {
        priceList.push({ tierId: 1, tierName: 'Normal', price: 0 });
      }

      return {
        id: p.id,
        name: p.name,
        description: p.description || p.name,
        isService: p.isService,
        codes: [
          { id: 1, type: 'SKU', value: p.sku },
          { id: 2, type: 'EAN', value: p.barcode || p.sku },
        ],
        attributes: { size: 'Estándar', color: 'N/A' },
        images: [{ id: 1, url: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=150', isPrimary: true }],
        stock: stockList.length > 0 ? stockList : [{ warehouseId: 1, warehouseName: 'Bodega Principal', quantity: 0 }],
        reservedStock: 0,
        prices: priceList,
        tax: { id: 1, name: 'IVA 12%', rate: p.taxRate },
        family: { id: p.categoryId || 1, name: p.category?.name || 'General' },
        suppliers: [],
        history: [],
      };
    });

    return NextResponse.json({
      items: formatted,
      total,
      totalStock: stockAgg._sum.quantity || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    return NextResponse.json({ error: 'Error al consultar productos' }, { status: 500 });
  }
}
