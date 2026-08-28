import { apiClient } from './client';

export type OpportunityStage = 'NEW' | 'CONTACTED' | 'QUOTED' | 'NEGOTIATION' | 'WON' | 'LOST';
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
}

// Mirrors Irisbackend's pipeline.ts FORWARD map — LOST is reachable from any
// open stage via the generic transition endpoint; WON always goes through
// the dedicated win() flow instead.
export const FORWARD_STAGE: Record<OpportunityStage, OpportunityStage | null> = {
  NEW: 'CONTACTED',
  CONTACTED: 'QUOTED',
  QUOTED: 'NEGOTIATION',
  NEGOTIATION: null,
  WON: null,
  LOST: null,
};

export function canWinOpportunity(stage: OpportunityStage): boolean {
  return stage === 'QUOTED' || stage === 'NEGOTIATION';
}

export function isOpportunityClosed(stage: OpportunityStage): boolean {
  return stage === 'WON' || stage === 'LOST';
}

export const opportunitiesApi = {
  getOne: (id: string) => apiClient.get<Opportunity>(`/opportunities/${id}`),

  transitionStage: (id: string, toStage: OpportunityStage, remark?: string) =>
    apiClient.patch<Opportunity>(`/opportunities/${id}/stage`, { toStage, remark }),

  markLost: (id: string, reason: string) =>
    apiClient.post<Opportunity>(`/opportunities/${id}/lost`, { reason }),

  win: (id: string, body?: { site?: string; timeline?: string }) =>
    apiClient.post<Opportunity>(`/opportunities/${id}/win`, body ?? {}),
};
