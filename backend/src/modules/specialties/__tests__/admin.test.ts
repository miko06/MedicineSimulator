import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { authModule } from "../../auth";
import { adminSpecialtiesModule } from "../admin";
import {
  createTestApp,
  createUserWithRole,
  loginAs,
  authHeader,
  cleanDatabase,
} from "../../../lib/test-helpers";
import { prisma } from "../../../lib/prisma";

const app = createTestApp(authModule, adminSpecialtiesModule);

describe("Admin Specialties CRUD", () => {
  let adminToken = "";
  let studentToken = "";
  let testSpecialtyId = "";

  beforeAll(async () => {
    await cleanDatabase();
    await createUserWithRole("admin@test.com", "admin123", "ADMIN");
    await createUserWithRole("student@test.com", "student123", "STUDENT");

    const adminLogin = await loginAs("admin@test.com", "admin123", app);
    adminToken = adminLogin.accessToken;

    const studentLogin = await loginAs("student@test.com", "student123", app);
    studentToken = studentLogin.accessToken;
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  describe("POST /api/admin/specialties", () => {
    it("creates a new specialty", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/admin/specialties", {
          method: "POST",
          headers: {
            ...authHeader(adminToken),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            slug: "cardiology",
            nameEn: "Cardiology",
            nameRu: "Кардиология",
            icon: "❤️",
            sortOrder: 1,
          }),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.slug).toBe("cardiology");
      testSpecialtyId = body.id as string;
    });

    it("returns 403 for non-admin", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/admin/specialties", {
          method: "POST",
          headers: {
            ...authHeader(studentToken),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            slug: "blocked",
            nameEn: "Blocked",
            nameRu: "Заблокировано",
          }),
        })
      );

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/admin/specialties", () => {
    it("returns all specialties for admin", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/admin/specialties", {
          headers: authHeader(adminToken),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json() as unknown[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("PUT /api/admin/specialties/:id", () => {
    it("updates a specialty", async () => {
      const res = await app.handle(
        new Request(
          `http://localhost/api/admin/specialties/${testSpecialtyId}`,
          {
            method: "PUT",
            headers: {
              ...authHeader(adminToken),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ nameEn: "Heart Surgery" }),
          }
        )
      );

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.nameEn).toBe("Heart Surgery");
    });

    it("returns 404 for non-existent specialty", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/admin/specialties/non-existent", {
          method: "PUT",
          headers: {
            ...authHeader(adminToken),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ nameEn: "Nope" }),
        })
      );

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/admin/specialties/:id", () => {
    it("deletes a specialty", async () => {
      const res = await app.handle(
        new Request(
          `http://localhost/api/admin/specialties/${testSpecialtyId}`,
          {
            method: "DELETE",
            headers: authHeader(adminToken),
          }
        )
      );

      expect(res.status).toBe(200);
    });

    it("returns 404 for already deleted specialty", async () => {
      const res = await app.handle(
        new Request(
          `http://localhost/api/admin/specialties/${testSpecialtyId}`,
          {
            method: "DELETE",
            headers: authHeader(adminToken),
          }
        )
      );

      expect(res.status).toBe(404);
    });
  });
});
