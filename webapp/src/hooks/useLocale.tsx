import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "en" | "ru" | "kz";

const LABELS: Record<Locale, string> = { en: "EN", ru: "RU", kz: "KZ" };
const LOCALES: Locale[] = ["en", "ru", "kz"];

interface LocaleContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  nextLocale: () => void;
  label: string;
  version: number;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
  setLocale: () => {},
  nextLocale: () => {},
  label: "EN",
  version: 0,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    return (localStorage.getItem("locale") as Locale) || "en";
  });
  const [version, setVersion] = useState(0);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
    setVersion(v => v + 1);
  };

  const nextLocale = () => {
    const idx = LOCALES.indexOf(locale);
    setLocale(LOCALES[(idx + 1) % LOCALES.length]!);
  };

  useEffect(() => {
    localStorage.setItem("locale", locale);
  }, [locale]);

  return (
    <LocaleContext.Provider
      value={{ locale, setLocale, nextLocale, label: LABELS[locale], version }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
