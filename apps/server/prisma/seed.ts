import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

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

  console.log("Seed complete.");
  console.log("Organizer login: organizer@kehai.dev / Password123!");
  console.log("Attendee login (any): riya.sharma@students.kehai.dev / Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
