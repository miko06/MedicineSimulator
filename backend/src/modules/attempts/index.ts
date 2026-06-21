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
        const exerciseDiagnosis = attempt.exercise.exerciseDiagnoses.find(
          (ed) => ed.diagnosisId === body.answer
        );

        const isCorrect = exerciseDiagnosis?.isCorrect ?? false;

        await prisma.attemptAnswer.create({
          data: {
            attemptId: attempt.id,
            diagnosisId: body.answer,
            isCorrect,
          },
        });

        const allAnswers = await prisma.attemptAnswer.findMany({
          where: { attemptId: attempt.id },
        });

        const correctCount = allAnswers.filter((a) => a.isCorrect).length;
        const totalAnswers = allAnswers.length;
        const score =
          totalAnswers > 0
            ? Math.round((correctCount / totalAnswers) * 100)
            : 0;

        const timeSpent = body.timeSpent ?? 0;
        const isComplete = body.final === true;

        await prisma.attempt.update({
          where: { id: attempt.id },
          data: {
            status: isComplete ? "COMPLETED" : "IN_PROGRESS",
            score,
            timeSpent,
          },
        });

        const selectedDiagnosis = exerciseDiagnosis?.diagnosis;

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
