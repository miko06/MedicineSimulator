import "dotenv/config";
import fs from "fs";

const INPUT = process.argv[2] || "/tmp/diagnoses.json";
const OUTPUT = process.argv[3] || "/tmp/diagnoses-kz.json";
const KEY = process.env.MEDSIM_OPENROUTER_KEY;

if (!KEY) {
  console.error("MEDSIM_OPENROUTER_KEY not set");
  process.exit(1);
}

const MODEL = "openai/gpt-4o-mini";

interface DiagnosisData {
  slug: string;
  nameRu: string;
  nameEn: string;
  descriptionRu: string;
  descriptionEn: string;
  symptoms: Array<{
    nameRu: string;
    nameEn: string;
    descriptionRu: string;
    descriptionEn: string;
  }>;
  correctDiagnosis: {
    nameRu: string;
    nameEn: string;
    descriptionRu: string;
    descriptionEn: string;
    treatmentsRu: string[];
    treatmentsEn: string[];
  };
  wrongDiagnoses: Array<{
    nameRu: string;
    nameEn: string;
    descriptionRu: string;
    descriptionEn: string;
  }>;
  patientVoice: { text: string; voiceId: string };
}

async function translate(item: DiagnosisData): Promise<DiagnosisData> {
  const prompt = `Ты медицинский переводчик. Переведи ВСЕ русскоязычные строки в следующем JSON с хирургическими клиническими кейсами на казахский язык (қазақша). Сохрани структуру JSON и все остальные поля без изменений.

Добавь поля:
- nameKz (рядом с nameRu/nameEn)
- descriptionKz (рядом с descriptionRu/descriptionEn)
- treatmentsKz (рядом с treatmentsRu/treatmentsEn)
- patientVoice.textKz (рядом с text)

Не добавляй пояснений, только валидный JSON.

Вход:
${JSON.stringify(item, null, 2)}`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
      "HTTP-Referer": "https://medsim.io",
      "X-Title": "MedSim Seed Translator",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a medical Kazakh translator. Translate Russian medical text into Kazakh accurately, using professional medical terminology. Always return only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices[0]?.message?.content?.trim() || "";
  const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(cleaned) as DiagnosisData;
  } catch (e) {
    console.error("Failed to parse translation output:", cleaned.slice(0, 500));
    throw e;
  }
}

async function main() {
  const input: DiagnosisData[] = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  const output: DiagnosisData[] = [];

  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    console.log(`Translating ${i + 1}/${input.length}: ${item.slug}`);
    try {
      const translated = await translate(item);
      output.push(translated);
      fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
    } catch (e) {
      console.error(`Failed at ${item.slug}:`, e);
      process.exit(1);
    }
  }

  console.log(`Done. Saved to ${OUTPUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
