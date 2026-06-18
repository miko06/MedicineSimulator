-- AlterTable
ALTER TABLE "diagnoses" ADD COLUMN     "descriptionKz" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "nameKz" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "treatmentsKz" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "descriptionKz" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "titleKz" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "specialties" ADD COLUMN     "nameKz" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "symptoms" ADD COLUMN     "descriptionKz" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "nameKz" TEXT NOT NULL DEFAULT '';
