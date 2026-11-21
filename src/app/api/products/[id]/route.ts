import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Product } from '@/lib/product-data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let p = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stocks: true,
        prices: true,
      },
    });

    if (!p) {
      // Try searching by SKU if not found by ID
      const bySku = await prisma.product.findFirst({
        where: { sku: id },
        include: {
          category: true,
          stocks: true,
          prices: true,
        },
      });
      p = bySku;
    }

    if (!p) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const stockList = p.stocks.map((s) => ({
      warehouseId: 1,
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

    const formatted: Product = {
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

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error in GET /api/products/[id]:', error);
    return NextResponse.json({ error: 'Error al obtener producto' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: Product = await request.json();

    const sku = body.codes?.find((c) => c.type === 'SKU')?.value || body.id;

    // Actualizar producto base
    await prisma.product.upsert({
      where: { id },
      update: {
        name: body.name,
        description: body.description,
        sku,
        isService: body.isService || false,
        taxRate: body.tax?.rate || 0.12,
        categoryId: body.family?.id || 1,
      },
      create: {
        id,
        sku,
        name: body.name,
        description: body.description,
        isService: body.isService || false,
        taxRate: body.tax?.rate || 0.12,
        categoryId: body.family?.id || 1,
      },
    });

    // Actualizar precios
    if (body.prices && body.prices.length > 0) {
      for (const pr of body.prices) {
        await prisma.productPrice.upsert({
          where: {
            productId_tierName: {
              productId: id,
              tierName: pr.tierName,
            },
          },
          update: { price: pr.price },
          create: {
            productId: id,
            tierName: pr.tierName,
            price: pr.price,
          },
        });
      }
    }

    // Actualizar stock
    if (body.stock && body.stock.length > 0) {
      for (const st of body.stock) {
        await prisma.productStock.upsert({
          where: {
            productId_warehouseId: {
              productId: id,
              warehouseId: 'wh-matriz-1',
            },
          },
          update: { quantity: st.quantity },
          create: {
            productId: id,
            warehouseId: 'wh-matriz-1',
            quantity: st.quantity,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/products/[id]:', error);
    return NextResponse.json({ error: 'Error al guardar producto' }, { status: 500 });
  }
}
