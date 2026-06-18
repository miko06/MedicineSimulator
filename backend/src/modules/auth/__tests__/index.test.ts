import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authModule } from "../index";
import { errorHandler } from "../../../middleware/error-handler";
import { cleanDatabase } from "../../../lib/test-utils";
import { prisma } from "../../../lib/prisma";

interface AuthUser {
  id: string;
  email: string;
  role: string;
  createdAt?: string;
}

interface AuthResponse {
  user?: AuthUser;
  error?: string;
  message?: string;
  ok?: boolean;
}

function createApp() {
  return new Elysia()
    .use(errorHandler)
    .use(cors({ origin: "*", credentials: true }))
    .use(authModule);
}

const app = createApp();

async function registerUser(email: string, password: string) {
  const res = await app.handle(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
  );

  const setCookie = res.headers.get("set-cookie") ?? "";
  const accessTokenMatch = setCookie.match(/access_token=([^;]+)/);
  const refreshTokenMatch = setCookie.match(/refresh_token=([^;]+)/);

  return {
    status: res.status,
    body: (await res.json()) as AuthResponse,
    accessToken: accessTokenMatch?.[1] ?? "",
    refreshToken: refreshTokenMatch?.[1] ?? "",
    setCookie,
  };
}

describe("Auth Module", () => {
  beforeAll(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  describe("POST /api/auth/register", () => {
    it("registers a new user and returns tokens", async () => {
      const result = await registerUser("newuser@test.com", "password123");

      expect(result.status).toBe(201);
      expect(result.body.user).toBeDefined();
      expect(result.body.user?.email).toBe("newuser@test.com");
      expect(result.body.user?.role).toBe("STUDENT");
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it("returns 409 for duplicate email", async () => {
      const result = await registerUser("newuser@test.com", "password123");

      expect(result.status).toBe(409);
      expect(result.body.error).toBe("CONFLICT");
    });

    it("returns 422 for short password", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "short@test.com", password: "ab" }),
        })
      );

      expect(res.status).toBe(422);
    });

    it("returns 422 for invalid email", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "not-an-email", password: "password123" }),
        })
      );

      expect(res.status).toBe(422);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeAll(async () => {
      await registerUser("login@test.com", "loginpass123");
    });

    it("logs in with correct credentials", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "login@test.com", password: "loginpass123" }),
        })
      );

      const setCookie = res.headers.get("set-cookie") ?? "";
      const body = (await res.json()) as AuthResponse;

      expect(res.status).toBe(200);
      expect(body.user?.email).toBe("login@test.com");
      expect(setCookie).toContain("access_token=");
      expect(setCookie).toContain("refresh_token=");
    });

    it("returns 400 for wrong password", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "login@test.com", password: "wrongpass" }),
        })
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as AuthResponse;
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for non-existent email", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "nobody@test.com", password: "password123" }),
        })
      );

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("returns 401 without refresh token", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/refresh", {
          method: "POST",
        })
      );

      expect(res.status).toBe(401);
    });

    it("returns new access token with valid refresh token", async () => {
      const reg = await registerUser("refresh@test.com", "pass123456");

      const res = await app.handle(
        new Request("http://localhost/api/auth/refresh", {
          method: "POST",
          headers: {
            Cookie: `refresh_token=${reg.refreshToken}`,
          },
        })
      );

      const setCookie = res.headers.get("set-cookie") ?? "";
      expect(res.status).toBe(200);
      expect(setCookie).toContain("access_token=");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("clears tokens", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/logout", {
          method: "POST",
        })
      );

      const setCookie = res.headers.get("set-cookie") ?? "";
      expect(res.status).toBe(200);
      expect(setCookie).toBeTruthy();
    });
  });

  describe("GET /api/auth/me", () => {
    let accessToken = "";

    beforeAll(async () => {
      const reg = await registerUser("me@test.com", "password123");
      accessToken = reg.accessToken;
    });

    it("returns current user with valid token", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/me", {
          method: "GET",
          headers: {
            Cookie: `access_token=${accessToken}`,
          },
        })
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as AuthResponse;
      expect(body.user?.email).toBe("me@test.com");
      expect(body.user?.role).toBe("STUDENT");
      expect(body.user?.id).toBeDefined();
      expect(body.user?.createdAt).toBeDefined();
    });

    it("returns 401 without token", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/me", {
          method: "GET",
        })
      );

      expect(res.status).toBe(401);
    });

    it("returns 401 with invalid token", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/me", {
          method: "GET",
          headers: {
            Cookie: "access_token=invalid.token.here",
          },
        })
      );

      expect(res.status).toBe(401);
    });
  });
});
