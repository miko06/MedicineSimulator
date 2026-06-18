import { Elysia, t } from "elysia";
import { prisma } from "../../lib/prisma";
import { adminGuard } from "../../middleware/auth";
import { NotFoundError } from "../../middleware/error-handler";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";

const UPLOADS_DIR = join(import.meta.dir, "..", "..", "..", "..", "webapp", "public", "images", "uploads");

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const adminUploadsModule = new Elysia({ prefix: "/api/admin/exercises" })
  .use(adminGuard)
  .post(
    "/:id/images",
    async ({ params, body }) => {
      const exercise = await prisma.exercise.findUnique({
        where: { id: params.id },
      });

      if (!exercise) {
        throw new NotFoundError("Exercise");
      }

      const files = body.files as File[];
      if (!files || files.length === 0) {
        return { error: "No files provided" };
      }

      const existingImages = (exercise.images as string[]) ?? [];
      const newImages: string[] = [];

      for (const file of files) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const filepath = join(UPLOADS_DIR, filename);

        const buffer = await file.arrayBuffer();
        writeFileSync(filepath, new Uint8Array(buffer));

        newImages.push(`/images/uploads/${filename}`);
      }

      const allImages = [...existingImages, ...newImages];

      await prisma.exercise.update({
        where: { id: params.id },
        data: { images: allImages },
      });

      return { images: allImages };
    },
    {
      body: t.Object({
        files: t.Files(),
      }),
    }
  )
  .delete(
    "/:id/images",
    async ({ params, body }) => {
      const exercise = await prisma.exercise.findUnique({
        where: { id: params.id },
      });

      if (!exercise) {
        throw new NotFoundError("Exercise");
      }

      const { index } = body as { index: number };
      const existingImages = (exercise.images as string[]) ?? [];

      if (index < 0 || index >= existingImages.length) {
        return { error: "Invalid index", images: existingImages };
      }

      const removedPath = existingImages[index];

      // Try to delete the physical file (skip if it doesn't exist)
      try {
        const filename = removedPath!.split("/").pop()!;
        const filepath = join(UPLOADS_DIR, filename);
        if (existsSync(filepath)) {
          unlinkSync(filepath);
        }
      } catch {
        // File doesn't exist — skip
      }

      const updatedImages = existingImages.filter((_, i) => i !== index);

      await prisma.exercise.update({
        where: { id: params.id },
        data: { images: updatedImages },
      });

      return { images: updatedImages };
    },
    {
      body: t.Object({
        index: t.Number(),
      }),
    }
  );
