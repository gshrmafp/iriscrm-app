import { apiClient } from './client';

export interface PicklistOption {
  id: string;
  listType: 'LEAD_SOURCE' | 'PRODUCT_INTEREST';
  code: string;
  label: string;
  active: boolean;
  sortOrder: number;
}

export const picklistsApi = {
  list: (listType: 'LEAD_SOURCE' | 'PRODUCT_INTEREST') =>
    apiClient.get<PicklistOption[]>('/picklists', { params: { listType } }),
};
