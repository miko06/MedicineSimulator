import { Elysia, t } from "elysia";
import { prisma } from "../../lib/prisma";
import { adminGuard } from "../../middleware/auth";
import { NotFoundError } from "../../middleware/error-handler";
import type { BodyZone } from "../../generated/prisma";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const SYMPTOM_UPLOADS = join(import.meta.dir, "..", "..", "..", "..", "webapp", "public", "uploads", "symptoms");
if (!existsSync(SYMPTOM_UPLOADS)) mkdirSync(SYMPTOM_UPLOADS, { recursive: true });

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
          nameKz: body.nameKz,
          bodyZone: body.bodyZone as BodyZone,
          severity: body.severity,
          color: body.color,
          descriptionEn: body.descriptionEn,
          descriptionRu: body.descriptionRu,
          descriptionKz: body.descriptionKz,
        },
      });
    },
    {
      body: t.Object({
        nameEn: t.String(),
        nameRu: t.String(),
        nameKz: t.Optional(t.String()),
        bodyZone: t.String(),
        severity: t.Optional(t.Number()),
        color: t.Optional(t.String()),
        descriptionEn: t.Optional(t.String()),
        descriptionRu: t.Optional(t.String()),
        descriptionKz: t.Optional(t.String()),
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
        nameKz: t.Optional(t.String()),
        bodyZone: t.Optional(t.String()),
        severity: t.Optional(t.Number()),
        color: t.Optional(t.String()),
        descriptionEn: t.Optional(t.String()),
        descriptionRu: t.Optional(t.String()),
        descriptionKz: t.Optional(t.String()),
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
  })
  .post("/:id/attachments", async ({ params, body }) => {
    const symptom = await prisma.symptom.findUnique({ where: { id: params.id } });
    if (!symptom) throw new NotFoundError("Symptom");

    const files = (body as any).files as File[];
    if (!files || files.length === 0) return { attachments: symptom.attachments };

    const existing = (symptom.attachments as Array<{ name: string; path: string }>) ?? [];
    const newAttachments: Array<{ name: string; path: string }> = [];

    for (const file of files) {
      const ext = file.name.split(".").pop() ?? "pdf";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const filepath = join(SYMPTOM_UPLOADS, filename);
      const buffer = await file.arrayBuffer();
      writeFileSync(filepath, new Uint8Array(buffer));
      newAttachments.push({ name: file.name, path: `/uploads/symptoms/${filename}` });
    }

    const all = [...existing, ...newAttachments];
    await prisma.symptom.update({ where: { id: params.id }, data: { attachments: all } });
    return { attachments: all };
  },
  {
    body: t.Object({
      files: t.Files(),
    }),
  })
  .delete("/:id/attachments", async ({ params, body }) => {
    const symptom = await prisma.symptom.findUnique({ where: { id: params.id } });
    if (!symptom) throw new NotFoundError("Symptom");

    const { index } = body as { index: number };
    const attachments = (symptom.attachments as Array<{ name: string; path: string }>) ?? [];
    if (index < 0 || index >= attachments.length) return { attachments };

    attachments.splice(index, 1);
    await prisma.symptom.update({ where: { id: params.id }, data: { attachments } });
    return { attachments };
  });
