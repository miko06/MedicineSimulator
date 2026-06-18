import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { authModule } from "../../auth";
import { adminRobotPresetsModule } from "../admin";
import {
  createTestApp,
  createUserWithRole,
  loginAs,
  authHeader,
  cleanDatabase,
} from "../../../lib/test-helpers";
import { prisma } from "../../../lib/prisma";

const app = createTestApp(authModule, adminRobotPresetsModule);

describe("Admin Robot Presets CRUD", () => {
  let adminToken = "";
  let presetId = "";

  beforeAll(async () => {
    await cleanDatabase();
    await createUserWithRole("admin@test.com", "admin123", "ADMIN");
    const adminLogin = await loginAs("admin@test.com", "admin123", app);
    adminToken = adminLogin.accessToken;
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  describe("POST /api/admin/robot-presets", () => {
    it("creates a new robot preset", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/admin/robot-presets", {
          method: "POST",
          headers: {
            ...authHeader(adminToken),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            modelVersion: "2.0",
            zoneOverrides: [
              { zone: "CHEST", color: "#EF4444", intensity: 0.7 },
              { zone: "ABDOMEN", color: "#F97316", intensity: 0.5 },
            ],
          }),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.modelVersion).toBe("2.0");
      expect(Array.isArray(body.zoneOverrides)).toBe(true);
      expect((body.zoneOverrides as unknown[]).length).toBe(2);
      presetId = body.id as string;
    });
  });

  describe("GET /api/admin/robot-presets", () => {
    it("returns all presets with exercise counts", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/admin/robot-presets", {
          headers: authHeader(adminToken),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json() as unknown[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("PUT /api/admin/robot-presets/:id", () => {
    it("updates a robot preset", async () => {
      const res = await app.handle(
        new Request(
          `http://localhost/api/admin/robot-presets/${presetId}`,
          {
            method: "PUT",
            headers: {
              ...authHeader(adminToken),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              modelVersion: "3.0",
              zoneOverrides: [{ zone: "HEAD", color: "#DC2626", intensity: 0.9 }],
            }),
          }
        )
      );

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.modelVersion).toBe("3.0");
    });
  });

  describe("DELETE /api/admin/robot-presets/:id", () => {
    it("deletes a preset", async () => {
      const res = await app.handle(
        new Request(
          `http://localhost/api/admin/robot-presets/${presetId}`,
          {
            method: "DELETE",
            headers: authHeader(adminToken),
          }
        )
      );

      expect(res.status).toBe(200);
    });

    it("returns 404 for deleted preset", async () => {
      const res = await app.handle(
        new Request(
          `http://localhost/api/admin/robot-presets/${presetId}`,
          {
            headers: authHeader(adminToken),
          }
        )
      );

      expect(res.status).toBe(404);
    });
  });
});
