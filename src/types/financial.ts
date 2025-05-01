// Financial data types

// Daily summary of financial data
export interface DailySummary {
  date: string;  // YYYY-MM-DD
  cashIn: number;
  cashOut: number;
  net: number;
  burnRate: number;
  openingBalance: number;
  closingBalance: number;
  updatedAt: number; // timestamp
}

// Types of financial alerts
export type AlertType = 'low_balance' | 'cost_spike' | 'revenue_drop';

// Configuration for a financial alert
export interface AlertConfig {
  type: AlertType;
  threshold: number;
  isActive: boolean;
  notifyByEmail?: boolean;
  notifyByPush?: boolean;
}

// Transaction data from open banking
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'inflow' | 'outflow';
  category?: string;
  timestamp: string; // ISO string
  accountId: string;
  reference?: string;
}

// Bank account data
export interface BankAccount {
  id: string;
  name: string;
  institution: string;
  balance: number;
  currency: string;
  type: 'checking' | 'savings' | 'credit' | 'loan' | 'other';
  lastUpdated: string; // ISO string
}

// Financial forecast data
export interface FinancialForecast {
  cashFlow: ForecastDataPoint[];
  burnRate: number;
  runway: number; // in weeks
  scenarios: {
    optimistic: ForecastDataPoint[];
    pessimistic: ForecastDataPoint[];
  };
  lastUpdated: string; // ISO string
}

// Single data point for forecasts
export interface ForecastDataPoint {
  date: string; // YYYY-MM-DD
  cashIn: number;
  cashOut: number;
  net: number;
  balance: number;
}

// Supported currency types
export type SupportedCurrency = 'AUD' | 'NZD' | 'SGD';

// View complexity levels
export type FinancialViewLevel = 'basic' | 'moderate' | 'advanced';

// Time range options
export type TimeRangeOption = 'today' | '7day' | '30day' | 'custom'; 