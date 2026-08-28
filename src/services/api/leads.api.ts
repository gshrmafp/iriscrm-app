import { apiClient } from './client';

export type FollowUpPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface FollowUp {
  id: string;
  note: string;
  channel: string;
  nextActionAt?: string;
  priority: FollowUpPriority;
  completedAt?: string | null;
  createdAt: string;
  lead?: { id: string; contactName: string; companyName?: string };
}

export interface OpportunitySummary {
  id: string;
  value: string;
  stage: string;
}

export interface Lead {
  id: string;
  refNo: string;
  contactName: string;
  companyName?: string;
  contactPhone?: string;
  contactEmail?: string;
  status: string;
  source?: string;
  sourceOther?: string;
  productInterest?: string;
  productInterestOther?: string;
  address?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  visitLocation?: string;
  notes?: string;
  lostReason?: string;
  createdAt: string;
  updatedAt?: string;
  owner?: { id: string; name: string; email: string };
  followUps?: FollowUp[];
  // Embedded on both the list and detail endpoints — the real deal value/stage
  // once a lead has been qualified. Never fabricate this from Lead fields.
  opportunity?: OpportunitySummary | null;
}

// The real, unwrapped GET /leads / /leads/follow-ups shape — the backend
// nests pagination as { items, total, page, pageSize, totalPages }, not
// `data`. (Only GET /notifications uses a `data` array + sibling `meta`.)
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type LeadsPage = Page<Lead>;

export interface StatusSummaryItem {
  status: string;
  count: number;
}

export interface LeadDashboardSummary {
  activeCount: number;
  needAttentionCount: number;
}

export interface CreateLeadResult {
  lead: Lead;
  duplicateWarning?: string[];
}

export const leadsApi = {
  list: (params: { page?: number; pageSize?: number; search?: string; status?: string }) =>
    apiClient.get<LeadsPage>('/leads', { params }),

  dashboardSummary: (params?: { ownerId?: string }) =>
    apiClient.get<LeadDashboardSummary>('/leads/dashboard-summary', { params }),

  getOne: (id: string) => apiClient.get<Lead>(`/leads/${id}`),

  // POST /leads returns { lead, duplicateWarning? } — not the Lead directly,
  // since the backend surfaces a same-region phone/email duplicate warning
  // alongside the created record.
  create: (body: Partial<Lead>) => apiClient.post<CreateLeadResult>('/leads', body),

  statusSummary: () => apiClient.get<StatusSummaryItem[]>('/leads/status-summary'),

  followUpsFeed: (params?: { page?: number; pageSize?: number; completed?: boolean }) =>
    apiClient.get<Page<FollowUp>>('/leads/follow-ups', { params }),

  addFollowUp: (id: string, body: { note: string; channel: string; nextActionAt?: string; priority?: FollowUpPriority }) =>
    apiClient.post<FollowUp>(`/leads/${id}/follow-ups`, body),

  completeFollowUp: (followUpId: string) =>
    apiClient.post<FollowUp>(`/leads/follow-ups/${followUpId}/complete`),

  markLost: (id: string, reason: string) =>
    apiClient.post<Lead>(`/leads/${id}/lost`, { reason }),

  qualify: (id: string, body: { dealType: string; value: number; expectedClose?: string }) =>
    apiClient.post(`/leads/${id}/qualify`, body),
};
