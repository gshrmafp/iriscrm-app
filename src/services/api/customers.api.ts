import { apiClient } from './client';
import type { Page } from './leads.api';

export interface CustomerContact {
  name: string;
  phone?: string;
  email?: string;
}

export interface CustomerAddress {
  line1: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface Customer {
  id: string;
  name: string;
  type?: string;
  active?: boolean;
  revenue?: string | null; // Prisma Decimal, serialized as a string
  contacts?: CustomerContact[];
  addresses?: CustomerAddress[];
  regionId?: string;
  createdAt?: string;
  // The list endpoint embeds the single most-recently-updated linked Lead
  // (if any) as a real recency signal — used to derive an honest
  // "active / needs attention / new" indicator instead of a fabricated one.
  leads?: Array<{ updatedAt: string }>;
}

export type CustomersPage = Page<Customer>;

export interface CustomerSummary {
  total: number;
  newThisMonth: number;
}

export const customersApi = {
  list: (params?: { page?: number; pageSize?: number; search?: string; active?: boolean }) =>
    apiClient.get<CustomersPage>('/customers', { params }),

  summary: () => apiClient.get<CustomerSummary>('/customers/summary'),

  getOne: (id: string) => apiClient.get<Customer>(`/customers/${id}`),

  create: (body: {
    name: string;
    type: string;
    revenue?: number;
    contacts?: CustomerContact[];
    addresses?: CustomerAddress[];
  }) => apiClient.post<Customer>('/customers', body),
};
