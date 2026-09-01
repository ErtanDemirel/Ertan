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

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

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

export interface LeaveRequest {
  id: number;
  personnelName: string;
  leaveTypeName: string;
  deductsFromAnnual: boolean;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string | null;
  status: LeaveStatus;
  managerComment?: string | null;
  requestedAt: string;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  isMandatory: boolean;
  publishedByName: string;
  publishedAt: string;
  isRead: boolean;
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

export interface AttendanceResult {
  success: boolean;
  type: 'CheckIn' | 'CheckOut';
  timestamp: string;
  locationName: string;
  distanceMeters: number;
  message: string;
}
