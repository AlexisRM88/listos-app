/**
 * =================================================================================================
 * COMPONENTE DE DASHBOARD DE ANÁLISIS
 * =================================================================================================
 * Componente para visualizar métricas y análisis del sistema desde el panel de administración.
 */

import React, { useState, useEffect, useRef } from 'react';
import { format, subDays, startOfMonth, endOfMonth, parseISO, addDays, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { text } from 'express';
import e from 'express';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsDashboardProps {
  onError: (error: string) => void;
}

// Interfaces para los datos de análisis
interface AnalyticsData {
  revenue: RevenueData;
  subscriptions: SubscriptionData;
  users: UserData;
  usage: UsageData;
}

interface RevenueData {
  total: number;
  monthly: number;
  annual: number;
  byPeriod: PeriodData[];
}

interface SubscriptionData {
  total: number;
  active: number;
  canceled: number;
  byPlan: PlanData[];
  conversionRate: number;
}

interface UserData {
  total: number;
  new: number;
  active: number;
  byPeriod: PeriodData[];
}

interface UsageData {
  totalDocuments: number;
  averagePerUser: number;
  byType: TypeData[];
}

interface PeriodData {
  period: string;
  value: number;
}

interface PlanData {
  plan: string;
  count: number;
}

interface TypeData {
  type: string;
  count: number;
}

// Interfaz para datos de gráficos
interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string[];
    borderColor?: string[];
    borderWidth?: number;
  }[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onError }) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 30),
    end: new Date()
  });
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d');
  const [exportFormat, setExportFormat] = useState<string>('csv');
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [isCustomDateOpen, setIsCustomDateOpen] = useState<boolean>(false);
  const [customStartDate, setCustomStartDate] = useState<string>(format(dateRange.start, 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(dateRange.end, 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'users' | 'subscriptions'>('overview');
  const [showExportOptions, setShowExportOptions] = useState<boolean>(false);
  
  // Referencias para los gráficos
  const chartRefs = {
    revenue: useRef<HTMLCanvasElement>(null),
    users: useRef<HTMLCanvasElement>(null),
    subscriptions: useRef<HTMLCanvasElement>(null),
    usage: useRef<HTMLCanvasElement>(null)
  };

  // Cargar datos de análisis al montar el componente o cambiar el rango de fechas
  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  // Función para cargar datos de análisis desde la API
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const startDate = format(dateRange.start, 'yyyy-MM-dd');
      const endDate = format(dateRange.end, 'yyyy-MM-dd');
      
      const response = await fetch(`/api/admin/analytics?start=${startDate}&end=${endDate}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar datos de análisis');
      }

      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error al cargar datos de análisis:', error);
      onError('No se pudieron cargar los datos de análisis. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Función para cambiar el período de tiempo
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    
    const now = new Date();
    let start: Date;
    
    switch (period) {
      case '7d':
        start = subDays(now, 7);
        break;
      case '30d':
        start = subDays(now, 30);
        break;
      case '90d':
        start = subDays(now, 90);
        break;
      case 'month':
        start = startOfMonth(now);
        break;
      case 'prevMonth':
        const prevMonth = subDays(startOfMonth(now), 1);
        start = startOfMonth(prevMonth);
        now.setTime(endOfMonth(prevMonth).getTime());
        break;
      case 'custom':
        setIsCustomDateOpen(true);
        return;
      default:
        start = subDays(now, 30);
    }
    
    setDateRange({ start, end: now });
  };

  // Función para aplicar rango de fechas personalizado
  const applyCustomDateRange = () => {
    try {
      const start = parseISO(customStartDate);
      const end = parseISO(customEndDate);
      
      // Validar que la fecha de inicio sea anterior a la fecha de fin
      if (isBefore(start, end)) {
        setDateRange({ start, end });
        setSelectedPeriod('custom');
        setIsCustomDateOpen(false);
      } else {
        onError('La fecha de inicio debe ser anterior a la fecha de fin');
      }
    } catch (error) {
      onError('Formato de fecha inválido');
    }
  };

  // Función para exportar datos
  const handleExportData = async () => {
    try {
      setExportLoading(true);
      const token = localStorage.getItem('authToken');
      
      const startDate = format(dateRange.start, 'yyyy-MM-dd');
      const endDate = format(dateRange.end, 'yyyy-MM-dd');
      
      const response = await fetch(`/api/admin/analytics/export?start=${startDate}&end=${endDate}&format=${exportFormat}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al exportar datos');
      }

      // Crear un blob y descargarlo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `listosapp-analytics-${startDate}-to-${endDate}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setShowExportOptions(false);
    } catch (error) {
      console.error('Error al exportar datos:', error);
      onError('No se pudieron exportar los datos. Intenta nuevamente.');
    } finally {
      setExportLoading(false);
    }
  };

  // Función para formatear moneda
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Función para formatear fecha
  const formatDate = (dateString: string): string => {
    try {
      const date = parseISO(dateString);
      return format(date, 'dd MMM yyyy', { locale: es });
    } catch (error) {
      return dateString;
    }
  };
  
  // Función para preparar datos de gráfico de líneas
  const prepareLineChartData = (periodData: PeriodData[]): ChartData => {
    if (!periodData || periodData.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: 'Sin datos',
          data: [],
          backgroundColor: ['rgba(59, 130, 246, 0.5)'],
          borderColor: ['rgb(59, 130, 246)'],
          borderWidth: 2
        }]
      };
    }
    
    // Ordenar datos por fecha
    const sortedData = [...periodData].sort((a, b) => {
      return new Date(a.period).getTime() - new Date(b.period).getTime();
    });
    
    return {
      labels: sortedData.map(item => formatDate(item.period)),
      datasets: [{
        label: 'Valor',
        data: sortedData.map(item => item.value),
        backgroundColor: ['rgba(59, 130, 246, 0.5)'],
        borderColor: ['rgb(59, 130, 246)'],
        borderWidth: 2
      }]
    };
  };
  
  // Función para preparar datos de gráfico de barras
  const prepareBarChartData = (data: PlanData[] | TypeData[], labelKey: string, valueKey: string): ChartData => {
    if (!data || data.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: 'Sin datos',
          data: [],
          backgroundColor: ['rgba(59, 130, 246, 0.5)'],
        }]
      };
    }
    
    // Colores para las barras
    const backgroundColors = [
      'rgba(59, 130, 246, 0.7)',  // Azul
      'rgba(16, 185, 129, 0.7)',  // Verde
      'rgba(245, 158, 11, 0.7)',  // Amarillo
      'rgba(239, 68, 68, 0.7)',   // Rojo
      'rgba(139, 92, 246, 0.7)',  // Púrpura
      'rgba(236, 72, 153, 0.7)',  // Rosa
      'rgba(75, 85, 99, 0.7)'     // Gris
    ];
    
    return {
      labels: data.map(item => item[labelKey as keyof typeof item] as string),
      datasets: [{
        label: 'Valor',
        data: data.map(item => item[valueKey as keyof typeof item] as number),
        backgroundColor: data.map((_, index) => backgroundColors[index % backgroundColors.length]),
      }]
    };
  };
  
  // Función para preparar datos de gráfico de dona
  const prepareDoughnutChartData = (data: PlanData[] | TypeData[], labelKey: string, valueKey: string): ChartData => {
    if (!data || data.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: 'Sin datos',
          data: [],
          backgroundColor: ['rgba(59, 130, 246, 0.5)'],
        }]
      };
    }
    
    // Colores para los segmentos
    const backgroundColors = [
      'rgba(59, 130, 246, 0.7)',  // Azul
      'rgba(16, 185, 129, 0.7)',  // Verde
      'rgba(245, 158, 11, 0.7)',  // Amarillo
      'rgba(239, 68, 68, 0.7)',   // Rojo
      'rgba(139, 92, 246, 0.7)',  // Púrpura
      'rgba(236, 72, 153, 0.7)',  // Rosa
      'rgba(75, 85, 99, 0.7)'     // Gris
    ];
    
    return {
      labels: data.map(item => item[labelKey as keyof typeof item] as string),
      datasets: [{
        label: 'Valor',
        data: data.map(item => item[valueKey as keyof typeof item] as number),
        backgroundColor: data.map((_, index) => backgroundColors[index % backgroundColors.length]),
      }]
    };
  };

  // Renderizar gráfico de barras simple
  const renderBarChart = (data: PeriodData[] | PlanData[] | TypeData[], valueKey: string, labelKey: string) => {
    if (!data || data.length === 0) return null;
    
    // Encontrar el valor máximo para calcular porcentajes
    const maxValue = Math.max(...data.map(item => item[valueKey as keyof typeof item] as number));
    
    return (
      <div className="space-y-2">
        {data.map((item, index) => {
          const value = item[valueKey as keyof typeof item] as number;
          const label = item[labelKey as keyof typeof item] as string;
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          
          return (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
                <span className="text-gray-600 dark:text-gray-400">{value}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Renderizar tarjeta de métrica
  const renderMetricCard = (title: string, value: string | number, subtitle: string, color: string) => {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 ${color}`}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar sección de ingresos
  const renderRevenueSection = () => {
    if (!analyticsData) return null;
    
    const { revenue } = analyticsData;
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Ingresos
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {renderMetricCard(
            'Ingresos Totales',
            formatCurrency(revenue.total),
            'En el período seleccionado',
            'border-green-500'
          )}
          {renderMetricCard(
            'Suscripciones Mensuales',
            formatCurrency(revenue.monthly),
            'Ingresos de planes mensuales',
            'border-blue-500'
          )}
          {renderMetricCard(
            'Suscripciones Anuales',
            formatCurrency(revenue.annual),
            'Ingresos de planes anuales',
            'border-purple-500'
          )}
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Ingresos por Período
          </h4>
          {renderBarChart(revenue.byPeriod, 'value', 'period')}
        </div>
      </div>
    );
  };

  // Renderizar sección de suscripciones
  const renderSubscriptionsSection = () => {
    if (!analyticsData) return null;
    
    const { subscriptions } = analyticsData;
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Suscripciones
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {renderMetricCard(
            'Total Suscripciones',
            subscriptions.total,
            'Todas las suscripciones',
            'border-blue-500'
          )}
          {renderMetricCard(
            'Suscripciones Activas',
            subscriptions.active,
            'Suscripciones actualmente activas',
            'border-green-500'
          )}
          {renderMetricCard(
            'Tasa de Conversión',
            `${(subscriptions.conversionRate * 100).toFixed(1)}%`,
            'Usuarios que se convierten en pagos',
            'border-yellow-500'
          )}
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Suscripciones por Plan
          </h4>
          {renderBarChart(subscriptions.byPlan, 'count', 'plan')}
        </div>
      </div>
    );
  };

  // Renderizar sección de usuarios
  const renderUsersSection = () => {
    if (!analyticsData) return null;
    
    const { users } = analyticsData;
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Usuarios
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {renderMetricCard(
            'Total Usuarios',
            users.total,
            'Todos los usuarios registrados',
            'border-blue-500'
          )}
          {renderMetricCard(
            'Nuevos Usuarios',
            users.new,
            'En el período seleccionado',
            'border-green-500'
          )}
          {renderMetricCard(
            'Usuarios Activos',
            users.active,
            'Activos en el período seleccionado',
            'border-purple-500'
          )}
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Nuevos Usuarios por Período
          </h4>
          {renderBarChart(users.byPeriod, 'value', 'period')}
        </div>
      </div>
    );
  };

  // Renderizar sección de uso
  const renderUsageSection = () => {
    if (!analyticsData) return null;
    
    const { usage } = analyticsData;
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Uso del Sistema
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {renderMetricCard(
            'Total Documentos',
            usage.totalDocuments,
            'Documentos generados',
            'border-blue-500'
          )}
          {renderMetricCard(
            'Promedio por Usuario',
            usage.averagePerUser.toFixed(1),
            'Documentos por usuario',
            'border-green-500'
          )}
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Documentos por Tipo
          </h4>
          <div className="h-48">
            {analyticsData && analyticsData.usage && analyticsData.usage.byType && (
              <Bar 
                data={{
                  labels: analyticsData.usage.byType.map(item => item.type),
                  datasets: [{
                    label: 'Documentos',
                    data: analyticsData.usage.byType.map(item => item.count),
                    backgroundColor: [
                      'rgba(59, 130, 246, 0.7)',  // Azul
                      'rgba(16, 185, 129, 0.7)',  // Verde
                      'rgba(245, 158, 11, 0.7)',  // Amarillo
                    ],
                    borderWidth: 1
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        precision: 0
                      }
                    }
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  // Renderizar modal de selección de fecha personalizada
  const renderCustomDateModal = () => {
    if (!isCustomDateOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Seleccionar rango de fechas
            </h3>
            <button
              onClick={() => setIsCustomDateOpen(false)}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fecha de inicio
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fecha de fin
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setIsCustomDateOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                onClick={applyCustomDateRange}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar pestañas de navegación
  const renderTabs = () => {
    return (
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Vista General
          </button>
          <button
            onClick={() => setActiveTab('revenue')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'revenue'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Ingresos
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'subscriptions'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Suscripciones
          </button>
        </nav>
      </div>
    );
  };

  // Renderizar contenido según la pestaña activa
  const renderTabContent = () => {
    if (!analyticsData) return null;
    
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderRevenueSection()}
            {renderSubscriptionsSection()}
            {renderUsersSection()}
            {renderUsageSection()}
          </div>
        );
      case 'revenue':
        return (
          <div className="space-y-6">
            {renderRevenueSection()}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Análisis Detallado de Ingresos
              </h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Tendencia de Ingresos
                  </h4>
                  <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    {analyticsData && analyticsData.revenue && analyticsData.revenue.byPeriod && (
                      <Line 
                        data={{
                          labels: analyticsData.revenue.byPeriod.map(item => formatDate(item.period)),
                          datasets: [{
                            label: 'Ingresos',
                            data: analyticsData.revenue.byPeriod.map(item => item.value),
                            backgroundColor: 'rgba(59, 130, 246, 0.5)',
                            borderColor: 'rgb(59, 130, 246)',
                            borderWidth: 2
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context: any) {
                                  return formatCurrency(context.raw);
                                }
                              }
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                callback: function(value: any) {
                                  return formatCurrency(value);
                                }
                              }
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Distribución de Ingresos por Plan
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="text-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mensual vs Anual</span>
                      </div>
                      <div className="flex justify-center">
                        <div className="w-48 h-48">
                          <div className="flex items-center justify-center h-full">
                            <div className="flex flex-col items-center">
                              <div className="flex items-center">
                                <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Mensual: {formatCurrency(analyticsData.revenue.monthly)}</span>
                              </div>
                              <div className="flex items-center mt-2">
                                <div className="w-4 h-4 bg-purple-500 rounded-full mr-2"></div>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Anual: {formatCurrency(analyticsData.revenue.annual)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="text-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Métricas Clave</span>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Ingreso Promedio por Usuario</span>
                            <span className="text-gray-600 dark:text-gray-400">
                              {analyticsData.users.total > 0 
                                ? formatCurrency(analyticsData.revenue.total / analyticsData.users.total) 
                                : '$0.00'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Tasa de Renovación</span>
                            <span className="text-gray-600 dark:text-gray-400">85%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'users':
        return (
          <div className="space-y-6">
            {renderUsersSection()}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Análisis Detallado de Usuarios
              </h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Tendencia de Nuevos Usuarios
                  </h4>
                  <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    {analyticsData && analyticsData.users && analyticsData.users.byPeriod && (
                      <Line 
                        data={{
                          labels: analyticsData.users.byPeriod.map(item => formatDate(item.period)),
                          datasets: [{
                            label: 'Nuevos Usuarios',
                            data: analyticsData.users.byPeriod.map(item => item.value),
                            backgroundColor: 'rgba(16, 185, 129, 0.5)',
                            borderColor: 'rgb(16, 185, 129)',
                            borderWidth: 2
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                precision: 0
                              }
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Métricas de Retención
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {renderMetricCard(
                      'Tasa de Retención',
                      '78%',
                      'Usuarios que continúan activos',
                      'border-green-500'
                    )}
                    {renderMetricCard(
                      'Tiempo Promedio',
                      '24 min',
                      'Tiempo de sesión promedio',
                      'border-blue-500'
                    )}
                    {renderMetricCard(
                      'Sesiones por Usuario',
                      '3.2',
                      'Promedio semanal',
                      'border-purple-500'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'subscriptions':
        return (
          <div className="space-y-6">
            {renderSubscriptionsSection()}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Análisis Detallado de Suscripciones
              </h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Distribución de Planes
                  </h4>
                  <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    {analyticsData && analyticsData.subscriptions && analyticsData.subscriptions.byPlan && (
                      <Doughnut 
                        data={{
                          labels: analyticsData.subscriptions.byPlan.map(item => item.plan),
                          datasets: [{
                            label: 'Suscripciones',
                            data: analyticsData.subscriptions.byPlan.map(item => item.count),
                            backgroundColor: [
                              'rgba(59, 130, 246, 0.7)',  // Azul
                              'rgba(16, 185, 129, 0.7)',  // Verde
                              'rgba(245, 158, 11, 0.7)',  // Amarillo
                              'rgba(239, 68, 68, 0.7)',   // Rojo
                              'rgba(139, 92, 246, 0.7)',  // Púrpura
                            ],
                            borderWidth: 1
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'right',
                              labels: {
                                boxWidth: 12,
                                padding: 15
                              }
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Métricas de Suscripción
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {renderMetricCard(
                      'Tiempo Promedio',
                      '4.2 meses',
                      'Duración promedio de suscripción',
                      'border-blue-500'
                    )}
                    {renderMetricCard(
                      'Tasa de Cancelación',
                      `${((analyticsData.subscriptions.canceled / analyticsData.subscriptions.total) * 100).toFixed(1)}%`,
                      'Suscripciones canceladas',
                      'border-red-500'
                    )}
                    {renderMetricCard(
                      'Valor de Vida',
                      formatCurrency(analyticsData.revenue.total / (analyticsData.subscriptions.active || 1) * 4.2),
                      'Estimado por cliente',
                      'border-green-500'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Renderizar menú de exportación
  const renderExportMenu = () => {
    if (!showExportOptions) return null;
    
    return (
      <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
        <div className="py-1" role="menu" aria-orientation="vertical">
          <button
            onClick={() => {
              setExportFormat('csv');
              handleExportData();
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            role="menuitem"
          >
            Exportar como CSV
          </button>
          <button
            onClick={() => {
              setExportFormat('xlsx');
              handleExportData();
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            role="menuitem"
          >
            Exportar como Excel
          </button>
          <button
            onClick={() => {
              setExportFormat('pdf');
              handleExportData();
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            role="menuitem"
          >
            Exportar como PDF
          </button>
        </div>
      </div>
    );
  };

  // Efectsponibles
  useEffect(() => {
    if (analyticsData && !loading) {
      // Aquí se inicializarían los gráficos si fuera necesario
      // Ejemplo:
      // if (chartRefs.revenue.current) {
      //   const ctx = chartRefs.revenue.current.getContext('2d');
      //   new Chart(ctx, {
      //     type: 'line',
      //     data: { ... },
      //     options: { ... }
      //   });
      // }
    }
  }, [analyticsData, loading, activeTab]);

  return (
    <div className="space-y-6">
      {/* Modal de fecha personalizada */}
      {renderCustomDateModal()}
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 sm:mb-0">
            Análisis y Métricas
          </h3>
          
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
            {/* Selector de período */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handlePeriodChange('7d')}
                className={`px-3 py-1 text-sm font-medium rounded-lg ${
                  selectedPeriod === '7d'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                }`}
              >
                7 días
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange('30d')}
                className={`px-3 py-1 text-sm font-medium rounded-lg ${
                  selectedPeriod === '30d'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                }`}
              >
                30 días
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange('90d')}
                className={`px-3 py-1 text-sm font-medium rounded-lg ${
                  selectedPeriod === '90d'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                }`}
              >
                90 días
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange('month')}
                className={`px-3 py-1 text-sm font-medium rounded-lg ${
                  selectedPeriod === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                }`}
              >
                Este mes
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange('prevMonth')}
                className={`px-3 py-1 text-sm font-medium rounded-lg ${
                  selectedPeriod === 'prevMonth'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                }`}
              >
                Mes anterior
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange('custom')}
                className={`px-3 py-1 text-sm font-medium rounded-lg ${
                  selectedPeriod === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                }`}
              >
                Personalizado
              </button>
            </div>
            
            {/* Botón de exportar */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportOptions(!showExportOptions)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-4-4m4 4l4-4m-6 4h8" />
                </svg>
                Exportar
              </button>
              {showExportOptions && renderExportMenu()}
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando datos desde {format(dateRange.start, 'dd/MM/yyyy')} hasta {format(dateRange.end, 'dd/MM/yyyy')}
          </p>
        </div>
        
        {/* Pestañas de navegación */}
        <div className="mt-6">
          {renderTabs()}
        </div>
      </div>
      
      {loading ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              Cargando datos de análisis...
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          {renderTabContent()}
        </div>
      )}
    </div>
  );
};