import { Elysia } from "elysia";
import { prisma } from "../../lib/prisma";
import { adminGuard } from "../../middleware/auth";

export const adminDashboardModule = new Elysia({ prefix: "/api/admin" })
  .use(adminGuard)
  .get("/dashboard", async () => {
    const [
      totalUsers,
      totalStudents,
      totalAdmins,
      activeUsers,
      totalSpecialties,
      totalExercises,
      totalSymptoms,
      totalDiagnoses,
      totalAttempts,
      completedAttempts,
      recentAttempts,
      averageScore,
      exercisesBySpecialty,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.specialty.count(),
      prisma.exercise.count(),
      prisma.symptom.count(),
      prisma.diagnosis.count(),
      prisma.attempt.count(),
      prisma.attempt.count({ where: { status: "COMPLETED" } }),
      prisma.attempt.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, email: true } },
          exercise: { select: { id: true, titleEn: true, titleRu: true, titleKz: true } },
        },
      }),
      prisma.attempt.aggregate({
        _avg: { score: true },
      }),
      prisma.specialty.findMany({
        select: {
          id: true,
          slug: true,
          nameEn: true,
          nameRu: true,
          nameKz: true,
          _count: { select: { exercises: true } },
        },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    const completionRate =
      totalAttempts > 0
        ? Math.round((completedAttempts / totalAttempts) * 100)
        : 0;

    return {
      users: {
        total: totalUsers,
        students: totalStudents,
        admins: totalAdmins,
        active: activeUsers,
      },
      content: {
        specialties: totalSpecialties,
        exercises: totalExercises,
        symptoms: totalSymptoms,
        diagnoses: totalDiagnoses,
      },
      attempts: {
        total: totalAttempts,
        completed: completedAttempts,
        completionRate,
        averageScore: Math.round(averageScore._avg?.score ?? 0),
      },
      exercisesBySpecialty: exercisesBySpecialty.map((s) => ({
        id: s.id,
        slug: s.slug,
        nameEn: s.nameEn,
        nameRu: s.nameRu,
        nameKz: s.nameKz,
        exerciseCount: s._count.exercises,
      })),
      recentActivity: recentAttempts.map((a) => ({
        id: a.id,
        user: a.user.email,
        exercise: a.exercise.titleKz || a.exercise.titleRu || a.exercise.titleEn,
        score: a.score,
        status: a.status,
        createdAt: a.createdAt,
      })),
    };
  });
