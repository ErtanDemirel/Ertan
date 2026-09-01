// Backend DTO'larıyla eşleşen tipler.

export type Role = 'Admin' | 'Manager' | 'Personnel';

export interface UserInfo {
  id: number;
  username: string;
  role: Role;
  personnelId: number | null;
  fullName: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: UserInfo;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Personnel {
  id: number;
  sicilNo: string;
  firstName: string;
  lastName: string;
  fullName: string;
  nationalId?: string | null;
  department?: string | null;
  title?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  hireDate?: string | null;
  managerId?: number | null;
  managerName?: string | null;
  serviceRouteId?: number | null;
  serviceRouteName?: string | null;
  shiftId?: number | null;
  shiftName?: string | null;
  isActive: boolean;
}

export interface ServiceRoute {
  id: number;
  name: string;
  description?: string | null;
  stops?: string | null;
  departureTime?: string | null;
  returnTime?: string | null;
  driverName?: string | null;
  plateNumber?: string | null;
  isActive: boolean;
  personnelCount: number;
}

export interface Shift {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  color?: string | null;
  description?: string | null;
  isActive: boolean;
  personnelCount: number;
}

export interface LeaveType {
  id: number;
  name: string;
  deductsFromAnnual: boolean;
  isPaid: boolean;
  isActive: boolean;
}

export interface LeaveBalance {
  personnelId: number;
  personnelName: string;
  year: number;
  entitledDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
}

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface LeaveRequest {
  id: number;
  personnelId: number;
  personnelName: string;
  sicilNo: string;
  leaveTypeId: number;
  leaveTypeName: string;
  deductsFromAnnual: boolean;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string | null;
  status: LeaveStatus;
  approverId?: number | null;
  approverName?: string | null;
  managerComment?: string | null;
  requestedAt: string;
  decidedAt?: string | null;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  isMandatory: boolean;
  isActive: boolean;
  publishedByName: string;
  publishedAt: string;
  expiresAt?: string | null;
  isRead: boolean;
  readCount: number;
}

export interface AnnouncementReadStat {
  userId: number;
  name: string;
  sicilNo?: string | null;
  isRead: boolean;
  readAt?: string | null;
}

export interface MealMenu {
  id: number;
  date: string;
  soup?: string | null;
  mainCourse?: string | null;
  sideDish?: string | null;
  complement?: string | null;
  dessert?: string | null;
  alternative?: string | null;
  calories?: number | null;
}

export interface WorkLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
}

export interface QrPayload {
  locationId: number;
  locationName: string;
  code: string;
  qrContent: string;
  secondsRemaining: number;
}

export interface Attendance {
  id: number;
  personnelId: number;
  personnelName: string;
  sicilNo: string;
  type: 'CheckIn' | 'CheckOut';
  timestamp: string;
  locationName?: string | null;
  distanceMeters: number;
  isWithinGeofence: boolean;
}
