import { apiClient } from './client';

// The Sales Executive field workflow: an Opportunity is created directly at
// QUOTATION (via Lead Step 3 — REQUIREMENT_IDENTIFIED). Logging a follow-up
// auto-advances QUOTATION -> FOLLOWUP; logging a meeting auto-advances
// QUOTATION/FOLLOWUP -> MEETING (both never-regress, backend-side effects of
// the follow-up/meeting POST endpoints). WON was renamed PURCHASE_ORDER and
// is only reachable via the dedicated win() flow.
export type OpportunityStage = 'QUOTATION' | 'FOLLOWUP' | 'MEETING' | 'PURCHASE_ORDER' | 'LOST';
export type DealType = 'INSTALLATION' | 'AMC' | 'PRODUCT';

export interface OpportunityStageHistoryEntry {
  id: string;
  fromStage: OpportunityStage | null;
  toStage: OpportunityStage;
  remark?: string;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  leadId: string;
  lead?: { id: string; contactName: string; companyName?: string };
  dealType: DealType;
  value: string; // Prisma Decimal, serialized as a string
  stage: OpportunityStage;
  probability: number;
  expectedClose?: string | null;
  lostReason?: string | null;
  wonAt?: string | null;
  createdAt: string;
  updatedAt: string;
  stageHistory?: OpportunityStageHistoryEntry[];
  // Purchase Order — captured by the win() flow once stage is PURCHASE_ORDER.
  poNumber?: string;
  poDate?: string;
  poRemarks?: string;
  poGpsLatitude?: number;
  poGpsLongitude?: number;
  poLocation?: string;
  poAmount?: string; // Prisma Decimal, serialized as a string
}

// Mirrors Irisbackend's pipeline.ts FORWARD map — LOST is reachable from any
// open stage via the generic transition endpoint; PURCHASE_ORDER always goes
// through the dedicated win() flow instead. FOLLOWUP/MEETING are normally
// reached automatically when a follow-up/meeting is logged, but this "next
// stage" mapping stays available for a manual correction.
export const FORWARD_STAGE: Record<OpportunityStage, OpportunityStage | null> = {
  QUOTATION: 'FOLLOWUP',
  FOLLOWUP: 'MEETING',
  MEETING: null,
  PURCHASE_ORDER: null,
  LOST: null,
};

export function canWinOpportunity(stage: OpportunityStage): boolean {
  return stage === 'QUOTATION' || stage === 'FOLLOWUP' || stage === 'MEETING';
}

export function isOpportunityClosed(stage: OpportunityStage): boolean {
  return stage === 'PURCHASE_ORDER' || stage === 'LOST';
}

export interface WinInput {
  poNumber: string;
  poDate: string;
  poAmount: number;
  poRemarks?: string;
  poGpsLatitude?: number;
  poGpsLongitude?: number;
  poLocation?: string;
  site?: string;
  timeline?: string;
}

export const opportunitiesApi = {
  getOne: (id: string) => apiClient.get<Opportunity>(`/opportunities/${id}`),

  transitionStage: (id: string, toStage: OpportunityStage, remark?: string) =>
    apiClient.patch<Opportunity>(`/opportunities/${id}/stage`, { toStage, remark }),

  markLost: (id: string, reason: string) =>
    apiClient.post<Opportunity>(`/opportunities/${id}/lost`, { reason }),

  win: (id: string, body: WinInput) =>
    apiClient.post<Opportunity>(`/opportunities/${id}/win`, body),
};
