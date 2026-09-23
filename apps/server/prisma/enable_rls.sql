-- Enables Row-Level Security on every application table with no policies
-- attached. This blocks Supabase's auto-generated PostgREST API (which
-- uses the low-privilege `anon`/`authenticated` roles and is subject to
-- RLS) from reading or writing any of these tables, without affecting the
-- app itself: Prisma connects via the `postgres` role, which owns these
-- tables and bypasses RLS by default (standard Postgres behavior for a
-- table owner / superuser), so nothing about the running app changes.
--
-- Run this once in the Supabase SQL Editor (not via a local migration --
-- there's no local Postgres in this sandbox to generate/verify one against).

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefreshToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailVerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Registration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Classroom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassAttendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiInsightCache" ENABLE ROW LEVEL SECURITY;

-- Prisma's own internal migration-history table -- also lives in the
-- public schema, also flagged by Supabase's Security Advisor.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
