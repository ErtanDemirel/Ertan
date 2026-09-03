import { api, getAccessToken } from './client';
import { API_URL } from '../config';
import type {
  Announcement, AttendanceResult, AuthResponse, LeaveBalance, LeaveRequest,
  LeaveType, MealMenu, Payslip,
} from './types';

export const authApi = {
  login: (username: string, password: string) =>
    api.post<AuthResponse>('/api/auth/login', { username, password }).then((r) => r.data),
  forgot: (username: string) =>
    api.post('/api/auth/forgot-password', { username }).then((r) => r.data),
  reset: (username: string, code: string, newPassword: string) =>
    api.post('/api/auth/reset-password', { username, code, newPassword }).then((r) => r.data),
};

export interface CreateLeaveInput {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  title?: string;
  reason?: string;
  days?: number;
  halfDay?: 'None' | 'Morning' | 'Afternoon';
}

export const leaveApi = {
  types: () => api.get<LeaveType[]>('/api/leave/types').then((r) => r.data),
  my: () =>
    api.get<{ requests: LeaveRequest[]; balance: LeaveBalance | null }>('/api/leave/my').then((r) => r.data),
  create: (input: CreateLeaveInput) =>
    api.post<LeaveRequest>('/api/leave/requests', input).then((r) => r.data),
  uploadAttachment: (id: number, file: { uri: string; name: string; type: string }) => {
    const fd = new FormData();
    // React Native FormData dosya biçimi
    fd.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    // Content-Type'ı elle set etmiyoruz; axios/RN boundary ile birlikte ayarlar.
    return api.post(`/api/leave/requests/${id}/attachments`, fd).then((r) => r.data);
  },
  cancel: (id: number) => api.post(`/api/leave/requests/${id}/cancel`).then((r) => r.data),
};

export const payrollApi = {
  my: () => api.get<Payslip[]>('/api/payroll/my').then((r) => r.data),
  fileUrl: (id: number) => `/api/payroll/${id}/file`,
};

export interface AdvanceReq { id: number; amount: number; reason?: string | null; status: string; managerComment?: string | null; requestedAt: string; }
export interface ExpenseReq { id: number; amount: number; title?: string | null; description?: string | null; hasFile: boolean; status: string; managerComment?: string | null; requestedAt: string; }

export const requestApi = {
  my: () => api.get<{ advances: AdvanceReq[]; expenses: ExpenseReq[] }>('/api/requests/my').then((r) => r.data),
  createAdvance: (amount: number, reason?: string) =>
    api.post('/api/requests/advance', { amount, reason }).then((r) => r.data),
  createExpense: (amount: number, title: string | undefined, description: string | undefined, file: { uri: string; name: string; type: string } | null) => {
    const fd = new FormData();
    fd.append('amount', String(amount));
    if (title) fd.append('title', title);
    if (description) fd.append('description', description);
    if (file) fd.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    return api.post('/api/requests/expense', fd).then((r) => r.data);
  },
};

export interface AppNotification {
  id: number; title: string; body: string; type: string; isRead: boolean; createdAt: string;
}
export const notificationApi = {
  my: () => api.get<{ items: AppNotification[]; unread: number }>('/api/notifications/my').then((r) => r.data),
  read: (id: number) => api.post(`/api/notifications/${id}/read`).then((r) => r.data),
  readAll: () => api.post('/api/notifications/read-all').then((r) => r.data),
  registerDevice: (token: string, platform?: string) =>
    api.post('/api/notifications/register-device', { token, platform }).then((r) => r.data),
  unregisterDevice: (token: string) =>
    api.post('/api/notifications/unregister-device', { token }).then((r) => r.data),
};

export const announcementApi = {
  list: () => api.get<Announcement[]>('/api/announcements').then((r) => r.data),
  unreadMandatory: () =>
    api.get<Announcement[]>('/api/announcements/unread-mandatory').then((r) => r.data),
  markRead: (id: number) => api.post(`/api/announcements/${id}/read`).then((r) => r.data),
};

export const mealApi = {
  list: () => api.get<MealMenu[]>('/api/meals').then((r) => r.data),
};

export interface AttendanceRecord {
  id: number; personnelId: number; personnelName: string; sicilNo: string;
  type: 'CheckIn' | 'CheckOut'; timestamp: string;
  workLocationName?: string | null; distanceMeters: number; isWithinGeofence: boolean;
}
export const attendanceApi = {
  check: (qrContent: string, latitude: number, longitude: number, deviceInfo?: string) =>
    api.post<AttendanceResult>('/api/attendance/check', { qrContent, latitude, longitude, deviceInfo }).then((r) => r.data),
  my: (from?: string, to?: string) =>
    api.get<AttendanceRecord[]>('/api/attendance/my', { params: { from, to } }).then((r) => r.data),
};

export interface DirectoryEntry {
  name: string; title?: string | null; department?: string | null;
  phone?: string | null; email?: string | null;
}
export const directoryApi = {
  list: (search?: string) =>
    api.get<DirectoryEntry[]>('/api/me/directory', { params: { search } }).then((r) => r.data),
};

export type FeedbackKind = 'Suggestion' | 'Complaint' | 'NearMiss' | 'Request';
export type FeedbackStatus = 'New' | 'Reviewing' | 'Resolved' | 'Closed';
export interface Feedback {
  id: number; kind: FeedbackKind; title?: string | null; body: string;
  location?: string | null; isAnonymous: boolean; status: FeedbackStatus;
  submitterName?: string | null; sicilNo?: string | null; handlerComment?: string | null;
  createdAt: string; handledAt?: string | null;
}
export const voiceApi = {
  my: () => api.get<Feedback[]>('/api/voice/my').then((r) => r.data),
  create: (b: { kind: FeedbackKind; title?: string; body: string; location?: string; isAnonymous?: boolean }) =>
    api.post<Feedback>('/api/voice', b).then((r) => r.data),
};

export interface Training {
  id: number; title: string; description?: string | null; category: string;
  durationSeconds: number; isMandatory: boolean; isActive: boolean;
  watchedSeconds: number; completed: boolean; completedAt?: string | null; progressPercent: number;
}
export const trainingApi = {
  list: () => api.get<Training[]>('/api/trainings').then((r) => r.data),
  videoUrl: (id: number) => `${API_URL}/api/trainings/${id}/video?access_token=${encodeURIComponent(getAccessToken() ?? '')}`,
  progress: (id: number, position: number, duration?: number) =>
    api.post<Training>(`/api/trainings/${id}/progress`, { position: Math.floor(position), duration: duration ? Math.floor(duration) : undefined }).then((r) => r.data),
};

export type AppStatus = 'New' | 'Reviewing' | 'Interview' | 'Offered' | 'Hired' | 'Rejected';
export interface InternalPosting {
  id: number; title: string; description?: string | null; department?: string | null;
  location?: string | null; positionCount?: number | null; deadline?: string | null;
  isActive: boolean; createdAt: string; applicantCount: number; alreadyApplied: boolean; myStatus?: string | null;
}
export interface InternalApplication {
  id: number; postingId: number; postingTitle: string; personnelName: string;
  note?: string | null; status: AppStatus; handlerComment?: string | null; createdAt: string;
}
export const postingApi = {
  list: () => api.get<InternalPosting[]>('/api/internal-postings').then((r) => r.data),
  apply: (id: number, note?: string) => api.post<InternalApplication>(`/api/internal-postings/${id}/apply`, { note }).then((r) => r.data),
  myApplications: () => api.get<InternalApplication[]>('/api/internal-postings/my-applications').then((r) => r.data),
};

export interface Holiday { id: number; date: string; name: string; isHalfDay: boolean; }
export const holidayApi = {
  list: (year?: number) => api.get<Holiday[]>('/api/holidays', { params: { year } }).then((r) => r.data),
};

export interface ContactUpdate {
  id: number; personnelName: string; phoneNumber?: string | null; email?: string | null;
  address?: string | null; emergencyContactName?: string | null; emergencyContactPhone?: string | null;
  status: 'Pending' | 'Approved' | 'Rejected'; handlerComment?: string | null; createdAt: string; handledAt?: string | null;
}
export interface ContactInfo {
  phoneNumber?: string | null; email?: string | null; address?: string | null;
  emergencyContactName?: string | null; emergencyContactPhone?: string | null;
  pending?: ContactUpdate | null;
}
export const contactApi = {
  mine: () => api.get<ContactInfo>('/api/me/contact').then((r) => r.data),
  create: (b: { phoneNumber?: string; email?: string; address?: string; emergencyContactName?: string; emergencyContactPhone?: string }) =>
    api.post<ContactUpdate>('/api/me/contact-requests', b).then((r) => r.data),
};

export interface MyService {
  mine: { routeName?: string | null; stop?: string | null; departure?: string | null; ret?: string | null; driver?: string | null; plate?: string | null } | null;
  routes: { name: string; stops?: string | null; departure?: string | null; ret?: string | null }[];
}
export const serviceApi = {
  mine: () => api.get<MyService>('/api/me/service').then((r) => r.data),
};
