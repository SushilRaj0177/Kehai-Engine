export type EventStatus = "DRAFT" | "PUBLISHED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type OrgRole = "OWNER" | "ADMIN" | "ORGANIZER" | "VIEWER";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  role?: OrgRole;
}

export interface EventSummary {
  id: string;
  name: string;
  description?: string | null;
  venue: string;
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  latitude: number;
  longitude: number;
  geofenceRadiusM: number;
  qrRotationSeconds: number;
  capacity?: number | null;
  organization?: { id: string; name: string; slug: string };
  _count: { registrations: number; attendances: number };
  isRegistered?: boolean;
  hasAttended?: boolean;
}

export interface MyRegistration {
  event: EventSummary;
  registeredAt: string;
  attended: boolean;
  checkedInAt: string | null;
}

export interface AttendeeRow {
  registrationId: string;
  user: { id: string; name: string; email: string; avatarUrl?: string | null };
  registeredAt: string;
  attended: boolean;
  checkedInAt: string | null;
  distanceMeters: number | null;
  method: string | null;
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

export interface RosterRow {
  enrollmentId: string;
  student: { id: string; name: string; email: string; avatarUrl?: string | null };
  joinedAt: string;
  presentDays: number;
  totalDays: number;
  attendanceRate: number;
  lastAttendedAt: string | null;
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
