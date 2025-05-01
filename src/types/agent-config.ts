export interface AgentConfig {
  businessBrand: {
    businessName: string;
    businessContext: string;
    primaryColor: string;
    secondaryColor: string;
    brandVoice: Array<string>;
  };
  agentTasks: {
    rewardsGeneration: boolean;
    reEngagement: boolean;
    bannerCreation: boolean;
    emailMarketing: boolean;
    customerMessaging: boolean;
    performanceAnalysis: boolean;
  };
  businessHours: {
    monday: { open: boolean; start: string; end: string };
    tuesday: { open: boolean; start: string; end: string };
    wednesday: { open: boolean; start: string; end: string };
    thursday: { open: boolean; start: string; end: string };
    friday: { open: boolean; start: string; end: string };
    saturday: { open: boolean; start: string; end: string };
    sunday: { open: boolean; start: string; end: string };
  };
  objectives: {
    businessObjectives: Array<{
      id: string;
      label: string;
      priority: number;
    }>;
    customerValuePriorities: {
      personalization: number;
      valueForMoney: number;
      convenience: number;
      quality: number;
      exclusivity: number;
      novelty: number;
    };
    seasonalCampaigns: Array<{
      name: string;
      objective: string;
      startDate: string;
      endDate: string;
    }>;
  };
  productPricing: {
    averageBasketSize: number;
    products: Array<{
      name: string;
      price: number;
      cost: number;
      category: string;
    }>;
    heroProducts: Array<string>;
    lowVelocityProducts: Array<string>;
  };
  financialGuardrails: {
    rewardBudgetType: 'fixed' | 'percentage';
    monthlyBudget: number;
    targetGrossMargin: number;
    maxCostPerAcquisition: number;
    minRewardValue: number;
    maxRewardValue: number;
  };
  customerSegments: {
    loyaltyTiers: Array<{
      name: string;
      lifetimeTransactions: number;
      lifetimeSpend: number;
      redemptions: number;
    }>;
    visitSpendingThresholds: {
      frequentVisitor: { visits: number; perDays: number };
      highSpender: { amount: number; perDays: number };
    };
  };
  customerCohorts: {
    new: {
      firstVisitWithinDays: number;
      maxLifetimeVisits: number;
    };
    active: {
      lastVisitWithinDays: number;
    };
    dormant: {
      lastVisitBetween: [number, number];
    };
    churned: {
      lastVisitMoreThanDays: number;
    };
    resurrected: {
      wasDormantOrChurned: boolean;
      recentVisitWithinDays: number;
    };
  };
  rewardConstraints: {
    allowedTypes: {
      freeItem: boolean;
      percentageDiscount: boolean;
      fixedAmount: boolean;
      buyXGetY: boolean;
      mysteryGift: boolean;
    };
    concurrencyCeiling: number;
  };
  messagingConstraints: {
    restrictedKeywords: Array<string>;
  };
} 