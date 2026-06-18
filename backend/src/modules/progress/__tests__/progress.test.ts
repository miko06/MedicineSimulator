import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { authModule } from "../../auth";
import { progressModule } from "../index";
import { adminProgressModule } from "../admin";
import { exercisesModule } from "../../exercises";
import { attemptsModule } from "../../attempts";
import { adminExercisesModule } from "../../exercises/admin";
import {
  createTestApp,
  createUserWithRole,
  loginAs,
  authHeader,
  cleanDatabase,
} from "../../../lib/test-helpers";
import { prisma } from "../../../lib/prisma";

const app = createTestApp(
  authModule,
  progressModule,
  adminProgressModule,
  exercisesModule,
  attemptsModule,
  adminExercisesModule
);

async function seedAttemptData(adminToken: string, studentToken: string) {
  const spec = await (await app.handle(
    new Request("http://localhost/api/admin/specialties", {
      method: "POST",
      headers: { ...authHeader(adminToken), "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "pulmo-test", nameEn: "Pulmonology", nameRu: "Пульмонология" }),
    })
  )).json() as { id: string };

  const symptom = await (await app.handle(
    new Request("http://localhost/api/admin/symptoms", {
      method: "POST",
      headers: { ...authHeader(adminToken), "Content-Type": "application/json" },
      body: JSON.stringify({ nameEn: "Cough", nameRu: "Кашель", bodyZone: "CHEST", severity: 5 }),
    })
  )).json() as { id: string };

  const diagnosis = await (await app.handle(
    new Request("http://localhost/api/admin/diagnoses", {
      method: "POST",
      headers: { ...authHeader(adminToken), "Content-Type": "application/json" },
      body: JSON.stringify({
        nameEn: "Pneumonia",
        nameRu: "Пневмония",
        specialtyId: spec.id,
        treatmentsEn: ["Antibiotics", "Rest"],
        treatmentsRu: ["Антибиотики", "Отдых"],
      }),
    })
  )).json() as { id: string };

  const exercise = await (await app.handle(
    new Request("http://localhost/api/admin/exercises", {
      method: "POST",
      headers: { ...authHeader(adminToken), "Content-Type": "application/json" },
      body: JSON.stringify({
        specialtyId: spec.id,
        titleEn: "Cough Case",
        titleRu: "Случай кашля",
        difficulty: "BEGINNER",
        symptomIds: [symptom.id],
        diagnoses: [{ diagnosisId: diagnosis.id, isCorrect: true }],
      }),
    })
  )).json() as { id: string };

  for (let i = 0; i < 3; i++) {
    await app.handle(
      new Request(`http://localhost/api/exercises/${exercise.id}/attempt`, {
        method: "POST",
        headers: authHeader(studentToken),
      })
    );

    await app.handle(
      new Request(`http://localhost/api/exercises/${exercise.id}/attempt`, {
        method: "PUT",
        headers: { ...authHeader(studentToken), "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: diagnosis.id,
          timeSpent: 30 + i * 10,
          final: true,
        }),
      })
    );
  }

  return { exerciseId: exercise.id };
}

describe("Progress Module", () => {
  let adminToken = "";
  let studentToken = "";

  beforeAll(async () => {
    await cleanDatabase();
    await createUserWithRole("admin@test.com", "admin123", "ADMIN");
    await createUserWithRole("student@test.com", "student123", "STUDENT");

    const adminLogin = await loginAs("admin@test.com", "admin123", app);
    adminToken = adminLogin.accessToken;

    const studentLogin = await loginAs("student@test.com", "student123", app);
    studentToken = studentLogin.accessToken;

    await seedAttemptData(adminToken, studentToken);
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  describe("GET /api/progress", () => {
    it("returns student progress summary", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/progress", {
          headers: authHeader(studentToken),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      const summary = body.summary as Record<string, unknown>;
      expect(summary.totalAttempts).toBe(3);
      expect(summary.completedAttempts).toBe(3);
      expect(summary.averageScore).toBe(100);
      expect(body.bySpecialty).toBeDefined();
      expect(Array.isArray(body.bySpecialty)).toBe(true);
      expect(Array.isArray(body.recentAttempts)).toBe(true);
    });

    it("returns 401 without token", async () => {
      const res = await app.handle(new Request("http://localhost/api/progress"));
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/progress/history", () => {
    it("returns paginated attempt history", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/progress/history?page=1&limit=5", {
          headers: authHeader(studentToken),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      const data = body.data as unknown[];
      expect(data.length).toBe(3);

      const pagination = body.pagination as Record<string, unknown>;
      expect(pagination.total).toBe(3);
    });

    it("filters by status", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/progress/history?status=COMPLETED", {
          headers: authHeader(studentToken),
        })
      );

      const body = await res.json() as Record<string, unknown>;
      const pagination = body.pagination as Record<string, unknown>;
      expect(pagination.total).toBe(3);
    });

    it("filters by specialty", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/progress/history?specialty=pulmo-test", {
          headers: authHeader(studentToken),
        })
      );

      const body = await res.json() as Record<string, unknown>;
      const pagination = body.pagination as Record<string, unknown>;
      expect(pagination.total).toBe(3);
    });
  });

  describe("GET /api/progress/leaderboard", () => {
    it("returns leaderboard", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/progress/leaderboard?limit=10", {
          headers: authHeader(studentToken),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.leaderboard).toBeDefined();
      const lb = body.leaderboard as unknown[];
      expect(lb.length).toBeGreaterThanOrEqual(1);
      const first = lb[0] as Record<string, unknown>;
      expect(first.email).toBeDefined();
      expect(first.averageScore).toBeDefined();
    });
  });

  describe("GET /api/progress/export", () => {
    it("returns CSV file", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/progress/export", {
          headers: authHeader(studentToken),
        })
      );

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("ID,Exercise,Specialty,Difficulty,Status,Score");
      expect(text.split("\n").length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Admin Progress", () => {
    let studentId = "";

    beforeAll(async () => {
      const student = await prisma.user.findFirst({
        where: { email: "student@test.com" },
      });
      studentId = student?.id ?? "";
    });

    describe("GET /api/admin/progress/:userId", () => {
      it("returns student progress for admin", async () => {
        const res = await app.handle(
          new Request(`http://localhost/api/admin/progress/${studentId}`, {
            headers: authHeader(adminToken),
          })
        );

        expect(res.status).toBe(200);
        const body = await res.json() as Record<string, unknown>;
        expect(body.user).toBeDefined();
        const user = body.user as Record<string, unknown>;
        expect(user.email).toBe("student@test.com");

        const summary = body.summary as Record<string, unknown>;
        expect(summary.totalAttempts).toBe(3);
      });

      it("returns 403 for non-admin", async () => {
        const res = await app.handle(
          new Request(`http://localhost/api/admin/progress/${studentId}`, {
            headers: authHeader(studentToken),
          })
        );

        expect(res.status).toBe(403);
      });

      it("returns 404 for non-existent user", async () => {
        const res = await app.handle(
          new Request("http://localhost/api/admin/progress/non-existent", {
            headers: authHeader(adminToken),
          })
        );

        expect(res.status).toBe(404);
      });
    });

    describe("GET /api/admin/progress/stats", () => {
      it("returns platform-wide stats", async () => {
        const res = await app.handle(
          new Request("http://localhost/api/admin/progress/stats", {
            headers: authHeader(adminToken),
          })
        );

        expect(res.status).toBe(200);
        const body = await res.json() as Record<string, unknown>;
        const overview = body.overview as Record<string, unknown>;
        expect(overview.totalStudents).toBe(1);
        expect(overview.totalAttempts).toBe(3);
        expect(overview.completionRate).toBe(100);
        expect(body.activityByDay).toBeDefined();
      });
    });
  });
});
