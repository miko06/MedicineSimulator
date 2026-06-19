const parseEnv = () => ({
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.PORT ?? "8080", 10),
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  CORS_ORIGINS: process.env.CORS_ORIGINS ?? "http://localhost:5173",
  ACCESS_TOKEN_TTL_SECONDS: parseInt(
    process.env.ACCESS_TOKEN_TTL_SECONDS ?? "900",
    10
  ),
  REFRESH_TOKEN_TTL_DAYS: parseInt(
    process.env.REFRESH_TOKEN_TTL_DAYS ?? "30",
    10
  ),
  COOKIE_SECURE: process.env.COOKIE_SECURE === "true",
  AI_MODEL: process.env.AI_MODEL ?? "nvidia/nemotron-nano-12b-v2-vl:free",
  AI_FALLBACK_MODEL:
    process.env.AI_FALLBACK_MODEL ?? "google/gemini-2.0-flash-exp:free",
  AI_TIMEOUT_MS: parseInt(process.env.AI_TIMEOUT_MS ?? "30000", 10),
  AI_MAX_TOKENS_CHAT: parseInt(process.env.AI_MAX_TOKENS_CHAT ?? "512", 10),
  AI_MAX_TOKENS_ANALYSIS: parseInt(
    process.env.AI_MAX_TOKENS_ANALYSIS ?? "1024",
    10
  ),
});

export const env = parseEnv();
