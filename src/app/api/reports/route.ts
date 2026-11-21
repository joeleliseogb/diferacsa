import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function serializeBigInt(obj: any): any {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )
  );
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all'; // 'all', '2026', '2025', '2024', '12months', 'custom'
    const startDateParam = searchParams.get('startDate') || '';
    const endDateParam = searchParams.get('endDate') || '';

    // Filtros de fecha dinámicos según el período o rango personalizado
    let invoiceDateFilter = '';
    let purchaseDateFilter = '';
    let trendQuery = '';
    let periodDays = 365;

    if (startDateParam && endDateParam) {
      const startISO = `${startDateParam}T00:00:00Z`;
      const endISO = `${endDateParam}T23:59:59Z`;
      invoiceDateFilter = `AND date >= '${startISO}' AND date <= '${endISO}'`;
      purchaseDateFilter = `AND date >= '${startISO}' AND date <= '${endISO}'`;

      const startD = new Date(startDateParam);
      const endD = new Date(endDateParam);
      const diffDays = Math.ceil(Math.abs(endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
      periodDays = Math.max(1, diffDays);

      if (diffDays <= 45) {
        trendQuery = `
          SELECT 
            strftime('%Y-%m-%d', date) as label, 
            count(*) as salesCount, 
            round(sum(total), 2) as totalSales
          FROM Invoice 
          WHERE isCancelled = 0 ${invoiceDateFilter}
          GROUP BY label 
          ORDER BY label ASC
        `;
      } else if (diffDays <= 730) {
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
        trendQuery = `
          SELECT 
            strftime('%Y', date) as label, 
            count(*) as salesCount, 
            round(sum(total), 2) as totalSales
          FROM Invoice 
          WHERE isCancelled = 0 ${invoiceDateFilter}
          GROUP BY label 
          ORDER BY label ASC
        `;
      }
    } else if (period === 'all') {
      periodDays = 365;
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
    } else if (period === 'this_month') {
      periodDays = 31;
      invoiceDateFilter = "AND date >= '2026-05-01T00:00:00Z' AND date <= '2026-05-31T23:59:59Z'";
      purchaseDateFilter = "AND date >= '2026-05-01T00:00:00Z' AND date <= '2026-05-31T23:59:59Z'";
      trendQuery = `
        SELECT 
          strftime('%Y-%m-%d', date) as label, 
          count(*) as salesCount, 
          round(sum(total), 2) as totalSales
        FROM Invoice 
        WHERE isCancelled = 0 ${invoiceDateFilter}
        GROUP BY label 
        ORDER BY label ASC
      `;
    } else if (period === 'last_month') {
      periodDays = 30;
      invoiceDateFilter = "AND date >= '2026-04-01T00:00:00Z' AND date <= '2026-04-30T23:59:59Z'";
      purchaseDateFilter = "AND date >= '2026-04-01T00:00:00Z' AND date <= '2026-04-30T23:59:59Z'";
      trendQuery = `
        SELECT 
          strftime('%Y-%m-%d', date) as label, 
          count(*) as salesCount, 
          round(sum(total), 2) as totalSales
        FROM Invoice 
        WHERE isCancelled = 0 ${invoiceDateFilter}
        GROUP BY label 
        ORDER BY label ASC
      `;
    } else if (period === 'last_30_days') {
      periodDays = 30;
      invoiceDateFilter = "AND date >= '2026-04-18T00:00:00Z' AND date <= '2026-05-18T23:59:59Z'";
      purchaseDateFilter = "AND date >= '2026-04-18T00:00:00Z' AND date <= '2026-05-18T23:59:59Z'";
      trendQuery = `
        SELECT 
          strftime('%Y-%m-%d', date) as label, 
          count(*) as salesCount, 
          round(sum(total), 2) as totalSales
        FROM Invoice 
        WHERE isCancelled = 0 ${invoiceDateFilter}
        GROUP BY label 
        ORDER BY label ASC
      `;
    } else if (period === '12months') {
      periodDays = 365;
      invoiceDateFilter = "AND date >= '2025-05-01T00:00:00Z' AND date <= '2026-05-31T23:59:59Z'";
      purchaseDateFilter = "AND date >= '2025-05-01T00:00:00Z' AND date <= '2026-05-31T23:59:59Z'";
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
      const targetYear = period.replace(/[^0-9]/g, '');
      periodDays = targetYear === '2026' ? 148 : 365;
      invoiceDateFilter = `AND date >= '${targetYear}-01-01T00:00:00Z' AND date <= '${targetYear}-12-31T23:59:59Z'`;
      purchaseDateFilter = `AND date >= '${targetYear}-01-01T00:00:00Z' AND date <= '${targetYear}-12-31T23:59:59Z'`;
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

    // Ejecución paralela de consultas analíticas principales
    const [
      salesKpiRaw,
      purchasesKpiRaw,
      customersKpiRaw,
      stockKpiRaw,
      trendRaw,
      paymentDistributionRaw,
      categoryRaw,
      salespeopleRaw,
      fiscalYearsRaw,
      monthlyRaw,
      topProductsRaw,
      topCustomersRaw,
      topDebtorsRaw,
      topSuppliersRaw,
      recentCreditMovementsRaw,
      catalogSummaryRaw,
      reorderRaw,
    ]: any[] = await Promise.all([
      // 1. KPIs de Ventas
      prisma.$queryRawUnsafe(`
        SELECT 
          count(*) as count, 
          coalesce(sum(total), 0) as totalSales,
          coalesce(sum(case when isCredit = 1 then total else 0 end), 0) as creditSales,
          coalesce(sum(case when isCredit = 0 then total else 0 end), 0) as cashSales
        FROM Invoice 
        WHERE isCancelled = 0 ${invoiceDateFilter}
      `),
      // 2. KPIs de Compras
      prisma.$queryRawUnsafe(`
        SELECT 
          count(*) as count, 
          coalesce(sum(total), 0) as totalPurchases 
        FROM Purchase 
        WHERE isCancelled = 0 ${purchaseDateFilter}
      `),
      // 3. KPIs de Clientes y Deuda
      prisma.$queryRawUnsafe(`
        SELECT 
          count(*) as totalCustomers, 
          count(case when currentBalance > 0 then 1 end) as debtorsCount,
          coalesce(sum(case when currentBalance > 0 then currentBalance else 0 end), 0) as totalReceivable 
        FROM Customer
      `),
      // 4. KPIs de Inventario
      prisma.$queryRawUnsafe(`
        SELECT 
          count(DISTINCT productId) as totalCatalogProducts, 
          coalesce(sum(quantity), 0) as totalUnitsInStock 
        FROM ProductStock
      `),
      // 5. Tendencia temporal
      prisma.$queryRawUnsafe(trendQuery),
      // 6. Contado vs Crédito
      prisma.$queryRawUnsafe(`
        SELECT 
          case when isCredit = 1 then 'Crédito' else 'Contado' end as name,
          count(*) as count,
          round(sum(total), 2) as value
        FROM Invoice 
        WHERE isCancelled = 0 ${invoiceDateFilter}
        GROUP BY isCredit
      `),
      // 7. Comparativa entre Familias (Categorías)
      prisma.$queryRawUnsafe(`
        SELECT 
          cat.id,
          cat.name, 
          count(DISTINCT p.id) as productCount, 
          coalesce(sales.unitsSold, 0) as unitsSold, 
          coalesce(sales.totalSales, 0) as totalSales,
          (SELECT coalesce(sum(ps.quantity), 0) FROM ProductStock ps JOIN Product p2 ON ps.productId = p2.id WHERE p2.categoryId = cat.id) as inStock
        FROM Category cat
        LEFT JOIN Product p ON p.categoryId = cat.id
        LEFT JOIN (
          SELECT 
            p.categoryId,
            round(sum(ii.quantity), 0) as unitsSold,
            round(sum(ii.total), 2) as totalSales
          FROM Invoice inv
          JOIN InvoiceItem ii ON ii.invoiceId = inv.id
          JOIN Product p ON ii.productId = p.id
          WHERE inv.isCancelled = 0 ${invoiceDateFilter}
          GROUP BY p.categoryId
        ) sales ON sales.categoryId = cat.id
        GROUP BY cat.id
        ORDER BY totalSales DESC
      `),
      // 8. Comparativa entre Vendedores / Cajeros
      prisma.$queryRawUnsafe(`
        SELECT 
          coalesce(nullif(trim(cashierName), ''), 'Cajero General') as name,
          count(*) as invoiceCount,
          round(sum(total), 2) as totalSales,
          round(avg(total), 2) as averageTicket,
          round(sum(case when isCredit = 1 then total else 0 end), 2) as creditSales,
          round(sum(case when isCredit = 0 then total else 0 end), 2) as cashSales
        FROM Invoice
        WHERE isCancelled = 0 ${invoiceDateFilter}
        GROUP BY name
        ORDER BY totalSales DESC
        LIMIT 15
      `),
      // 9. Comparativa entre Periodos Fiscales (Años)
      prisma.$queryRawUnsafe(`
        SELECT 
          strftime('%Y', date) as fiscalYear,
          count(*) as invoiceCount,
          round(sum(total), 2) as totalSales,
          round(avg(total), 2) as averageTicket,
          round(sum(case when isCredit = 1 then total else 0 end), 2) as creditSales,
          round(sum(case when isCredit = 0 then total else 0 end), 2) as cashSales
        FROM Invoice
        WHERE isCancelled = 0
        GROUP BY fiscalYear
        ORDER BY fiscalYear ASC
      `),
      // 10. Desglose Mensual para Comparativa Anual (Últimos años)
      prisma.$queryRawUnsafe(`
        SELECT 
          strftime('%Y', date) as year,
          strftime('%m', date) as month,
          count(*) as invoiceCount,
          round(sum(total), 2) as totalSales
        FROM Invoice
        WHERE isCancelled = 0 AND strftime('%Y', date) >= '2023'
        GROUP BY year, month
        ORDER BY year ASC, month ASC
      `),
      // 11. Top Productos
      prisma.$queryRawUnsafe(`
        SELECT 
          p.id, 
          p.sku, 
          p.name, 
          round(sum(ii.quantity), 0) as qtySold, 
          round(sum(ii.total), 2) as totalAmount,
          (SELECT coalesce(sum(ps.quantity), 0) FROM ProductStock ps WHERE ps.productId = p.id) as inStock
        FROM Invoice inv
        JOIN InvoiceItem ii ON ii.invoiceId = inv.id
        JOIN Product p ON ii.productId = p.id
        WHERE inv.isCancelled = 0 ${invoiceDateFilter}
        GROUP BY p.id
        ORDER BY totalAmount DESC
        LIMIT 20
      `),
      // 12. Top Clientes
      prisma.$queryRawUnsafe(`
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
      `),
      // 13. Top Deudores
      prisma.$queryRawUnsafe(`
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
      `),
      // 14. Comparativa de Proveedores
      prisma.$queryRawUnsafe(`
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
      `),
      // 15. Últimos Abonos de Crédito
      prisma.$queryRawUnsafe(`
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
      `),
      // 16. Catálogo de Artículos para Comparador Interactivo
      prisma.$queryRawUnsafe(`
        SELECT 
          p.id, 
          p.sku, 
          p.name, 
          coalesce(sales.salesCount, 0) as salesCount,
          (SELECT coalesce(sum(ps.quantity), 0) FROM ProductStock ps WHERE ps.productId = p.id) as inStock,
          (SELECT coalesce(min(pp.price), 0) FROM ProductPrice pp WHERE pp.productId = p.id AND pp.tierName = 'Normal') as priceNormal,
          (SELECT coalesce(min(pp.price), 0) FROM ProductPrice pp WHERE pp.productId = p.id AND pp.tierName = 'Mayorista') as priceMayorista
        FROM Product p
        LEFT JOIN (
          SELECT ii.productId, round(sum(ii.quantity), 0) as salesCount
          FROM Invoice inv
          JOIN InvoiceItem ii ON ii.invoiceId = inv.id
          WHERE inv.isCancelled = 0 ${invoiceDateFilter}
          GROUP BY ii.productId
        ) sales ON sales.productId = p.id
        ORDER BY salesCount DESC
        LIMIT 500
      `),
      // 17. Punto de Pedido y Reposición de Inventario (Top 400 productos con rotación activa)
      prisma.$queryRawUnsafe(`
        SELECT 
          p.id,
          p.sku,
          p.name,
          coalesce(cat.name, 'GENERAL') as categoryName,
          (SELECT coalesce(sum(quantity), 0) FROM ProductStock WHERE productId = p.id) as currentStock,
          (SELECT coalesce(max(minStock), 5) FROM ProductStock WHERE productId = p.id) as minStock,
          round(coalesce(sales.unitsSold, 0), 0) as unitsSold,
          (SELECT coalesce(min(pp.price), 0) FROM ProductPrice pp WHERE pp.productId = p.id AND pp.tierName = 'Normal') as priceNormal
        FROM (
          SELECT ii.productId, round(sum(ii.quantity), 0) as unitsSold
          FROM Invoice inv
          JOIN InvoiceItem ii ON ii.invoiceId = inv.id
          WHERE inv.isCancelled = 0 ${invoiceDateFilter}
          GROUP BY ii.productId
          ORDER BY unitsSold DESC
          LIMIT 400
        ) sales
        JOIN Product p ON sales.productId = p.id
        LEFT JOIN Category cat ON p.categoryId = cat.id
        ORDER BY sales.unitsSold DESC
      `),
    ]);

    const salesKpi = salesKpiRaw[0] || {};
    const purchasesKpi = purchasesKpiRaw[0] || {};
    const customersKpi = customersKpiRaw[0] || {};
    const stockKpi = stockKpiRaw[0] || {};

    const totalSalesNum = Number(salesKpi.totalSales || 0);
    const totalSalesCount = Number(salesKpi.count || 0);
    const averageTicket = totalSalesCount > 0 ? totalSalesNum / totalSalesCount : 0;

    // Calcular porcentajes de Familias
    const sumCategories = categoryRaw.reduce((sum: number, c: any) => sum + Number(c.totalSales || 0), 0);
    const categoryComparison = categoryRaw.map((cat: any) => ({
      ...cat,
      percentage: sumCategories > 0 ? Math.round((Number(cat.totalSales) / sumCategories) * 1000) / 10 : 0,
    }));

    // Calcular porcentajes de Vendedores
    const sumSalespeople = salespeopleRaw.reduce((sum: number, s: any) => sum + Number(s.totalSales || 0), 0);
    const salespeopleComparison = salespeopleRaw.map((sp: any) => ({
      ...sp,
      percentage: sumSalespeople > 0 ? Math.round((Number(sp.totalSales) / sumSalespeople) * 1000) / 10 : 0,
    }));

    // Calcular Crecimiento YoY (Año tras Año) en Períodos Fiscales
    const fiscalPeriodsComparison = fiscalYearsRaw.map((fy: any, index: number) => {
      let growthPct = 0;
      if (index > 0) {
        const prevSales = Number(fiscalYearsRaw[index - 1].totalSales || 0);
        const currSales = Number(fy.totalSales || 0);
        if (prevSales > 0) {
          growthPct = Math.round(((currSales - prevSales) / prevSales) * 1000) / 10;
        }
      }
      return {
        ...fy,
        growthPct,
      };
    });

    // Formatear Comparativa Mensual Agrupada (Ene-Dic) para 2024, 2025, 2026
    const monthlyMatrix: Record<string, Record<string, number>> = {};
    for (let m = 1; m <= 12; m++) {
      const monthKey = String(m).padStart(2, '0');
      const label = MONTH_NAMES[m - 1];
      monthlyMatrix[monthKey] = { label, '2024': 0, '2025': 0, '2026': 0 } as any;
    }

    monthlyRaw.forEach((row: any) => {
      const m = row.month;
      const y = row.year;
      if (monthlyMatrix[m] && (y === '2024' || y === '2025' || y === '2026')) {
        monthlyMatrix[m][y] = Number(row.totalSales || 0);
      }
    });
    const monthlyComparisonByYear = Object.values(monthlyMatrix);

    // Calcular porcentajes de Proveedores
    const sumPurchases = topSuppliersRaw.reduce((sum: number, s: any) => sum + Number(s.totalPurchased || 0), 0);
    const supplierComparison = topSuppliersRaw.map((sup: any) => ({
      ...sup,
      percentage: sumPurchases > 0 ? Math.round((Number(sup.totalPurchased) / sumPurchases) * 1000) / 10 : 0,
    }));

    // 17. Analítica de Punto de Pedido y Reposición de Inventario
    const defaultLeadTime = 7;
    const defaultCoverage = 30;
    let criticalCount = 0;
    let reorderCount = 0;
    let optimalCount = 0;
    let totalReplenishmentCost = 0;

    const reorderItems = (reorderRaw || []).map((item: any) => {
      const unitsSold = Number(item.unitsSold || 0);
      const currentStock = Number(item.currentStock || 0);
      const minStock = Number(item.minStock || 5);
      const priceNormal = Number(item.priceNormal || 0);

      const dailyDemand = Math.round((unitsSold / Math.max(1, periodDays)) * 100) / 100;
      const safetyStock = Math.max(minStock, Math.ceil(dailyDemand * 2));
      const reorderPoint = Math.ceil(dailyDemand * defaultLeadTime) + safetyStock;
      const targetStock = Math.ceil(dailyDemand * defaultCoverage) + safetyStock;

      let status: 'CRITICAL' | 'REORDER' | 'OPTIMAL' = 'OPTIMAL';
      let suggestedQty = 0;

      if (currentStock <= minStock || currentStock <= safetyStock) {
        status = 'CRITICAL';
        suggestedQty = Math.max(0, targetStock - currentStock);
        criticalCount++;
      } else if (currentStock <= reorderPoint) {
        status = 'REORDER';
        suggestedQty = Math.max(0, targetStock - currentStock);
        reorderCount++;
      } else {
        status = 'OPTIMAL';
        suggestedQty = 0;
        optimalCount++;
      }

      const estimatedCost = Math.round(suggestedQty * priceNormal * 100) / 100;
      totalReplenishmentCost += estimatedCost;

      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        categoryName: item.categoryName,
        currentStock,
        minStock,
        unitsSold,
        priceNormal,
        dailyDemand,
        safetyStock,
        reorderPoint,
        targetStock,
        suggestedQty,
        estimatedCost,
        status,
      };
    });

    const reorderAnalytics = {
      periodDays,
      defaultLeadTime,
      defaultCoverage,
      criticalCount,
      reorderCount,
      optimalCount,
      totalReplenishmentCost: Math.round(totalReplenishmentCost * 100) / 100,
      items: reorderItems,
    };

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
      categoryComparison,
      salespeopleComparison,
      fiscalPeriodsComparison,
      monthlyComparisonByYear,
      supplierComparison,
      topProducts: topProductsRaw,
      topCustomers: topCustomersRaw,
      topDebtors: topDebtorsRaw,
      recentCreditMovements: recentCreditMovementsRaw,
      catalogSummary: catalogSummaryRaw,
      reorderAnalytics,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Error in GET /api/reports:', error);
    return NextResponse.json({ error: 'Error al generar reportes y estadísticas' }, { status: 500 });
  }
}
