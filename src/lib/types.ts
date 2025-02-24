export type SortField = 
  | 'fullName'
  | 'lastTransactionDate'
  | 'totalLifetimeSpend'
  | 'redemptionCount'
  | 'pointsBalance'
  | 'lifetimeTransactionCount'

export type SortDirection = 'asc' | 'desc'

export type CustomerCohort = 
  | 'all'
  | 'active'    // Transacted in last 30 days
  | 'engaged'   // Transacted in last 90 days
  | 'at-risk'   // No transaction in 90-180 days
  | 'dormant'   // No transaction in 180+ days
  | 'new'       // First transaction in last 30 days
  | 'loyal'     // 10+ transactions
  | 'vip'       // Top 10% by spend 