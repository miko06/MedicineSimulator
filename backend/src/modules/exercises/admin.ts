import { Elysia, t } from "elysia";
import { prisma } from "../../lib/prisma";
import { adminGuard } from "../../middleware/auth";
import { NotFoundError, ValidationError } from "../../middleware/error-handler";
import type { Difficulty } from "../../generated/prisma";

export const adminExercisesModule = new Elysia({
  prefix: "/api/admin/exercises",
})
  .use(adminGuard)
  .get("/", async () => {
    return prisma.exercise.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        titleEn: true,
        titleRu: true,
        titleKz: true,
        descriptionEn: true,
        descriptionRu: true,
        descriptionKz: true,
        difficulty: true,
        specialtyId: true,
        images: true,
        specialty: {
          select: { id: true, slug: true, nameEn: true, nameRu: true, nameKz: true },
        },
        _count: {
          select: {
            exerciseSymptoms: true,
            exerciseDiagnoses: true,
          },
        },
      },
    });
  })
  .get("/:id", async ({ params }) => {
    const exercise = await prisma.exercise.findUnique({
      where: { id: params.id },
      include: {
        specialty: true,
        robotPreset: true,
        exerciseSymptoms: {
          include: { symptom: true },
        },
        exerciseDiagnoses: {
          include: { diagnosis: true },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundError("Exercise");
    }

    return exercise;
  })
  .post(
    "/",
    async ({ body, currentUser }) => {
      const specialty = await prisma.specialty.findUnique({
        where: { id: body.specialtyId },
      });

      if (!specialty) {
        throw new ValidationError("Specialty not found");
      }

      const robotPreset = await prisma.robotPreset.create({
        data: {
          modelVersion: "1.0",
          zoneOverrides: body.zoneOverrides ?? [],
        },
      });

      return prisma.exercise.create({
        data: {
          specialtyId: body.specialtyId,
          titleEn: body.titleEn,
          titleRu: body.titleRu,
          descriptionEn: body.descriptionEn ?? "",
          descriptionRu: body.descriptionRu ?? "",
          difficulty: (body.difficulty as Difficulty) ?? "BEGINNER",
          robotPresetId: robotPreset.id,
          createdById: currentUser!.id,
          exerciseSymptoms: {
            create: (body.symptomIds ?? []).map((symptomId: string) => ({
              symptomId,
            })),
          },
          exerciseDiagnoses: {
            create: (body.diagnoses ?? []).map(
              (d: { diagnosisId: string; isCorrect: boolean }) => ({
                diagnosisId: d.diagnosisId,
                isCorrect: d.isCorrect,
              })
            ),
          },
        },
      });
    },
    {
      body: t.Object({
        specialtyId: t.String(),
        titleEn: t.String(),
        titleRu: t.String(),
        descriptionEn: t.Optional(t.String()),
        descriptionRu: t.Optional(t.String()),
        difficulty: t.Optional(t.String()),
        zoneOverrides: t.Optional(t.Array(t.Any())),
        symptomIds: t.Optional(t.Array(t.String())),
        diagnoses: t.Optional(
          t.Array(
            t.Object({
              diagnosisId: t.String(),
              isCorrect: t.Boolean(),
            })
          )
        ),
      }),
    }
  )
  .put(
    "/:id",
    async ({ params, body }) => {
      const exercise = await prisma.exercise.findUnique({
        where: { id: params.id },
      });

      if (!exercise) {
        throw new NotFoundError("Exercise");
      }

      const updateData: Record<string, unknown> = {};

      if (body.titleEn !== undefined) updateData.titleEn = body.titleEn;
      if (body.titleRu !== undefined) updateData.titleRu = body.titleRu;
      if (body.descriptionEn !== undefined) updateData.descriptionEn = body.descriptionEn;
      if (body.descriptionRu !== undefined) updateData.descriptionRu = body.descriptionRu;
      if (body.difficulty !== undefined) updateData.difficulty = body.difficulty as Difficulty;
      if (body.specialtyId !== undefined) updateData.specialtyId = body.specialtyId;

      if (body.zoneOverrides) {
        await prisma.robotPreset.update({
          where: { id: exercise.robotPresetId },
          data: { zoneOverrides: body.zoneOverrides },
        });
      }

      if (body.symptomIds) {
        await prisma.exerciseSymptom.deleteMany({
          where: { exerciseId: params.id },
        });

        await prisma.exerciseSymptom.createMany({
          data: body.symptomIds.map((symptomId: string) => ({
            exerciseId: params.id,
            symptomId,
          })),
        });
      }

      if (body.diagnoses) {
        await prisma.exerciseDiagnosis.deleteMany({
          where: { exerciseId: params.id },
        });

        await prisma.exerciseDiagnosis.createMany({
          data: body.diagnoses.map(
            (d: { diagnosisId: string; isCorrect: boolean }) => ({
              exerciseId: params.id,
              diagnosisId: d.diagnosisId,
              isCorrect: d.isCorrect,
            })
          ),
        });
      }

      return prisma.exercise.update({
        where: { id: params.id },
        data: updateData,
      });
    },
    {
      body: t.Object({
        specialtyId: t.Optional(t.String()),
        titleEn: t.Optional(t.String()),
        titleRu: t.Optional(t.String()),
        descriptionEn: t.Optional(t.String()),
        descriptionRu: t.Optional(t.String()),
        difficulty: t.Optional(t.String()),
        zoneOverrides: t.Optional(t.Array(t.Any())),
        symptomIds: t.Optional(t.Array(t.String())),
        diagnoses: t.Optional(
          t.Array(
            t.Object({
              diagnosisId: t.String(),
              isCorrect: t.Boolean(),
            })
          )
        ),
      }),
    }
  )
  .delete("/:id", async ({ params }) => {
    const exercise = await prisma.exercise.findUnique({
      where: { id: params.id },
    });

    if (!exercise) {
      throw new NotFoundError("Exercise");
    }

    await prisma.exercise.delete({ where: { id: params.id } });
    return { ok: true };
  });
