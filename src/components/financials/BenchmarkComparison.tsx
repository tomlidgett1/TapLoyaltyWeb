import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

// Define the types for comparison metrics
interface ComparisonMetric {
  name: string;
  description: string;
  businessValue: number;
  industryAverage: number;
  industryBenchmarkRange: [number, number]; // [min, max]
  percentile: number;
  isHigherBetter: boolean;
}

interface BenchmarkComparisonProps {
  metrics: ComparisonMetric[];
  industryName: string;
  businessSizeRange: string;
  dataSource: string;
  lastUpdated: string;
  formatCurrency?: (amount: number) => string;
}

const BenchmarkComparison = ({
  metrics,
  industryName,
  businessSizeRange,
  dataSource,
  lastUpdated,
  formatCurrency
}: BenchmarkComparisonProps) => {
  // Function to determine if the metric is good, neutral, or concerning
  const getMetricStatus = (metric: ComparisonMetric) => {
    const { businessValue, industryAverage, isHigherBetter, percentile } = metric;
    
    if (isHigherBetter) {
      if (businessValue >= industryAverage * 1.2) return 'good';
      if (businessValue <= industryAverage * 0.8) return 'concerning';
      return 'neutral';
    } else {
      if (businessValue <= industryAverage * 0.8) return 'good';
      if (businessValue >= industryAverage * 1.2) return 'concerning';
      return 'neutral';
    }
  };

  // Function to get the appropriate icon and text color based on status
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'good':
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          textColor: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'concerning':
        return {
          icon: <AlertCircle className="h-4 w-4 text-red-500" />,
          textColor: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'neutral':
      default:
        return {
          icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
          textColor: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200'
        };
    }
  };

  // Function to format percentile description
  const getPercentileDescription = (metric: ComparisonMetric) => {
    const { percentile, isHigherBetter } = metric;
    
    if (isHigherBetter) {
      if (percentile >= 75) return `Better than ${percentile}% of similar businesses`;
      if (percentile <= 25) return `Lower than ${100 - percentile}% of similar businesses`;
      return `Average compared to similar businesses`;
    } else {
      if (percentile <= 25) return `Better than ${100 - percentile}% of similar businesses`;
      if (percentile >= 75) return `Higher than ${percentile}% of similar businesses`;
      return `Average compared to similar businesses`;
    }
  };

  // Function to get description about the metric status
  const getMetricDescription = (metric: ComparisonMetric) => {
    const status = getMetricStatus(metric);
    const { name, isHigherBetter } = metric;
    
    switch (status) {
      case 'good':
        return isHigherBetter 
          ? `Great! Your ${name.toLowerCase()} is above industry average.` 
          : `Great! Your ${name.toLowerCase()} is below industry average.`;
      case 'concerning':
        return isHigherBetter 
          ? `Your ${name.toLowerCase()} is below industry average. Consider ways to improve this metric.` 
          : `Your ${name.toLowerCase()} is above industry average. Consider ways to reduce this.`;
      case 'neutral':
      default:
        return `Your ${name.toLowerCase()} is in line with industry standards.`;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Benchmarking Comparisons</h2>
      
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="rounded-full bg-blue-100 p-1.5">
              <Info className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-800">Industry Benchmarks</h3>
              <p className="text-sm text-blue-600 mt-1">
                See how your business performs compared to industry standards. Data is based on {dataSource} for 
                {' '}{industryName} businesses with {businessSizeRange} annual revenue.
                <span className="block mt-1 text-xs">Last updated: {lastUpdated}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 gap-4">
        {metrics.map((metric, index) => {
          const status = getMetricStatus(metric);
          const styles = getStatusStyles(status);
          
          return (
            <Card key={index} className={`${styles.bgColor} ${styles.borderColor}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-medium flex items-center">
                      {styles.icon}
                      <span className={`ml-2 ${styles.textColor}`}>{metric.name}</span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-600">Your Business</span>
                    <p className="text-lg font-bold">
                      {metric.name.includes('Ratio') || metric.name.includes('% of') 
                        ? `${metric.businessValue}%` 
                        : formatCurrency 
                          ? formatCurrency(metric.businessValue)
                          : metric.businessValue}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Industry Range</span>
                    <span>Industry Average: {
                      metric.name.includes('Ratio') || metric.name.includes('% of')  
                        ? `${metric.industryAverage}%` 
                        : formatCurrency 
                          ? formatCurrency(metric.industryAverage)
                          : metric.industryAverage
                    }</span>
                  </div>
                  
                  {/* Percentile gauge */}
                  <div className="h-2 relative bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${status === 'good' ? 'bg-green-500' : status === 'concerning' ? 'bg-red-500' : 'bg-amber-500'}`}
                      style={{ width: `${metric.percentile}%` }}
                    />
                    <div 
                      className="absolute top-0 h-full border-l-2 border-gray-700" 
                      style={{ left: `${metric.industryAverage}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs mt-1">
                    <span>{metric.industryBenchmarkRange[0]}%</span>
                    <span>{metric.industryBenchmarkRange[1]}%</span>
                  </div>
                  
                  <p className={`mt-2 text-sm ${styles.textColor}`}>
                    {getPercentileDescription(metric)}
                  </p>
                  
                  <p className="mt-1 text-sm text-gray-600">
                    {getMetricDescription(metric)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default BenchmarkComparison; 