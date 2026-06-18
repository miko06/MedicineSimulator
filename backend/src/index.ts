import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { env } from "./config";
import { errorHandler } from "./middleware/error-handler";
import { authModule } from "./modules/auth";
import { specialtiesModule } from "./modules/specialties";
import { adminSpecialtiesModule } from "./modules/specialties/admin";
import { adminSymptomsModule } from "./modules/symptoms/admin";
import { adminDiagnosesModule } from "./modules/diagnoses/admin";
import { adminExercisesModule } from "./modules/exercises/admin";
import { adminUploadsModule } from "./modules/exercises/upload";
import { voiceModule } from "./modules/exercises/voice";
import { exercisesModule } from "./modules/exercises";
import { attemptsModule } from "./modules/attempts";
import { progressModule } from "./modules/progress";
import { adminProgressModule } from "./modules/progress/admin";
import { adminUsersModule } from "./modules/users/admin";
import { adminDashboardModule } from "./modules/admin/dashboard";
import { adminRobotPresetsModule } from "./modules/robot/admin";

const app = new Elysia()
  .use(errorHandler)
  .use(
    cors({
      origin: env.CORS_ORIGINS.split(",").map((o) => o.trim()),
      credentials: true,
    })
  )
  .use(
    swagger({
      path: "/docs",
      documentation: {
        info: {
          title: "MedSim API",
          version: "0.1.0",
          description: "Medicine Simulator — clinical practice platform",
        },
      },
    })
  )
  .use(authModule)
  .use(specialtiesModule)
  .use(exercisesModule)
  .use(attemptsModule)
  .use(progressModule)
  .use(adminSpecialtiesModule)
  .use(adminSymptomsModule)
  .use(adminDiagnosesModule)
  .use(adminExercisesModule)
  .use(adminUploadsModule)
  .use(voiceModule)
  .use(adminUsersModule)
  .use(adminDashboardModule)
  .use(adminProgressModule)
  .use(adminRobotPresetsModule)
  .get("/health", () => ({ status: "ok" }))
  .listen(env.PORT);

console.log(`MedSim API running on http://localhost:${env.PORT}`);
console.log(`Swagger docs: http://localhost:${env.PORT}/docs`);

export type App = typeof app;
