import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { env } from "../config";
import { UnauthorizedError, ForbiddenError } from "./error-handler";
import type { UserRole } from "../generated/prisma";

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
}

export const jwtPlugin = jwt({
  name: "jwt",
  secret: env.JWT_SECRET,
  schema: t.Object({
    sub: t.String(),
    email: t.String(),
    role: t.String(),
  }),
});

export const authPlugin = new Elysia({ name: "auth-plugin" })
  .use(jwtPlugin)
  .derive({ as: "global" }, async ({ jwt, cookie }) => {
    const accessToken = cookie.access_token?.value;

    if (!accessToken) {
      return { currentUser: null as CurrentUser | null };
    }

    const payload = await jwt.verify(accessToken as string);

    if (!payload) {
      return { currentUser: null as CurrentUser | null };
    }

    return {
      currentUser: {
        id: payload.sub as string,
        email: payload.email as string,
        role: payload.role as UserRole,
      } as CurrentUser | null,
    };
  });

export const requireAuth = new Elysia({ name: "require-auth" })
  .use(authPlugin)
  .derive({ as: "scoped" }, ({ currentUser }) => {
    if (!currentUser) {
      throw new UnauthorizedError("Authentication required");
    }
    return { currentUser: currentUser! };
  });

export const adminGuard = new Elysia({ name: "admin-guard" })
  .use(requireAuth)
  .onBeforeHandle(({ currentUser }) => {
    if (currentUser!.role !== "ADMIN") {
      throw new ForbiddenError("Admin access required");
    }
  });
