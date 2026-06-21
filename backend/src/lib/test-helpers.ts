import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { errorHandler } from "../middleware/error-handler";

export interface TestTokens {
  accessToken: string;
  refreshToken: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createTestApp(...modules: any[]) {
  let app = new Elysia()
    .use(errorHandler)
    .use(cors({ origin: "*", credentials: true }));

  for (const mod of modules) {
    app = app.use(mod) as typeof app;
  }

  return app;
}

export async function createUserWithRole(email: string, password: string, role: "STUDENT" | "ADMIN") {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.create({
    data: { email, passwordHash, role },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loginAs(email: string, password: string, app: any): Promise<TestTokens> {
  const res = await app.handle(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
  );

  const setCookie = res.headers.get("set-cookie") ?? "";
  const accessTokenMatch = setCookie.match(/access_token=([^;]+)/);
  const refreshTokenMatch = setCookie.match(/refresh_token=([^;]+)/);

  return {
    accessToken: accessTokenMatch?.[1] ?? "",
    refreshToken: refreshTokenMatch?.[1] ?? "",
  };
}

export function authHeader(accessToken: string): Record<string, string> {
  return { Cookie: `access_token=${accessToken}` };
}

export async function cleanDatabase() {
  await prisma.attemptAnswer.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.exerciseDiagnosis.deleteMany();
  await prisma.exerciseSymptom.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.robotPreset.deleteMany();
  await prisma.diagnosis.deleteMany();
  await prisma.symptom.deleteMany();
  await prisma.specialty.deleteMany();
  await prisma.aiDiagnosis.deleteMany();
  await prisma.aiConversation.deleteMany();
  await prisma.user.deleteMany();
}
