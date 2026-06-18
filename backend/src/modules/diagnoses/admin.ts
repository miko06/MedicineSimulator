import { Elysia, t } from "elysia";
import { prisma } from "../../lib/prisma";
import { adminGuard } from "../../middleware/auth";
import { NotFoundError, ValidationError } from "../../middleware/error-handler";

export const adminDiagnosesModule = new Elysia({
  prefix: "/api/admin/diagnoses",
})
  .use(adminGuard)
  .get("/", async () => {
    return prisma.diagnosis.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        specialty: {
          select: { id: true, slug: true, nameEn: true, nameRu: true },
        },
      },
    });
  })
  .get("/:id", async ({ params }) => {
    const diagnosis = await prisma.diagnosis.findUnique({
      where: { id: params.id },
      include: {
        specialty: {
          select: { id: true, slug: true, nameEn: true, nameRu: true },
        },
      },
    });

    if (!diagnosis) {
      throw new NotFoundError("Diagnosis");
    }

    return diagnosis;
  })
  .post(
    "/",
    async ({ body }) => {
      const specialty = await prisma.specialty.findUnique({
        where: { id: body.specialtyId },
      });

      if (!specialty) {
        throw new ValidationError("Specialty not found");
      }

      return prisma.diagnosis.create({
        data: body,
      });
    },
    {
      body: t.Object({
        nameEn: t.String(),
        nameRu: t.String(),
        descriptionEn: t.Optional(t.String()),
        descriptionRu: t.Optional(t.String()),
        treatmentsEn: t.Optional(t.Array(t.String())),
        treatmentsRu: t.Optional(t.Array(t.String())),
        specialtyId: t.String(),
      }),
    }
  )
  .put(
    "/:id",
    async ({ params, body }) => {
      const diagnosis = await prisma.diagnosis.findUnique({
        where: { id: params.id },
      });

      if (!diagnosis) {
        throw new NotFoundError("Diagnosis");
      }

      return prisma.diagnosis.update({
        where: { id: params.id },
        data: body,
      });
    },
    {
      body: t.Object({
        nameEn: t.Optional(t.String()),
        nameRu: t.Optional(t.String()),
        descriptionEn: t.Optional(t.String()),
        descriptionRu: t.Optional(t.String()),
        treatmentsEn: t.Optional(t.Array(t.String())),
        treatmentsRu: t.Optional(t.Array(t.String())),
        specialtyId: t.Optional(t.String()),
      }),
    }
  )
  .delete("/:id", async ({ params }) => {
    const diagnosis = await prisma.diagnosis.findUnique({
      where: { id: params.id },
    });

    if (!diagnosis) {
      throw new NotFoundError("Diagnosis");
    }

    await prisma.diagnosis.delete({ where: { id: params.id } });
    return { ok: true };
  });
