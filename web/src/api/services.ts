import { api } from './client';
import type {
  Announcement, AnnouncementReadStat, Attendance, AuthResponse, LeaveBalance,
  LeaveRequest, LeaveType, MealMenu, Paged, Personnel, QrPayload, ServiceRoute,
  Shift, WorkLocation,
} from './types';

// ---------------- Auth ----------------
export const authApi = {
  login: (username: string, password: string) =>
    api.post<AuthResponse>('/api/auth/login', { username, password }).then((r) => r.data),
  forgot: (username: string) =>
    api.post('/api/auth/forgot-password', { username }).then((r) => r.data),
  reset: (username: string, code: string, newPassword: string) =>
    api.post('/api/auth/reset-password', { username, code, newPassword }).then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),
};

// ---------------- Personnel ----------------
export interface PersonnelFilter {
  search?: string;
  department?: string;
  shiftId?: number;
  serviceRouteId?: number;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}
export const personnelApi = {
  list: (f: PersonnelFilter = {}) =>
    api.get<Paged<Personnel>>('/api/personnel', { params: f }).then((r) => r.data),
  get: (id: number) => api.get<Personnel>(`/api/personnel/${id}`).then((r) => r.data),
  create: (body: unknown) => api.post<Personnel>('/api/personnel', body).then((r) => r.data),
  update: (id: number, body: unknown) =>
    api.put<Personnel>(`/api/personnel/${id}`, body).then((r) => r.data),
  remove: (id: number) => api.delete(`/api/personnel/${id}`).then((r) => r.data),
};

// ---------------- Service Routes ----------------
export const routeApi = {
  list: () => api.get<ServiceRoute[]>('/api/service-routes').then((r) => r.data),
  create: (b: unknown) => api.post<ServiceRoute>('/api/service-routes', b).then((r) => r.data),
  update: (id: number, b: unknown) =>
    api.put<ServiceRoute>(`/api/service-routes/${id}`, b).then((r) => r.data),
  remove: (id: number) => api.delete(`/api/service-routes/${id}`).then((r) => r.data),
};

// ---------------- Shifts ----------------
export const shiftApi = {
  list: () => api.get<Shift[]>('/api/shifts').then((r) => r.data),
  create: (b: unknown) => api.post<Shift>('/api/shifts', b).then((r) => r.data),
  update: (id: number, b: unknown) => api.put<Shift>(`/api/shifts/${id}`, b).then((r) => r.data),
  remove: (id: number) => api.delete(`/api/shifts/${id}`).then((r) => r.data),
  assignments: (from: string, to: string) =>
    api.get<{ assignments: any[]; leaves: any[] }>('/api/shifts/assignments', {
      params: { from, to },
    }).then((r) => r.data),
  assign: (b: unknown) => api.post('/api/shifts/assignments', b).then((r) => r.data),
  unassign: (id: number) => api.delete(`/api/shifts/assignments/${id}`).then((r) => r.data),
};

// ---------------- Leave ----------------
export const leaveApi = {
  types: () => api.get<LeaveType[]>('/api/leave/types').then((r) => r.data),
  createType: (b: unknown) => api.post<LeaveType>('/api/leave/types', b).then((r) => r.data),
  updateType: (id: number, b: unknown) =>
    api.put<LeaveType>(`/api/leave/types/${id}`, b).then((r) => r.data),
  balances: (year?: number) =>
    api.get<LeaveBalance[]>('/api/leave/balances', { params: { year } }).then((r) => r.data),
  setBalance: (b: unknown) => api.post<LeaveBalance>('/api/leave/balances', b).then((r) => r.data),
  requests: (status?: string) =>
    api.get<LeaveRequest[]>('/api/leave/requests', { params: { status } }).then((r) => r.data),
  pending: () => api.get<LeaveRequest[]>('/api/leave/pending').then((r) => r.data),
  my: () => api.get<{ requests: LeaveRequest[]; balance: LeaveBalance | null }>('/api/leave/my').then((r) => r.data),
  create: (b: unknown) => api.post<LeaveRequest>('/api/leave/requests', b).then((r) => r.data),
  decide: (id: number, approve: boolean, comment?: string) =>
    api.post(`/api/leave/requests/${id}/decide`, { approve, comment }).then((r) => r.data),
  cancel: (id: number) => api.post(`/api/leave/requests/${id}/cancel`).then((r) => r.data),
};

// ---------------- Announcements ----------------
export const announcementApi = {
  list: () => api.get<Announcement[]>('/api/announcements').then((r) => r.data),
  unreadMandatory: () =>
    api.get<Announcement[]>('/api/announcements/unread-mandatory').then((r) => r.data),
  markRead: (id: number) => api.post(`/api/announcements/${id}/read`).then((r) => r.data),
  create: (b: unknown) => api.post<Announcement>('/api/announcements', b).then((r) => r.data),
  update: (id: number, b: unknown) => api.put(`/api/announcements/${id}`, b).then((r) => r.data),
  remove: (id: number) => api.delete(`/api/announcements/${id}`).then((r) => r.data),
  readStats: (id: number) =>
    api.get<AnnouncementReadStat[]>(`/api/announcements/${id}/read-stats`).then((r) => r.data),
};

// ---------------- Meals ----------------
export const mealApi = {
  list: (from?: string, to?: string) =>
    api.get<MealMenu[]>('/api/meals', { params: { from, to } }).then((r) => r.data),
  create: (b: unknown) => api.post<MealMenu>('/api/meals', b).then((r) => r.data),
  update: (id: number, b: unknown) => api.put<MealMenu>(`/api/meals/${id}`, b).then((r) => r.data),
  remove: (id: number) => api.delete(`/api/meals/${id}`).then((r) => r.data),
};

// ---------------- Attendance / Locations ----------------
export const attendanceApi = {
  list: (params: { personnelId?: number; from?: string; to?: string } = {}) =>
    api.get<Attendance[]>('/api/attendance', { params }).then((r) => r.data),
  qr: (locationId: number) =>
    api.get<QrPayload>(`/api/attendance/qr/${locationId}`).then((r) => r.data),
};
export const locationApi = {
  list: () => api.get<WorkLocation[]>('/api/work-locations').then((r) => r.data),
  create: (b: unknown) => api.post<WorkLocation>('/api/work-locations', b).then((r) => r.data),
  update: (id: number, b: unknown) =>
    api.put<WorkLocation>(`/api/work-locations/${id}`, b).then((r) => r.data),
  remove: (id: number) => api.delete(`/api/work-locations/${id}`).then((r) => r.data),
};
