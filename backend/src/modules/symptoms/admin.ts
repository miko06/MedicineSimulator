import { Elysia, t } from "elysia";
import { prisma } from "../../lib/prisma";
import { adminGuard } from "../../middleware/auth";
import { NotFoundError } from "../../middleware/error-handler";
import type { BodyZone } from "../../generated/prisma";

export const adminSymptomsModule = new Elysia({
  prefix: "/api/admin/symptoms",
})
  .use(adminGuard)
  .get("/", async () => {
    return prisma.symptom.findMany({
      orderBy: { createdAt: "desc" },
    });
  })
  .get("/:id", async ({ params }) => {
    const symptom = await prisma.symptom.findUnique({
      where: { id: params.id },
    });

    if (!symptom) {
      throw new NotFoundError("Symptom");
    }

    return symptom;
  })
  .post(
    "/",
    async ({ body }) => {
      return prisma.symptom.create({
        data: {
          nameEn: body.nameEn,
          nameRu: body.nameRu,
          bodyZone: body.bodyZone as BodyZone,
          severity: body.severity,
          color: body.color,
          descriptionEn: body.descriptionEn,
          descriptionRu: body.descriptionRu,
        },
      });
    },
    {
      body: t.Object({
        nameEn: t.String(),
        nameRu: t.String(),
        bodyZone: t.String(),
        severity: t.Optional(t.Number()),
        color: t.Optional(t.String()),
        descriptionEn: t.Optional(t.String()),
        descriptionRu: t.Optional(t.String()),
      }),
    }
  )
  .put(
    "/:id",
    async ({ params, body }) => {
      const symptom = await prisma.symptom.findUnique({
        where: { id: params.id },
      });

      if (!symptom) {
        throw new NotFoundError("Symptom");
      }

      return prisma.symptom.update({
        where: { id: params.id },
        data: {
          ...body,
          bodyZone: body.bodyZone as BodyZone | undefined,
        },
      });
    },
    {
      body: t.Object({
        nameEn: t.Optional(t.String()),
        nameRu: t.Optional(t.String()),
        bodyZone: t.Optional(t.String()),
        severity: t.Optional(t.Number()),
        color: t.Optional(t.String()),
        descriptionEn: t.Optional(t.String()),
        descriptionRu: t.Optional(t.String()),
      }),
    }
  )
  .delete("/:id", async ({ params }) => {
    const symptom = await prisma.symptom.findUnique({
      where: { id: params.id },
    });

    if (!symptom) {
      throw new NotFoundError("Symptom");
    }

    await prisma.symptom.delete({ where: { id: params.id } });
    return { ok: true };
  });
