import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Define types for vendors and customers
interface TopEntity {
  name: string;
  amount: number;
  count: number;
  trend?: number;
  type?: string;
}

interface TopVendorsCustomersProps {
  topVendors: TopEntity[];
  topCustomers: TopEntity[];
  formatCurrency: (amount: number) => string;
}

const TopVendorsCustomers = ({
  topVendors,
  topCustomers,
  formatCurrency
}: TopVendorsCustomersProps) => {
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Top Categories & Vendors</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Expense Vendors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Expense Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topVendors.map((vendor, index) => (
                <div key={index} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center">
                    <span className="w-6 h-6 flex items-center justify-center bg-amber-100 text-amber-800 rounded-full text-xs font-medium mr-3">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{vendor.name}</p>
                      <p className="text-xs text-gray-500">
                        {vendor.count} {vendor.count === 1 ? 'payment' : 'payments'}
                        {vendor.type && ` · ${vendor.type}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-amber-800">{formatCurrency(vendor.amount)}</p>
                    {vendor.trend !== undefined && (
                      <p className={`text-xs ${vendor.trend > 0 ? 'text-red-600' : vendor.trend < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        {vendor.trend > 0 ? '+' : ''}{vendor.trend}% vs prev. period
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {topVendors.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <p>No vendor data available</p>
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium mb-2">Insights</h3>
              <p className="text-xs text-gray-600">
                Your top 5 vendors represent 
                {Math.round((topVendors.reduce((sum, vendor) => sum + vendor.amount, 0) / 
                  (topVendors[0]?.amount * 20 || 1)) * 100)}% of your total expenses. 
                {topVendors[0]?.trend && topVendors[0].trend > 10 
                  ? ` ${topVendors[0].name} has increased significantly (${topVendors[0].trend}%) compared to the previous period.` 
                  : ''}
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Top Customers/Income Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Income Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCustomers.map((customer, index) => (
                <div key={index} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center">
                    <span className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-800 rounded-full text-xs font-medium mr-3">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-xs text-gray-500">
                        {customer.count} {customer.count === 1 ? 'transaction' : 'transactions'}
                        {customer.type && ` · ${customer.type}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-800">{formatCurrency(customer.amount)}</p>
                    {customer.trend !== undefined && (
                      <p className={`text-xs ${customer.trend > 0 ? 'text-green-600' : customer.trend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {customer.trend > 0 ? '+' : ''}{customer.trend}% vs prev. period
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {topCustomers.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <p>No customer data available</p>
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium mb-2">Insights</h3>
              <p className="text-xs text-gray-600">
                Your top income source ({topCustomers[0]?.name || 'N/A'}) represents 
                {Math.round((topCustomers[0]?.amount || 0) / 
                  (topCustomers.reduce((sum, customer) => sum + customer.amount, 0) || 1) * 100)}% 
                of your total income. 
                {topCustomers[0]?.trend && topCustomers[0].trend > 15 
                  ? ` Income from ${topCustomers[0].name} has grown significantly (${topCustomers[0].trend}%) compared to the previous period.` 
                  : topCustomers[0]?.trend && topCustomers[0].trend < -15
                    ? ` Income from ${topCustomers[0].name} has decreased significantly (${topCustomers[0].trend}%) compared to the previous period.`
                    : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TopVendorsCustomers; 