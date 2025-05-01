import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Define the props interface
interface ExpenseBreakdownProps {
  expenses: {
    name: string;
    value: number;
    color?: string;
  }[];
  detailedExpenses: {
    category: string;
    subcategory: string;
    amount: number;
  }[];
  totalIncome: number;
  totalExpenses: number;
  previousPeriodIncomeChange: number;
  previousPeriodExpenseChange: number;
  formatCurrency: (amount: number) => string;
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', 
  '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'
];

const ExpenseBreakdown = ({
  expenses,
  detailedExpenses,
  totalIncome,
  totalExpenses,
  previousPeriodIncomeChange,
  previousPeriodExpenseChange,
  formatCurrency
}: ExpenseBreakdownProps) => {
  // Group the detailed expenses by category
  const expensesByCategory = detailedExpenses.reduce((acc, expense) => {
    if (!acc[expense.category]) {
      acc[expense.category] = [];
    }
    acc[expense.category].push(expense);
    return acc;
  }, {} as Record<string, typeof detailedExpenses>);

  // Custom formatter for the pie chart tooltip
  const customTooltipFormatter = (value: number, name: string) => {
    return [formatCurrency(value), name];
  };

  // Generate the percentage for each expense category
  const expensesWithPercentage = expenses.map(expense => ({
    ...expense,
    percentage: Math.round((expense.value / totalExpenses) * 100)
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Income & Expenses Breakdown</h2>
      
      {/* Income & Expense Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <h3 className="text-lg font-medium text-green-800">Total Income</h3>
            <div className="mt-2 flex items-baseline">
              <span className="text-2xl font-bold text-green-900">{formatCurrency(totalIncome)}</span>
              <span className={`ml-2 text-sm font-medium ${previousPeriodIncomeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {previousPeriodIncomeChange > 0 ? '+' : ''}{previousPeriodIncomeChange}% from previous period
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <h3 className="text-lg font-medium text-amber-800">Total Expenses</h3>
            <div className="mt-2 flex items-baseline">
              <span className="text-2xl font-bold text-amber-900">{formatCurrency(totalExpenses)}</span>
              <span className={`ml-2 text-sm font-medium ${previousPeriodExpenseChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {previousPeriodExpenseChange > 0 ? '+' : ''}{previousPeriodExpenseChange}% from previous period
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense Categories Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expense Categories Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesWithPercentage}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expensesWithPercentage.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color || COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={customTooltipFormatter} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Detailed Breakdown Accordion */}
            <div className="space-y-3">
              <Accordion type="single" collapsible className="w-full">
                {Object.keys(expensesByCategory).map((category) => (
                  <AccordionItem key={category} value={category}>
                    <AccordionTrigger className="text-sm font-medium">
                      {category}
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2">
                        {expensesByCategory[category].map((expense, index) => (
                          <li key={index} className="flex justify-between text-sm">
                            <span className="text-gray-600">{expense.subcategory}</span>
                            <span className="font-medium">{formatCurrency(expense.amount)}</span>
                          </li>
                        ))}
                        <li className="flex justify-between text-sm pt-2 border-t border-gray-200 mt-2">
                          <span className="font-medium">Total {category}</span>
                          <span className="font-bold">
                            {formatCurrency(
                              expensesByCategory[category].reduce(
                                (sum, expense) => sum + expense.amount, 
                                0
                              )
                            )}
                          </span>
                        </li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
          
          {/* Top Expenses Bar Chart */}
          <div className="mt-8 border-t pt-6">
            <h3 className="text-base font-medium mb-4">Top Expense Categories</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={expenses.slice(0, 5)} // Just show top 5
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Bar 
                    dataKey="value" 
                    fill="#8884d8" 
                    background={{ fill: '#eee' }}
                    label={{ position: 'right', formatter: (value: any) => formatCurrency(value) }}
                  >
                    {expenses.slice(0, 5).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color || COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseBreakdown; 