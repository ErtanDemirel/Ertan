import { api } from './client';
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

export const attendanceApi = {
  check: (qrContent: string, latitude: number, longitude: number, deviceInfo?: string) =>
    api.post<AttendanceResult>('/api/attendance/check', { qrContent, latitude, longitude, deviceInfo }).then((r) => r.data),
  my: () => api.get('/api/attendance/my').then((r) => r.data),
};
