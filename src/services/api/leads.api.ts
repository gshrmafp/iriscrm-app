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
  // Snapshot of which of the 7 named lead-lifecycle stages was active at the
  // exact moment this follow-up was logged (NEW_LEAD | CONTACTED | QUOTATION |
  // FOLLOWUP | MEETING | PURCHASE_ORDER | LOST) — set by the backend, never sent.
  // Powers the stage-grouped Lead Journey accordion.
  loggedAtStage?: string | null;
}

export interface OpportunitySummary {
  id: string;
  value: string;
  stage: string;
  // Only populated on the GET /leads/:id detail response (list/summary
  // endpoints only select id/value/stage) — captured at qualification (Step 3,
  // REQUIREMENT_IDENTIFIED path) and at Win time respectively.
  initialQuotationRef?: string;
  initialQuotationDate?: string;
  initialQuotationAmount?: string; // Prisma Decimal, serialized as a string
  poNumber?: string;
  poDate?: string;
  poAmount?: string; // Prisma Decimal, serialized as a string
  poRemarks?: string;
  // Also only on the detail response — the durable audit trail of every real
  // stage transition. Lets the Lead Journey mark a stage "reached" even after
  // the opportunity later moves to LOST, instead of relying solely on the
  // current (possibly regressed-to-LOST) `stage` value.
  stageHistory?: { id: string; fromStage: string | null; toStage: string; remark?: string; createdAt: string }[];
}

// A physical meeting logged against a lead — note + silently-captured GPS.
// Loggable at any point in the lead's life, same as follow-ups. Logging one
// advances the linked opportunity's stage to MEETING (never-regress, only
// from QUOTATION or FOLLOWUP) — invalidate the opportunity + lead queries
// after a successful POST.
export interface LeadMeeting {
  id: string;
  leadId: string;
  note: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  visitLocation?: string;
  createdBy?: string;
  createdAt: string;
  // See FollowUp.loggedAtStage — same snapshot semantics, captured on every
  // POST /leads/:id/meetings call.
  loggedAtStage?: string | null;
}

export interface Lead {
  id: string;
  refNo: string;
  contactName?: string;
  companyName?: string;
  contactPhone?: string;
  contactEmail?: string;
  status: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  visitLocation?: string;
  currentStep?: number;
  step1CompletedAt?: string;
  step2CompletedAt?: string;
  step3CompletedAt?: string;
  remarks?: string;
  discussionNote?: string;
  qualificationPath?: string;
  lostReason?: string;
  createdAt: string;
  updatedAt?: string;
  owner?: { id: string; name: string; email: string };
  followUps?: FollowUp[];
  meetings?: LeadMeeting[];
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

// The 7 canonical Lead Journey stages — see leads.api.ts's `stage` param above.
export type LeadStageFilter =
  | 'NEW_LEAD'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'QUOTATION'
  | 'MEETING'
  | 'PURCHASE_ORDER'
  | 'LOST';

export interface JourneyRecentLead {
  id: string;
  refNo: string;
  contactName?: string | null;
  companyName?: string | null;
  status: string;
  currentStep: number;
  updatedAt: string;
  opportunity?: { stage: string } | null;
}

export interface JourneyStageSummary {
  stage: LeadStageFilter;
  count: number;
  value?: number;
  recentLeads: JourneyRecentLead[];
}

export interface LeadJourneySummary {
  stages: JourneyStageSummary[];
  total: number;
}

export interface TeamPerformanceRow {
  ownerId: string;
  counts: Record<LeadStageFilter, number>;
}

export const leadsApi = {
  list: (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    // Filters by the linked Opportunity's stage (e.g. QUOTED) instead of the
    // lead's own status — a lead only has one once it's been qualified.
    opportunityStage?: string;
    // Composite "Lead Journey" stage filter — one of NEW_LEAD, CONTACTED,
    // QUALIFIED, QUOTATION, MEETING, PURCHASE_ORDER, LOST. Folds status/
    // currentStep and Opportunity.stage into the same 7 stages shown on a
    // lead's own journey timeline (see leads/dto.ts's leadStageFilterValues
    // on the backend). Prefer this over status/opportunityStage above.
    stage?: string;
    ownerId?: string;
  }) => apiClient.get<LeadsPage>('/leads', { params }),

  dashboardSummary: (params?: { ownerId?: string }) =>
    apiClient.get<LeadDashboardSummary>('/leads/dashboard-summary', { params }),

  getOne: (id: string) => apiClient.get<Lead>(`/leads/${id}`),

  statusSummary: () => apiClient.get<StatusSummaryItem[]>('/leads/status-summary'),

  followUpsFeed: (params?: { page?: number; pageSize?: number; completed?: boolean }) =>
    apiClient.get<Page<FollowUp>>('/leads/follow-ups', { params }),

  addFollowUp: (id: string, body: { note: string; channel: string; nextActionAt?: string; priority?: FollowUpPriority }) =>
    apiClient.post<FollowUp>(`/leads/${id}/follow-ups`, body),

  completeFollowUp: (followUpId: string) =>
    apiClient.post<FollowUp>(`/leads/follow-ups/${followUpId}/complete`),

  // Physical meeting log — note + silently-captured GPS. Loggable at any
  // point in the lead's life. A successful call may advance the linked
  // opportunity's stage to MEETING — invalidate opportunity + lead queries.
  addMeeting: (id: string, body: { note: string; gpsLatitude?: number; gpsLongitude?: number; visitLocation?: string }) =>
    apiClient.post<LeadMeeting>(`/leads/${id}/meetings`, body),

  createStepped: (body: {
    companyName: string;
    remarks: string;
    gpsLatitude: number;
    gpsLongitude: number;
    visitLocation: string;
  }) => apiClient.post<{ lead: Lead }>('/leads/stepped', body),

  saveStep2: (id: string, body: {
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
    discussionNote: string;
  }) => apiClient.patch<{ lead: Lead; duplicateWarning?: string[] }>(`/leads/${id}/step-2`, body),

  saveStep3: (id: string, body:
    | { path: 'NOT_QUALIFIED'; remark: string }
    | { path: 'FUTURE_POTENTIAL'; followUpDate: string; remarks?: string }
    | { path: 'REQUIREMENT_IDENTIFIED'; dealType: 'INSTALLATION' | 'AMC' | 'MAINTENANCE'; quotationRef: string; quotationDate: string; quotationAmount: number }
  ) => apiClient.patch<{ lead: Lead; opportunity?: { id: string } }>(`/leads/${id}/step-3`, body),

  // Combined Lead+Opportunity 7-stage breakdown (count + recent leads per
  // stage), date-range filterable — powers the Home dashboard's stage
  // sections instead of client-filtering a flat, capped leads fetch.
  journeySummary: (params?: { ownerId?: string; dateFrom?: string; dateTo?: string }) =>
    apiClient.get<LeadJourneySummary>('/leads/journey-summary', { params }),

  // Per-owner version of the same 7-stage breakdown, for the Home
  // dashboard's Team performance section (managers/admins only).
  teamPerformance: (params?: { dateFrom?: string; dateTo?: string }) =>
    apiClient.get<TeamPerformanceRow[]>('/leads/team-performance', { params }),
};
