import { Elysia, t } from "elysia";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { i18nPlugin } from "../../middleware/i18n";
import { NotFoundError } from "../../middleware/error-handler";

function loc(
  locale: string,
  en: string | null | undefined,
  ru: string | null | undefined,
  kz: string | null | undefined
): string {
  if (locale === "ru") return ru || en || "";
  if (locale === "kz") return kz || ru || en || "";
  return en || ru || "";
}

export const attemptsModule = new Elysia({ prefix: "/api/exercises" })
  .use(i18nPlugin)
  .use(requireAuth)
  .post(
    "/:id/attempt",
    async ({ params, currentUser, locale }) => {
      const exercise = await prisma.exercise.findUnique({
        where: { id: params.id },
      });

      if (!exercise) {
        throw new NotFoundError("Exercise");
      }

      const existingInProgress = await prisma.attempt.findFirst({
        where: {
          exerciseId: params.id,
          userId: currentUser.id,
          status: "IN_PROGRESS",
        },
        orderBy: { createdAt: "desc" },
      });

      if (existingInProgress) {
        return {
          id: existingInProgress.id,
          status: existingInProgress.status,
          startedAt: existingInProgress.createdAt,
          resumed: true,
        };
      }

      const attempt = await prisma.attempt.create({
        data: {
          userId: currentUser.id,
          exerciseId: params.id,
          status: "IN_PROGRESS",
        },
      });

      return {
        id: attempt.id,
        status: attempt.status,
        startedAt: attempt.createdAt,
        resumed: false,
      };
    }
  )
  .put(
    "/:id/attempt",
    async ({ params, body, currentUser, locale }) => {
      const attempt = await prisma.attempt.findFirst({
        where: {
          exerciseId: params.id,
          userId: currentUser.id,
          status: "IN_PROGRESS",
        },
        include: {
          exercise: {
            include: {
              exerciseDiagnoses: {
                include: { diagnosis: true },
              },
            },
          },
          answers: true,
        },
        orderBy: { createdAt: "desc" },
      });

      if (!attempt) {
        throw new NotFoundError("Active attempt");
      }

      if (body.answer) {
        const timeSpent = body.timeSpent ?? 0;
        const isComplete = body.final === true;

        const testSteps = (attempt.exercise.testSteps as Array<{
          type: string;
          title: string;
          options: string[];
          correctIndex: number;
        }> | null) ?? [];

        let isCorrect = false;
        let score = 0;
        let selectedDiagnosis = null;

        if (testSteps.length > 0) {
          // Multi-step test: answer is comma-separated option indices
          const answerParts = body.answer.split(",").map((v) => Number(v.trim()));
          const correctCount = testSteps.filter(
            (s, i) => answerParts[i] === s.correctIndex
          ).length;
          score =
            testSteps.length > 0
              ? Math.round((correctCount / testSteps.length) * 100)
              : 0;
          isCorrect = correctCount === testSteps.length;

          await prisma.attemptAnswer.createMany({
            data: testSteps.map((s, i) => ({
              attemptId: attempt.id,
              diagnosisId: `step-${i}`,
              isCorrect: answerParts[i] === s.correctIndex,
            })),
          });
        } else {
          // Single diagnosis answer
          const exerciseDiagnosis = attempt.exercise.exerciseDiagnoses.find(
            (ed) => ed.diagnosisId === body.answer
          );

          isCorrect = exerciseDiagnosis?.isCorrect ?? false;
          selectedDiagnosis = exerciseDiagnosis?.diagnosis ?? null;
          score = isCorrect ? 100 : 0;

          await prisma.attemptAnswer.create({
            data: {
              attemptId: attempt.id,
              diagnosisId: body.answer,
              isCorrect,
            },
          });
        }

        await prisma.attempt.update({
          where: { id: attempt.id },
          data: {
            status: isComplete ? "COMPLETED" : "IN_PROGRESS",
            score,
            timeSpent,
          },
        });

        const response: Record<string, unknown> = {
          isCorrect,
          score,
          completed: isComplete,
          answerDetails: selectedDiagnosis
            ? {
                id: selectedDiagnosis.id,
                name: loc(
                  locale,
                  selectedDiagnosis.nameEn,
                  selectedDiagnosis.nameRu,
                  selectedDiagnosis.nameKz
                ),
                description: loc(
                  locale,
                  selectedDiagnosis.descriptionEn,
                  selectedDiagnosis.descriptionRu,
                  selectedDiagnosis.descriptionKz
                ),
                treatments: loc(
                  locale,
                  (selectedDiagnosis.treatmentsEn as string[] | null)?.join(", ") ?? "",
                  (selectedDiagnosis.treatmentsRu as string[] | null)?.join(", ") ?? "",
                  (selectedDiagnosis.treatmentsKz as string[] | null)?.join(", ") ?? ""
                )
                  .split(", ")
                  .filter(Boolean),
              }
            : null,
        };

        if (!isCorrect && isComplete) {
          const correctDiagnosis = attempt.exercise.exerciseDiagnoses.find(
            (ed) => ed.isCorrect
          );

          if (correctDiagnosis) {
            const diag = correctDiagnosis.diagnosis;
            response.correctDiagnosis = {
              id: diag.id,
              name: loc(locale, diag.nameEn, diag.nameRu, diag.nameKz),
              description: loc(
                locale,
                diag.descriptionEn,
                diag.descriptionRu,
                diag.descriptionKz
              ),
              treatments: loc(
                locale,
                (diag.treatmentsEn as string[] | null)?.join(", ") ?? "",
                (diag.treatmentsRu as string[] | null)?.join(", ") ?? "",
                (diag.treatmentsKz as string[] | null)?.join(", ") ?? ""
              )
                .split(", ")
                .filter(Boolean),
            };
          }
        }

        return response;
      }

      if (body.timeSpent !== undefined) {
        await prisma.attempt.update({
          where: { id: attempt.id },
          data: { timeSpent: body.timeSpent },
        });
      }

      return { ok: true };
    },
    {
      body: t.Object({
        answer: t.Optional(t.String()),
        timeSpent: t.Optional(t.Number()),
        final: t.Optional(t.Boolean()),
      }),
    }
  );
