import { Elysia } from "elysia";
import { prisma } from "../../lib/prisma";
import { adminGuard } from "../../middleware/auth";
import { NotFoundError } from "../../middleware/error-handler";

export const adminProgressModule = new Elysia({ prefix: "/api/admin/progress" })
  .use(adminGuard)
  .get("/:userId", async ({ params }) => {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    const attempts = await prisma.attempt.findMany({
      where: { userId: params.userId },
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

    const bySpecialty: Record<
      string,
      {
        slug: string;
        nameEn: string;
        nameRu: string;
        total: number;
        completed: number;
        averageScore: number;
      }
    > = {};

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
      if (attempt.status === "COMPLETED") stats.completed++;
      stats.averageScore = Math.round(
        (stats.averageScore * (stats.total - 1) + attempt.score) / stats.total
      );
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      summary: {
        totalAttempts,
        completedAttempts,
        averageScore,
        totalTimeSpent,
      },
      bySpecialty: Object.values(bySpecialty),
      recentAttempts: attempts.slice(0, 20).map((a) => ({
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
  .get("/stats", async () => {
    const [totalStudents, totalAttempts, completedAttempts, avgScoreResult] =
      await Promise.all([
        prisma.user.count({ where: { role: "STUDENT" } }),
        prisma.attempt.count(),
        prisma.attempt.count({ where: { status: "COMPLETED" } }),
        prisma.attempt.aggregate({
          _avg: { score: true },
          where: { status: "COMPLETED" },
        }),
      ]);

    const attemptsByDay = await prisma.$queryRawUnsafe<
      { date: string; count: bigint }[]
    >(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM attempts
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    const completionRate =
      totalAttempts > 0
        ? Math.round((completedAttempts / totalAttempts) * 100)
        : 0;

    return {
      overview: {
        totalStudents,
        totalAttempts,
        completedAttempts,
        completionRate,
        platformAverageScore: Math.round(avgScoreResult._avg?.score ?? 0),
      },
      activityByDay: attemptsByDay.map((r) => ({
        date: r.date,
        count: Number(r.count),
      })),
    };
  });
