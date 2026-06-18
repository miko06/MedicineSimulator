import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { authModule } from "../../auth";
import { adminDashboardModule } from "../dashboard";
import {
  createTestApp,
  createUserWithRole,
  loginAs,
  authHeader,
  cleanDatabase,
} from "../../../lib/test-helpers";
import { prisma } from "../../../lib/prisma";

const app = createTestApp(authModule, adminDashboardModule);

describe("Admin Dashboard", () => {
  let adminToken = "";
  let studentToken = "";

  beforeAll(async () => {
    await cleanDatabase();

    await createUserWithRole("admin@test.com", "admin123", "ADMIN");
    await createUserWithRole("student@test.com", "student123", "STUDENT");

    await prisma.specialty.create({
      data: {
        slug: "cardiology",
        nameEn: "Cardiology",
        nameRu: "Кардиология",
        icon: "❤️",
      },
    });

    const adminLogin = await loginAs("admin@test.com", "admin123", app);
    adminToken = adminLogin.accessToken;

    const studentLogin = await loginAs("student@test.com", "student123", app);
    studentToken = studentLogin.accessToken;
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  describe("GET /api/admin/dashboard", () => {
    it("returns dashboard stats for admin", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/admin/dashboard", {
          headers: authHeader(adminToken),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;

      expect(body.users).toBeDefined();
      const users = body.users as Record<string, unknown>;
      expect(users.total).toBe(2);

      expect(body.content).toBeDefined();
      const content = body.content as Record<string, unknown>;
      expect(content.specialties).toBe(1);

      expect(body.attempts).toBeDefined();
      const attempts = body.attempts as Record<string, unknown>;
      expect(attempts.total).toBe(0);

      expect(body.exercisesBySpecialty).toBeDefined();
      expect(Array.isArray(body.exercisesBySpecialty)).toBe(true);

      expect(body.recentActivity).toBeDefined();
      expect(Array.isArray(body.recentActivity)).toBe(true);
    });

    it("returns 403 for non-admin user", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/admin/dashboard", {
          headers: authHeader(studentToken),
        })
      );

      expect(res.status).toBe(403);
    });

    it("returns 401 without token", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/admin/dashboard")
      );

      expect(res.status).toBe(401);
    });
  });
});
