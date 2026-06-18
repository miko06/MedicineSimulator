import { Elysia } from "elysia";
import { prisma } from "../../lib/prisma";
import { i18nPlugin } from "../../middleware/i18n";

function loc(locale: string, en: string, ru: string, kz: string): string {
  if (locale === "ru") return ru || en;
  if (locale === "kz") return kz || ru || en;
  return en;
}

export const specialtiesModule = new Elysia({ prefix: "/api/specialties" })
  .use(i18nPlugin)
  .get("/", async ({ locale }) => {
    const specialties = await prisma.specialty.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { exercises: true } } },
    });

    return specialties.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: loc(locale, s.nameEn, s.nameRu, s.nameKz),
      icon: s.icon,
      exerciseCount: s._count.exercises,
    }));
  })
  .get("/:slug", async ({ params, locale }) => {
    const specialty = await prisma.specialty.findUnique({
      where: { slug: params.slug },
      include: { exercises: { orderBy: { createdAt: "desc" } } },
    });

    if (!specialty) {
      return { error: "NOT_FOUND", message: "Specialty not found" };
    }

    return {
      id: specialty.id,
      slug: specialty.slug,
      name: loc(locale, specialty.nameEn, specialty.nameRu, specialty.nameKz),
      icon: specialty.icon,
      exercises: specialty.exercises.map((e) => ({
        id: e.id,
        title: loc(locale, e.titleEn, e.titleRu, e.titleKz),
        difficulty: e.difficulty,
      })),
    };
  });
