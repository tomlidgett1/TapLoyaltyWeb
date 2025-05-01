import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Transaction } from '@/types/financial';
import { Search, ArrowDownUp, ChevronDown, ChevronUp, Download } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  formatCurrency: (amount: number) => string;
}

const TransactionList = ({ transactions, formatCurrency }: TransactionListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<'all' | 'inflow' | 'outflow'>('all');
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle sort change
  const toggleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc'); // Default to descending
    }
  };
  
  // Filter and sort transactions
  const filteredAndSortedTransactions = transactions
    // Filter by search term
    .filter(transaction => 
      searchTerm === '' || 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.category && transaction.category.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    // Filter by transaction type
    .filter(transaction => 
      filterType === 'all' || 
      transaction.type === filterType
    )
    // Sort by selected field
    .sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      } else { // amount
        return sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
    });
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };
  
  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-AU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Transactions</h2>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filters and search */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                type="text" 
                placeholder="Search transactions..." 
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-8"
              />
            </div>
            
            <Select
              value={filterType}
              onValueChange={(value) => setFilterType(value as 'all' | 'inflow' | 'outflow')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="inflow">Income Only</SelectItem>
                <SelectItem value="outflow">Expenses Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Transaction table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 px-2 text-left font-medium">Description</th>
                  <th className="py-3 px-2 text-left font-medium">Category</th>
                  <th className="py-3 px-2 text-left font-medium cursor-pointer" onClick={() => toggleSort('amount')}>
                    <div className="flex items-center gap-1">
                      Amount
                      {sortBy === 'amount' && (
                        sortDirection === 'asc' 
                          ? <ChevronUp className="h-4 w-4" /> 
                          : <ChevronDown className="h-4 w-4" />
                      )}
                      {sortBy !== 'amount' && <ArrowDownUp className="h-3 w-3" />}
                    </div>
                  </th>
                  <th className="py-3 px-2 text-left font-medium cursor-pointer" onClick={() => toggleSort('date')}>
                    <div className="flex items-center gap-1">
                      Date & Time
                      {sortBy === 'date' && (
                        sortDirection === 'asc' 
                          ? <ChevronUp className="h-4 w-4" /> 
                          : <ChevronDown className="h-4 w-4" />
                      )}
                      {sortBy !== 'date' && <ArrowDownUp className="h-3 w-3" />}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2">{transaction.description}</td>
                    <td className="py-3 px-2">{transaction.category || '-'}</td>
                    <td className={`py-3 px-2 ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="py-3 px-2">
                      <div>{formatDate(transaction.timestamp)}</div>
                      <div className="text-xs text-gray-500">{formatTime(transaction.timestamp)}</div>
                    </td>
                  </tr>
                ))}
                
                {filteredAndSortedTransactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      {searchTerm || filterType !== 'all' 
                        ? 'No transactions match your filters'
                        : 'No transactions available'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Transaction count and summary */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-sm text-gray-500">
            <span>
              Showing {filteredAndSortedTransactions.length} of {transactions.length} transactions
            </span>
            <div className="flex gap-4">
              <span>
                Income: {formatCurrency(
                  filteredAndSortedTransactions
                    .filter(t => t.amount > 0)
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </span>
              <span>
                Expenses: {formatCurrency(
                  Math.abs(filteredAndSortedTransactions
                    .filter(t => t.amount < 0)
                    .reduce((sum, t) => sum + t.amount, 0)
                  )
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionList; 