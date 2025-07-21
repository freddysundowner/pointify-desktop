import { useState } from 'react';
import { BarChart3, PieChart, TrendingUp, Download, Calendar, Filter, FileText, ShoppingCart, Package, DollarSign, Users, ArrowUpRight, ArrowDownRight, Receipt, Eye, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

interface ReportData {
  title: string;
  description: string;
  value: number | string;
  type: 'income' | 'profit' | 'discount' | 'stock' | 'movement' | 'due_sales';
  details: string[];
  trend?: 'up' | 'down' | 'stable';
  percentage?: number;
}

const reports: ReportData[] = [
  {
    title: 'Income Reports',
    description: 'Total revenue from all sales channels',
    value: 45600,
    type: 'income',
    trend: 'up',
    percentage: 12.5,
    details: [
      'Cash Sales: KES 30,200',
      'Credit Sales: KES 8,750',
      'Wallet Payments: KES 4,650',
      'Card Payments: KES 2,000'
    ]
  },
  {
    title: 'Profit Analysis',
    description: 'Product profitability and margin analysis',
    value: 114800,
    type: 'profit',
    trend: 'up',
    percentage: 18.7,
    details: [
      'Gross Profit: KES 114,800',
      'Average Margin: 33.9%',
      'Top Product: Wireless Headphones',
      'Best Margin: Smartphone Case (50%)'
    ]
  },
  {
    title: 'Discount Reports',
    description: 'Total discounts given to customers',
    value: 2340,
    type: 'discount',
    trend: 'down',
    percentage: 8.2,
    details: [
      'Bulk Purchase Discounts: KES 1,200',
      'Loyalty Customer Discounts: KES 680',
      'Promotional Discounts: KES 350',
      'Staff Discounts: KES 110'
    ]
  },
  {
    title: 'Stock Report',
    description: 'Current inventory levels and values',
    value: 78500,
    type: 'stock',
    trend: 'stable',
    percentage: 2.1,
    details: [
      'Fast Moving Items: KES 45,000',
      'Slow Moving Items: KES 20,500',
      'Dead Stock: KES 8,000',
      'Low Stock Items: 23 products'
    ]
  },
  {
    title: 'Product Movements',
    description: 'Items moved in/out of inventory',
    value: 234,
    type: 'movement',
    trend: 'up',
    percentage: 15.3,
    details: [
      'Sales Out: 156 items',
      'Stock In: 78 items',
      'Returns In: 12 items',
      'Transfers: 8 items'
    ]
  },
  {
    title: 'Customer Based Due Sales',
    description: 'Outstanding credit sales by customer',
    value: 12750,
    type: 'due_sales',
    trend: 'down',
    percentage: 5.7,
    details: [
      'Overdue (30+ days): KES 5,200',
      'Due within 30 days: KES 4,800',
      'Due within 7 days: KES 2,750',
      'Number of customers: 18'
    ]
  }
];

export default function Reports() {
  const { hasPermission } = usePermissions();
  const [dateFilter, setDateFilter] = useState('today');
  const [customDate, setCustomDate] = useState('');
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);

  // Check if user has permission to view reports
  if (!hasPermission('reports_view')) {
    return (
      <DashboardLayout title="Reports">
        <div className="p-4">
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-gray-600">
                You don't have permission to view reports. Contact your administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'profit':
        return <BarChart3 className="h-5 w-5 text-emerald-600" />;
      case 'discount':
        return <ArrowDownRight className="h-5 w-5 text-orange-600" />;
      case 'stock':
        return <Package className="h-5 w-5 text-purple-600" />;
      case 'movement':
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'due_sales':
        return <Users className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      default:
        return <ArrowUpRight className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatValue = (value: number | string, type: string) => {
    if (typeof value === 'number') {
      if (type === 'income' || type === 'profit' || type === 'discount' || type === 'stock' || type === 'due_sales') {
        return `KES ${value.toLocaleString()}`;
      }
      return value.toLocaleString();
    }
    return value;
  };

  return (
    <DashboardLayout title="Business Reports">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Business Reports</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Comprehensive business analytics and insights</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
            <PermissionGuard permission="reports_export">
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
            </PermissionGuard>
          </div>
        </div>

        {/* Date Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Report Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {['today', 'yesterday', 'thisWeek', 'thisMonth', 'thisYear', 'custom'].map((period) => (
                <Button 
                  key={period}
                  variant={dateFilter === period ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setDateFilter(period)}
                  className="capitalize"
                >
                  {period === 'thisWeek' ? 'This Week' : 
                   period === 'thisMonth' ? 'This Month' : 
                   period === 'thisYear' ? 'This Year' : period}
                </Button>
              ))}
            </div>
            {dateFilter === 'custom' && (
              <div className="mt-4 flex gap-2">
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-auto"
                  placeholder="Start date"
                />
                <Input
                  type="date"
                  className="w-auto"
                  placeholder="End date"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Overview Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report, index) => {
            const getReportLink = (type: string) => {
              switch (type) {
                case 'income': return '/income-reports';
                case 'profit': return '/profit-analysis';
                case 'discount': return '/discount-reports';
                case 'stock': return '/stock-report';
                case 'movement': return '/product-movements';
                case 'due_sales': return '/customer-due-sales';
                default: return '#';
              }
            };
            
            // Permission checks for financial data access
            const requiresFinancialPermission = ['income', 'profit'].includes(report.type);
            const hasRequiredPermission = requiresFinancialPermission ? 
              hasPermission('financial_view') : hasPermission('reports_view');
            
            if (!hasRequiredPermission) {
              return (
                <Card key={index} className="opacity-50">
                  <CardContent className="p-6 text-center">
                    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg mb-3 inline-block">
                      {getTypeIcon(report.type)}
                    </div>
                    <p className="text-sm text-gray-500">{report.title}</p>
                    <p className="text-xs text-gray-400 mt-1">Access Restricted</p>
                  </CardContent>
                </Card>
              );
            }
            
            return (
              <Link key={index} href={getReportLink(report.type)}>
                <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          {getTypeIcon(report.type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{report.title}</CardTitle>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{report.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold">
                          {formatValue(report.value, report.type)}
                        </div>
                        {report.trend && report.percentage && (
                          <div className={`flex items-center gap-1 ${getTrendColor(report.trend)}`}>
                            {getTrendIcon(report.trend)}
                            <span className="text-sm font-medium">{report.percentage}%</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Breakdown:</h4>
                        <div className="space-y-1">
                          {report.details.slice(0, 2).map((detail, idx) => (
                            <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex justify-between">
                              <span>{detail.split(':')[0]}:</span>
                              <span className="font-medium">{detail.split(':')[1]}</span>
                            </div>
                          ))}
                          {report.details.length > 2 && (
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              +{report.details.length - 2} more items
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Button variant="outline" className="justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                Sales Analytics
              </Button>
              <Button variant="outline" className="justify-start">
                <PieChart className="h-4 w-4 mr-2" />
                Profit Analysis
              </Button>
              <Button variant="outline" className="justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Financial Statement
              </Button>
              <Button variant="outline" className="justify-start">
                <Receipt className="h-4 w-4 mr-2" />
                Tax Reports
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Detail Modal/Panel */}
        {selectedReport && (
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  {getTypeIcon(selectedReport.type)}
                  {selectedReport.title} - Detailed View
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">Complete Breakdown</h4>
                  <div className="space-y-2">
                    {selectedReport.details.map((detail, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-sm">{detail.split(':')[0]}</span>
                        <span className="font-medium">{detail.split(':')[1]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Performance</h4>
                    <div className="text-3xl font-bold">{formatValue(selectedReport.value, selectedReport.type)}</div>
                    {selectedReport.trend && (
                      <div className={`flex items-center gap-2 mt-2 ${getTrendColor(selectedReport.trend)}`}>
                        {getTrendIcon(selectedReport.trend)}
                        <span>{selectedReport.percentage}% vs last period</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}