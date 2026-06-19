import { Elysia, t } from "elysia";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { env } from "../../config";
import { jwtPlugin, requireAuth } from "../../middleware/auth";
import { ValidationError, ConflictError, NotFoundError } from "../../middleware/error-handler";
import { rateLimit } from "../../middleware/rate-limit";

const SALT_ROUNDS = 12;

export const authModule = new Elysia({ prefix: "/api/auth" })
  .use(rateLimit(10, 60))
  .use(jwtPlugin)
  .post(
    "/register",
    async ({ body, jwt, set, cookie }) => {
      const existing = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existing) {
        throw new ConflictError("User with this email already exists");
      }

      const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);

      const user = await prisma.user.create({
        data: {
          email: body.email,
          passwordHash,
          firstName: body.firstName ?? "",
          lastName: body.lastName ?? "",
          course: body.course ?? "",
        },
      });

      const accessToken = await jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = await jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      cookie.access_token!.set({
        value: accessToken,
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: "lax",
        path: "/",
        maxAge: env.ACCESS_TOKEN_TTL_SECONDS,
      });

      cookie.refresh_token!.set({
        value: refreshToken,
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: "lax",
        path: "/api/auth",
        maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
      });

      set.status = 201;

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          course: user.course,
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 6 }),
        firstName: t.Optional(t.String()),
        lastName: t.Optional(t.String()),
        course: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/login",
    async ({ body, jwt, set, cookie }) => {
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        throw new ValidationError("Invalid email or password");
      }

      const validPassword = await bcrypt.compare(
        body.password,
        user.passwordHash
      );

      if (!validPassword) {
        throw new ValidationError("Invalid email or password");
      }

      const accessToken = await jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = await jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      cookie.access_token!.set({
        value: accessToken,
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: "lax",
        path: "/",
        maxAge: env.ACCESS_TOKEN_TTL_SECONDS,
      });

      cookie.refresh_token!.set({
        value: refreshToken,
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: "lax",
        path: "/api/auth",
        maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    }
  )
  .post(
    "/refresh",
    async ({ jwt, cookie, set }) => {
      const refreshToken = cookie.refresh_token?.value;

      if (!refreshToken) {
        set.status = 401;
        return { error: "UNAUTHORIZED", message: "No refresh token" };
      }

      const payload = await jwt.verify(refreshToken as string);

      if (!payload) {
        set.status = 401;
        return { error: "UNAUTHORIZED", message: "Invalid refresh token" };
      }

      const accessToken = await jwt.sign({
        sub: payload.sub as string,
        email: payload.email as string,
        role: payload.role as string,
      });

      cookie.access_token!.set({
        value: accessToken,
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: "lax",
        path: "/",
        maxAge: env.ACCESS_TOKEN_TTL_SECONDS,
      });

      return { ok: true };
    }
  )
  .post("/logout", ({ cookie }) => {
    cookie.access_token!.remove();
    cookie.refresh_token!.remove();
    return { ok: true };
  })
  .use(requireAuth)
  .get("/me", async ({ currentUser }) => {
    const user = await prisma.user.findUnique({
      where: { id: currentUser!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        course: true,
        displayName: true,
        institution: true,
        emailVerified: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    return { user };
  })
  .put("/me", async ({ currentUser, body }) => {
    const user = await prisma.user.update({
      where: { id: currentUser!.id },
      data: {
        displayName: body.displayName,
        institution: body.institution,
        firstName: body.firstName,
        lastName: body.lastName,
        course: body.course,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        course: true, displayName: true, institution: true,
        emailVerified: true, role: true,
      },
    });
    return { user };
  },
  {
    body: t.Object({
      displayName: t.Optional(t.String()),
      institution: t.Optional(t.String()),
      firstName: t.Optional(t.String()),
      lastName: t.Optional(t.String()),
      course: t.Optional(t.String()),
    }),
  });
