import { Elysia, t } from "elysia";
import { prisma } from "../../lib/prisma";
import { adminGuard } from "../../middleware/auth";
import { NotFoundError } from "../../middleware/error-handler";

export const adminSpecialtiesModule = new Elysia({
  prefix: "/api/admin/specialties",
})
  .use(adminGuard)
  .get("/", async () => {
    return prisma.specialty.findMany({
      orderBy: { sortOrder: "asc" },
    });
  })
  .post(
    "/",
    async ({ body }) => {
      return prisma.specialty.create({
        data: body,
      });
    },
    {
      body: t.Object({
        slug: t.String(),
        nameEn: t.String(),
        nameRu: t.String(),
        icon: t.Optional(t.String()),
        sortOrder: t.Optional(t.Number()),
      }),
    }
  )
  .put(
    "/:id",
    async ({ params, body }) => {
      const specialty = await prisma.specialty.findUnique({
        where: { id: params.id },
      });

      if (!specialty) {
        throw new NotFoundError("Specialty");
      }

      return prisma.specialty.update({
        where: { id: params.id },
        data: body,
      });
    },
    {
      body: t.Object({
        slug: t.Optional(t.String()),
        nameEn: t.Optional(t.String()),
        nameRu: t.Optional(t.String()),
        icon: t.Optional(t.String()),
        sortOrder: t.Optional(t.Number()),
      }),
    }
  )
  .delete("/:id", async ({ params }) => {
    const specialty = await prisma.specialty.findUnique({
      where: { id: params.id },
    });

    if (!specialty) {
      throw new NotFoundError("Specialty");
    }

    await prisma.specialty.delete({ where: { id: params.id } });
    return { ok: true };
  });
