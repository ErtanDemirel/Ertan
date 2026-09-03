import { api } from './client';
import type {
  AdvanceRequest, Announcement, AnnouncementReadStat, AppNotification, ApprovalTemplateStep,
  Attendance, AuthResponse, Department, DirectoryEntry, ExpenseRequest, Feedback, FeedbackKind,
  FeedbackStatus, Holiday, JobApplication, LeaveBalance,
  LeaveRequest, LeaveType, MealMenu, Paged, Payslip, PendingApproval, Personnel, QrPayload,
  ServiceAnalytics, ServiceRoute, Shift, WorkLocation,
} from './types';

/** Yetki başlıklı dosya indirir ve tarayıcıda kaydettirir. */
export async function downloadFile(url: string, suggestedName?: string) {
  const res = await api.get(url, { responseType: 'blob' });
  const disposition = res.headers['content-disposition'] as string | undefined;
  let name = suggestedName || 'dosya';
  const m = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^\";]+)"?/i);
  if (m) name = decodeURIComponent(m[1]);
  const blobUrl = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

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
  analytics: (shiftId?: number) =>
    api.get<ServiceAnalytics>('/api/service-routes/analytics', { params: { shiftId } }).then((r) => r.data),
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
  bulkAssign: (b: { shiftId: number; personnelIds: number[]; dates: string[]; note?: string }) =>
    api.post<{ created: number; updated: number; total: number }>('/api/shifts/assignments/bulk', b).then((r) => r.data),
  resolveSicil: (sicilNos: string[]) =>
    api.post<{ found: { id: number; sicilNo: string; name: string }[]; notFound: string[] }>('/api/shifts/resolve-sicil', sicilNos).then((r) => r.data),
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
  dashboard: (days = 14) => api.get<{ onLeave: any[]; upcoming: any[] }>('/api/leave/dashboard', { params: { days } }).then((r) => r.data),
  my: () => api.get<{ requests: LeaveRequest[]; balance: LeaveBalance | null }>('/api/leave/my').then((r) => r.data),
  create: (b: unknown) => api.post<LeaveRequest>('/api/leave/requests', b).then((r) => r.data),
  cancel: (id: number) => api.post(`/api/leave/requests/${id}/cancel`).then((r) => r.data),
  uploadAttachment: (id: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/api/leave/requests/${id}/attachments`, fd).then((r) => r.data);
  },
  attachmentUrl: (attachmentId: number) => `/api/leave/attachments/${attachmentId}`,
  documentUrl: (id: number) => `/api/leave/requests/${id}/document`,
};

// ---------------- Onaylar (izin/avans/masraf) ----------------
export const approvalApi = {
  pending: () => api.get<PendingApproval[]>('/api/approvals/pending').then((r) => r.data),
  decide: (approvalRequestId: number, approve: boolean, comment?: string) =>
    api.post(`/api/approvals/${approvalRequestId}/decide`, { approve, comment }).then((r) => r.data),
};

// ---------------- Departmanlar & Onay Zinciri ----------------
export const departmentApi = {
  list: () => api.get<Department[]>('/api/departments').then((r) => r.data),
  create: (b: { name: string; managerPersonnelId?: number | null; isActive: boolean }) =>
    api.post<Department>('/api/departments', b).then((r) => r.data),
  update: (id: number, b: { name: string; managerPersonnelId?: number | null; isActive: boolean }) =>
    api.put(`/api/departments/${id}`, b).then((r) => r.data),
  remove: (id: number) => api.delete(`/api/departments/${id}`).then((r) => r.data),
  template: (id: number) => api.get<ApprovalTemplateStep[]>(`/api/departments/${id}/template`).then((r) => r.data),
  saveTemplate: (id: number, steps: { kind: string; specificPersonnelId?: number | null; infoOnly: boolean }[]) =>
    api.put(`/api/departments/${id}/template`, { steps }).then((r) => r.data),
};

// ---------------- Avans / Masraf ----------------
export const requestApi = {
  my: () => api.get<{ advances: AdvanceRequest[]; expenses: ExpenseRequest[] }>('/api/requests/my').then((r) => r.data),
  createAdvance: (amount: number, reason?: string) =>
    api.post<AdvanceRequest>('/api/requests/advance', { amount, reason }).then((r) => r.data),
  createExpense: (data: { amount: number; title?: string; description?: string; file?: File }) => {
    const fd = new FormData();
    fd.append('amount', String(data.amount));
    if (data.title) fd.append('title', data.title);
    if (data.description) fd.append('description', data.description);
    if (data.file) fd.append('file', data.file);
    return api.post<ExpenseRequest>('/api/requests/expense', fd).then((r) => r.data);
  },
  expenseFileUrl: (id: number) => `/api/requests/expense/${id}/file`,
};

// ---------------- Bordro ----------------
export const payrollApi = {
  list: (params: { personnelId?: number; year?: number; distributed?: boolean } = {}) =>
    api.get<Payslip[]>('/api/payroll', { params }).then((r) => r.data),
  my: () => api.get<Payslip[]>('/api/payroll/my').then((r) => r.data),
  distribute: (payslipIds: number[], notifyInApp: boolean, notifySms: boolean) =>
    api.post('/api/payroll/distribute', { payslipIds, notifyInApp, notifySms }).then((r) => r.data),
  upload: (data: { personnelId: number; year: number; month: number; netAmount?: number; note?: string; file: File }) => {
    const fd = new FormData();
    fd.append('personnelId', String(data.personnelId));
    fd.append('year', String(data.year));
    fd.append('month', String(data.month));
    if (data.netAmount != null) fd.append('netAmount', String(data.netAmount));
    if (data.note) fd.append('note', data.note);
    fd.append('file', data.file);
    return api.post<Payslip>('/api/payroll', fd).then((r) => r.data);
  },
  fileUrl: (id: number) => `/api/payroll/${id}/file`,
  remove: (id: number) => api.delete(`/api/payroll/${id}`).then((r) => r.data),
  importPdf: (year: number, month: number, file: File) => {
    const fd = new FormData();
    fd.append('year', String(year));
    fd.append('month', String(month));
    fd.append('file', file);
    return api.post<{ matched: Payslip[]; unmatched: string[] }>('/api/payroll/import-pdf', fd).then((r) => r.data);
  },
};

// ---------------- Aday / İş Başvurusu ----------------
export const applicationApi = {
  submit: (b: unknown) => api.post<{ id: number }>('/api/applications', b).then((r) => r.data),
  uploadCv: (id: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/api/applications/${id}/cv`, fd).then((r) => r.data);
  },
  list: (status?: string) =>
    api.get<JobApplication[]>('/api/applications', { params: { status } }).then((r) => r.data),
  get: (id: number) => api.get<JobApplication>(`/api/applications/${id}`).then((r) => r.data),
  updateStatus: (id: number, status: string, reviewNote?: string) =>
    api.put(`/api/applications/${id}/status`, { status, reviewNote }).then((r) => r.data),
  cvUrl: (id: number) => `/api/applications/${id}/cv`,
};

// ---------------- Self-servis ----------------
export const selfApi = {
  service: () => api.get<{ mine: any; routes: any[] }>('/api/me/service').then((r) => r.data),
};

// ---------------- Bildirimler ----------------
export const notificationApi = {
  my: () => api.get<{ items: AppNotification[]; unread: number }>('/api/notifications/my').then((r) => r.data),
  read: (id: number) => api.post(`/api/notifications/${id}/read`).then((r) => r.data),
  readAll: () => api.post('/api/notifications/read-all').then((r) => r.data),
};

// ---------------- Resmî Tatiller ----------------
export const holidayApi = {
  list: (year?: number) => api.get<Holiday[]>('/api/holidays', { params: { year } }).then((r) => r.data),
  create: (b: { date: string; name: string; isHalfDay: boolean }) =>
    api.post<Holiday>('/api/holidays', b).then((r) => r.data),
  remove: (id: number) => api.delete(`/api/holidays/${id}`).then((r) => r.data),
};

// ---------------- Kullanıcılar (Admin) ----------------
export interface AppUser {
  id: number; username: string; role: string; isActive: boolean;
  canDistributePayroll: boolean; fullName: string | null;
}
export const usersApi = {
  list: () => api.get<AppUser[]>('/api/users').then((r) => r.data),
  setPayrollPermission: (id: number, enabled: boolean) =>
    api.post(`/api/users/${id}/payroll-permission`, { enabled }).then((r) => r.data),
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

// ---------------- Raporlar (CSV export) ----------------
function qs(params: Record<string, string | number | boolean | undefined>): string {
  const p = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return p.length ? `?${p.join('&')}` : '';
}
export const reportApi = {
  personnelUrl: (active?: boolean) => `/api/reports/personnel.csv${qs({ active })}`,
  leavesUrl: (p: { from?: string; to?: string; status?: string } = {}) =>
    `/api/reports/leaves.csv${qs(p)}`,
  attendanceUrl: (p: { from?: string; to?: string } = {}) =>
    `/api/reports/attendance.csv${qs(p)}`,
  leaveBalancesUrl: (year?: number) => `/api/reports/leave-balances.csv${qs({ year })}`,
};

// ---------------- Çalışan Sesi (Feedback) ----------------
export const voiceApi = {
  my: () => api.get<Feedback[]>('/api/voice/my').then((r) => r.data),
  create: (b: { kind: FeedbackKind; title?: string; body: string; location?: string; isAnonymous?: boolean }) =>
    api.post<Feedback>('/api/voice', b).then((r) => r.data),
  list: (kind?: string, status?: string) =>
    api.get<Feedback[]>('/api/voice', { params: { kind, status } }).then((r) => r.data),
  updateStatus: (id: number, status: FeedbackStatus, comment?: string) =>
    api.post<Feedback>(`/api/voice/${id}/status`, { status, comment }).then((r) => r.data),
};

// ---------------- Şirket rehberi ----------------
export const directoryApi = {
  list: (search?: string) =>
    api.get<DirectoryEntry[]>('/api/me/directory', { params: { search } }).then((r) => r.data),
};

// ---------------- Self mesai geçmişi ----------------
export const selfAttendanceApi = {
  my: (from?: string, to?: string) =>
    api.get<Attendance[]>('/api/attendance/my', { params: { from, to } }).then((r) => r.data),
};
