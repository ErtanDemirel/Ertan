import { api } from './client';
import type {
  Announcement, AttendanceResult, AuthResponse, LeaveBalance, LeaveRequest,
  LeaveType, MealMenu,
} from './types';

export const authApi = {
  login: (username: string, password: string) =>
    api.post<AuthResponse>('/api/auth/login', { username, password }).then((r) => r.data),
  forgot: (username: string) =>
    api.post('/api/auth/forgot-password', { username }).then((r) => r.data),
  reset: (username: string, code: string, newPassword: string) =>
    api.post('/api/auth/reset-password', { username, code, newPassword }).then((r) => r.data),
};

export const leaveApi = {
  types: () => api.get<LeaveType[]>('/api/leave/types').then((r) => r.data),
  my: () =>
    api.get<{ requests: LeaveRequest[]; balance: LeaveBalance | null }>('/api/leave/my').then((r) => r.data),
  create: (leaveTypeId: number, startDate: string, endDate: string, reason?: string) =>
    api.post<LeaveRequest>('/api/leave/requests', { leaveTypeId, startDate, endDate, reason }).then((r) => r.data),
  cancel: (id: number) => api.post(`/api/leave/requests/${id}/cancel`).then((r) => r.data),
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
