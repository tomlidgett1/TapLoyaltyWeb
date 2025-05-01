import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { DollarSign, TrendingDown, TrendingUp, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { TimeRangeOption } from '@/types/financial';

// Type for KPI cards
interface KpiCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: number;
  trendDirection?: 'up' | 'down' | 'neutral';
  format?: 'currency' | 'percent' | 'days' | 'weeks';
  formatCurrency: (amount: number) => string;
  subtitle?: string;
  accentColor?: string;
}

// Type for the CashFlowOverview props
interface CashFlowOverviewProps {
  dailyData: any[];
  weeklyData: any[];
  monthlyData: any[];
  currentBalance: number;
  netToday: number;
  netWeek: number;
  netMonth: number;
  burnRate: number;
  runway: number;
  formatCurrency: (amount: number) => string;
}

// KPI Card Component
const KpiCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  trendDirection = 'neutral', 
  format = 'currency',
  formatCurrency,
  subtitle,
  accentColor = "bg-blue-500",
}: KpiCardProps) => {
  // Format the value based on the format prop
  const formattedValue = format === 'currency' 
    ? formatCurrency(value)
    : format === 'percent'
      ? `${value}%`
      : format === 'days'
        ? `${value} days`
        : `${value} weeks`;

  const getTrendIcon = () => {
    if (trendDirection === 'up') return <ArrowUp className="h-3 w-3 mr-1" />;
    if (trendDirection === 'down') return <ArrowDown className="h-3 w-3 mr-1" />;
    return null;
  };

  const getTrendClass = () => {
    // For financial metrics, "up" is good for income and bad for expenses
    // Here we just use a simple approach - up is green, down is red
    if (trendDirection === 'up') return 'text-green-600';
    if (trendDirection === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card className="bg-white border-gray-200 shadow-md rounded-lg overflow-hidden">
      <div className={`h-1 ${accentColor} w-full`}></div>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="rounded-full p-1.5 bg-gray-50">{icon}</div>
        </div>
        <div className="mt-3">
          <h3 className="text-xl font-bold text-gray-900">{formattedValue}</h3>
          {trend !== undefined && (
            <p className={`text-xs flex items-center mt-1 ${getTrendClass()}`}>
              {getTrendIcon()}
              {trend > 0 ? '+' : ''}{trend}% from previous
            </p>
          )}
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const CashFlowOverview = ({ 
  dailyData, 
  weeklyData, 
  monthlyData, 
  currentBalance,
  netToday,
  netWeek,
  netMonth,
  burnRate,
  runway,
  formatCurrency 
}: CashFlowOverviewProps) => {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('today');

  // Helper to determine what data to display based on timeRange
  const getDataForTimeRange = () => {
    switch(timeRange) {
      case 'today':
        return dailyData;
      case '7day':
        return weeklyData;
      case '30day':
        return monthlyData;
      default:
        return dailyData;
    }
  };

  // Helper to get the net value based on timeRange
  const getNetForTimeRange = () => {
    switch(timeRange) {
      case 'today':
        return netToday;
      case '7day':
        return netWeek;
      case '30day':
        return netMonth;
      default:
        return netToday;
    }
  };

  // Custom tooltip formatter for the chart
  const customTooltipFormatter = (value: number) => {
    return formatCurrency(value);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium text-gray-900">Cash Flow Overview</h2>
      
      {/* Time Range Selection */}
      <Tabs value={timeRange} onValueChange={(value: string) => setTimeRange(value as TimeRangeOption)} className="mb-4">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="today" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">Today</TabsTrigger>
          <TabsTrigger value="7day" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">This Week</TabsTrigger>
          <TabsTrigger value="30day" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">This Month</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard 
          title="Current Balance"
          value={currentBalance}
          icon={<DollarSign className="h-4 w-4 text-blue-500" />}
          format="currency"
          formatCurrency={formatCurrency}
          subtitle="As of today"
          accentColor="bg-blue-500"
        />
        <KpiCard 
          title={`Net ${timeRange === 'today' ? 'Today' : timeRange === '7day' ? 'This Week' : 'This Month'}`}
          value={getNetForTimeRange()}
          icon={getNetForTimeRange() >= 0 
            ? <TrendingUp className="h-4 w-4 text-blue-500" /> 
            : <TrendingDown className="h-4 w-4 text-gray-500" />
          }
          trend={getNetForTimeRange() > 0 ? +8.5 : -4.2}
          trendDirection={getNetForTimeRange() >= 0 ? 'up' : 'down'}
          format="currency"
          formatCurrency={formatCurrency}
          accentColor={getNetForTimeRange() >= 0 ? "bg-blue-500" : "bg-gray-400"}
        />
        <KpiCard 
          title="Cash Runway"
          value={runway}
          icon={<Clock className="h-4 w-4 text-blue-500" />}
          format="weeks"
          formatCurrency={formatCurrency}
          subtitle={`at ${formatCurrency(burnRate)}/week burn rate`}
          accentColor="bg-blue-500"
        />
      </div>
      
      {/* Cash Flow Chart */}
      <Card className="bg-white border-gray-200 shadow-md rounded-lg overflow-hidden">
        <CardHeader className="border-b border-gray-100 py-4 px-6 bg-gray-50">
          <CardTitle className="text-base font-medium text-gray-800">
            {timeRange === 'today' 
              ? 'Today\'s Cash Flow' 
              : timeRange === '7day' 
                ? 'Weekly Cash Flow' 
                : 'Monthly Cash Flow'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {timeRange === 'today' ? (
                // For daily view, use area chart
                <AreaChart
                  data={getDataForTimeRange()}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip formatter={(value: any) => customTooltipFormatter(value)} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="cashIn" 
                    name="Cash In"
                    stackId="1"
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.1}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cashOut" 
                    name="Cash Out"
                    stackId="2"
                    stroke="#6b7280" 
                    fill="#6b7280"
                    fillOpacity={0.1}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="net" 
                    name="Net"
                    stroke="#60a5fa" 
                    fill="#60a5fa"
                    fillOpacity={0.1}
                  />
                  <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="3 3" />
                </AreaChart>
              ) : (
                // For weekly/monthly view, use bar chart with net line
                <BarChart
                  data={getDataForTimeRange()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey={timeRange === '7day' ? "date" : "month"} stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip formatter={(value: any) => customTooltipFormatter(value)} />
                  <Legend />
                  <Bar dataKey="cashIn" name="Cash In" fill="#3b82f6" fillOpacity={0.7} />
                  <Bar dataKey="cashOut" name="Cash Out" fill="#6b7280" fillOpacity={0.7} />
                  <Line 
                    type="monotone" 
                    dataKey="net" 
                    name="Net" 
                    stroke="#60a5fa" 
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#60a5fa", strokeWidth: 0 }}
                  />
                  <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="3 3" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          
          {/* Cash Flow Summary */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="p-3 rounded-md bg-gray-50 border border-gray-100">
              <p className="text-sm font-medium text-gray-700">Total Cash In</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(
                  getDataForTimeRange().reduce((sum, day) => sum + day.cashIn, 0)
                )}
              </p>
            </div>
            
            <div className="p-3 rounded-md bg-gray-50 border border-gray-100">
              <p className="text-sm font-medium text-gray-700">Total Cash Out</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(
                  getDataForTimeRange().reduce((sum, day) => sum + day.cashOut, 0)
                )}
              </p>
            </div>
            
            <div className="p-3 rounded-md bg-gray-50 border border-gray-100">
              <p className="text-sm font-medium text-blue-700">Net Cash Flow</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(
                  getDataForTimeRange().reduce((sum, day) => sum + day.net, 0)
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashFlowOverview; 