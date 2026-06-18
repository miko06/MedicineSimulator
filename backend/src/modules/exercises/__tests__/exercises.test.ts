import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { authModule } from "../../auth";
import { exercisesModule } from "../index";
import { adminSpecialtiesModule } from "../../specialties/admin";
import { adminSymptomsModule } from "../../symptoms/admin";
import { adminDiagnosesModule } from "../../diagnoses/admin";
import { adminExercisesModule } from "../admin";
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
  adminSpecialtiesModule,
  adminSymptomsModule,
  adminDiagnosesModule,
  adminExercisesModule
);

async function createTestExercise(adminToken: string) {
  const specRes = await app.handle(
    new Request("http://localhost/api/admin/specialties", {
      method: "POST",
      headers: {
        ...authHeader(adminToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slug: "cardiology-test",
        nameEn: "Cardiology",
        nameRu: "Кардиология",
        icon: "❤️",
      }),
    })
  );
  const spec = await specRes.json() as Record<string, unknown>;

  const sympRes = await app.handle(
    new Request("http://localhost/api/admin/symptoms", {
      method: "POST",
      headers: {
        ...authHeader(adminToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nameEn: "Chest pain",
        nameRu: "Боль в груди",
        bodyZone: "CHEST",
        severity: 7,
        color: "#EF4444",
      }),
    })
  );
  const symptom = await sympRes.json() as Record<string, unknown>;

  const diagRes1 = await app.handle(
    new Request("http://localhost/api/admin/diagnoses", {
      method: "POST",
      headers: {
        ...authHeader(adminToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nameEn: "Myocardial Infarction",
        nameRu: "Инфаркт миокарда",
        specialtyId: spec.id,
        treatmentsEn: ["Aspirin", "PCI", "Oxygen"],
        treatmentsRu: ["Аспирин", "ЧКВ", "Кислород"],
      }),
    })
  );
  const correctDiag = await diagRes1.json() as Record<string, unknown>;

  const diagRes2 = await app.handle(
    new Request("http://localhost/api/admin/diagnoses", {
      method: "POST",
      headers: {
        ...authHeader(adminToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nameEn: "Angina Pectoris",
        nameRu: "Стенокардия",
        specialtyId: spec.id,
      }),
    })
  );
  const wrongDiag = await diagRes2.json() as Record<string, unknown>;

  const exRes = await app.handle(
    new Request("http://localhost/api/admin/exercises", {
      method: "POST",
      headers: {
        ...authHeader(adminToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        specialtyId: spec.id,
        titleEn: "Chest Pain Case",
        titleRu: "Случай боли в груди",
        difficulty: "INTERMEDIATE",
        zoneOverrides: [
          { zone: "CHEST", color: "#EF4444", intensity: 0.8 },
        ],
        symptomIds: [symptom.id],
        diagnoses: [
          { diagnosisId: correctDiag.id, isCorrect: true },
          { diagnosisId: wrongDiag.id, isCorrect: false },
        ],
      }),
    })
  );
  const exercise = await exRes.json() as Record<string, unknown>;

  return {
    specialty: spec,
    symptom,
    correctDiagnosis: correctDiag,
    wrongDiagnosis: wrongDiag,
    exercise,
  };
}

describe("Exercises Module", () => {
  let adminToken = "";
  let studentToken = "";
  let exerciseId = "";
  let correctDiagnosisId = "";

  beforeAll(async () => {
    await cleanDatabase();
    await createUserWithRole("admin@test.com", "admin123", "ADMIN");
    await createUserWithRole("student@test.com", "student123", "STUDENT");

    const adminLogin = await loginAs("admin@test.com", "admin123", app);
    adminToken = adminLogin.accessToken;

    const studentLogin = await loginAs("student@test.com", "student123", app);
    studentToken = studentLogin.accessToken;

    const data = await createTestExercise(adminToken);
    exerciseId = data.exercise.id as string;
    correctDiagnosisId = data.correctDiagnosis.id as string;
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  describe("GET /api/exercises", () => {
    it("returns filtered exercise list", async () => {
      const res = await app.handle(
        new Request(
          "http://localhost/api/exercises?difficulty=INTERMEDIATE&page=1&limit=10",
          {
            headers: authHeader(studentToken),
          }
        )
      );

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      const data = body.data as unknown[];
      expect(data.length).toBeGreaterThanOrEqual(1);

      const pagination = body.pagination as Record<string, unknown>;
      expect(pagination.total).toBe(1);
    });

    it("returns empty list for non-matching filter", async () => {
      const res = await app.handle(
        new Request(
          "http://localhost/api/exercises?difficulty=BEGINNER",
          {
            headers: authHeader(studentToken),
          }
        )
      );

      const body = await res.json() as Record<string, unknown>;
      const data = body.data as unknown[];
      expect(data.length).toBe(0);
    });

    it("filters by specialty slug", async () => {
      const res = await app.handle(
        new Request(
          "http://localhost/api/exercises?specialty=cardiology-test",
          {
            headers: authHeader(studentToken),
          }
        )
      );

      const body = await res.json() as Record<string, unknown>;
      const data = body.data as unknown[];
      expect(data.length).toBe(1);
    });
  });

  describe("GET /api/exercises/:id", () => {
    it("returns exercise with robot preset and symptoms", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/exercises/${exerciseId}`, {
          headers: {
            ...authHeader(studentToken),
            "Accept-Language": "ru",
          },
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;

      expect(body.title).toBe("Случай боли в груди");
      expect(body.robotPreset).toBeDefined();
      const preset = body.robotPreset as Record<string, unknown>;
      expect(preset.modelVersion).toBeDefined();
      expect(Array.isArray(preset.zoneOverrides)).toBe(true);

      expect(Array.isArray(body.symptoms)).toBe(true);
      const symptoms = body.symptoms as unknown[];
      expect(symptoms.length).toBe(1);

      expect(body.diagnosesCount).toBe(2);
    });

    it("returns 401 without token", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/exercises/${exerciseId}`)
      );

      expect(res.status).toBe(401);
    });

    it("returns 404 for non-existent exercise", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/exercises/non-existent", {
          headers: authHeader(studentToken),
        })
      );

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/exercises/:id/attempts", () => {
    it("returns empty history for new exercise", async () => {
      const res = await app.handle(
        new Request(
          `http://localhost/api/exercises/${exerciseId}/attempts`,
          {
            headers: authHeader(studentToken),
          }
        )
      );

      expect(res.status).toBe(200);
      const body = await res.json() as unknown[];
      expect(Array.isArray(body)).toBe(true);
    });
  });
});
