import { Elysia, t } from "elysia";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { i18nPlugin } from "../../middleware/i18n";

interface SpecialtyStats {
  slug: string;
  nameEn: string;
  nameRu: string;
  total: number;
  completed: number;
  averageScore: number;
}

interface LeaderboardEntry {
  userId: string;
  email: string;
  totalScore: number;
  completedCount: number;
  averageScore: number;
  totalTimeSpent: number;
}

export const progressModule = new Elysia({ prefix: "/api/progress" })
  .use(i18nPlugin)
  .use(requireAuth)
  .get("/", async ({ currentUser }) => {
    const attempts = await prisma.attempt.findMany({
      where: { userId: currentUser.id },
      include: {
        exercise: {
          include: {
            specialty: {
              select: { id: true, slug: true, nameEn: true, nameRu: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter(
      (a) => a.status === "COMPLETED"
    ).length;
    const averageScore =
      totalAttempts > 0
        ? Math.round(
            attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts
          )
        : 0;
    const totalTimeSpent = attempts.reduce((sum, a) => sum + a.timeSpent, 0);

    const bestScore = attempts.reduce(
      (max, a) => Math.max(max, a.score),
      0
    );

    const bySpecialty: Record<string, SpecialtyStats> = {};

    for (const attempt of attempts) {
      const spec = attempt.exercise.specialty;
      if (!bySpecialty[spec.id]) {
        bySpecialty[spec.id] = {
          slug: spec.slug,
          nameEn: spec.nameEn,
          nameRu: spec.nameRu,
          total: 0,
          completed: 0,
          averageScore: 0,
        };
      }

      const stats = bySpecialty[spec.id]!;
      stats.total++;
      if (attempt.status === "COMPLETED") {
        stats.completed++;
      }
      stats.averageScore = Math.round(
        (stats.averageScore * (stats.total - 1) + attempt.score) / stats.total
      );
    }

    return {
      summary: {
        totalAttempts,
        completedAttempts,
        averageScore,
        bestScore,
        totalTimeSpent,
      },
      bySpecialty: Object.values(bySpecialty),
      recentAttempts: attempts.slice(0, 10).map((a) => ({
        id: a.id,
        exerciseTitle: a.exercise.titleEn,
        specialty: a.exercise.specialty.slug,
        status: a.status,
        score: a.score,
        timeSpent: a.timeSpent,
        createdAt: a.createdAt,
      })),
    };
  })
  .get("/history", async ({ currentUser, query }) => {
    const page = Math.max(1, parseInt(query?.page ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(query?.limit ?? "10", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      userId: currentUser.id,
    };

    if (query?.status) {
      where.status = query.status as string;
    }

    if (query?.specialty) {
      const specialty = await prisma.specialty.findUnique({
        where: { slug: query.specialty as string },
      });
      if (specialty) {
        where.exercise = { specialtyId: specialty.id };
      }
    }

    const [attempts, total] = await Promise.all([
      prisma.attempt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          exercise: {
            select: {
              id: true,
              titleEn: true,
              titleRu: true,
              difficulty: true,
              specialty: {
                select: { id: true, slug: true, nameEn: true, nameRu: true },
              },
            },
          },
          answers: {
            include: {
              attempt: false,
            },
          },
        },
      }),
      prisma.attempt.count({ where }),
    ]);

    return {
      data: attempts.map((a) => ({
        id: a.id,
        exercise: {
          id: a.exercise.id,
          title: a.exercise.titleEn,
          difficulty: a.exercise.difficulty,
          specialty: a.exercise.specialty.slug,
        },
        status: a.status,
        score: a.score,
        timeSpent: a.timeSpent,
        answersCount: a.answers.length,
        correctAnswers: a.answers.filter((ans) => ans.isCorrect).length,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  })
  .get("/error-history", async ({ currentUser, query }) => {
    const limit = Math.min(
      50,
      Math.max(1, parseInt(query?.limit ?? "20", 10))
    );

    const attempts = await prisma.attempt.findMany({
      where: { userId: currentUser.id, status: "COMPLETED" },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        exercise: {
          select: {
            id: true,
            titleEn: true,
            titleRu: true,
            titleKz: true,
            difficulty: true,
            specialty: {
              select: { slug: true, nameEn: true, nameRu: true, nameKz: true },
            },
            exerciseDiagnoses: {
              include: {
                diagnosis: {
                  select: {
                    id: true,
                    nameEn: true,
                    nameRu: true,
                    nameKz: true,
                  },
                },
              },
            },
          },
        },
        answers: {
          select: { diagnosisId: true, isCorrect: true, answeredAt: true },
          orderBy: { answeredAt: "desc" },
        },
      },
    });

    const data = attempts
      .filter(
        (a) => a.score < 100 || a.answers.some((ans) => !ans.isCorrect)
      )
      .map((a) => {
        const diagnosisById = new Map(
          a.exercise.exerciseDiagnoses.map((ed) => [ed.diagnosisId, ed.diagnosis])
        );
        const correct = a.exercise.exerciseDiagnoses.find((ed) => ed.isCorrect)
          ?.diagnosis ?? null;

        return {
          id: a.id,
          score: a.score,
          status: a.status,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          exercise: {
            id: a.exercise.id,
            title:
              a.exercise.titleKz || a.exercise.titleRu || a.exercise.titleEn,
            difficulty: a.exercise.difficulty,
            specialty: a.exercise.specialty,
          },
          answers: a.answers.map((ans) => ({
            diagnosisId: ans.diagnosisId,
            diagnosisName:
              diagnosisById.get(ans.diagnosisId)?.nameKz ||
              diagnosisById.get(ans.diagnosisId)?.nameRu ||
              diagnosisById.get(ans.diagnosisId)?.nameEn ||
              "Белгісіз",
            isCorrect: ans.isCorrect,
          })),
          correctDiagnosis: correct
            ? {
                id: correct.id,
                name: correct.nameKz || correct.nameRu || correct.nameEn,
              }
            : null,
        };
      });

    return { attempts: data };
  })
  .get("/leaderboard", async ({ query }) => {
    const limit = Math.min(100, Math.max(1, parseInt(query?.limit ?? "10", 10)));
    const specialtySlug = query?.specialty as string | undefined;

    const attemptWhere: Record<string, unknown> = {
      status: "COMPLETED",
    };

    if (specialtySlug) {
      const specialty = await prisma.specialty.findUnique({
        where: { slug: specialtySlug },
      });
      if (specialty) {
        attemptWhere.exercise = { specialtyId: specialty.id };
      }
    }

    const allAttempts = await prisma.attempt.findMany({
      where: attemptWhere,
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    const leaderboard: Record<string, LeaderboardEntry> = {};

    for (const a of allAttempts) {
      const uid = a.userId;
      if (!leaderboard[uid]) {
        leaderboard[uid] = {
          userId: uid,
          email: a.user.email,
          totalScore: 0,
          completedCount: 0,
          averageScore: 0,
          totalTimeSpent: 0,
        };
      }

      const entry = leaderboard[uid]!;
      entry.totalScore += a.score;
      entry.completedCount++;
      entry.totalTimeSpent += a.timeSpent;
      entry.averageScore = Math.round(entry.totalScore / entry.completedCount);
    }

    const sorted = Object.values(leaderboard)
      .sort((a, b) => b.averageScore - a.averageScore || b.completedCount - a.completedCount)
      .slice(0, limit);

    return {
      leaderboard: sorted,
      filter: specialtySlug ? { specialty: specialtySlug } : null,
    };
  })
  .get("/export", async ({ currentUser }) => {
    const attempts = await prisma.attempt.findMany({
      where: { userId: currentUser.id },
      include: {
        exercise: {
          select: {
            titleEn: true,
            difficulty: true,
            specialty: {
              select: { slug: true, nameEn: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const header = "ID,Exercise,Specialty,Difficulty,Status,Score,TimeSpent(sec),CreatedAt";
    const rows = attempts.map((a) =>
      [
        a.id,
        `"${a.exercise.titleEn.replace(/"/g, '""')}"`,
        a.exercise.specialty.slug,
        a.exercise.difficulty,
        a.status,
        a.score,
        a.timeSpent,
        a.createdAt.toISOString(),
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="progress.csv"',
      },
    });
  });
