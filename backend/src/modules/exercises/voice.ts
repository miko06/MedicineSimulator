import { Elysia } from "elysia";
import { prisma } from "../../lib/prisma";
import { authPlugin } from "../../middleware/auth";
import { NotFoundError } from "../../middleware/error-handler";

const API_KEY = process.env.ELEVENLABS_API_KEY!;
const BASE_URL = "https://api.elevenlabs.io/v1";

async function elevenlabsTTS(voiceId: string, text: string): Promise<ArrayBuffer> {
  const res = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "Unknown error");
    throw new Error(`ElevenLabs API error ${res.status}: ${err}`);
  }

  return res.arrayBuffer();
}

export const voiceModule = new Elysia({ prefix: "/api/exercises" })
  .use(authPlugin)
  .post("/:id/voice", async ({ params, set }) => {
    const exercise = await prisma.exercise.findUnique({
      where: { id: params.id },
      select: { patientVoice: true },
    });

    if (!exercise) {
      throw new NotFoundError("Exercise");
    }

    const voice = exercise.patientVoice as {
      text?: string;
      voiceId?: string;
    } | null;

    if (!voice?.text) {
      set.status = 404;
      return { error: "No voice script" };
    }

    try {
      const audioBuffer = await elevenlabsTTS(
        (voice.voiceId as string) || "JBFqnCBsd6RMkjVDRZzb",
        voice.text
      );

      return new Response(audioBuffer, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": String(audioBuffer.byteLength),
        },
      });
    } catch (err) {
      console.error("ElevenLabs error:", err);
      set.status = 500;
      return { error: "Voice generation failed" };
    }
  });
