import { apiClient } from './client';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  regionId: string;
  region?: { code: string; name: string };
  status: string;
  createdAt: string;
  updatedAt?: string;
  reportingToId?: string;
}

export const authApi = {
  getMe: () => apiClient.get<UserProfile>('/auth/me'),

  updateMe: (body: { name?: string; email?: string }) =>
    apiClient.patch<UserProfile>('/auth/me', body),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiClient.post<{ message: string }>('/auth/change-password', body),
};
