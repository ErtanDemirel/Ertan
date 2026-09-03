// Backend DTO'larıyla eşleşen tipler.

export type Role = 'Admin' | 'Manager' | 'Personnel';

export interface UserInfo {
  id: number;
  username: string;
  role: Role;
  personnelId: number | null;
  fullName: string | null;
  canDistributePayroll: boolean;
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
  serviceStop?: string | null;
  shiftId?: number | null;
  shiftName?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  isHrManager: boolean;
  isFactoryManager: boolean;
  exitDate?: string | null;
  exitReason?: string | null;
  isActive: boolean;
}

export interface ApprovalStepInfo {
  order: number;
  label: string;
  approverName?: string | null;
  status: string;
  infoOnly: boolean;
  comment?: string | null;
}
export interface PendingApproval {
  approvalRequestId: number;
  kind: string;
  kindLabel: string;
  requesterName: string;
  sicilNo: string;
  summary: string;
  title?: string | null;
  createdAt: string;
  currentStepLabel: string;
  steps: ApprovalStepInfo[];
}

export interface Department {
  id: number;
  name: string;
  managerPersonnelId?: number | null;
  managerName?: string | null;
  isActive: boolean;
  stepCount: number;
}
export interface ApprovalTemplateStep {
  id: number;
  order: number;
  kind: string;
  specificPersonnelId?: number | null;
  specificPersonName?: string | null;
  infoOnly: boolean;
}

export interface AdvanceRequest {
  id: number;
  personnelName: string;
  amount: number;
  reason?: string | null;
  status: string;
  managerComment?: string | null;
  requestedAt: string;
}
export interface ExpenseRequest {
  id: number;
  personnelName: string;
  amount: number;
  title?: string | null;
  description?: string | null;
  hasFile: boolean;
  status: string;
  managerComment?: string | null;
  requestedAt: string;
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
  capacity: number;
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

export interface LeaveAttachment {
  id: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

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
  halfDay: 'None' | 'Morning' | 'Afternoon';
  title?: string | null;
  reason?: string | null;
  status: LeaveStatus;
  approverId?: number | null;
  approverName?: string | null;
  managerComment?: string | null;
  requestedAt: string;
  decidedAt?: string | null;
  attachments: LeaveAttachment[];
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
}

export interface Payslip {
  id: number;
  personnelId: number;
  personnelName: string;
  sicilNo: string;
  year: number;
  month: number;
  fileName: string;
  sizeBytes: number;
  netAmount?: number | null;
  note?: string | null;
  uploadedAt: string;
  isDistributed: boolean;
  distributedAt?: string | null;
}

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
  isHalfDay: boolean;
}

export interface PriorEmployment {
  workedBefore: boolean;
  personnelId?: number | null;
  name?: string | null;
  sicilNo?: string | null;
  hireDate?: string | null;
  exitDate?: string | null;
  currentlyEmployed: boolean;
  totalMonths?: number | null;
  exitReason?: string | null;
}

export interface JobApplication {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  nationalId?: string | null;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  address?: string | null;
  position?: string | null;
  education?: string | null;
  experienceYears?: number | null;
  previousWorkplace?: string | null;
  notes?: string | null;
  status: string;
  reviewNote?: string | null;
  hasCv: boolean;
  createdAt: string;
  priorEmployment?: PriorEmployment | null;
}

export interface ServiceStopStat {
  stop: string;
  personnelCount: number;
}
export interface ServiceRouteAnalytics {
  routeId: number;
  routeName: string;
  capacity: number;
  personnelCount: number;
  servicesNeeded: number;
  stops: ServiceStopStat[];
}
export interface ShiftServiceSummary {
  shiftId: number;
  shiftName: string;
  totalPersonnel: number;
  servicesNeeded: number;
}
export interface ServiceAnalytics {
  shiftId?: number | null;
  shiftName?: string | null;
  totalPersonnel: number;
  totalServicesNeeded: number;
  routes: ServiceRouteAnalytics[];
  byShift: ShiftServiceSummary[];
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

export type FeedbackKind = 'Suggestion' | 'Complaint' | 'NearMiss' | 'Request';
export type FeedbackStatus = 'New' | 'Reviewing' | 'Resolved' | 'Closed';
export interface Feedback {
  id: number;
  kind: FeedbackKind;
  title?: string | null;
  body: string;
  location?: string | null;
  isAnonymous: boolean;
  status: FeedbackStatus;
  submitterName?: string | null;
  sicilNo?: string | null;
  handlerComment?: string | null;
  createdAt: string;
  handledAt?: string | null;
}

export interface DirectoryEntry {
  name: string;
  title?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface ContactUpdate {
  id: number;
  personnelId: number;
  personnelName: string;
  sicilNo?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  handlerComment?: string | null;
  createdAt: string;
  handledAt?: string | null;
}
export interface ContactInfo {
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  pending?: ContactUpdate | null;
}

export interface Training {
  id: number;
  title: string;
  description?: string | null;
  category: string;
  durationSeconds: number;
  isMandatory: boolean;
  isActive: boolean;
  watchedSeconds: number;
  completed: boolean;
  completedAt?: string | null;
  progressPercent: number;
}
export interface TrainingAdmin {
  id: number;
  title: string;
  description?: string | null;
  category: string;
  durationSeconds: number;
  isMandatory: boolean;
  isActive: boolean;
  videoFileName: string;
  createdAt: string;
  assignedCount: number;
  completedCount: number;
  completionRate: number;
}
export interface TrainingProgressRow {
  personnelId: number;
  personnelName: string;
  sicilNo?: string | null;
  watchedSeconds: number;
  progressPercent: number;
  completed: boolean;
  completedAt?: string | null;
}

export type AppStatus = 'New' | 'Reviewing' | 'Interview' | 'Offered' | 'Hired' | 'Rejected';
export interface InternalPosting {
  id: number;
  title: string;
  description?: string | null;
  department?: string | null;
  location?: string | null;
  positionCount?: number | null;
  deadline?: string | null;
  isActive: boolean;
  createdAt: string;
  applicantCount: number;
  alreadyApplied: boolean;
  myStatus?: string | null;
}
export interface InternalApplication {
  id: number;
  postingId: number;
  postingTitle: string;
  personnelId: number;
  personnelName: string;
  sicilNo?: string | null;
  department?: string | null;
  note?: string | null;
  status: AppStatus;
  handlerComment?: string | null;
  createdAt: string;
  handledAt?: string | null;
}
