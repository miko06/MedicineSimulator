import { Elysia, t } from "elysia";
import { prisma } from "../../lib/prisma";
import { adminGuard } from "../../middleware/auth";
import { NotFoundError } from "../../middleware/error-handler";

export const adminRobotPresetsModule = new Elysia({
  prefix: "/api/admin/robot-presets",
})
  .use(adminGuard)
  .get("/", async () => {
    return prisma.robotPreset.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { exercises: true } },
      },
    });
  })
  .get("/:id", async ({ params }) => {
    const preset = await prisma.robotPreset.findUnique({
      where: { id: params.id },
      include: {
        exercises: {
          select: { id: true, titleEn: true, titleRu: true },
        },
      },
    });

    if (!preset) {
      throw new NotFoundError("RobotPreset");
    }

    return preset;
  })
  .post(
    "/",
    async ({ body }) => {
      return prisma.robotPreset.create({
        data: {
          modelVersion: body.modelVersion ?? "1.0",
          zoneOverrides: body.zoneOverrides ?? [],
        },
      });
    },
    {
      body: t.Object({
        modelVersion: t.Optional(t.String()),
        zoneOverrides: t.Optional(t.Array(t.Any())),
      }),
    }
  )
  .put(
    "/:id",
    async ({ params, body }) => {
      const preset = await prisma.robotPreset.findUnique({
        where: { id: params.id },
      });

      if (!preset) {
        throw new NotFoundError("RobotPreset");
      }

      return prisma.robotPreset.update({
        where: { id: params.id },
        data: {
          modelVersion: body.modelVersion,
          zoneOverrides: body.zoneOverrides,
        },
      });
    },
    {
      body: t.Object({
        modelVersion: t.Optional(t.String()),
        zoneOverrides: t.Optional(t.Array(t.Any())),
      }),
    }
  )
  .delete("/:id", async ({ params }) => {
    const preset = await prisma.robotPreset.findUnique({
      where: { id: params.id },
    });

    if (!preset) {
      throw new NotFoundError("RobotPreset");
    }

    await prisma.robotPreset.delete({ where: { id: params.id } });
    return { ok: true };
  });
