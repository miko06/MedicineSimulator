import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { authModule } from "../../auth";
import { adminUsersModule } from "../admin";
import {
  createTestApp,
  createUserWithRole,
  loginAs,
  authHeader,
  cleanDatabase,
} from "../../../lib/test-helpers";
import { prisma } from "../../../lib/prisma";

const app = createTestApp(authModule, adminUsersModule);

describe("Admin Users Module", () => {
  let adminToken = "";
  let studentToken = "";

  beforeAll(async () => {
    await cleanDatabase();
    await createUserWithRole("admin@test.com", "admin123", "ADMIN");
    const student = await createUserWithRole("student@test.com", "student123", "STUDENT");

    const adminLogin = await loginAs("admin@test.com", "admin123", app);
    adminToken = adminLogin.accessToken;

    const studentLogin = await loginAs("student@test.com", "student123", app);
    studentToken = studentLogin.accessToken;
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  describe("GET /api/admin/users", () => {
    it("returns paginated user list for admin", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/admin/users?page=1&limit=10", {
          headers: authHeader(adminToken),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect((body.data as unknown[]).length).toBeGreaterThanOrEqual(2);
      expect(body.pagination).toBeDefined();
    });

    it("returns 403 for non-admin user", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/admin/users", {
          headers: authHeader(studentToken),
        })
      );

      expect(res.status).toBe(403);
    });

    it("returns 401 without token", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/admin/users")
      );

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/admin/users/:id", () => {
    it("returns user details for admin", async () => {
      const users = await prisma.user.findMany({ take: 1 });
      const userId = users[0]?.id;

      const res = await app.handle(
        new Request(`http://localhost/api/admin/users/${userId}`, {
          headers: authHeader(adminToken),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.user).toBeDefined();
    });

    it("returns 404 for non-existent user", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/admin/users/non-existent-id", {
          headers: authHeader(adminToken),
        })
      );

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/admin/users/:id/role", () => {
    it("changes user role", async () => {
      const student = await prisma.user.findFirst({
        where: { email: "student@test.com" },
      });
      const studentId = student?.id ?? "";

      const res = await app.handle(
        new Request(`http://localhost/api/admin/users/${studentId}/role`, {
          method: "PATCH",
          headers: {
            ...authHeader(adminToken),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: "ADMIN" }),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect((body.user as Record<string, unknown>)?.role).toBe("ADMIN");
    });

    it("returns 403 when changing own role", async () => {
      const admin = await prisma.user.findFirst({
        where: { email: "admin@test.com" },
      });
      const adminId = admin?.id ?? "";

      const res = await app.handle(
        new Request(`http://localhost/api/admin/users/${adminId}/role`, {
          method: "PATCH",
          headers: {
            ...authHeader(adminToken),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: "STUDENT" }),
        })
      );

      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /api/admin/users/:id/toggle-active", () => {
    it("toggles user active status", async () => {
      const student = await prisma.user.findFirst({
        where: { email: "student@test.com" },
      });
      const studentId = student?.id ?? "";

      const res = await app.handle(
        new Request(
          `http://localhost/api/admin/users/${studentId}/toggle-active`,
          {
            method: "PATCH",
            headers: authHeader(adminToken),
          }
        )
      );

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect((body.user as Record<string, unknown>)?.isActive).toBe(false);
    });

    it("returns 403 when toggling own active status", async () => {
      const admin = await prisma.user.findFirst({
        where: { email: "admin@test.com" },
      });
      const adminId = admin?.id ?? "";

      const res = await app.handle(
        new Request(
          `http://localhost/api/admin/users/${adminId}/toggle-active`,
          {
            method: "PATCH",
            headers: authHeader(adminToken),
          }
        )
      );

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/admin/users/:id", () => {
    it("deletes a user", async () => {
      const tempUser = await createUserWithRole(
        "temp@test.com",
        "temppass",
        "STUDENT"
      );

      const res = await app.handle(
        new Request(`http://localhost/api/admin/users/${tempUser.id}`, {
          method: "DELETE",
          headers: authHeader(adminToken),
        })
      );

      expect(res.status).toBe(200);
    });

    it("returns 403 when deleting own account", async () => {
      const admin = await prisma.user.findFirst({
        where: { email: "admin@test.com" },
      });
      const adminId = admin?.id ?? "";

      const res = await app.handle(
        new Request(`http://localhost/api/admin/users/${adminId}`, {
          method: "DELETE",
          headers: authHeader(adminToken),
        })
      );

      expect(res.status).toBe(403);
    });
  });
});
