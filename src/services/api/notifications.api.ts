import { apiClient } from './client';

export type NotificationType =
  | 'QUERY_CREATED'
  | 'QUERY_ASSIGNED'
  | 'QUERY_STATUS_CHANGED'
  | 'QUERY_COMMENT_ADDED'
  | 'QUERY_MENTIONED'
  | 'QUERY_CLOSED'
  | 'QUERY_PRIORITY_CHANGED'
  | 'FOLLOW_UP_DUE'
  | 'FOLLOW_UP_OVERDUE'
  | 'QUERY_ATTACHMENT_UPLOADED'
  | 'QUERY_DUE_DATE_UPDATED'
  | 'ENTITY_MENTIONED';

export interface AppNotification {
  id: string;
  type: NotificationType;
  entityType: string;
  entityId: string;
  title: string;
  body?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationsPage {
  data: AppNotification[];
  meta: { page: number; pageSize: number; total: number };
}

// Only Lead/Opportunity-linked notifications are navigable today — the rest
// (Sales Query-scoped types) have no mobile screens to land on yet.
export function notificationTarget(notification: AppNotification): { screen: 'LeadDetail' | 'OpportunityDetail'; id: string } | null {
  if (notification.entityType === 'Lead') return { screen: 'LeadDetail', id: notification.entityId };
  if (notification.entityType === 'Opportunity') return { screen: 'OpportunityDetail', id: notification.entityId };
  return null;
}

export const notificationsApi = {
  list: (params?: { unreadOnly?: boolean; page?: number; pageSize?: number }) =>
    apiClient.get<NotificationsPage>('/notifications', { params }),

  unreadCount: () => apiClient.get<{ count: number }>('/notifications/unread-count'),

  markAllRead: () => apiClient.post('/notifications/read-all'),

  markRead: (id: string) => apiClient.post(`/notifications/${id}/read`),
};
