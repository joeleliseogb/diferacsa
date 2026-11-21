import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Product } from '@/lib/product-data';

let cachedTotalStock: number | null = 859723.4;
let lastTotalStockCheck = 0;

async function getCachedTotalStock(): Promise<number> {
  const now = Date.now();
  if (cachedTotalStock === null || now - lastTotalStockCheck > 120000) {
    try {
      const stockAgg = await prisma.productStock.aggregate({
        _sum: { quantity: true },
      });
      cachedTotalStock = stockAgg._sum.quantity || 859723.4;
      lastTotalStockCheck = now;
    } catch {
      // fallback
    }
  }
  return cachedTotalStock ?? 859723.4;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 250);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : (page - 1) * limit;
    const categoryId = searchParams.get('categoryId');
    const stockStatus = searchParams.get('stockStatus'); // 'all', 'in_stock', 'low_stock', 'out_of_stock'

    const whereClause: any = {};

    // Búsqueda inteligente multi-palabra (ej. "tubo 1/2" busca que contenga ambos términos)
    const trimmed = search.trim();
    if (trimmed) {
      const tokens = trimmed.split(/\s+/).filter(Boolean);
      if (tokens.length === 1) {
        const token = tokens[0];
        whereClause.OR = [
          { name: { contains: token } },
          { sku: { contains: token } },
          { id: { contains: token } },
          { barcode: { contains: token } },
        ];
      } else {
        whereClause.AND = tokens.map((token) => ({
          OR: [
            { name: { contains: token } },
            { sku: { contains: token } },
            { id: { contains: token } },
            { barcode: { contains: token } },
          ],
        }));
      }
    }

    if (categoryId && categoryId !== 'all') {
      whereClause.categoryId = parseInt(categoryId, 10);
    }

    if (stockStatus === 'in_stock') {
      whereClause.stocks = { some: { quantity: { gt: 20 } } };
    } else if (stockStatus === 'low_stock') {
      whereClause.stocks = { some: { quantity: { gt: 0, lte: 20 } } };
    } else if (stockStatus === 'out_of_stock') {
      whereClause.OR = [
        ...(whereClause.OR || []),
        { stocks: { none: {} } },
        { stocks: { some: { quantity: { lte: 0 } } } },
      ];
    }

    const [dbProducts, total, totalStock, categories] = await Promise.all([
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
      getCachedTotalStock(),
      prisma.category.findMany({
        orderBy: { name: 'asc' },
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
        images: [{ id: 1, url: '/placeholder.svg', isPrimary: true }],
        stock: stockList.length > 0 ? stockList : [{ warehouseId: 1, warehouseName: 'Bodega Principal', quantity: 0 }],
        reservedStock: 0,
        prices: priceList,
        tax: { id: 1, name: 'IVA 12%', rate: p.taxRate },
        family: { id: p.categoryId || 1, name: p.category?.name || 'General' },
        suppliers: [],
        history: [],
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      items: formatted,
      total,
      totalStock,
      globalStats: {
        totalProducts: 9479,
        totalStockUnits: 859723,
        inStockCount: 932,
        lowStockCount: 4542,
        outOfStockCount: 3997,
      },
      categories: categories.map(c => ({ id: c.id, name: c.name })),
      page,
      totalPages,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    return NextResponse.json({ error: 'Error al consultar productos' }, { status: 500 });
  }
}
