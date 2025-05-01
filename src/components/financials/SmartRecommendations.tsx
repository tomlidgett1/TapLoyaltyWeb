import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Lightbulb, TrendingUp, CheckCircle, X } from 'lucide-react';

// Define types for recommendations
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

interface SmartRecommendationsProps {
  recommendations: Recommendation[];
  onDismissRecommendation: (id: string) => void;
  formatCurrency?: (amount: number) => string;
}

const SmartRecommendations = ({ 
  recommendations: initialRecs, 
  onDismissRecommendation,
  formatCurrency 
}: SmartRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>(initialRecs);
  const [showDismissed, setShowDismissed] = useState(false);

  // Handle dismissing a recommendation
  const handleDismiss = (id: string) => {
    setRecommendations(prev => 
      prev.map(rec => rec.id === id ? { ...rec, dismissed: true } : rec)
    );
    onDismissRecommendation(id);
  };

  // Filter recommendations based on showDismissed state
  const filteredRecommendations = showDismissed 
    ? recommendations
    : recommendations.filter(rec => !rec.dismissed);

  // Get icon and accent color for recommendation type
  const getRecommendationIconAndColor = (type: string) => {
    switch(type) {
      case 'alert':
        return { 
          icon: <AlertCircle className="h-5 w-5 text-blue-600" />,
          accentColor: '#2563eb',
          bgColor: 'bg-blue-50'
        };
      case 'opportunity':
        return { 
          icon: <Lightbulb className="h-5 w-5 text-gray-600" />,
          accentColor: '#9ca3af',
          bgColor: 'bg-gray-50'
        };
      case 'success':
        return { 
          icon: <TrendingUp className="h-5 w-5 text-blue-600" />,
          accentColor: '#2563eb',
          bgColor: 'bg-blue-50'
        };
      default:
        return { 
          icon: <Lightbulb className="h-5 w-5 text-gray-600" />,
          accentColor: '#9ca3af',
          bgColor: 'bg-gray-50'
        };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium text-gray-900">Smart Recommendations</h2>
        {recommendations.some(rec => rec.dismissed) && (
          <Button 
            variant="outline" 
            size="sm"
            className="border-0 ring-1 ring-gray-200 text-gray-600 rounded-lg"
            onClick={() => setShowDismissed(!showDismissed)}
          >
            {showDismissed ? 'Hide Dismissed' : 'Show Dismissed'}
          </Button>
        )}
      </div>
      
      {/* Introduction text */}
      <p className="text-sm text-gray-600">
        Our AI analyzes your financial data to provide personalized recommendations. These insights are updated daily based on your transaction patterns and industry benchmarks.
      </p>
      
      {/* Recommendations list */}
      <div className="space-y-4">
        {filteredRecommendations.length > 0 ? (
          filteredRecommendations.map(recommendation => {
            const { icon, accentColor, bgColor } = getRecommendationIconAndColor(recommendation.type);
            
            return (
              <Card 
                key={recommendation.id} 
                className={`bg-white border-gray-200 shadow-md rounded-lg overflow-hidden ${recommendation.dismissed ? 'opacity-60' : ''}`}
              >
                <div className="h-1 w-full" style={{ background: recommendation.dismissed ? '#d1d5db' : accentColor }}></div>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-4">
                      <div className={`rounded-full ${bgColor} p-2 mt-0.5`}>
                        {icon}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{recommendation.title}</h4>
                        <p className="text-sm mt-1 text-gray-600">
                          {recommendation.description}
                        </p>
                        {recommendation.detail && (
                          <p className="text-sm mt-2 text-gray-500">
                            {recommendation.detail}
                          </p>
                        )}
                        {recommendation.action && (
                          <Button 
                            variant="link" 
                            className="p-0 h-auto text-sm mt-2 text-blue-600 hover:text-blue-700"
                            onClick={() => {
                              // Handle action click - could open a URL or trigger a function
                              if (recommendation.action?.url) {
                                window.open(recommendation.action.url, '_blank');
                              }
                            }}
                          >
                            {recommendation.action.label}
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {!recommendation.dismissed && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                        onClick={() => handleDismiss(recommendation.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {recommendation.dismissed && (
                      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                        Dismissed
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="bg-white border-gray-200 shadow-md rounded-lg overflow-hidden">
            <CardContent className="p-5 flex flex-col items-center justify-center py-8">
              <CheckCircle className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
              <p className="text-sm text-gray-600 text-center max-w-md mt-1">
                There are no active recommendations at the moment. We'll continue to analyze your financial data and provide insights as new patterns emerge.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SmartRecommendations; 