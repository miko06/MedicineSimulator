import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import seedData from "./seed-data.json";

const databaseUrl = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

function surgicalImages(folder: string): string[] {
  const fs = require("fs");
  const path = require("path");
  const dir = path.resolve(
    __dirname, "..", "..", "webapp", "public", "images", "surgery", folder
  );
  try {
    const files = fs.readdirSync(dir).filter(
      (f: string) => !f.startsWith(".") && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(f)
    );
    return files.map((f: string) => `/images/surgery/${encodeURIComponent(folder)}/${f}`);
  } catch {
    console.log(`  ⚠ No images found for ${folder} at ${dir}`);
    return [];
  }
}

interface DiagnosisData {
  slug: string;
  nameRu: string;
  nameKz: string;
  nameEn: string;
  descriptionRu: string;
  descriptionKz: string;
  descriptionEn: string;
  symptoms: Array<{
    nameRu: string;
    nameKz: string;
    nameEn: string;
    bodyZone: string;
    severity: number;
    color: string;
    descriptionRu: string;
    descriptionKz: string;
    descriptionEn: string;
  }>;
  correctDiagnosis: {
    nameRu: string;
    nameKz: string;
    nameEn: string;
    descriptionRu: string;
    descriptionKz: string;
    descriptionEn: string;
    treatmentsRu: string[];
    treatmentsKz: string[];
    treatmentsEn: string[];
  };
  wrongDiagnoses: Array<{
    nameRu: string;
    nameKz: string;
    nameEn: string;
    descriptionRu: string;
    descriptionKz: string;
    descriptionEn: string;
  }>;
  robotZones: Array<{ zone: string; color: string; intensity: number }>;
  imageFolder: string;
  patientVoice: { text: string; textKz: string; voiceId: string };
}

const DIAGNOSES = seedData as DiagnosisData[];

async function main() {
  const force = process.argv.includes("--force") || process.env.FORCE_SEED === "true";

  const existingExercises = await prisma.exercise.count();
  const existingUsers = await prisma.user.count();

  if (!force && (existingExercises > 0 || existingUsers > 2)) {
    console.error(
      `Aborting seed: found ${existingExercises} exercise(s) and ${existingUsers} user(s).`
    );
    console.error(
      "Run with --force or FORCE_SEED=true to wipe and re-seed. This will delete all existing exercises, attempts, symptoms, diagnoses and specialties."
    );
    process.exit(1);
  }

  console.log("Clearing old data...");
  await prisma.attemptAnswer.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.exerciseDiagnosis.deleteMany();
  await prisma.exerciseSymptom.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.robotPreset.deleteMany();
  await prisma.diagnosis.deleteMany();
  await prisma.symptom.deleteMany();
  await prisma.specialty.deleteMany();

  console.log("Seeding users...");
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@medsim.io" },
    update: {},
    create: {
      email: "admin@medsim.io",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const studentPassword = await bcrypt.hash("student123", 12);
  await prisma.user.upsert({
    where: { email: "student@medsim.io" },
    update: {},
    create: {
      email: "student@medsim.io",
      passwordHash: studentPassword,
      role: "STUDENT",
    },
  });

  console.log("Seeding surgery specialty...");
  const surgery = await prisma.specialty.create({
    data: {
      slug: "surgery",
      nameEn: "Surgery",
      nameRu: "Хирургия",
      nameKz: "Хирургия",
      icon: "✚",
      sortOrder: 1,
    },
  });

  // Seed 9 more specialties for future use
  const otherSpecialties = [
    { slug: "dermatology", nameEn: "Dermatology", nameRu: "Дерматология", nameKz: "Дерматология", icon: "✚", sortOrder: 2 },
    { slug: "pediatrics", nameEn: "Pediatrics", nameRu: "Педиатрия", nameKz: "Педиатрия", icon: "✚", sortOrder: 3 },
    { slug: "traumatology", nameEn: "Traumatology", nameRu: "Травматология", nameKz: "Травматология", icon: "✚", sortOrder: 4 },
    { slug: "cardiology", nameEn: "Cardiology", nameRu: "Кардиология", nameKz: "Кардиология", icon: "✚", sortOrder: 5 },
    { slug: "neurology", nameEn: "Neurology", nameRu: "Неврология", nameKz: "Неврология", icon: "✚", sortOrder: 6 },
    { slug: "ophthalmology", nameEn: "Ophthalmology", nameRu: "Офтальмология", nameKz: "Офтальмология", icon: "✚", sortOrder: 7 },
    { slug: "ent", nameEn: "ENT", nameRu: "ЛОР", nameKz: "ЛОР", icon: "✚", sortOrder: 8 },
    { slug: "pulmonology", nameEn: "Pulmonology", nameRu: "Пульмонология", nameKz: "Пульмонология", icon: "✚", sortOrder: 9 },
    { slug: "gastroenterology", nameEn: "Gastroenterology", nameRu: "Гастроэнтерология", nameKz: "Гастроэнтерология", icon: "✚", sortOrder: 10 },
  ];

  for (const spec of otherSpecialties) {
    await prisma.specialty.create({ data: spec });
  }

  console.log(`Seeding ${DIAGNOSES.length} surgery exercises...`);
  for (const d of DIAGNOSES) {
    // Create symptoms
    const symptomRecords = [];
    for (const s of d.symptoms) {
      const record = await prisma.symptom.create({
        data: {
          nameEn: s.nameEn,
          nameRu: s.nameRu,
          nameKz: s.nameKz,
          bodyZone: s.bodyZone as any,
          severity: s.severity,
          color: s.color,
          descriptionEn: s.descriptionEn,
          descriptionRu: s.descriptionRu,
          descriptionKz: s.descriptionKz,
        },
      });
      symptomRecords.push(record);
    }

    // Create correct diagnosis
    const correctDiag = await prisma.diagnosis.create({
      data: {
        nameEn: d.correctDiagnosis.nameEn,
        nameRu: d.correctDiagnosis.nameRu,
        nameKz: d.correctDiagnosis.nameKz,
        descriptionEn: d.correctDiagnosis.descriptionEn,
        descriptionRu: d.correctDiagnosis.descriptionRu,
        descriptionKz: d.correctDiagnosis.descriptionKz,
        treatmentsEn: d.correctDiagnosis.treatmentsEn,
        treatmentsRu: d.correctDiagnosis.treatmentsRu,
        treatmentsKz: d.correctDiagnosis.treatmentsKz,
        specialtyId: surgery.id,
      },
    });

    // Create wrong diagnoses
    const wrongDiagRecords = [];
    for (const wd of d.wrongDiagnoses) {
      const record = await prisma.diagnosis.create({
        data: {
          nameEn: wd.nameEn,
          nameRu: wd.nameRu,
          nameKz: wd.nameKz,
          descriptionEn: wd.descriptionEn,
          descriptionRu: wd.descriptionRu,
          descriptionKz: wd.descriptionKz,
          specialtyId: surgery.id,
        },
      });
      wrongDiagRecords.push(record);
    }

    // Create robot preset
    const robotPreset = await prisma.robotPreset.create({
      data: {
        modelVersion: "1.0",
        zoneOverrides: d.robotZones.map((z) => ({
          zone: z.zone,
          color: z.color,
          intensity: z.intensity,
        })),
      },
    });

    // Create exercise
    const images = surgicalImages(d.imageFolder);
    await prisma.exercise.create({
      data: {
        specialtyId: surgery.id,
        titleEn: d.nameEn,
        titleRu: d.nameRu,
        titleKz: d.nameKz,
        descriptionEn: d.descriptionEn,
        descriptionRu: d.descriptionRu,
        descriptionKz: d.descriptionKz,
        difficulty: "INTERMEDIATE",
        patientVoice: {
          text: d.patientVoice.textKz || d.patientVoice.text,
          voiceId: d.patientVoice.voiceId,
        },
        robotPresetId: robotPreset.id,
        createdById: admin.id,
        images: images,
        exerciseSymptoms: {
          create: symptomRecords.map((s) => ({ symptomId: s.id })),
        },
        exerciseDiagnoses: {
          create: [
            { diagnosisId: correctDiag.id, isCorrect: true },
            ...wrongDiagRecords.map((wd) => ({
              diagnosisId: wd.id,
              isCorrect: false,
            })),
          ],
        },
      },
    });

    console.log(`  ✓ ${d.nameKz}`);
  }

  console.log(`Done! Seeded 10 specialties, ${DIAGNOSES.length} surgery exercises.`);
}

if (import.meta.main) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
