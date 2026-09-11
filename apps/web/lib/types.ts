export type EventStatus = "DRAFT" | "PUBLISHED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type OrgRole = "OWNER" | "ADMIN" | "ORGANIZER" | "VIEWER";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  role?: OrgRole;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  actor: { id: string; name: string; email: string } | null;
  event: { id: string; name: string } | null;
}

export interface OrgMember {
  id: string;
  role: OrgRole;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface EventSummary {
  id: string;
  name: string;
  description?: string | null;
  venue: string;
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  attendanceOpensMinutesBefore: number;
  attendanceClosesMinutesAfter: number;
  latitude: number;
  longitude: number;
  geofenceRadiusM: number;
  qrRotationSeconds: number;
  capacity?: number | null;
  organization?: { id: string; name: string; slug: string };
  _count: { registrations: number; attendances: number };
  isRegistered?: boolean;
  isWaitlisted?: boolean;
  hasAttended?: boolean;
}

export interface MyRegistration {
  event: EventSummary;
  registeredAt: string;
  attended: boolean;
  checkedInAt: string | null;
  waitlisted: boolean;
}

export interface AttendeeRow {
  registrationId: string;
  user: { id: string; name: string; email: string; avatarUrl?: string | null };
  registeredAt: string;
  attended: boolean;
  checkedInAt: string | null;
  distanceMeters: number | null;
  method: string | null;
  flagged: boolean;
  flagReasons: string[];
  waitlisted: boolean;
}

export interface EventAnalytics {
  eventId: string;
  eventName: string;
  status: string;
  startsAt: string;
  registrations: number;
  attendance: number;
  attendanceRate: number;
  noShowRate: number;
  unregisteredAttendance: number;
  earlyArrivals: number;
  onTimeArrivals: number;
  lateArrivals: number;
  arrivalTimeline: { minuteOffset: number; count: number }[];
  peakArrivalWindow: { startMinute: number; endMinute: number; count: number } | null;
  medianCheckInLatencyMinutes: number | null;
  averageDistanceMeters: number | null;
}

export interface OrgOverview {
  totalEvents: number;
  completedEvents: number;
  totalRegistrations: number;
  totalAttendance: number;
  averageAttendanceRate: number;
  recurringAttendeeRate: number;
  events: {
    id: string;
    name: string;
    startsAt: string;
    status: string;
    registrations: number;
    attendance: number;
    attendanceRate: number;
  }[];
}

export interface Anomaly {
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  evidence: Record<string, unknown>;
}

export interface EventInsights {
  headline: string;
  bullets: string[];
  recommendation: string | null;
  confidence: "low" | "medium" | "high";
  aiGenerated: boolean;
  cached: boolean;
}

export interface PostEventReport {
  title: string;
  summary: string;
  metrics: { label: string; value: string }[];
  observations: string[];
  recommendations: string[];
  aiGenerated: boolean;
}

// --- Classrooms (recurring daily QR + geofence attendance for teachers) ---

export interface ClassroomSummary {
  id: string;
  name: string;
  courseCode: string | null;
  semesterLabel: string | null;
  joinCode: string;
  hasGeofence: boolean;
  geofenceRadiusM: number | null;
  createdAt: string;
  studentCount: number;
  sessionCount: number;
}

export interface EnrolledClassroom {
  classroom: {
    id: string;
    name: string;
    courseCode: string | null;
    semesterLabel: string | null;
    teacherName: string;
    hasGeofence: boolean;
  };
  joinedAt: string;
  presentDays: number;
  totalDays: number;
  attendanceRate: number;
  currentStreak: number;
}

export interface ClassroomDetail {
  id: string;
  name: string;
  courseCode: string | null;
  semesterLabel: string | null;
  hasGeofence: boolean;
  geofenceRadiusM: number | null;
  createdAt: string;
  isTeacher: boolean;
  isEnrolled: boolean;
  joinCode?: string;
  studentCount: number;
  openSession: { id: string; label: string | null; date: string; status: "OPEN" } | null;
}

export interface ClassSessionSummary {
  id: string;
  label: string | null;
  date: string;
  status: "OPEN" | "CLOSED";
  qrRotationSeconds: number;
  openedAt: string;
  closedAt: string | null;
  presentCount: number;
}

export interface MyAttendanceRow {
  id: string;
  label: string | null;
  date: string;
  status: "OPEN" | "CLOSED";
  present: boolean;
  checkedInAt: string | null;
  method: "QR_GEO" | "MANUAL_OVERRIDE" | null;
}

export interface RosterRow {
  student: { id: string; name: string; email: string; avatarUrl?: string | null };
  enrolledAt: string;
  presentDays: number;
  totalDays: number;
  attendanceRate: number;
  lastAttendedAt: string | null;
  checkedInOpenSession: boolean;
}

export interface HeatmapDay {
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface HeatmapResponse {
  scope: "class" | "student";
  days: HeatmapDay[];
  totalSessions: number;
  presentCount: number;
  currentStreak: number;
  longestStreak: number;
}
