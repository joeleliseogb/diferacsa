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
    const period = searchParams.get('period') || '2026'; // '2026', 'all', '2025', '2024', 'month', 'today'

    let invoiceDateFilter = '';
    let purchaseDateFilter = '';
    let isDailyTrend = false;
    let isYearlyTrend = false;

    if (period === 'all') {
      isYearlyTrend = true;
      invoiceDateFilter = '';
      purchaseDateFilter = '';
    } else if (period === 'today') {
      // Día más reciente o fecha actual
      const todayISO = new Date().toISOString().split('T')[0];
      invoiceDateFilter = `AND date >= '${todayISO}T00:00:00Z' AND date <= '${todayISO}T23:59:59Z'`;
      purchaseDateFilter = `AND date >= '${todayISO}T00:00:00Z' AND date <= '${todayISO}T23:59:59Z'`;
      isDailyTrend = true;
    } else if (period === 'month' || period === 'this_month') {
      // Mes activo 2026-05
      invoiceDateFilter = "AND date >= '2026-05-01T00:00:00Z' AND date <= '2026-05-31T23:59:59Z'";
      purchaseDateFilter = "AND date >= '2026-05-01T00:00:00Z' AND date <= '2026-05-31T23:59:59Z'";
      isDailyTrend = true;
    } else {
      // Por defecto o año específico ('2026', '2025', '2024', etc.)
      const targetYear = period.replace(/[^0-9]/g, '') || '2026';
      invoiceDateFilter = `AND date >= '${targetYear}-01-01T00:00:00Z' AND date <= '${targetYear}-12-31T23:59:59Z'`;
      purchaseDateFilter = `AND date >= '${targetYear}-01-01T00:00:00Z' AND date <= '${targetYear}-12-31T23:59:59Z'`;
    }

    // Consultas en paralelo
    const [
      salesKpiRaw,
      purchasesKpiRaw,
      customersKpiRaw,
      stockKpiRaw,
      trendRaw,
      recentInvoicesRaw,
    ]: any[] = await Promise.all([
      // 1. KPIs de Ventas
      prisma.$queryRawUnsafe(`
        SELECT 
          count(*) as salesCount, 
          coalesce(sum(total), 0) as totalSales,
          count(DISTINCT customerId) as activeCustomers,
          coalesce(avg(total), 0) as averageTicket,
          coalesce(sum(case when isCredit = 1 then total else 0 end), 0) as creditSales,
          coalesce(sum(case when isCredit = 0 then total else 0 end), 0) as cashSales
        FROM Invoice 
        WHERE isCancelled = 0 ${invoiceDateFilter}
      `),
      // 2. KPIs de Compras / Costos
      prisma.$queryRawUnsafe(`
        SELECT 
          count(*) as purchaseCount, 
          coalesce(sum(total), 0) as totalPurchases 
        FROM Purchase 
        WHERE isCancelled = 0 ${purchaseDateFilter}
      `),
      // 3. Clientes y Cuentas por Cobrar
      prisma.$queryRawUnsafe(`
        SELECT 
          count(*) as totalCustomers, 
          count(case when currentBalance > 0 then 1 end) as debtorsCount,
          coalesce(sum(case when currentBalance > 0 then currentBalance else 0 end), 0) as totalReceivable 
        FROM Customer
      `),
      // 4. Inventario Global
      prisma.$queryRawUnsafe(`
        SELECT 
          count(DISTINCT productId) as totalCatalogProducts, 
          coalesce(sum(quantity), 0) as totalUnitsInStock 
        FROM ProductStock
      `),
      // 5. Tendencia temporal para el gráfico
      prisma.$queryRawUnsafe(
        isDailyTrend
          ? `
            SELECT 
              strftime('%d', date) as label, 
              round(sum(total), 2) as total,
              count(*) as salesCount
            FROM Invoice 
            WHERE isCancelled = 0 ${invoiceDateFilter}
            GROUP BY label 
            ORDER BY label ASC
          `
          : isYearlyTrend
          ? `
            SELECT 
              strftime('%Y', date) as label, 
              round(sum(total), 2) as total,
              count(*) as salesCount
            FROM Invoice 
            WHERE isCancelled = 0
            GROUP BY label 
            ORDER BY label ASC
          `
          : `
            SELECT 
              strftime('%m', date) as label, 
              round(sum(total), 2) as total,
              count(*) as salesCount
            FROM Invoice 
            WHERE isCancelled = 0 ${invoiceDateFilter}
            GROUP BY label 
            ORDER BY label ASC
          `
      ),
      // 6. Actividad y Ventas Recientes (Últimas transacciones reales)
      prisma.$queryRawUnsafe(`
        SELECT 
          inv.id, 
          inv.invoiceNumber, 
          inv.date, 
          round(inv.total, 2) as total, 
          inv.isCredit, 
          coalesce(c.name, 'CONSUMIDOR FINAL') as customerName,
          (SELECT count(*) FROM InvoiceItem ii WHERE ii.invoiceId = inv.id) as itemCount
        FROM Invoice inv
        LEFT JOIN Customer c ON inv.customerId = c.id
        WHERE inv.isCancelled = 0
        ORDER BY inv.date DESC
        LIMIT 6
      `),
    ]);

    const salesKpi = salesKpiRaw[0] || {};
    const purchasesKpi = purchasesKpiRaw[0] || {};
    const customersKpi = customersKpiRaw[0] || {};
    const stockKpi = stockKpiRaw[0] || {};

    const totalSalesNum = Number(salesKpi.totalSales || 0);
    const totalPurchasesNum = Number(purchasesKpi.totalPurchases || 0);
    const salesCountNum = Number(salesKpi.salesCount || 0);
    const activeCustomersNum = Number(salesKpi.activeCustomers || 0);

    // Margen operativo y ganancia neta estimada
    // En ferretería y distribución, el margen promedio sobre facturación suele rondar 20-30% si compras del período es parcial
    let grossProfit = 0;
    if (totalPurchasesNum > 0 && totalPurchasesNum < totalSalesNum) {
      grossProfit = totalSalesNum - totalPurchasesNum;
    } else {
      grossProfit = totalSalesNum * 0.28; // Estimación base del 28% de margen comercial
    }
    const netMarginPct = totalSalesNum > 0 ? Math.round((grossProfit / totalSalesNum) * 1000) / 10 : 0;
    const costsPct = Math.max(0, Math.round((100 - netMarginPct) * 10) / 10);

    // Formatear datos del gráfico
    let chartData: Array<{ name: string; total: number; salesCount: number }> = [];

    if (isDailyTrend) {
      chartData = (trendRaw || []).map((r: any) => ({
        name: `Día ${Number(r.label)}`,
        total: Number(r.total || 0),
        salesCount: Number(r.salesCount || 0),
      }));
    } else if (isYearlyTrend) {
      chartData = (trendRaw || []).map((r: any) => ({
        name: r.label,
        total: Number(r.total || 0),
        salesCount: Number(r.salesCount || 0),
      }));
    } else {
      // Gráfico mensual Ene-Dic
      const monthMap: Record<string, { total: number; salesCount: number }> = {};
      (trendRaw || []).forEach((r: any) => {
        monthMap[r.label] = {
          total: Number(r.total || 0),
          salesCount: Number(r.salesCount || 0),
        };
      });

      chartData = MONTH_NAMES.map((name, idx) => {
        const monthKey = String(idx + 1).padStart(2, '0');
        const match = monthMap[monthKey] || { total: 0, salesCount: 0 };
        return {
          name,
          total: match.total,
          salesCount: match.salesCount,
        };
      });
    }

    const payload = serializeBigInt({
      period,
      summary: {
        totalSales: totalSalesNum,
        salesCount: salesCountNum,
        activeCustomers: activeCustomersNum,
        averageTicket: Math.round(Number(salesKpi.averageTicket || 0) * 100) / 100,
        creditSales: Number(salesKpi.creditSales || 0),
        cashSales: Number(salesKpi.cashSales || 0),
        totalPurchases: totalPurchasesNum,
        purchaseCount: Number(purchasesKpi.purchaseCount || 0),
        grossProfit: Math.round(grossProfit * 100) / 100,
        netMarginPct,
        costsPct,
        totalCustomers: Number(customersKpi.totalCustomers || 0),
        totalReceivable: Number(customersKpi.totalReceivable || 0),
        debtorsCount: Number(customersKpi.debtorsCount || 0),
        totalCatalogProducts: Number(stockKpi.totalCatalogProducts || 0),
        totalUnitsInStock: Number(stockKpi.totalUnitsInStock || 0),
      },
      chartData,
      composition: [
        { name: 'Costos y Egresos', value: Math.max(1, totalSalesNum - grossProfit), color: '#1E2538', percentage: costsPct },
        { name: 'Ganancia Neta', value: Math.max(1, grossProfit), color: '#F25C3B', percentage: netMarginPct },
      ],
      recentInvoices: recentInvoicesRaw || [],
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error in GET /api/dashboard:', error);
    return NextResponse.json({ error: 'Error al cargar datos del dashboard' }, { status: 500 });
  }
}
