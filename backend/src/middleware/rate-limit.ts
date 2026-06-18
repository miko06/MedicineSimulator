import { Elysia } from "elysia";
import { AppError } from "./error-handler";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimitError extends AppError {
  constructor(message = "Too many requests, please try again later") {
    super(429, message, "RATE_LIMITED");
  }
}

export function rateLimit(maxRequests = 5, windowSeconds = 60) {
  const store = new Map<string, RateLimitEntry>();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 60_000);

  if (typeof globalThis !== "undefined") {
    const ref = setInterval as unknown as ReturnType<typeof setInterval>;
    (globalThis as Record<string, unknown>)._rateLimitCleanup = cleanup;
  }

  return new Elysia({ name: "rate-limit" }).onBeforeHandle(
    ({ request, set }) => {
      const ip =
        request.headers.get("x-forwarded-for") ??
        request.headers.get("x-real-ip") ??
        "unknown";

      const now = Date.now();
      const entry = store.get(ip);

      if (!entry || now > entry.resetAt) {
        store.set(ip, { count: 1, resetAt: now + windowSeconds * 1000 });
        return;
      }

      entry.count++;

      if (entry.count > maxRequests) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        set.headers["Retry-After"] = String(retryAfter);
        throw new RateLimitError(
          `Too many requests. Try again in ${retryAfter} seconds.`
        );
      }
    }
  );
}
