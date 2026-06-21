import { Elysia } from "elysia";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { i18nPlugin } from "../../middleware/i18n";
import { NotFoundError } from "../../middleware/error-handler";
import type { BodyZone } from "../../generated/prisma";

function loc(locale: string, en: string, ru: string, kz: string): string {
  if (locale === "ru") return ru || en;
  if (locale === "kz") return kz || ru || en;
  return en;
}

export const exercisesModule = new Elysia({ prefix: "/api/exercises" })
  .use(i18nPlugin)
  .use(requireAuth)
  .get("/", async ({ locale, query }) => {
    const page = Math.max(1, parseInt(query?.page ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(query?.limit ?? "12", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query?.specialty) {
      const specialty = await prisma.specialty.findUnique({
        where: { slug: query.specialty as string },
      });
      if (specialty) {
        where.specialtyId = specialty.id;
      }
    }

    if (query?.difficulty) {
      where.difficulty = query.difficulty as string;
    }

    if (query?.search) {
      where.OR = [
        { titleEn: { contains: query.search as string, mode: "insensitive" } },
        { titleRu: { contains: query.search as string, mode: "insensitive" } },
        { titleKz: { contains: query.search as string, mode: "insensitive" } },
      ];
    }

    const [exercises, total] = await Promise.all([
      prisma.exercise.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          specialty: {
            select: { id: true, slug: true, nameEn: true, nameRu: true, nameKz: true },
          },
          _count: {
            select: { exerciseSymptoms: true, exerciseDiagnoses: true, attempts: true },
          },
        },
      }),
      prisma.exercise.count({ where }),
    ]);

    return {
      data: exercises.map((e) => ({
        id: e.id,
        title: loc(locale, e.titleEn, e.titleRu, e.titleKz),
        description: loc(locale, e.descriptionEn, e.descriptionRu, e.descriptionKz).slice(0, 150),
        difficulty: e.difficulty,
        specialty: {
          slug: e.specialty.slug,
          name: loc(locale, e.specialty.nameEn, e.specialty.nameRu, e.specialty.nameKz),
        },
        symptomsCount: e._count.exerciseSymptoms,
        diagnosesCount: e._count.exerciseDiagnoses,
        attemptsCount: e._count.attempts,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  })
  .get("/:id", async ({ params, locale }) => {
    const exercise = await prisma.exercise.findUnique({
      where: { id: params.id },
      include: {
        robotPreset: true,
        exerciseSymptoms: {
          include: { symptom: true },
        },
        exerciseDiagnoses: {
          include: { diagnosis: true },
        },
        specialty: {
          select: { id: true, slug: true, nameEn: true, nameRu: true, nameKz: true },
        },
      },
    });

    if (!exercise) throw new NotFoundError("Exercise");

    // Auto-generate test steps if empty
    let testSteps = exercise.testSteps as Array<{type:string;title:string;options:string[];correctIndex:number}> | undefined;
    if (!testSteps || (testSteps as any).length === 0) {
      const diagnoses = exercise.exerciseDiagnoses;
      if (diagnoses.length >= 2) {
        const correctDiag = diagnoses.find(d => d.isCorrect)?.diagnosis;
        const wrongDiags = diagnoses.filter(d => !d.isCorrect).map(d => d.diagnosis);
        const allOptions = diagnoses.map(d => {
          const desc = loc(locale, d.diagnosis.descriptionEn, d.diagnosis.descriptionRu, d.diagnosis.descriptionKz);
          return desc;
        });
        const correctIdx = diagnoses.findIndex(d => d.isCorrect);

        const treatments = (correctDiag
          ? loc(
              locale,
              (correctDiag.treatmentsEn as string[] | null)?.join(", ") ?? "",
              (correctDiag.treatmentsRu as string[] | null)?.join(", ") ?? "",
              (correctDiag.treatmentsKz as string[] | null)?.join(", ") ?? ""
            )
          : ""
        )
          .split(", ")
          .filter(Boolean);

        testSteps = [{
          type: "diagnosis",
          title: loc(locale, "Select the correct diagnosis", "Выберите правильный диагноз", "Дұрыс диагнозды таңдаңыз"),
          options: allOptions,
          correctIndex: correctIdx >= 0 ? correctIdx : 0,
        }];

        if (treatments.length >= 2) {
          const correctTx = treatments[0]!;
          const wrongTx = [
            loc(locale, "Observation only", "Только наблюдение", "Тек қана бақылау"),
            loc(locale, "Symptomatic treatment", "Симптоматическое лечение", "Симптоматикалық емдеу"),
            loc(locale, "No treatment needed", "Лечение не требуется", "Емдеу қажет емес"),
          ];
          testSteps.push({
            type: "treatment",
            title: loc(locale, "Choose the correct treatment", "Выберите правильное лечение", "Дұрыс емдеуді таңдаңыз"),
            options: [correctTx, ...wrongTx.slice(0, 3)],
            correctIndex: 0,
          });
        }
      }
    }

    return {
      id: exercise.id,
      title: loc(locale, exercise.titleEn, exercise.titleRu, exercise.titleKz),
      description: loc(locale, exercise.descriptionEn, exercise.descriptionRu, exercise.descriptionKz),
      difficulty: exercise.difficulty,
      specialty: {
        slug: exercise.specialty.slug,
        name: loc(locale, exercise.specialty.nameEn, exercise.specialty.nameRu, exercise.specialty.nameKz),
      },
      robotPreset: {
        id: exercise.robotPreset.id,
        modelVersion: exercise.robotPreset.modelVersion,
        zoneOverrides: exercise.robotPreset.zoneOverrides,
      },
      symptoms: exercise.exerciseSymptoms.map((es) => ({
        id: es.symptom.id,
        name: loc(locale, es.symptom.nameEn, es.symptom.nameRu, es.symptom.nameKz),
        bodyZone: es.symptom.bodyZone as BodyZone,
        severity: es.symptom.severity,
        color: es.symptom.color,
        description: loc(locale, es.symptom.descriptionEn, es.symptom.descriptionRu, es.symptom.descriptionKz),
        attachments: es.symptom.attachments,
      })),
      diagnosesCount: exercise.exerciseDiagnoses.length,
      diagnoses: exercise.exerciseDiagnoses.map((ed) => ({
        id: ed.diagnosis.id,
        name: loc(locale, ed.diagnosis.nameEn, ed.diagnosis.nameRu, ed.diagnosis.nameKz),
      })),
      patientAge: exercise.patientAge,
      patientGender: exercise.patientGender,
      patientHistory: exercise.patientHistory,
      testSteps: testSteps,
      images: exercise.images,
    };
  })
  .get("/:id/attempts", async ({ params, currentUser }) => {
    const attempts = await prisma.attempt.findMany({
      where: { exerciseId: params.id, userId: currentUser!.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { answers: true },
    });

    return attempts.map((a) => ({
      id: a.id, status: a.status, score: a.score,
      timeSpent: a.timeSpent, answersCount: a.answers.length,
      createdAt: a.createdAt,
    }));
  });
