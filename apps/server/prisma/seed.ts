import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { generateJoinCode } from "../src/utils/joinCode.js";

const prisma = new PrismaClient();

// SRM University main campus, Kattankulathur — a real, sensible default
// venue for the demo dataset.
const VENUE = { name: "SRM Tech Park Auditorium", lat: 12.8231, lng: 80.0444 };

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const organizer = await prisma.user.upsert({
    where: { email: "organizer@kehai.dev" },
    update: {},
    create: { name: "Aiko Tanaka", email: "organizer@kehai.dev", passwordHash, provider: "PASSWORD" },
  });

  const org = await prisma.organization.upsert({
    where: { slug: "srm-nscc" },
    update: {},
    create: {
      name: "SRM NSCC",
      slug: "srm-nscc",
      description: "SRM Networking & Systems Computing Club",
      memberships: { create: { userId: organizer.id, role: "OWNER" } },
    },
  });

  const attendeeNames = [
    "Riya Sharma", "Karthik Iyer", "Ananya Rao", "Vikram Singh", "Priya Nair",
    "Arjun Mehta", "Sneha Reddy", "Rahul Verma", "Divya Menon", "Aditya Kumar",
    "Sana Khan", "Yuki Sato", "Kenji Yamamoto", "Meera Pillai", "Rohan Das",
  ];
  const attendees = [];
  for (const [i, name] of attendeeNames.entries()) {
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@students.kehai.dev`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name, email, passwordHash, provider: "PASSWORD" },
    });
    attendees.push(user);
    void i;
  }

  const now = Date.now();
  const pastEventSpecs = [
    { name: "Intro to Systems Design Workshop", daysAgo: 30, attendanceRate: 0.85 },
    { name: "Competitive Programming Bootcamp", daysAgo: 20, attendanceRate: 0.62 },
    { name: "Cloud Infrastructure Hack Night", daysAgo: 10, attendanceRate: 0.4 },
  ];

  for (const spec of pastEventSpecs) {
    const startsAt = new Date(now - spec.daysAgo * 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);

    const event = await prisma.event.create({
      data: {
        organizationId: org.id,
        createdById: organizer.id,
        name: spec.name,
        description: `${spec.name} hosted by SRM NSCC.`,
        venue: VENUE.name,
        status: "COMPLETED",
        startsAt,
        endsAt,
        latitude: VENUE.lat,
        longitude: VENUE.lng,
        geofenceRadiusM: 120,
        qrSecret: crypto.randomBytes(24).toString("hex"),
      },
    });

    for (const [i, attendee] of attendees.entries()) {
      await prisma.registration.create({ data: { eventId: event.id, userId: attendee.id } });
      if (Math.random() < spec.attendanceRate) {
        const offsetMinutes = Math.round((Math.random() - 0.3) * 40);
        const checkedInAt = new Date(startsAt.getTime() + offsetMinutes * 60_000);
        const distance = Math.round(Math.random() * 90);
        await prisma.attendanceRecord.create({
          data: {
            eventId: event.id,
            userId: attendee.id,
            method: "QR_GEO",
            latitude: VENUE.lat + (Math.random() - 0.5) * 0.0008,
            longitude: VENUE.lng + (Math.random() - 0.5) * 0.0008,
            accuracyMeters: 10 + Math.random() * 30,
            distanceMeters: distance,
            locationConfidence: distance < 40 ? "high" : "medium",
            qrTokenJti: `seed-${event.id}-${i}`,
            checkedInAt,
          },
        });
      }
    }
  }

  const upcoming = await prisma.event.create({
    data: {
      organizationId: org.id,
      createdById: organizer.id,
      name: "AI in Campus Systems — Live Demo Day",
      description: "Flagship NSCC demo day showcasing student AI/systems projects.",
      venue: VENUE.name,
      status: "PUBLISHED",
      startsAt: new Date(now + 3 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      latitude: VENUE.lat,
      longitude: VENUE.lng,
      geofenceRadiusM: 100,
      capacity: 200,
      qrSecret: crypto.randomBytes(24).toString("hex"),
    },
  });

  for (const attendee of attendees.slice(0, 8)) {
    await prisma.registration.create({ data: { eventId: upcoming.id, userId: attendee.id } });
  }

  await seedClassroom(organizer.id, attendees);

  console.log("Seed complete.");
  console.log("Organizer login: organizer@kehai.dev / Password123!");
  console.log("Attendee login (any): riya.sharma@students.kehai.dev / Password123!");
}

// A semester-style classroom for the teacher side: about six weeks of past
// weekday sessions (so the heatmap, streaks and leaderboard have history) plus
// one session open right now with a few fresh check-ins (so the live control
// room has something to show). Uses a fixed-seed generator, so re-running the
// seed produces the same attendance pattern.
async function seedClassroom(teacherId: string, students: { id: string; name: string }[]) {
  let state = 20260904;
  const rand = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  const ROOM = { lat: 12.8236, lng: 80.0449 };

  const existing = await prisma.classroom.findFirst({ where: { teacherId, courseCode: "CS201" } });
  if (existing) return;

  const classroom = await prisma.classroom.create({
    data: {
      teacherId,
      name: "Data Structures & Algorithms",
      courseCode: "CS201",
      semesterLabel: "Spring 2027",
      joinCode: generateJoinCode(),
      latitude: ROOM.lat,
      longitude: ROOM.lng,
      geofenceRadiusM: 80,
    },
  });

  const years = ["YEAR_2", "YEAR_2", "YEAR_3", "YEAR_2", "YEAR_1", "YEAR_3", "YEAR_2", "YEAR_4", "YEAR_2", "YEAR_3", "GRADUATE", "YEAR_2"] as const;
  // How reliably each student turns up, from almost always to rarely.
  const reliability = [0.97, 0.93, 0.9, 0.88, 0.85, 0.82, 0.78, 0.74, 0.7, 0.62, 0.5, 0.38];
  const enrolled = students.slice(0, 12);
  const enrollments = [];
  for (const [i, student] of enrolled.entries()) {
    enrollments.push(
      await prisma.enrollment.create({
        data: { classroomId: classroom.id, studentId: student.id, gradeYear: years[i], createdAt: new Date(Date.now() - 45 * 86_400_000) },
      })
    );
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let daysAgo = 42; daysAgo >= 1; daysAgo--) {
    const date = new Date(today.getTime() - daysAgo * 86_400_000);
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) continue; // weekdays only
    const openedAt = new Date(date.getTime() + 3.5 * 3_600_000); // 09:00 IST
    const session = await prisma.classSession.create({
      data: {
        classroomId: classroom.id,
        label: weekday === 3 ? "Lab" : "Lecture",
        date,
        status: "CLOSED",
        qrSecret: crypto.randomBytes(24).toString("hex"),
        qrEpochAt: openedAt,
        openedAt,
        closedAt: new Date(openedAt.getTime() + 50 * 60_000),
      },
    });
    for (const [i, enrollment] of enrollments.entries()) {
      if (rand() > reliability[i]) continue;
      await prisma.classAttendance.create({
        data: {
          sessionId: session.id,
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          method: "QR_GEO",
          latitude: ROOM.lat + (rand() - 0.5) * 0.0004,
          longitude: ROOM.lng + (rand() - 0.5) * 0.0004,
          accuracyMeters: 8 + rand() * 20,
          distanceMeters: Math.round(rand() * 45),
          locationConfidence: "high",
          qrTokenJti: `seed-${session.id}-${i}`,
          checkedInAt: new Date(openedAt.getTime() + Math.round(rand() * 12) * 60_000),
        },
      });
    }
  }

  // Today's session, open now: the first few students checked in over the
  // last few minutes.
  const openedAt = new Date(Date.now() - 6 * 60_000);
  const live = await prisma.classSession.create({
    data: {
      classroomId: classroom.id,
      label: "Lecture",
      date: today,
      status: "OPEN",
      qrSecret: crypto.randomBytes(24).toString("hex"),
      qrEpochAt: openedAt,
      openedAt,
    },
  });
  for (const [i, enrollment] of enrollments.slice(0, 7).entries()) {
    await prisma.classAttendance.create({
      data: {
        sessionId: live.id,
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        method: "QR_GEO",
        latitude: ROOM.lat + (rand() - 0.5) * 0.0004,
        longitude: ROOM.lng + (rand() - 0.5) * 0.0004,
        accuracyMeters: 8 + rand() * 20,
        distanceMeters: Math.round(rand() * 45),
        locationConfidence: "high",
        qrTokenJti: `seed-${live.id}-${i}`,
        checkedInAt: new Date(openedAt.getTime() + (i + 1) * 40_000),
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
