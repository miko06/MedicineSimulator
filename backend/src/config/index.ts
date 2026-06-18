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
});

export const env = parseEnv();
