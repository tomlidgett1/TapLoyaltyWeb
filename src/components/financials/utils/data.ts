// Sample data for financial dashboard
import { Transaction } from '@/types/financial';

// Sample daily cash flow data
export const sampleDailyCashFlow = [
  { time: '9:00', cashIn: 120, cashOut: 50, net: 70 },
  { time: '10:00', cashIn: 180, cashOut: 80, net: 100 },
  { time: '11:00', cashIn: 220, cashOut: 110, net: 110 },
  { time: '12:00', cashIn: 350, cashOut: 120, net: 230 },
  { time: '13:00', cashIn: 190, cashOut: 160, net: 30 },
  { time: '14:00', cashIn: 140, cashOut: 90, net: 50 },
  { time: '15:00', cashIn: 210, cashOut: 120, net: 90 },
  { time: '16:00', cashIn: 280, cashOut: 200, net: 80 },
];

// Sample weekly cash flow data
export const sampleWeeklyCashFlow = [
  { date: 'Mon', cashIn: 1250, cashOut: 850, net: 400 },
  { date: 'Tue', cashIn: 1420, cashOut: 910, net: 510 },
  { date: 'Wed', cashIn: 1380, cashOut: 940, net: 440 },
  { date: 'Thu', cashIn: 1520, cashOut: 880, net: 640 },
  { date: 'Fri', cashIn: 1850, cashOut: 1050, net: 800 },
  { date: 'Sat', cashIn: 1750, cashOut: 920, net: 830 },
  { date: 'Sun', cashIn: 1100, cashOut: 780, net: 320 },
];

// Sample monthly cash flow data
export const sampleMonthlyCashFlow = [
  { month: 'Jan', cashIn: 32500, cashOut: 28400, net: 4100 },
  { month: 'Feb', cashIn: 29800, cashOut: 27200, net: 2600 },
  { month: 'Mar', cashIn: 35200, cashOut: 29500, net: 5700 },
  { month: 'Apr', cashIn: 38600, cashOut: 30200, net: 8400 },
  { month: 'May', cashIn: 41200, cashOut: 32400, net: 8800 },
  { month: 'Jun', cashIn: 39800, cashOut: 33100, net: 6700 },
];

// Sample expense categories data
export const sampleExpenseCategories = [
  { name: 'Payroll', value: 420.50, color: '#0088FE' },
  { name: 'Rent', value: 250.00, color: '#00C49F' },
  { name: 'Inventory', value: 185.30, color: '#FFBB28' },
  { name: 'Marketing', value: 120.75, color: '#FF8042' },
  { name: 'Utilities', value: 80.45, color: '#8884d8' },
  { name: 'Other', value: 60.20, color: '#82ca9d' }
];

// Sample detailed expenses for subcategories
export const sampleDetailedExpenses = [
  { category: 'Payroll', subcategory: 'Full-time Staff', amount: 320.50 },
  { category: 'Payroll', subcategory: 'Part-time Staff', amount: 100.00 },
  { category: 'Rent', subcategory: 'Main Location', amount: 250.00 },
  { category: 'Inventory', subcategory: 'Fresh Produce', amount: 85.30 },
  { category: 'Inventory', subcategory: 'Packaged Goods', amount: 100.00 },
  { category: 'Marketing', subcategory: 'Social Media', amount: 70.75 },
  { category: 'Marketing', subcategory: 'Print Ads', amount: 50.00 },
  { category: 'Utilities', subcategory: 'Electricity', amount: 45.25 },
  { category: 'Utilities', subcategory: 'Water', amount: 35.20 },
  { category: 'Other', subcategory: 'Insurance', amount: 60.20 }
];

// Sample transactions data
export const sampleTransactions: Transaction[] = [
  { 
    id: '1', 
    description: 'Customer Purchase', 
    amount: 125.00, 
    type: 'inflow', 
    timestamp: '2023-10-15T14:30:00Z',
    category: 'Sales',
    accountId: 'acc_123'
  },
  { 
    id: '2', 
    description: 'Supplier Payment', 
    amount: -250.45, 
    type: 'outflow', 
    timestamp: '2023-10-15T12:15:00Z',
    category: 'Inventory',
    accountId: 'acc_123' 
  },
  { 
    id: '3', 
    description: 'Subscription Revenue', 
    amount: 99.99, 
    type: 'inflow', 
    timestamp: '2023-10-15T10:45:00Z',
    category: 'Recurring',
    accountId: 'acc_123' 
  },
  { 
    id: '4', 
    description: 'Utility Bill', 
    amount: -85.32, 
    type: 'outflow', 
    timestamp: '2023-10-15T09:20:00Z',
    category: 'Utilities',
    accountId: 'acc_123' 
  },
  { 
    id: '5', 
    description: 'Online Sale', 
    amount: 175.25, 
    type: 'inflow', 
    timestamp: '2023-10-15T08:10:00Z',
    category: 'Sales',
    accountId: 'acc_123' 
  },
  { 
    id: '6', 
    description: 'Staff Wages', 
    amount: -320.50, 
    type: 'outflow', 
    timestamp: '2023-10-14T16:45:00Z',
    category: 'Payroll',
    accountId: 'acc_123' 
  },
  { 
    id: '7', 
    description: 'Equipment Purchase', 
    amount: -425.99, 
    type: 'outflow', 
    timestamp: '2023-10-14T14:20:00Z',
    category: 'Equipment',
    accountId: 'acc_123' 
  },
  { 
    id: '8', 
    description: 'Catering Order', 
    amount: 250.00, 
    type: 'inflow', 
    timestamp: '2023-10-14T10:30:00Z',
    category: 'Sales',
    accountId: 'acc_123' 
  },
  { 
    id: '9', 
    description: 'Insurance Payment', 
    amount: -60.20, 
    type: 'outflow', 
    timestamp: '2023-10-13T15:10:00Z',
    category: 'Other',
    accountId: 'acc_123' 
  },
  { 
    id: '10', 
    description: 'In-store Sales', 
    amount: 315.75, 
    type: 'inflow', 
    timestamp: '2023-10-13T09:45:00Z',
    category: 'Sales',
    accountId: 'acc_123' 
  },
];

// Sample top vendors data
export const sampleTopVendors = [
  { name: 'Supplier Co.', amount: 450.45, count: 3, trend: +12 },
  { name: 'Utilities Provider', amount: 225.32, count: 4, trend: -5 },
  { name: 'Marketing Agency', amount: 200.75, count: 2, trend: 0 },
  { name: 'Equipment Vendor', amount: 180.99, count: 1, trend: +20 },
  { name: 'Insurance Company', amount: 125.20, count: 2, trend: 0 },
];

// Sample top customers/income sources data
export const sampleTopCustomers = [
  { name: 'In-store Sales', amount: 875.25, count: 15, trend: +8, type: 'Daily' },
  { name: 'Online Orders', amount: 550.50, count: 7, trend: +15, type: 'Web' },
  { name: 'Catering Client A', amount: 325.00, count: 1, trend: 0, type: 'Event' },
  { name: 'Subscription Revenue', amount: 299.97, count: 3, trend: 0, type: 'Recurring' },
  { name: 'Corporate Account B', amount: 250.00, count: 1, trend: -10, type: 'B2B' },
];

// Define required types to match component interfaces
interface ComparisonMetric {
  name: string;
  description: string;
  businessValue: number;
  industryAverage: number;
  industryBenchmarkRange: [number, number]; // [min, max]
  percentile: number;
  isHigherBetter: boolean;
}

interface Recommendation {
  id: string;
  type: 'alert' | 'opportunity' | 'success';
  title: string;
  description: string;
  detail?: string;
  severity?: 'low' | 'medium' | 'high';
  action?: {
    label: string;
    url?: string;
  };
  dismissed?: boolean;
}

// Sample benchmark metrics
export const sampleBenchmarkMetrics: ComparisonMetric[] = [
  {
    name: 'Rent as % of Revenue',
    description: 'Percentage of your revenue spent on rent and facilities',
    businessValue: 8, // percent
    industryAverage: 12, // percent
    industryBenchmarkRange: [6, 17] as [number, number], // Explicitly type as tuple
    percentile: 25, // Your business is at the 25th percentile (lower is better)
    isHigherBetter: false
  },
  {
    name: 'Staff Costs as % of Revenue',
    description: 'Percentage of your revenue spent on employee wages',
    businessValue: 32, // percent
    industryAverage: 30, // percent
    industryBenchmarkRange: [25, 40] as [number, number], // Explicitly type as tuple
    percentile: 60, // Your business is at the 60th percentile (lower is better)
    isHigherBetter: false
  },
  {
    name: 'Average Transaction Value',
    description: 'Average amount of each sales transaction',
    businessValue: 42.15, // dollars
    industryAverage: 38.50, // dollars
    industryBenchmarkRange: [32, 50] as [number, number], // Explicitly type as tuple
    percentile: 70, // Your business is at the 70th percentile (higher is better)
    isHigherBetter: true
  },
  {
    name: 'Inventory Turnover',
    description: 'How quickly you sell through your inventory',
    businessValue: 16, // times per year
    industryAverage: 12, // times per year
    industryBenchmarkRange: [8, 20] as [number, number], // Explicitly type as tuple
    percentile: 75, // Your business is at the 75th percentile (higher is better)
    isHigherBetter: true
  },
];

// Sample smart recommendations
export const sampleRecommendations: Recommendation[] = [
  {
    id: '1',
    type: 'alert',
    severity: 'high',
    title: 'Cash Flow Warning',
    description: 'Your net cash flow this week is negative. Expenses exceeded income by $500.',
    detail: 'You may want to reduce non-essential spending or ensure you have enough reserve cash.',
    action: {
      label: 'View Cash Flow Forecast',
      url: '#cashflow'
    }
  },
  {
    id: '2',
    type: 'opportunity',
    title: 'Cost Reduction Opportunity',
    description: 'Your marketing expenses are higher than 80% of similar businesses.',
    detail: 'Consider reviewing your marketing ROI and budget – it may be higher than necessary.',
    action: {
      label: 'View Marketing Expenses',
      url: '#expenses'
    }
  },
  {
    id: '3',
    type: 'alert',
    severity: 'medium',
    title: 'Large Expense Alert',
    description: 'A recent payment of $425.99 to Equipment Vendor is 2.5x larger than your typical payments to this vendor.',
    action: {
      label: 'View Transaction',
      url: '#transactions'
    }
  },
  {
    id: '4',
    type: 'success',
    title: 'Income Growth',
    description: 'Your online sales revenue has increased by 15% compared to last month.',
    detail: 'Your digital marketing efforts appear to be paying off. Consider continuing or expanding these initiatives.',
    action: {
      label: 'View Income Details',
      url: '#income'
    }
  },
  {
    id: '5',
    type: 'opportunity',
    title: 'Supplier Negotiation',
    description: 'You\'re paying about 12% more to Supplier Co. compared to last quarter.',
    detail: 'Consider negotiating with this supplier or exploring alternatives for better pricing.',
    action: {
      label: 'View Supplier Details',
      url: '#vendors'
    },
    dismissed: true
  },
];

// Key financial metrics
export const sampleFinancialMetrics = {
  currentBalance: 15300.25,
  netToday: 415.33,
  netWeek: 3940.00,
  netMonth: 8800.00,
  burnRate: 1245.80,
  runway: 12,
  totalIncome: 10750.75,
  totalExpenses: 6835.42,
  previousPeriodIncomeChange: +8.5,
  previousPeriodExpenseChange: +4.2
}; 