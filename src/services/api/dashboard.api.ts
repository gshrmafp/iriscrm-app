import { apiClient } from './client';

export interface OpportunityStats {
  byStage: Array<{ stage: string; count: number; value: number }>;
  openCount: number;
  pipelineValue: number;
  weightedForecast: number;
  // Real, createdAt-derived month-over-month trend — not a snapshot-based
  // "current portfolio value vs 30 days ago" (the backend keeps no history
  // for that).
  newValueThisMonth: number;
  newValueLastMonth: number;
}

export const dashboardApi = {
  leadStatusSummary: () =>
    apiClient.get<Array<{ status: string; count: number }>>('/leads/status-summary'),

  opportunityStats: () =>
    apiClient.get<OpportunityStats>('/opportunities/summary/stats'),
};
