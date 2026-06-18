import { Elysia, t } from "elysia";
import { prisma } from "../../lib/prisma";
import { adminGuard } from "../../middleware/auth";
import { NotFoundError, ValidationError, ForbiddenError } from "../../middleware/error-handler";

export const adminUsersModule = new Elysia({ prefix: "/api/admin/users" })
  .use(adminGuard)
  .get("/", async ({ query }) => {
    const page = Math.max(1, parseInt(query?.page ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(query?.limit ?? "20", 10)));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              attempts: true,
              createdExercises: true,
            },
          },
        },
      }),
      prisma.user.count(),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  })
  .get("/:id", async ({ params }) => {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            attempts: true,
            createdExercises: true,
          },
        },
        attempts: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            exercise: {
              select: { id: true, titleEn: true, titleRu: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    return { user };
  })
  .patch(
    "/:id/role",
    async ({ params, body, currentUser }) => {
      if (params.id === currentUser!.id) {
        throw new ForbiddenError("Cannot change your own role");
      }

      const user = await prisma.user.findUnique({
        where: { id: params.id },
      });

      if (!user) {
        throw new NotFoundError("User");
      }

      const updated = await prisma.user.update({
        where: { id: params.id },
        data: { role: body.role },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });

      return { user: updated };
    },
    {
      body: t.Object({
        role: t.Union([t.Literal("STUDENT"), t.Literal("ADMIN")]),
      }),
    }
  )
  .patch(
    "/:id/toggle-active",
    async ({ params, currentUser }) => {
      if (params.id === currentUser!.id) {
        throw new ForbiddenError("Cannot deactivate your own account");
      }

      const user = await prisma.user.findUnique({
        where: { id: params.id },
      });

      if (!user) {
        throw new NotFoundError("User");
      }

      const updated = await prisma.user.update({
        where: { id: params.id },
        data: { isActive: !user.isActive },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });

      return { user: updated };
    }
  )
  .delete("/:id", async ({ params, currentUser }) => {
    if (params.id === currentUser!.id) {
        throw new ForbiddenError("Cannot delete your own account");
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    await prisma.user.delete({ where: { id: params.id } });
    return { ok: true };
  });
