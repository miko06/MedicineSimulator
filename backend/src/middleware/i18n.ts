import { Elysia } from "elysia";

export type SupportedLocale = "en" | "ru" | "kz";

const FALLBACK_LOCALE: SupportedLocale = "en";

function parseAcceptLanguage(header: string | null): SupportedLocale {
  if (!header) return FALLBACK_LOCALE;

  const first = header.split(",")[0]?.trim().split(";")[0]?.trim();
  if (!first) return FALLBACK_LOCALE;

  if (first.startsWith("ru")) return "ru";
  if (first.startsWith("kk") || first.startsWith("kz")) return "kz";
  return "en";
}

export const i18nPlugin = new Elysia({ name: "i18n" })
  .derive({ as: "global" }, ({ request }) => {
    const acceptLanguage = request.headers.get("accept-language");
    const locale = parseAcceptLanguage(acceptLanguage);

    return {
      locale,
      t: {
        field: <T extends Record<string, unknown>>(
          obj: T | null | undefined,
          suffix: "name" | "title" = "name"
        ): string => {
          if (!obj) return "";
          const key = `${suffix}${locale === "ru" ? "Ru" : locale === "kz" ? "Kz" : "En"}`;
          return (obj as Record<string, string>)[key] ?? (obj as Record<string, string>)[`${suffix}Ru`] ?? (obj as Record<string, string>)[`${suffix}En`] ?? "";
        },
        description: <T extends Record<string, unknown>>(
          obj: T | null | undefined
        ): string => {
          if (!obj) return "";
          const key = `description${locale === "ru" ? "Ru" : locale === "kz" ? "Kz" : "En"}`;
          return (obj as Record<string, string>)[key] ?? (obj as Record<string, string>).descriptionRu ?? (obj as Record<string, string>).descriptionEn ?? "";
        },
        treatments: <T extends Record<string, unknown>>(
          obj: T | null | undefined
        ): unknown[] => {
          if (!obj) return [];
          const key = `treatments${locale === "ru" ? "Ru" : locale === "kz" ? "Kz" : "En"}`;
          return ((obj as Record<string, unknown>)[key] as unknown[]) ?? ((obj as Record<string, unknown>).treatmentsRu as unknown[]) ?? ((obj as Record<string, unknown>).treatmentsEn as unknown[]) ?? [];
        },
      },
    };
  });
