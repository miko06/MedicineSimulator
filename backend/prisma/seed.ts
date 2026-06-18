import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const SURGERY_IMAGES_BASE = "/images/surgery";

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
  nameEn: string;
  descriptionRu: string;
  descriptionEn: string;
  symptoms: Array<{
    nameRu: string;
    nameEn: string;
    bodyZone: string;
    severity: number;
    color: string;
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
  robotZones: Array<{ zone: string; color: string; intensity: number }>;
  imageFolder: string;
  patientVoice: { text: string; voiceId: string };
}

const DIAGNOSES: DiagnosisData[] = [
  {
    slug: "appendicitis",
    nameRu: "Острый аппендицит",
    nameEn: "Acute Appendicitis",
    descriptionRu:
      "Пациент 25 лет жалуется на сильную боль в животе. Боль началась в верхней части живота, через несколько часов переместилась в правую нижнюю часть. Боль усиливается при ходьбе, кашле, движении. Пациент старается лежать неподвижно.",
    descriptionEn:
      "A 25-year-old patient complains of severe abdominal pain. Pain started in the upper abdomen and migrated to the right lower quadrant after several hours. Pain worsens with walking, coughing, and movement. The patient tries to lie still.",
    symptoms: [
      {
        nameRu: "Острая боль в правой подвздошной области",
        nameEn: "Sharp pain in right iliac region",
        bodyZone: "ABDOMEN",
        severity: 8,
        color: "#EF4444",
        descriptionRu:
          "Постоянная, постепенно усиливающаяся боль. Усиливается при резком отпускании руки (симптом Щеткина-Блюмберга).",
        descriptionEn:
          "Constant, gradually increasing pain. Worsens on rebound (Blumberg sign).",
      },
      {
        nameRu: "Тошнота и рвота",
        nameEn: "Nausea and vomiting",
        bodyZone: "ABDOMEN",
        severity: 5,
        color: "#F97316",
        descriptionRu: "1-2 эпизода рвоты, снижение аппетита.",
        descriptionEn: "1-2 episodes of vomiting, loss of appetite.",
      },
      {
        nameRu: "Повышенная температура",
        nameEn: "Fever",
        bodyZone: "FULL_BODY",
        severity: 6,
        color: "#F97316",
        descriptionRu: "Температура 37.5-39°C, слабость, учащённый пульс.",
        descriptionEn: "Temperature 37.5-39°C, weakness, rapid pulse.",
      },
      {
        nameRu: "Напряжение мышц живота",
        nameEn: "Abdominal muscle tension",
        bodyZone: "ABDOMEN",
        severity: 7,
        color: "#EF4444",
        descriptionRu: "Напряжение мышц справа, болезненность при пальпации.",
        descriptionEn: "Right-sided muscle tension, tenderness on palpation.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Острый аппендицит",
      nameEn: "Acute Appendicitis",
      descriptionRu:
        "Воспаление червеобразного отростка, требующее срочного хирургического вмешательства.",
      descriptionEn:
        "Inflammation of the appendix requiring urgent surgical intervention.",
      treatmentsRu: ["Аппендэктомия", "Антибиотикотерапия", "Внутривенная инфузия"],
      treatmentsEn: ["Appendectomy", "Antibiotic therapy", "IV fluids"],
    },
    wrongDiagnoses: [
      {
        nameRu: "Гастроэнтерит",
        nameEn: "Gastroenteritis",
        descriptionRu:
          "Воспаление желудка и кишечника, обычно самокупирующееся.",
        descriptionEn:
          "Inflammation of stomach and intestines, usually self-limiting.",
      },
      {
        nameRu: "Почечная колика",
        nameEn: "Renal Colic",
        descriptionRu:
          "Острая боль в пояснице, иррадиирующая в пах, вызванная камнем в мочеточнике.",
        descriptionEn:
          "Sharp flank pain radiating to groin, caused by ureteral stone.",
      },
    ],
    robotZones: [
      { zone: "ABDOMEN", color: "#EF4444", intensity: 0.8 },
    ],
    imageFolder: "Острый аппендицит",
    patientVoice: {
      text: "Доктор, у меня сильно заболел живот. Сначала боль была где-то возле пупка, я думал, что просто что-то не то съел. Но через несколько часов боль переместилась вниз, справа. Сейчас там очень сильно болит, особенно когда я двигаюсь или пытаюсь идти. Меня тошнит, есть совсем не хочется. Один раз меня вырвало. Кажется, у меня поднялась температура, меня знобит. Когда лежу спокойно — немного легче, но если повернуться или нажать на живот — становится намного больнее.",
      voiceId: "JBFqnCBsd6RMkjVDRZzb",
    },
  },
  {
    slug: "cholecystitis",
    nameRu: "Острый холецистит",
    nameEn: "Acute Cholecystitis",
    descriptionRu:
      "Пациент жалуется на боль справа под рёбрами. Боль появилась после приёма жирной пищи. Тошнота, тяжесть. Боль может отдавать в правое плечо и под правую лопатку.",
    descriptionEn:
      "Patient complains of pain under the right ribs. Pain appeared after eating fatty food. Nausea, heaviness. Pain may radiate to the right shoulder and under the right shoulder blade.",
    symptoms: [
      {
        nameRu: "Боль в правом подреберье",
        nameEn: "Pain in right hypochondrium",
        bodyZone: "CHEST",
        severity: 7,
        color: "#EF4444",
        descriptionRu:
          "Постоянная боль, усиливающаяся при вдохе во время пальпации (симптом Мёрфи).",
        descriptionEn:
          "Constant pain, worsening on inspiration during palpation (Murphy sign).",
      },
      {
        nameRu: "Тошнота и рвота желчью",
        nameEn: "Nausea and bilious vomiting",
        bodyZone: "ABDOMEN",
        severity: 5,
        color: "#F97316",
        descriptionRu: "Горечь во рту, вздутие живота.",
        descriptionEn: "Bitter taste in mouth, bloating.",
      },
      {
        nameRu: "Повышенная температура с ознобом",
        nameEn: "Fever with chills",
        bodyZone: "FULL_BODY",
        severity: 6,
        color: "#F97316",
        descriptionRu: "Температура 38°C+, озноб, слабость.",
        descriptionEn: "Temperature 38°C+, chills, weakness.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Острый холецистит",
      nameEn: "Acute Cholecystitis",
      descriptionRu:
        "Воспаление желчного пузыря, часто вызванное обструкцией камнем.",
      descriptionEn:
        "Inflammation of the gallbladder, often caused by stone obstruction.",
      treatmentsRu: ["Холецистэктомия", "Антибиотики", "Голодная диета"],
      treatmentsEn: ["Cholecystectomy", "Antibiotics", "NPO"],
    },
    wrongDiagnoses: [
      {
        nameRu: "Язвенная болезнь",
        nameEn: "Peptic Ulcer",
        descriptionRu:
          "Дефект слизистой желудка или двенадцатиперстной кишки, вызывающий боль в эпигастрии.",
        descriptionEn:
          "Defect in stomach or duodenal mucosa causing epigastric pain.",
      },
      {
        nameRu: "Панкреатит",
        nameEn: "Pancreatitis",
        descriptionRu:
          "Воспаление поджелудочной железы с опоясывающей болью.",
        descriptionEn:
          "Inflammation of the pancreas with girdle pain.",
      },
    ],
    robotZones: [
      { zone: "CHEST", color: "#EF4444", intensity: 0.7 },
    ],
    imageFolder: "Острый холецистит",
    patientVoice: {
      text: "Доктор, у меня уже несколько часов сильно болит справа под рёбрами. Началось после того, как я поел жирную пищу. Боль постоянная, иногда отдаёт прямо в правое плечо и под лопатку. Меня тошнит, была рвота, но легче после неё не стало. Во рту какой-то горький вкус. Температура поднялась, чувствую слабость. Когда делаю глубокий вдох, боль становится сильнее.",
      voiceId: "JBFqnCBsd6RMkjVDRZzb",
    },
  },
  {
    slug: "pancreatitis",
    nameRu: "Острый панкреатит",
    nameEn: "Acute Pancreatitis",
    descriptionRu:
      "Пациент жалуется на очень сильную боль в животе, отдающую в спину. Боль опоясывающая, постоянная. Пациент сидит наклонившись вперёд — так легче. Многократная рвота без облегчения.",
    descriptionEn:
      "Patient complains of very severe abdominal pain radiating to the back. Girdle-like, constant pain. Patient sits leaning forward — it's easier that way. Repeated vomiting without relief.",
    symptoms: [
      {
        nameRu: "Сильная опоясывающая боль",
        nameEn: "Severe girdle pain",
        bodyZone: "ABDOMEN",
        severity: 9,
        color: "#DC2626",
        descriptionRu:
          "Постоянная боль в верхней части живота, отдающая в спину.",
        descriptionEn:
          "Constant pain in upper abdomen, radiating to the back.",
      },
      {
        nameRu: "Многократная рвота",
        nameEn: "Repeated vomiting",
        bodyZone: "ABDOMEN",
        severity: 7,
        color: "#EF4444",
        descriptionRu: "Рвота без облегчения, вздутие живота.",
        descriptionEn: "Vomiting without relief, bloating.",
      },
      {
        nameRu: "Тахикардия и слабость",
        nameEn: "Tachycardia and weakness",
        bodyZone: "FULL_BODY",
        severity: 7,
        color: "#F97316",
        descriptionRu:
          "Учащённый пульс, возможное падение давления.",
        descriptionEn: "Rapid pulse, possible blood pressure drop.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Острый панкреатит",
      nameEn: "Acute Pancreatitis",
      descriptionRu:
        "Воспаление поджелудочной железы с активацией ферментов внутри органа.",
      descriptionEn:
        "Inflammation of the pancreas with enzyme activation within the organ.",
      treatmentsRu: [
        "Голод, холод, покой",
        "Инфузионная терапия",
        "Спазмолитики и анальгетики",
      ],
      treatmentsEn: ["NPO, rest", "IV fluid therapy", "Antispasmodics and analgesics"],
    },
    wrongDiagnoses: [
      {
        nameRu: "Холецистит",
        nameEn: "Cholecystitis",
        descriptionRu:
          "Воспаление желчного пузыря с болью в правом подреберье.",
        descriptionEn:
          "Gallbladder inflammation with right hypochondrium pain.",
      },
      {
        nameRu: "Перфорация язвы",
        nameEn: "Perforated Ulcer",
        descriptionRu:
          "Прорыв стенки желудка с кинжальной болью.",
        descriptionEn:
          "Stomach wall rupture with stabbing pain.",
      },
    ],
    robotZones: [
      { zone: "ABDOMEN", color: "#DC2626", intensity: 0.9 },
    ],
    imageFolder: "Острый панкреатит",
    patientVoice: {
      text: "Доктор, у меня очень сильная боль в верхней части живота. Такое ощущение, будто боль идёт насквозь и отдаёт в спину. Она постоянная, не проходит. Меня несколько раз вырвало, но после этого легче не стало. Живот вздулся. Мне тяжело лежать, немного легче становится, когда я сижу и наклоняюсь вперёд. Вчера был праздник, я выпил алкоголь и хорошо поел.",
      voiceId: "JBFqnCBsd6RMkjVDRZzb",
    },
  },
  {
    slug: "perforated-ulcer",
    nameRu: "Перфорация язвы желудка",
    nameEn: "Perforated Gastric Ulcer",
    descriptionRu:
      'Пациент жалуется на внезапно появившуюся ужасную боль — «как удар ножом». Живот стал твёрдым, мышцы напряжены. Холодный пот, слабость, падение давления.',
    descriptionEn:
      'Patient complains of sudden severe pain — "like a knife stab". Abdomen became hard, muscles tense. Cold sweat, weakness, blood pressure drop.',
    symptoms: [
      {
        nameRu: "Кинжальная боль в животе",
        nameEn: "Stabbing abdominal pain",
        bodyZone: "ABDOMEN",
        severity: 10,
        color: "#DC2626",
        descriptionRu:
          "Внезапная, очень сильная боль. Доскообразный живот.",
        descriptionEn:
          "Sudden, very severe pain. Board-like abdomen.",
      },
      {
        nameRu: "Холодный пот и слабость",
        nameEn: "Cold sweat and weakness",
        bodyZone: "FULL_BODY",
        severity: 8,
        color: "#EF4444",
        descriptionRu:
          "Падение давления, признаки интоксикации.",
        descriptionEn:
          "Blood pressure drop, signs of intoxication.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Перфорация язвы желудка",
      nameEn: "Perforated Gastric Ulcer",
      descriptionRu:
        "Прорыв стенки желудка или двенадцатиперстной кишки с выходом содержимого в брюшную полость.",
      descriptionEn:
        "Rupture of stomach or duodenal wall with content leakage into abdominal cavity.",
      treatmentsRu: [
        "Экстренная операция",
        "Антибиотики широкого спектра",
        "Интенсивная терапия",
      ],
      treatmentsEn: ["Emergency surgery", "Broad-spectrum antibiotics", "ICU care"],
    },
    wrongDiagnoses: [
      {
        nameRu: "Острый панкреатит",
        nameEn: "Acute Pancreatitis",
        descriptionRu:
          "Воспаление поджелудочной железы с опоясывающей болью в верхней части живота.",
        descriptionEn:
          "Pancreatic inflammation with upper abdominal girdle pain.",
      },
    ],
    robotZones: [
      { zone: "ABDOMEN", color: "#DC2626", intensity: 0.95 },
    ],
    imageFolder: "Перфорация язвы желудка",
    patientVoice: {
      text: "Доктор, это произошло внезапно. Я просто почувствовал очень резкую боль в животе, как будто меня ударили ножом. Никогда раньше такого не было. Сейчас живот очень твёрдый, мне больно даже немного двигаться. Я стараюсь лежать неподвижно. Меня бросает в холодный пот, появилась слабость. Сначала боль была сильнее сверху живота, а сейчас болит практически всё.",
      voiceId: "JBFqnCBsd6RMkjVDRZzb",
    },
  },
  {
    slug: "intestinal-obstruction",
    nameRu: "Кишечная непроходимость",
    nameEn: "Intestinal Obstruction",
    descriptionRu:
      "Пациент жалуется на вздутие живота и невозможность сходить в туалет. Боль схваткообразная, приступами. Отсутствие стула и газов. Сильное вздутие.",
    descriptionEn:
      "Patient complains of bloating and inability to use the toilet. Cramping pain in attacks. No stool or gas passage. Severe distension.",
    symptoms: [
      {
        nameRu: "Схваткообразная боль",
        nameEn: "Cramping pain",
        bodyZone: "ABDOMEN",
        severity: 7,
        color: "#EF4444",
        descriptionRu:
          "Периодически усиливающаяся боль, приступами.",
        descriptionEn:
          "Periodically worsening pain, in attacks.",
      },
      {
        nameRu: "Вздутие живота",
        nameEn: "Abdominal distension",
        bodyZone: "ABDOMEN",
        severity: 8,
        color: "#F97316",
        descriptionRu:
          "Увеличенный живот, отсутствие стула и газов.",
        descriptionEn:
          "Enlarged abdomen, no stool or gas passage.",
      },
      {
        nameRu: "Рвота",
        nameEn: "Vomiting",
        bodyZone: "ABDOMEN",
        severity: 6,
        color: "#F97316",
        descriptionRu:
          "При высокой непроходимости — ранняя рвота, при низкой — поздняя с неприятным запахом.",
        descriptionEn:
          "Early vomiting in high obstruction, late foul-smelling in low obstruction.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Кишечная непроходимость",
      nameEn: "Intestinal Obstruction",
      descriptionRu:
        "Прекращение пассажа кишечного содержимого из-за механического препятствия или нарушения моторики.",
      descriptionEn:
        "Cessation of intestinal content passage due to mechanical obstruction or motility disorder.",
      treatmentsRu: [
        "Назогастральный зонд",
        "Инфузионная терапия",
        "Хирургическое вмешательство",
      ],
      treatmentsEn: ["Nasogastric tube", "IV fluids", "Surgical intervention"],
    },
    wrongDiagnoses: [
      {
        nameRu: "Перитонит",
        nameEn: "Peritonitis",
        descriptionRu:
          "Воспаление брюшины с постоянной разлитой болью по всему животу.",
        descriptionEn:
          "Peritoneal inflammation with constant diffuse abdominal pain.",
      },
    ],
    robotZones: [
      { zone: "ABDOMEN", color: "#F97316", intensity: 0.8 },
    ],
    imageFolder: "Кишечная непроходимость",
    patientVoice: {
      text: "Доктор, у меня уже второй день сильно раздулся живот. Он стал большим и твёрдым. У меня схватками появляется сильная боль — отпускает и снова начинается. Я не могу сходить в туалет и газы тоже не отходят. Меня несколько раз вырвало. Сначала обычным содержимым, потом стало хуже. Чувствую слабость, во рту сухо.",
      voiceId: "JBFqnCBsd6RMkjVDRZzb",
    },
  },
  {
    slug: "peritonitis",
    nameRu: "Перитонит",
    nameEn: "Peritonitis",
    descriptionRu:
      "Пациент жалуется на боль во всём животе. Любое движение усиливает боль. Живот напряжённый, пациент избегает движения. Температура, слабость, учащённое сердцебиение.",
    descriptionEn:
      "Patient complains of whole-abdomen pain. Any movement worsens the pain. Tense abdomen, patient avoids movement. Fever, weakness, rapid heartbeat.",
    symptoms: [
      {
        nameRu: "Разлитая боль по всему животу",
        nameEn: "Diffuse abdominal pain",
        bodyZone: "ABDOMEN",
        severity: 9,
        color: "#DC2626",
        descriptionRu:
          "Постоянная, распространяется по всему животу. Движение усиливает боль.",
        descriptionEn:
          "Constant, spreads throughout abdomen. Movement worsens pain.",
      },
      {
        nameRu: "Напряжение мышц живота",
        nameEn: "Abdominal muscle rigidity",
        bodyZone: "ABDOMEN",
        severity: 8,
        color: "#EF4444",
        descriptionRu:
          "Доскообразный живот, пациент избегает движений.",
        descriptionEn:
          "Board-like abdomen, patient avoids movement.",
      },
      {
        nameRu: "Признаки интоксикации",
        nameEn: "Signs of intoxication",
        bodyZone: "FULL_BODY",
        severity: 8,
        color: "#DC2626",
        descriptionRu:
          "Температура, слабость, тахикардия, падение давления.",
        descriptionEn:
          "Fever, weakness, tachycardia, blood pressure drop.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Перитонит",
      nameEn: "Peritonitis",
      descriptionRu:
        "Воспаление брюшины — серьёзное хирургическое заболевание, угрожающее жизни.",
      descriptionEn:
        "Inflammation of the peritoneum — a serious life-threatening surgical condition.",
      treatmentsRu: [
        "Экстренное хирургическое вмешательство",
        "Массивная антибиотикотерапия",
        "Интенсивная терапия",
      ],
      treatmentsEn: ["Emergency surgery", "Massive antibiotic therapy", "ICU care"],
    },
    wrongDiagnoses: [
      {
        nameRu: "Кишечная непроходимость",
        nameEn: "Intestinal Obstruction",
        descriptionRu:
          "Прекращение пассажа кишечного содержимого со схваткообразной болью.",
        descriptionEn:
          "Cessation of intestinal passage with cramping pain.",
      },
    ],
    robotZones: [
      { zone: "ABDOMEN", color: "#DC2626", intensity: 0.9 },
    ],
    imageFolder: "Перитонит",
    patientVoice: {
      text: "Доктор, у меня очень сильно болит весь живот. Боль постоянная, она никуда не уходит. Даже когда я двигаюсь или пытаюсь повернуться — становится намного хуже. Я почти не могу ходить, хочется просто лежать неподвижно. Меня знобит, слабость сильная. Живот будто напряжённый и твёрдый.",
      voiceId: "JBFqnCBsd6RMkjVDRZzb",
    },
  },
  {
    slug: "inguinal-hernia",
    nameRu: "Паховая грыжа",
    nameEn: "Inguinal Hernia",
    descriptionRu:
      "Пациент жалуется на появившуюся шишку в паху. Выпячивание увеличивается при кашле, поднятии тяжести, натуживании. Тянущая боль, усиливающаяся к вечеру.",
    descriptionEn:
      "Patient complains of a lump in the groin. Protrusion increases with coughing, lifting, straining. Pulling pain, worsening in the evening.",
    symptoms: [
      {
        nameRu: "Выпячивание в паховой области",
        nameEn: "Protrusion in inguinal area",
        bodyZone: "PELVIS",
        severity: 5,
        color: "#F97316",
        descriptionRu:
          "Выпуклость кожи, увеличивающаяся при кашле и натуживании.",
        descriptionEn:
          "Skin bulge that increases with coughing and straining.",
      },
      {
        nameRu: "Тянущая боль в паху",
        nameEn: "Pulling pain in groin",
        bodyZone: "PELVIS",
        severity: 4,
        color: "#F97316",
        descriptionRu:
          "Усиливается к вечеру, чувство давления при ходьбе.",
        descriptionEn:
          "Worsens in the evening, pressure sensation when walking.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Паховая грыжа",
      nameEn: "Inguinal Hernia",
      descriptionRu:
        "Выпячивание содержимого брюшной полости через паховый канал.",
      descriptionEn:
        "Protrusion of abdominal contents through the inguinal canal.",
      treatmentsRu: [
        "Герниопластика (пластика грыжевых ворот)",
        "Ношение бандажа",
        "Ограничение физических нагрузок",
      ],
      treatmentsEn: ["Hernioplasty", "Support belt", "Physical activity restriction"],
    },
    wrongDiagnoses: [
      {
        nameRu: "Ущемлённая грыжа",
        nameEn: "Strangulated Hernia",
        descriptionRu:
          "Осложнение грыжи с острой болью и невправимостью.",
        descriptionEn:
          "Hernia complication with acute pain and irreducibility.",
      },
    ],
    robotZones: [
      { zone: "PELVIS", color: "#F97316", intensity: 0.5 },
    ],
    imageFolder: "Паховая грыжа",
    patientVoice: {
      text: "Доктор, я заметил у себя странную шишку в паху. Она появляется, когда я долго стою или поднимаю что-то тяжёлое. Когда ложусь — становится меньше или исчезает. Иногда чувствую давление и неприятные ощущения, особенно после нагрузки. Сильной боли обычно нет, но это место меня беспокоит.",
      voiceId: "JBFqnCBsd6RMkjVDRZzb",
    },
  },
  {
    slug: "strangulated-hernia",
    nameRu: "Ущемлённая грыжа",
    nameEn: "Strangulated Hernia",
    descriptionRu:
      "Пациент жалуется, что грыжа внезапно сильно заболела. Грыжа увеличена, плотная, не вправляется. Тошнота, рвота, отсутствие стула, вздутие живота.",
    descriptionEn:
      "Patient complains that the hernia suddenly became very painful. Hernia is enlarged, firm, irreducible. Nausea, vomiting, no stool, abdominal distension.",
    symptoms: [
      {
        nameRu: "Острая боль в области грыжи",
        nameEn: "Acute pain in hernia area",
        bodyZone: "PELVIS",
        severity: 9,
        color: "#DC2626",
        descriptionRu:
          "Внезапная, резкая, постоянная боль. Грыжа плотная, не вправляется.",
        descriptionEn:
          "Sudden, sharp, constant pain. Hernia is firm and irreducible.",
      },
      {
        nameRu: "Тошнота и рвота",
        nameEn: "Nausea and vomiting",
        bodyZone: "ABDOMEN",
        severity: 6,
        color: "#EF4444",
        descriptionRu:
          "Отсутствие стула, вздутие живота — признаки непроходимости.",
        descriptionEn:
          "No stool, abdominal distension — signs of obstruction.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Ущемлённая грыжа",
      nameEn: "Strangulated Hernia",
      descriptionRu:
        "Сдавление грыжевого содержимого в грыжевых воротах с нарушением кровоснабжения.",
      descriptionEn:
        "Compression of hernia contents in the hernia orifice with blood supply impairment.",
      treatmentsRu: [
        "Экстренная герниопластика",
        "Резекция некротизированного участка",
        "Антибиотикотерапия",
      ],
      treatmentsEn: ["Emergency hernioplasty", "Necrotic segment resection", "Antibiotics"],
    },
    wrongDiagnoses: [
      {
        nameRu: "Паховая грыжа (неосложнённая)",
        nameEn: "Uncomplicated Inguinal Hernia",
        descriptionRu:
          "Выпячивание в паху без острой боли и признаков ущемления.",
        descriptionEn:
          "Groin protrusion without acute pain or strangulation signs.",
      },
    ],
    robotZones: [
      { zone: "PELVIS", color: "#DC2626", intensity: 0.9 },
    ],
    imageFolder: "Ущемлённая грыжа",
    patientVoice: {
      text: "Доктор, у меня давно была шишка в паху, но сегодня внезапно появилась сильная боль. Сейчас она стала намного больше и очень болит. Раньше я мог её аккуратно вправить, а сейчас она не убирается. Меня тошнит, несколько раз вырвало. Живот начал вздуваться. Боль становится всё сильнее.",
      voiceId: "JBFqnCBsd6RMkjVDRZzb",
    },
  },
  {
    slug: "varicose-veins",
    nameRu: "Варикозное расширение вен",
    nameEn: "Varicose Veins",
    descriptionRu:
      "Пациент жалуется на тяжесть в ногах, боль к вечеру. Видны расширенные синие вены, сосудистые узлы. Жжение, зуд, ночные судороги.",
    descriptionEn:
      "Patient complains of leg heaviness, pain in the evening. Visible dilated blue veins, vascular nodes. Burning, itching, night cramps.",
    symptoms: [
      {
        nameRu: "Расширенные вены на ногах",
        nameEn: "Dilated leg veins",
        bodyZone: "LEFT_LEG",
        severity: 6,
        color: "#6366F1",
        descriptionRu:
          "Синие сосудистые узлы, изменение кожи.",
        descriptionEn:
          "Blue vascular nodes, skin changes.",
      },
      {
        nameRu: "Тяжесть и боль в ногах",
        nameEn: "Heaviness and pain in legs",
        bodyZone: "LEFT_LEG",
        severity: 5,
        color: "#6366F1",
        descriptionRu:
          "Жжение, зуд, судороги ночью, отёки голени.",
        descriptionEn:
          "Burning, itching, night cramps, calf swelling.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Варикозное расширение вен",
      nameEn: "Varicose Veins",
      descriptionRu:
        "Расширение поверхностных вен нижних конечностей с нарушением функции клапанов.",
      descriptionEn:
        "Dilation of superficial leg veins with valve dysfunction.",
      treatmentsRu: [
        "Флебэктомия или лазерная коагуляция",
        "Компрессионный трикотаж",
        "Венотоники",
      ],
      treatmentsEn: ["Phlebectomy or laser ablation", "Compression stockings", "Venotonics"],
    },
    wrongDiagnoses: [
      {
        nameRu: "Тромбоз глубоких вен",
        nameEn: "Deep Vein Thrombosis",
        descriptionRu:
          "Острый тромбоз с резким отёком одной ноги, болью в икре, покраснением.",
        descriptionEn:
          "Acute thrombosis with sudden single-leg swelling, calf pain, redness.",
      },
    ],
    robotZones: [
      { zone: "LEFT_LEG", color: "#6366F1", intensity: 0.6 },
    ],
    imageFolder: "Варикозное расширение вен",
    patientVoice: {
      text: "Доктор, у меня давно проблемы с венами на ногах. К вечеру ноги становятся тяжёлыми, появляются неприятные ощущения и отёки. Иногда чувствую жжение и судороги ночью. Когда долго стою — становится хуже, а если полежу и подниму ноги — становится легче. Вены стали сильно заметны под кожей.",
      voiceId: "JBFqnCBsd6RMkjVDRZzb",
    },
  },
  {
    slug: "dvt",
    nameRu: "Тромбоз глубоких вен",
    nameEn: "Deep Vein Thrombosis",
    descriptionRu:
      "Пациент жалуется на резко опухшую одну ногу. Боль в икре, усиливается при ходьбе. Кожа красная, горячая. Иногда температура, слабость.",
    descriptionEn:
      "Patient complains of a suddenly swollen single leg. Calf pain, worsens with walking. Red, hot skin. Sometimes fever, weakness.",
    symptoms: [
      {
        nameRu: "Отёк одной ноги",
        nameEn: "Single leg swelling",
        bodyZone: "LEFT_LEG",
        severity: 8,
        color: "#DC2626",
        descriptionRu:
          "Увеличение объёма голени, обычно только одна конечность.",
        descriptionEn:
          "Increased calf volume, usually only one limb.",
      },
      {
        nameRu: "Боль в икре",
        nameEn: "Calf pain",
        bodyZone: "LEFT_LEG",
        severity: 7,
        color: "#EF4444",
        descriptionRu:
          "Усиливается при ходьбе, кожа красная и горячая на ощупь.",
        descriptionEn:
          "Worsens with walking, skin is red and hot to touch.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Тромбоз глубоких вен",
      nameEn: "Deep Vein Thrombosis",
      descriptionRu:
        "Образование тромба в глубоких венах нижних конечностей. Опасность тромбоэмболии лёгочной артерии.",
      descriptionEn:
        "Blood clot formation in deep leg veins. Risk of pulmonary embolism.",
      treatmentsRu: [
        "Антикоагулянтная терапия",
        "Компрессионный трикотаж",
        "Постельный режим с возвышенным положением ноги",
      ],
      treatmentsEn: ["Anticoagulant therapy", "Compression stockings", "Bed rest with leg elevation"],
    },
    wrongDiagnoses: [
      {
        nameRu: "Варикозное расширение вен",
        nameEn: "Varicose Veins",
        descriptionRu:
          "Хроническое расширение вен с тяжестью и болью, без острого отёка.",
        descriptionEn:
          "Chronic vein dilation with heaviness and pain, without acute swelling.",
      },
    ],
    robotZones: [
      { zone: "LEFT_LEG", color: "#DC2626", intensity: 0.8 },
    ],
    imageFolder: "Тромбоз глубоких вен",
    patientVoice: {
      text: "Доктор, несколько дней назад у меня неожиданно начала опухать одна нога. Вторая нормальная. Появилась боль в икре, особенно когда хожу. Нога стала какой-то тяжёлой, кожа кажется горячее, чем на другой ноге. Я переживаю, потому что отёк не проходит.",
      voiceId: "JBFqnCBsd6RMkjVDRZzb",
    },
  },
];

async function main() {
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
      icon: "🔪",
      sortOrder: 1,
    },
  });

  // Seed 9 more specialties for future use
  const otherSpecialties = [
    { slug: "dermatology", nameEn: "Dermatology", nameRu: "Дерматология", nameKz: "Дерматология", icon: "🔬", sortOrder: 2 },
    { slug: "pediatrics", nameEn: "Pediatrics", nameRu: "Педиатрия", nameKz: "Педиатрия", icon: "👶", sortOrder: 3 },
    { slug: "traumatology", nameEn: "Traumatology", nameRu: "Травматология", nameKz: "Травматология", icon: "🦴", sortOrder: 4 },
    { slug: "cardiology", nameEn: "Cardiology", nameRu: "Кардиология", nameKz: "Кардиология", icon: "❤️", sortOrder: 5 },
    { slug: "neurology", nameEn: "Neurology", nameRu: "Неврология", nameKz: "Неврология", icon: "🧠", sortOrder: 6 },
    { slug: "ophthalmology", nameEn: "Ophthalmology", nameRu: "Офтальмология", nameKz: "Офтальмология", icon: "👁️", sortOrder: 7 },
    { slug: "ent", nameEn: "ENT", nameRu: "ЛОР", nameKz: "ЛОР", icon: "👂", sortOrder: 8 },
    { slug: "pulmonology", nameEn: "Pulmonology", nameRu: "Пульмонология", nameKz: "Пульмонология", icon: "🫁", sortOrder: 9 },
    { slug: "gastroenterology", nameEn: "Gastroenterology", nameRu: "Гастроэнтерология", nameKz: "Гастроэнтерология", icon: "🔍", sortOrder: 10 },
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
          bodyZone: s.bodyZone as any,
          severity: s.severity,
          color: s.color,
          descriptionEn: s.descriptionEn,
          descriptionRu: s.descriptionRu,
        },
      });
      symptomRecords.push(record);
    }

    // Create correct diagnosis
    const correctDiag = await prisma.diagnosis.create({
      data: {
        nameEn: d.correctDiagnosis.nameEn,
        nameRu: d.correctDiagnosis.nameRu,
        descriptionEn: d.correctDiagnosis.descriptionEn,
        descriptionRu: d.correctDiagnosis.descriptionRu,
        treatmentsEn: d.correctDiagnosis.treatmentsEn,
        treatmentsRu: d.correctDiagnosis.treatmentsRu,
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
          descriptionEn: wd.descriptionEn,
          descriptionRu: wd.descriptionRu,
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
        descriptionEn: d.descriptionEn,
        descriptionRu: d.descriptionRu,
        difficulty: "INTERMEDIATE",
        patientVoice: d.patientVoice,
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

    console.log(`  ✓ ${d.nameRu}`);
  }

  console.log(`Done! Seeded 10 specialties, ${DIAGNOSES.length} surgery exercises.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
