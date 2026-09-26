import { apiClient } from './client';

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const identityApi = {
  // Minimal user directory (id/name/email/role) for teammate lookup — same
  // region-scoped endpoint the web app uses to resolve an ownerId to a
  // display name (e.g. on the Team performance list).
  userDirectory: () => apiClient.get<DirectoryUser[]>('/users/directory'),
};
