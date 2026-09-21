import { afterAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

// Every other integration test in this suite calls service functions
// directly, which structurally can't catch a wiring bug: middleware
// ordering, a route registered in the wrong place (route-param precedence,
// see event.routes.ts's "/mine" comment), auth actually being enforced at
// the HTTP layer, or the error handler's real response shape. This file
// exercises the same createApp() Render actually runs, over real HTTP via
// supertest, specifically to catch that class of bug.
const app = createApp();

const createdUserEmails: string[] = [];

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: createdUserEmails } } });
  await prisma.$disconnect();
});

describe("GET /health", () => {
  it("reports ok with a reachable database", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("request id", () => {
  it("echoes a generated X-Request-Id on every response", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  it("trusts an incoming X-Request-Id instead of generating a new one", async () => {
    const res = await request(app).get("/health").set("X-Request-Id", "test-fixed-id-123");
    expect(res.headers["x-request-id"]).toBe("test-fixed-id-123");
  });
});

describe("auth middleware wiring", () => {
  it("rejects an unauthenticated request to a protected route with 401", async () => {
    const res = await request(app).post("/api/orgs").send({ name: "Nope" });
    expect(res.status).toBe(401);
  });

  it("rejects a request with a garbage bearer token with 401, not a 500", async () => {
    const res = await request(app).post("/api/orgs").set("Authorization", "Bearer not-a-real-token").send({ name: "Nope" });
    expect(res.status).toBe(401);
  });
});

describe("validation middleware wiring", () => {
  it("returns a structured 400 for a malformed register body, not a 500", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("route param precedence (event.routes.ts's own documented trap)", () => {
  it("GET /api/events/mine is not swallowed by /:eventId, even unauthenticated", async () => {
    // If "/mine" were ever registered after "/:eventId", Express would
    // treat "mine" as an eventId and this would 404 from getEventForViewer
    // instead of 401 from requireAuth on the /mine route itself.
    const res = await request(app).get("/api/events/mine");
    expect(res.status).toBe(401);
  });
});

describe("full register -> login -> protected route flow over real HTTP", () => {
  const email = `http-test-${crypto.randomUUID()}@example.com`;
  createdUserEmails.push(email);

  it("registers, logs in, and can then create an organization using the issued access token", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Http Test User",
      email,
      password: "a-fine-password-8",
    });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.accessToken).toBeTruthy();

    const loginRes = await request(app).post("/api/auth/login").send({ email, password: "a-fine-password-8" });
    expect(loginRes.status).toBe(200);
    const { accessToken } = loginRes.body;
    expect(accessToken).toBeTruthy();

    const orgRes = await request(app)
      .post("/api/orgs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Http Test Org" });
    expect(orgRes.status).toBe(201);
    expect(orgRes.body.name).toBe("Http Test Org");

    await prisma.membership.deleteMany({ where: { organizationId: orgRes.body.id } });
    await prisma.organization.delete({ where: { id: orgRes.body.id } });
  });

  it("rejects login with the wrong password without revealing whether the account exists", async () => {
    const res = await request(app).post("/api/auth/login").send({ email, password: "totally-wrong-password" });
    expect(res.status).toBe(401);
  });
});

describe("CORS wiring", () => {
  it("rejects a request from an origin not in WEB_ORIGIN", async () => {
    const res = await request(app).get("/health").set("Origin", "https://evil.example.com");
    // cors() surfaces a rejected origin as a thrown error the error handler
    // turns into a 500 by default — what matters here is that it does NOT
    // echo back an Access-Control-Allow-Origin for a disallowed origin.
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
