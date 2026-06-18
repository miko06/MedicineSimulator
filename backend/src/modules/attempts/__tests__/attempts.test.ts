import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { authModule } from "../../auth";
import { exercisesModule } from "../../exercises";
import { attemptsModule } from "../index";
import { adminSpecialtiesModule } from "../../specialties/admin";
import { adminSymptomsModule } from "../../symptoms/admin";
import { adminDiagnosesModule } from "../../diagnoses/admin";
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
  exercisesModule,
  attemptsModule,
  adminSpecialtiesModule,
  adminSymptomsModule,
  adminDiagnosesModule,
  adminExercisesModule
);

interface IdBody { id: string }
type JsonBody = Record<string, unknown>;

async function createFullExercise(adminToken: string) {
  const spec = await (await app.handle(
    new Request("http://localhost/api/admin/specialties", {
      method: "POST",
      headers: { ...authHeader(adminToken), "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "neuro-test", nameEn: "Neurology", nameRu: "Неврология" }),
    })
  )).json() as IdBody;

  const symptom = await (await app.handle(
    new Request("http://localhost/api/admin/symptoms", {
      method: "POST",
      headers: { ...authHeader(adminToken), "Content-Type": "application/json" },
      body: JSON.stringify({ nameEn: "Headache", nameRu: "Головная боль", bodyZone: "HEAD", severity: 6 }),
    })
  )).json() as IdBody;

  const correctDiag = await (await app.handle(
    new Request("http://localhost/api/admin/diagnoses", {
      method: "POST",
      headers: { ...authHeader(adminToken), "Content-Type": "application/json" },
      body: JSON.stringify({
        nameEn: "Migraine",
        nameRu: "Мигрень",
        specialtyId: spec.id,
        treatmentsEn: ["Sumatriptan", "Rest in dark room", "NSAIDs"],
        treatmentsRu: ["Суматриптан", "Отдых в темной комнате", "НПВС"],
      }),
    })
  )).json() as IdBody;

  const wrongDiag = await (await app.handle(
    new Request("http://localhost/api/admin/diagnoses", {
      method: "POST",
      headers: { ...authHeader(adminToken), "Content-Type": "application/json" },
      body: JSON.stringify({ nameEn: "Tension Headache", nameRu: "Головная боль напряжения", specialtyId: spec.id }),
    })
  )).json() as IdBody;

  const exercise = await (await app.handle(
    new Request("http://localhost/api/admin/exercises", {
      method: "POST",
      headers: { ...authHeader(adminToken), "Content-Type": "application/json" },
      body: JSON.stringify({
        specialtyId: spec.id,
        titleEn: "Headache Case",
        titleRu: "Случай головной боли",
        difficulty: "BEGINNER",
        symptomIds: [symptom.id],
        diagnoses: [
          { diagnosisId: correctDiag.id, isCorrect: true },
          { diagnosisId: wrongDiag.id, isCorrect: false },
        ],
      }),
    })
  )).json() as IdBody;

  return { exerciseId: exercise.id, correctDiagId: correctDiag.id, wrongDiagId: wrongDiag.id };
}

describe("Attempts Module", () => {
  let adminToken = "";
  let studentToken = "";
  let exerciseId = "";
  let correctDiagId = "";
  let wrongDiagId = "";

  beforeAll(async () => {
    await cleanDatabase();
    await createUserWithRole("admin@test.com", "admin123", "ADMIN");
    await createUserWithRole("student@test.com", "student123", "STUDENT");

    const adminLogin = await loginAs("admin@test.com", "admin123", app);
    adminToken = adminLogin.accessToken;

    const studentLogin = await loginAs("student@test.com", "student123", app);
    studentToken = studentLogin.accessToken;

    const data = await createFullExercise(adminToken);
    exerciseId = data.exerciseId;
    correctDiagId = data.correctDiagId;
    wrongDiagId = data.wrongDiagId;
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  describe("POST /api/exercises/:id/attempt (start)", () => {
    it("starts a new attempt", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/exercises/${exerciseId}/attempt`, {
          method: "POST",
          headers: authHeader(studentToken),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json() as JsonBody;
      expect(body.id).toBeDefined();
      expect(body.status).toBe("IN_PROGRESS");
      expect(body.resumed).toBe(false);
    });

    it("resumes existing in-progress attempt", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/exercises/${exerciseId}/attempt`, {
          method: "POST",
          headers: authHeader(studentToken),
        })
      );

      const body = await res.json() as JsonBody;
      expect(body.resumed).toBe(true);
    });
  });

  describe("PUT /api/exercises/:id/attempt (submit answer)", () => {
    it("returns correct feedback for right answer", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/exercises/${exerciseId}/attempt`, {
          method: "PUT",
          headers: {
            ...authHeader(studentToken),
            "Content-Type": "application/json",
            "Accept-Language": "en",
          },
          body: JSON.stringify({
            answer: correctDiagId,
            timeSpent: 45,
          }),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json() as JsonBody;
      expect(body.isCorrect).toBe(true);
      expect(body.score).toBe(100);
      expect(body.answerDetails).toBeDefined();
      const details = body.answerDetails as JsonBody;
      expect(details.name).toBe("Migraine");
      expect(Array.isArray(details.treatments)).toBe(true);
    });

    it("returns feedback for wrong answer without revealing correct", async () => {
      // Reset by starting fresh attempt for a new test flow
      // Fall back to checking wrong answer behavior
      const res = await app.handle(
        new Request(`http://localhost/api/exercises/${exerciseId}/attempt`, {
          method: "PUT",
          headers: {
            ...authHeader(studentToken),
            "Content-Type": "application/json",
            "Accept-Language": "en",
          },
          body: JSON.stringify({
            answer: wrongDiagId,
            timeSpent: 30,
          }),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json() as JsonBody;
      expect(body.isCorrect).toBe(false);
      expect(body.answerDetails).toBeDefined();
      // Not final, so no correctDiagnosis revealed yet
      expect(body.correctDiagnosis).toBeUndefined();
    });

    it("reveals correct diagnosis when finalizing with wrong answer", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/exercises/${exerciseId}/attempt`, {
          method: "PUT",
          headers: {
            ...authHeader(studentToken),
            "Content-Type": "application/json",
            "Accept-Language": "ru",
          },
          body: JSON.stringify({
            answer: wrongDiagId,
            timeSpent: 60,
            final: true,
          }),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json() as JsonBody;
      expect(body.isCorrect).toBe(false);
      expect(body.completed).toBe(true);
      expect(body.correctDiagnosis).toBeDefined();
      const correct = body.correctDiagnosis as JsonBody;
      expect(correct.name).toBe("Мигрень");
      expect(Array.isArray(correct.treatments)).toBe(true);
      expect((correct.treatments as unknown[]).length).toBe(3);
    });
  });
});
