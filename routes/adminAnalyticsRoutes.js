/**
 * =================================================================================================
 * RUTAS DE API PARA ANÁLISIS Y MÉTRICAS (ADMIN)
 * =================================================================================================
 * Endpoints para obtener datos de análisis y métricas desde el panel de administración.
 */

import express from 'express';
import databaseService from '../services/databaseService.js';
import { isAdmin } from '../middleware/authMiddleware.js';
import { format, subDays, parseISO } from 'date-fns';

const router = express.Router();
const db = databaseService.getDb();

/**
 * Obtener datos de análisis generales
 * GET /api/admin/analytics
 */
router.get('/analytics', isAdmin, async (req, res) => {
  try {
    // Parámetros de fecha
    const startDate = req.query.start ? parseISO(req.query.start) : subDays(new Date(), 30);
    const endDate = req.query.end ? parseISO(req.query.end) : new Date();
    
    // Formatear fechas para consultas SQL
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    // Datos de ingresos
    const revenueData = await getRevenueData(startDateStr, endDateStr);
    
    // Datos de suscripciones
    const subscriptionData = await getSubscriptionData(startDateStr, endDateStr);
    
    // Datos de usuarios
    const userData = await getUserData(startDateStr, endDateStr);
    
    // Datos de uso
    const usageData = await getUsageData(startDateStr, endDateStr);
    
    res.json({
      revenue: revenueData,
      subscriptions: subscriptionData,
      users: userData,
      usage: usageData
    });
  } catch (error) {
    console.error('Error al obtener datos de análisis:', error);
    res.status(500).json({ error: 'Error al obtener datos de análisis' });
  }
});

/**
 * Exportar datos de análisis
 * GET /api/admin/analytics/export
 */
router.get('/analytics/export', isAdmin, async (req, res) => {
  try {
    // Parámetros de fecha y formato
    const startDate = req.query.start ? parseISO(req.query.start) : subDays(new Date(), 30);
    const endDate = req.query.end ? parseISO(req.query.end) : new Date();
    const format = req.query.format || 'csv';
    
    // Formatear fechas para consultas SQL
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    // Obtener todos los datos
    const revenueData = await getRevenueData(startDateStr, endDateStr);
    const subscriptionData = await getSubscriptionData(startDateStr, endDateStr);
    const userData = await getUserData(startDateStr, endDateStr);
    const usageData = await getUsageData(startDateStr, endDateStr);
    
    const analyticsData = {
      revenue: revenueData,
      subscriptions: subscriptionData,
      users: userData,
      usage: usageData
    };
    
    // Generar archivo según formato solicitado
    switch (format.toLowerCase()) {
      case 'csv':
        generateCSV(res, analyticsData, startDateStr, endDateStr);
        break;
      case 'pdf':
        generatePDF(res, analyticsData, startDateStr, endDateStr);
        break;
      case 'xlsx':
        generateExcel(res, analyticsData, startDateStr, endDateStr);
        break;
      default:
        generateCSV(res, analyticsData, startDateStr, endDateStr);
    }
  } catch (error) {
    console.error('Error al exportar datos de análisis:', error);
    res.status(500).json({ error: 'Error al exportar datos de análisis' });
  }
});

/**
 * Obtener datos de ingresos
 */
async function getRevenueData(startDate, endDate) {
  // Total de ingresos en el período
  const [totalRevenue] = await db.raw(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM payments
    WHERE created_at BETWEEN ? AND ?
  `, [startDate, endDate]);
  
  // Ingresos por tipo de plan
  const [planRevenue] = await db.raw(`
    SELECT 
      CASE 
        WHEN p.plan LIKE '%annual%' THEN 'annual'
        ELSE 'monthly'
      END as plan_type,
      COALESCE(SUM(p.amount), 0) as total
    FROM payments p
    WHERE p.created_at BETWEEN ? AND ?
    GROUP BY plan_type
  `, [startDate, endDate]);
  
  // Ingresos por período (diario, semanal o mensual según el rango)
  const [periodRevenue] = await db.raw(`
    SELECT 
      DATE_FORMAT(created_at, '%Y-%m-%d') as period,
      COALESCE(SUM(amount), 0) as value
    FROM payments
    WHERE created_at BETWEEN ? AND ?
    GROUP BY period
    ORDER BY period
  `, [startDate, endDate]);
  
  // Encontrar valores para planes mensuales y anuales
  const monthlyRevenue = planRevenue.find(item => item.plan_type === 'monthly')?.total || 0;
  const annualRevenue = planRevenue.find(item => item.plan_type === 'annual')?.total || 0;
  
  return {
    total: parseFloat(totalRevenue[0]?.total || 0),
    monthly: parseFloat(monthlyRevenue),
    annual: parseFloat(annualRevenue),
    byPeriod: periodRevenue.map(item => ({
      period: item.period,
      value: parseFloat(item.value)
    }))
  };
}

/**
 * Obtener datos de suscripciones
 */
async function getSubscriptionData(startDate, endDate) {
  // Total de suscripciones
  const [totalCount] = await db.raw(`
    SELECT COUNT(*) as total
    FROM subscriptions
  `);
  
  // Suscripciones activas
  const [activeCount] = await db.raw(`
    SELECT COUNT(*) as active
    FROM subscriptions
    WHERE status = 'active'
  `);
  
  // Suscripciones canceladas
  const [canceledCount] = await db.raw(`
    SELECT COUNT(*) as canceled
    FROM subscriptions
    WHERE status = 'canceled'
  `);
  
  // Suscripciones por plan
  const [planData] = await db.raw(`
    SELECT 
      plan,
      COUNT(*) as count
    FROM subscriptions
    GROUP BY plan
    ORDER BY count DESC
  `);
  
  // Tasa de conversión (usuarios que se convierten en pagos)
  const [conversionData] = await db.raw(`
    SELECT 
      (SELECT COUNT(DISTINCT user_id) FROM subscriptions) / 
      (SELECT COUNT(*) FROM users) as rate
  `);
  
  return {
    total: parseInt(totalCount[0]?.total || 0),
    active: parseInt(activeCount[0]?.active || 0),
    canceled: parseInt(canceledCount[0]?.canceled || 0),
    byPlan: planData.map(item => ({
      plan: item.plan,
      count: parseInt(item.count)
    })),
    conversionRate: parseFloat(conversionData[0]?.rate || 0)
  };
}

/**
 * Obtener datos de usuarios
 */
async function getUserData(startDate, endDate) {
  // Total de usuarios
  const [totalCount] = await db.raw(`
    SELECT COUNT(*) as total
    FROM users
  `);
  
  // Nuevos usuarios en el período
  const [newCount] = await db.raw(`
    SELECT COUNT(*) as new
    FROM users
    WHERE created_at BETWEEN ? AND ?
  `, [startDate, endDate]);
  
  // Usuarios activos en el período
  const [activeCount] = await db.raw(`
    SELECT COUNT(DISTINCT user_id) as active
    FROM active_sessions
    WHERE last_activity BETWEEN ? AND ?
  `, [startDate, endDate]);
  
  // Nuevos usuarios por período
  const [periodData] = await db.raw(`
    SELECT 
      DATE_FORMAT(created_at, '%Y-%m-%d') as period,
      COUNT(*) as value
    FROM users
    WHERE created_at BETWEEN ? AND ?
    GROUP BY period
    ORDER BY period
  `, [startDate, endDate]);
  
  return {
    total: parseInt(totalCount[0]?.total || 0),
    new: parseInt(newCount[0]?.new || 0),
    active: parseInt(activeCount[0]?.active || 0),
    byPeriod: periodData.map(item => ({
      period: item.period,
      value: parseInt(item.value)
    }))
  };
}

/**
 * Obtener datos de uso
 */
async function getUsageData(startDate, endDate) {
  // Total de documentos generados
  const [totalCount] = await db.raw(`
    SELECT COUNT(*) as total
    FROM usage
  `);
  
  // Documentos por tipo
  const [typeData] = await db.raw(`
    SELECT 
      document_type as type,
      COUNT(*) as count
    FROM usage
    GROUP BY document_type
    ORDER BY count DESC
  `);
  
  // Promedio de documentos por usuario
  const [avgData] = await db.raw(`
    SELECT 
      AVG(user_count) as average
    FROM (
      SELECT 
        user_id,
        COUNT(*) as user_count
      FROM usage
      GROUP BY user_id
    ) as user_counts
  `);
  
  return {
    totalDocuments: parseInt(totalCount[0]?.total || 0),
    averagePerUser: parseFloat(avgData[0]?.average || 0),
    byType: typeData.map(item => ({
      type: item.type,
      count: parseInt(item.count)
    }))
  };
}

/**
 * Generar archivo CSV
 */
function generateCSV(res, data, startDate, endDate) {
  // Implementación básica para generar CSV
  let csvContent = `ListosApp Analytics Report,${startDate} to ${endDate}\n\n`;
  
  // Sección de ingresos
  csvContent += 'REVENUE DATA\n';
  csvContent += `Total Revenue,${data.revenue.total}\n`;
  csvContent += `Monthly Plans Revenue,${data.revenue.monthly}\n`;
  csvContent += `Annual Plans Revenue,${data.revenue.annual}\n\n`;
  
  csvContent += 'Revenue by Period\n';
  csvContent += 'Period,Amount\n';
  data.revenue.byPeriod.forEach(item => {
    csvContent += `${item.period},${item.value}\n`;
  });
  csvContent += '\n';
  
  // Sección de suscripciones
  csvContent += 'SUBSCRIPTION DATA\n';
  csvContent += `Total Subscriptions,${data.subscriptions.total}\n`;
  csvContent += `Active Subscriptions,${data.subscriptions.active}\n`;
  csvContent += `Canceled Subscriptions,${data.subscriptions.canceled}\n`;
  csvContent += `Conversion Rate,${(data.subscriptions.conversionRate * 100).toFixed(2)}%\n\n`;
  
  csvContent += 'Subscriptions by Plan\n';
  csvContent += 'Plan,Count\n';
  data.subscriptions.byPlan.forEach(item => {
    csvContent += `${item.plan},${item.count}\n`;
  });
  csvContent += '\n';
  
  // Sección de usuarios
  csvContent += 'USER DATA\n';
  csvContent += `Total Users,${data.users.total}\n`;
  csvContent += `New Users,${data.users.new}\n`;
  csvContent += `Active Users,${data.users.active}\n\n`;
  
  csvContent += 'New Users by Period\n';
  csvContent += 'Period,Count\n';
  data.users.byPeriod.forEach(item => {
    csvContent += `${item.period},${item.value}\n`;
  });
  csvContent += '\n';
  
  // Sección de uso
  csvContent += 'USAGE DATA\n';
  csvContent += `Total Documents,${data.usage.totalDocuments}\n`;
  csvContent += `Average per User,${data.usage.averagePerUser.toFixed(2)}\n\n`;
  
  csvContent += 'Documents by Type\n';
  csvContent += 'Type,Count\n';
  data.usage.byType.forEach(item => {
    csvContent += `${item.type},${item.count}\n`;
  });
  
  // Configurar encabezados y enviar respuesta
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=listosapp-analytics-${startDate}-to-${endDate}.csv`);
  res.send(csvContent);
}

/**
 * Generar archivo PDF
 */
function generatePDF(res, data, startDate, endDate) {
  // En una implementación real, se utilizaría una biblioteca como PDFKit
  // Para este ejemplo, enviamos un mensaje de error
  res.status(501).json({ error: 'Exportación a PDF no implementada' });
}

/**
 * Generar archivo Excel
 */
function generateExcel(res, data, startDate, endDate) {
  // En una implementación real, se utilizaría una biblioteca como ExcelJS
  // Para este ejemplo, enviamos un mensaje de error
  res.status(501).json({ error: 'Exportación a Excel no implementada' });
}

export default router;