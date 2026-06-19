import { Elysia, t } from "elysia";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { NotFoundError } from "../../middleware/error-handler";
import { env } from "../../config";

const OPENAI_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = env.AI_MODEL;
const FALLBACK_MODEL = env.AI_FALLBACK_MODEL;
const TIMEOUT_MS = env.AI_TIMEOUT_MS;
const MAX_TOKENS_CHAT = env.AI_MAX_TOKENS_CHAT;
const MAX_TOKENS_ANALYSIS = env.AI_MAX_TOKENS_ANALYSIS;

function getKey(): string {
  return process.env.MEDSIM_OPENROUTER_KEY || Bun.env.MEDSIM_OPENROUTER_KEY || "";
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatOptions {
  maxTokens?: number;
  stream?: boolean;
}

async function callOpenRouter(
  messages: ChatMessage[],
  model: string,
  options: ChatOptions = {}
): Promise<Response> {
  const key = getKey();
  if (!key) throw new Error("OPENROUTER_API_KEY not configured");

  const body = {
    model,
    messages,
    temperature: 0.3,
    max_tokens: options.maxTokens ?? MAX_TOKENS_ANALYSIS,
    stream: options.stream ?? false,
  };

  return fetchWithTimeout(
    OPENAI_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://medsim.io",
        "X-Title": "MedSim AI Lab",
      },
      body: JSON.stringify(body),
    },
    TIMEOUT_MS
  );
}

async function openaiChat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const key = getKey();
  if (!key) throw new Error("OPENROUTER_API_KEY not configured");

  const models = [MODEL, FALLBACK_MODEL].filter(
    (m, i, arr) => m && arr.indexOf(m) === i
  );
  let lastError: Error | undefined;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await callOpenRouter(messages, model, options);

        if (!res.ok) {
          const err = await res.text().catch(() => "Unknown");
          throw new Error(`OpenRouter error ${res.status}: ${err}`);
        }

        const data = (await res.json()) as {
          choices: Array<{ message: { content: string; reasoning?: string } }>;
        };
        const msg = data.choices[0]?.message;
        const content = msg?.content || msg?.reasoning || "";
        if (!content.trim()) {
          throw new Error("Empty response from model");
        }
        return content;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Don't retry client errors (4xx) except rate limits (429)
        if (lastError.message.includes("OpenRouter error 4") && !lastError.message.includes("429")) {
          break;
        }
      }
    }
  }

  throw lastError ?? new Error("AI request failed");
}

const SYSTEM_MED = {
  role: "system",
  content:
    "You are an AI medical education assistant for MedSim — a clinical simulation platform. " +
    "Students practice diagnosing surgical conditions. Answer in the language the user writes in (Russian, English, or Kazakh). " +
    "Be precise, educational, and reference specific symptoms, signs, and diagnostic reasoning. " +
    "When analyzing a case, follow this structure: 1) Key symptoms and their significance, " +
    "2) Differential diagnosis with reasoning, 3) Most likely diagnosis with explanation, " +
    "4) Recommended diagnostic steps, 5) Treatment approach. Never guess — if information is insufficient, say so.",
};

const SYSTEM_CHAT = {
  role: "system",
  content:
    "You are a helpful medical tutor for students using MedSim — a clinical simulation platform. " +
    "You help students understand surgical conditions, interpret symptoms, analyze diagnostic images conceptually, " +
    "and improve their clinical reasoning. Answer in the student's language. Be encouraging but accurate. " +
    "If you're unsure, say so. Never fabricate patient data or give definitive diagnoses without sufficient information. " +
    "Focus on teaching the reasoning process, not just giving answers. Keep answers concise.",
};

const SYSTEM_DIAGNOSE = {
  role: "system",
  content:
    "You are an expert diagnostician AI for MedSim. A student submits symptoms and test results. " +
    "Your job: perform a structured differential diagnosis. " +
    "1) List the key findings from the provided information. " +
    "2) Generate 3-5 possible diagnoses ranked by likelihood. " +
    "3) For each: explain why it fits and why it might not fit. " +
    "4) Recommend what additional tests would help narrow the diagnosis. " +
    "5) State the most likely diagnosis with confidence level. " +
    "Be specific, use medical terminology appropriately, and explain your reasoning step by step. " +
    "Answer in the student's language.",
};

export const aiModule = new Elysia({ prefix: "/api/ai" })
  .use(requireAuth)
  // Chat with AI (streaming)
  .post(
    "/chat/stream",
    async ({ body }) => {
      const key = getKey();
      if (!key) return new Response("OPENROUTER_API_KEY not configured", { status: 500 });

      const messages = [SYSTEM_CHAT, ...body.messages] as ChatMessage[];

      const models = [MODEL, FALLBACK_MODEL].filter(
        (m, i, arr) => m && arr.indexOf(m) === i
      );
      let lastError: Error | undefined;

      for (const model of models) {
        try {
          const res = await callOpenRouter(messages, model, {
            maxTokens: MAX_TOKENS_CHAT,
            stream: true,
          });

          if (!res.ok) {
            const err = await res.text().catch(() => "Unknown");
            throw new Error(`OpenRouter error ${res.status}: ${err}`);
          }

          if (!res.body) {
            throw new Error("No response body");
          }

          return new Response(res.body, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      }

      return new Response(lastError?.message ?? "AI request failed", { status: 502 });
    },
    {
      body: t.Object({
        messages: t.Array(
          t.Object({ role: t.String(), content: t.String() })
        ),
      }),
    }
  )
  // Chat with AI (non-streaming fallback)
  .post(
    "/chat",
    async ({ body }) => {
      const messages = [SYSTEM_CHAT, ...body.messages] as ChatMessage[];
      const reply = await openaiChat(messages, { maxTokens: MAX_TOKENS_CHAT });
      return { reply };
    },
    {
      body: t.Object({
        messages: t.Array(
          t.Object({
            role: t.String(),
            content: t.String(),
          })
        ),
      }),
    }
  )
  // Analyze error in an attempt
  .post(
    "/analyze-error",
    async ({ body }) => {
      const attempt = await prisma.attempt.findUnique({
        where: { id: body.attemptId },
        include: {
          exercise: {
            include: {
              exerciseSymptoms: { include: { symptom: true } },
              exerciseDiagnoses: {
                include: { diagnosis: true },
                where: { isCorrect: true },
              },
            },
          },
          answers: true,
        },
      });

      if (!attempt) throw new NotFoundError("Attempt");

      const symptoms = attempt.exercise.exerciseSymptoms
        .map(
          (es) =>
            `- ${es.symptom.nameEn}: ${es.symptom.descriptionEn} (severity: ${es.symptom.severity}/10, zone: ${es.symptom.bodyZone})`
        )
        .join("\n");

      const correctDiagnosis = attempt.exercise.exerciseDiagnoses[0]?.diagnosis;
      const studentAnswers = attempt.answers.map((a) => a.diagnosisId).join(", ");

      const prompt = `The student attempted to diagnose this clinical case and got it wrong. Here's the case:

SYMPTOMS:
${symptoms}

CORRECT DIAGNOSIS: ${correctDiagnosis?.nameEn || "Unknown"}
${correctDiagnosis?.descriptionEn || ""}

STUDENT'S ANSWER(S): ${studentAnswers || "No answer submitted"}

STUDENT'S SCORE: ${attempt.score}%

Please analyze:
1. What key symptoms did the student likely miss or misinterpret?
2. Why is the correct diagnosis the right one based on these symptoms?
3. What clinical reasoning process should lead to the correct diagnosis?
4. What are the typical diagnostic pitfalls for this condition?
5. How can the student improve their diagnostic approach?

Be educational and encouraging. The student is learning.`;

      const reply = await openaiChat([
        SYSTEM_MED as ChatMessage,
        { role: "user", content: prompt },
      ], { maxTokens: MAX_TOKENS_ANALYSIS });

      return { reply };
    },
    {
      body: t.Object({ attemptId: t.String() }),
    }
  )
  // AI Diagnosis from user input
  .post(
    "/diagnose",
    async ({ body }) => {
      const prompt = `A medical student is asking for help with a diagnosis. Here's what they provided:

SYMPTOMS:
${body.symptoms || "Not provided"}

ADDITIONAL NOTES / FINDINGS:
${body.notes || "Not provided"}

Please perform a structured differential diagnosis.`;

      const reply = await openaiChat([
        SYSTEM_DIAGNOSE as ChatMessage,
        { role: "user", content: prompt },
      ], { maxTokens: MAX_TOKENS_ANALYSIS });

      return { reply };
    },
    {
      body: t.Object({
        symptoms: t.Optional(t.String()),
        notes: t.Optional(t.String()),
      }),
    }
  )
  // Conversation history
  .get("/conversations", async ({ currentUser }) => {
    const convos = await prisma.aiConversation.findMany({
      where: { userId: currentUser!.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true, createdAt: true },
    });
    return { conversations: convos };
  })
  .get("/conversations/:id", async ({ params }) => {
    const convo = await prisma.aiConversation.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, messages: true },
    });
    if (!convo) throw new NotFoundError("Conversation");
    return convo;
  })
  .post("/conversations", async ({ currentUser, body }) => {
    const convo = await prisma.aiConversation.create({
      data: {
        userId: currentUser!.id,
        title: (body as { title?: string }).title || "New Chat",
        messages: ((body as { messages?: unknown }).messages as any) || [],
      },
    });
    return { id: convo.id };
  })
  .put("/conversations/:id", async ({ params, body }) => {
    const b = body as { title?: string; messages?: unknown };
    await prisma.aiConversation.update({
      where: { id: params.id },
      data: {
        title: b.title,
        messages: b.messages as any,
      },
    });
    return { ok: true };
  })
  .delete("/conversations/:id", async ({ params }) => {
    await prisma.aiConversation.delete({ where: { id: params.id } });
    return { ok: true };
  })
  // Diagnosis history
  .get("/diagnoses", async ({ currentUser }) => {
    const list = await prisma.aiDiagnosis.findMany({
      where: { userId: currentUser!.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return { diagnoses: list };
  })
  .post("/diagnoses", async ({ currentUser, body }) => {
    const b = body as { symptoms?: string; notes?: string; result?: string };
    await prisma.aiDiagnosis.create({
      data: {
        userId: currentUser!.id,
        symptoms: b.symptoms || "",
        notes: b.notes || "",
        result: b.result || "",
      },
    });
    return { ok: true };
  });
