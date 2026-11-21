import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function serializeBigInt(obj: any): any {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all'; // 'all', '2026', '2025', '2024', '12months'

    // Filtros de fecha dinámicos según el período
    let invoiceDateFilter = '';
    let purchaseDateFilter = '';
    let trendQuery = '';

    if (period === 'all') {
      trendQuery = `
        SELECT 
          strftime('%Y', date) as label, 
          count(*) as salesCount, 
          round(sum(total), 2) as totalSales
        FROM Invoice 
        WHERE isCancelled = 0 
        GROUP BY label 
        ORDER BY label ASC
      `;
    } else if (period === '12months') {
      invoiceDateFilter = "AND date >= '2025-05-01T00:00:00Z'";
      purchaseDateFilter = "AND date >= '2025-05-01T00:00:00Z'";
      trendQuery = `
        SELECT 
          strftime('%Y-%m', date) as label, 
          count(*) as salesCount, 
          round(sum(total), 2) as totalSales
        FROM Invoice 
        WHERE isCancelled = 0 ${invoiceDateFilter}
        GROUP BY label 
        ORDER BY label ASC
      `;
    } else {
      // Un año específico (e.g. '2026', '2025', '2024')
      const targetYear = period.replace(/[^0-9]/g, '');
      invoiceDateFilter = `AND strftime('%Y', date) = '${targetYear}'`;
      purchaseDateFilter = `AND strftime('%Y', date) = '${targetYear}'`;
      trendQuery = `
        SELECT 
          strftime('%Y-%m', date) as label, 
          count(*) as salesCount, 
          round(sum(total), 2) as totalSales
        FROM Invoice 
        WHERE isCancelled = 0 ${invoiceDateFilter}
        GROUP BY label 
        ORDER BY label ASC
      `;
    }

    // 1. Métricas Globales (KPIs)
    const [salesKpiRaw, purchasesKpiRaw, customersKpiRaw, stockKpiRaw]: any[] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT 
          count(*) as count, 
          coalesce(sum(total), 0) as totalSales,
          coalesce(sum(case when isCredit = 1 then total else 0 end), 0) as creditSales,
          coalesce(sum(case when isCredit = 0 then total else 0 end), 0) as cashSales
        FROM Invoice 
        WHERE isCancelled = 0 ${invoiceDateFilter}
      `),
      prisma.$queryRawUnsafe(`
        SELECT 
          count(*) as count, 
          coalesce(sum(total), 0) as totalPurchases 
        FROM Purchase 
        WHERE isCancelled = 0 ${purchaseDateFilter}
      `),
      prisma.$queryRawUnsafe(`
        SELECT 
          count(*) as totalCustomers, 
          count(case when currentBalance > 0 then 1 end) as debtorsCount,
          coalesce(sum(case when currentBalance > 0 then currentBalance else 0 end), 0) as totalReceivable 
        FROM Customer
      `),
      prisma.$queryRawUnsafe(`
        SELECT 
          count(DISTINCT productId) as totalCatalogProducts, 
          coalesce(sum(quantity), 0) as totalUnitsInStock 
        FROM ProductStock
      `),
    ]);

    const salesKpi = salesKpiRaw[0] || {};
    const purchasesKpi = purchasesKpiRaw[0] || {};
    const customersKpi = customersKpiRaw[0] || {};
    const stockKpi = stockKpiRaw[0] || {};

    const totalSalesNum = Number(salesKpi.totalSales || 0);
    const totalSalesCount = Number(salesKpi.count || 0);
    const averageTicket = totalSalesCount > 0 ? totalSalesNum / totalSalesCount : 0;

    // 2. Tendencia de Ventas (para gráficos)
    const trendRaw = await prisma.$queryRawUnsafe(trendQuery);

    // 3. Distribución Contado vs Crédito
    const paymentDistributionRaw: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        case when isCredit = 1 then 'Crédito' else 'Contado' end as name,
        count(*) as count,
        round(sum(total), 2) as value
      FROM Invoice 
      WHERE isCancelled = 0 ${invoiceDateFilter}
      GROUP BY isCredit
    `);

    // 4. Top 15 Productos Más Vendidos
    const topProductsRaw: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        p.id, 
        p.sku, 
        p.name, 
        round(sum(ii.quantity), 0) as qtySold, 
        round(sum(ii.total), 2) as totalAmount,
        (SELECT coalesce(sum(ps.quantity), 0) FROM ProductStock ps WHERE ps.productId = p.id) as inStock
      FROM InvoiceItem ii
      JOIN Product p ON ii.productId = p.id
      GROUP BY p.id
      ORDER BY qtySold DESC
      LIMIT 15
    `);

    // 5. Top 15 Clientes de Mayor Facturación
    const topCustomersRaw: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        c.id, 
        c.name, 
        c.nit, 
        count(i.id) as invoiceCount, 
        round(sum(i.total), 2) as totalSpent, 
        round(c.currentBalance, 2) as currentBalance, 
        c.creditLimit
      FROM Invoice i
      JOIN Customer c ON i.customerId = c.id
      WHERE i.isCancelled = 0 ${invoiceDateFilter}
      GROUP BY c.id
      ORDER BY totalSpent DESC
      LIMIT 15
    `);

    // 6. Top 15 Clientes con Deuda (Cuentas por Cobrar)
    const topDebtorsRaw: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        id, 
        name, 
        nit, 
        phone, 
        round(currentBalance, 2) as balance, 
        round(creditLimit, 2) as limitCredit
      FROM Customer
      WHERE currentBalance > 0
      ORDER BY currentBalance DESC
      LIMIT 15
    `);

    // 7. Top Proveedores por Compras
    const topSuppliersRaw: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        s.id, 
        s.name, 
        s.nit, 
        s.phone,
        count(p.id) as purchaseCount, 
        round(sum(p.total), 2) as totalPurchased
      FROM Purchase p
      JOIN Supplier s ON p.supplierId = s.id
      WHERE p.isCancelled = 0 ${purchaseDateFilter}
      GROUP BY s.id
      ORDER BY totalPurchased DESC
      LIMIT 15
    `);

    // 8. Últimos Abonos de Crédito
    const recentCreditMovementsRaw: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        m.id, 
        m.date, 
        m.reason, 
        round(m.debit, 2) as debit, 
        round(m.credit, 2) as credit, 
        round(m.balance, 2) as balance, 
        m.userName, 
        c.name as customerName
      FROM CustomerCreditMovement m
      JOIN Customer c ON m.customerId = c.id
      ORDER BY m.date DESC
      LIMIT 15
    `);

    const responsePayload = serializeBigInt({
      period,
      summary: {
        totalSales: totalSalesNum,
        salesCount: totalSalesCount,
        averageTicket: Math.round(averageTicket * 100) / 100,
        creditSales: Number(salesKpi.creditSales || 0),
        cashSales: Number(salesKpi.cashSales || 0),
        creditSalesPct: totalSalesNum > 0 ? Math.round((Number(salesKpi.creditSales || 0) / totalSalesNum) * 100) : 0,
        totalPurchases: Number(purchasesKpi.totalPurchases || 0),
        purchaseCount: Number(purchasesKpi.count || 0),
        totalReceivable: Number(customersKpi.totalReceivable || 0),
        debtorsCount: Number(customersKpi.debtorsCount || 0),
        totalCustomers: Number(customersKpi.totalCustomers || 0),
        totalCatalogProducts: Number(stockKpi.totalCatalogProducts || 0),
        totalUnitsInStock: Number(stockKpi.totalUnitsInStock || 0),
      },
      salesTrend: trendRaw,
      paymentDistribution: paymentDistributionRaw,
      topProducts: topProductsRaw,
      topCustomers: topCustomersRaw,
      topDebtors: topDebtorsRaw,
      topSuppliers: topSuppliersRaw,
      recentCreditMovements: recentCreditMovementsRaw,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Error in GET /api/reports:', error);
    return NextResponse.json({ error: 'Error al generar reportes y estadísticas' }, { status: 500 });
  }
}
