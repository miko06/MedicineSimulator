import { prisma } from "./prisma";

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
  await prisma.user.deleteMany();
}

export function createTestUser(email = "test@example.com", password = "password123") {
  return { email, password };
}
