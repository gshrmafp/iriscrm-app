import { apiClient } from './client';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN' | 'CONSULTANT';
export type EmployeeLifecycleStatus = 'ONBOARDING' | 'PROBATION' | 'CONFIRMED' | 'NOTICE' | 'EXITED';

export interface Employee {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'ACTIVE' | 'INACTIVE';
    regionId: string;
    region?: { id: string; code: string; name: string } | null;
    reportingTo: { id: string; name: string } | null;
  };
  phone?: string | null;
  personalEmail?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  currentAddress?: string | null;
  permanentAddress?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRel?: string | null;
  designation?: { id: string; code: string; name: string } | null;
  department?: { id: string; code: string; name: string } | null;
  employmentType: EmploymentType;
  lifecycleStatus: EmployeeLifecycleStatus;
  joiningDate?: string | null;
  probationEndsOn?: string | null;
  confirmedOn?: string | null;
  noticePeriodDays?: number | null;
  workLocation?: string | null;
}

export interface UpdateMyEmployeeBody {
  phone?: string | null;
  personalEmail?: string | null;
  currentAddress?: string | null;
  permanentAddress?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRel?: string | null;
}

export const hrmsApi = {
  myPermissions: () => apiClient.get<string[]>('/auth/me/permissions'),
  getMyEmployee: () => apiClient.get<Employee>('/hrms/employees/me'),
  updateMyEmployee: (body: UpdateMyEmployeeBody) => apiClient.patch<Employee>('/hrms/employees/me', body),
};

export const LIFECYCLE_LABELS: Record<EmployeeLifecycleStatus, string> = {
  ONBOARDING: 'Onboarding',
  PROBATION: 'Probation',
  CONFIRMED: 'Confirmed',
  NOTICE: 'Notice period',
  EXITED: 'Exited',
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
  CONSULTANT: 'Consultant',
};

// HR dates are stored at UTC midnight — format in UTC so they never shift a day.
export function formatHrDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function apiErrorMessage(err: any, fallback: string): string {
  return err?.response?.data?.error?.message ?? err?.response?.data?.message ?? err?.message ?? fallback;
}
