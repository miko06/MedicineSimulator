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
        descriptionRu: "Пациент испытывает постоянную, постепенно усиливающуюся боль в животе, которая становится более выраженной при резком отпускании руки врача, указывая на возможное воспаление брюшины (симптом Щеткина-Блюмберга), что требует тщательного клинического обследования и дифференциальной диагностики.",
        descriptionEn: "The patient experiences constant, gradually increasing abdominal pain that intensifies upon rebound tenderness, indicating possible peritoneal irritation (Blumberg sign), requiring thorough clinical examination and differential diagnosis.",
      },
      {
        nameRu: "Тошнота и рвота",
        nameEn: "Nausea and vomiting",
        bodyZone: "ABDOMEN",
        severity: 5,
        color: "#F97316",
        descriptionRu: "Пациент сообщает о 1-2 эпизодах рвоты, сопровождающихся снижением аппетита, общей слабостью и возможной лихорадкой, что может указывать на гастроинтестинальную инфекцию или другие расстройства пищеварения, что требует тщательного клинического обследования и дифференциальной диагностики.",
        descriptionEn: "The patient reports 1-2 episodes of vomiting accompanied by loss of appetite, general weakness, and possible fever, which may indicate a gastrointestinal infection or other digestive disorders.",
      },
      {
        nameRu: "Повышенная температура",
        nameEn: "Fever",
        bodyZone: "FULL_BODY",
        severity: 6,
        color: "#F97316",
        descriptionRu: "Температура тела колеблется в пределах 37.5-39°C, сопровождается выраженной слабостью, учащённым пульсом и возможной лихорадкой, что может свидетельствовать о наличии инфекции или воспалительного процесса в организме.",
        descriptionEn: "Body temperature ranges from 37.5-39°C, accompanied by significant weakness, a rapid pulse, and possible fever, which may indicate the presence of an infection or inflammatory process in the body.",
      },
      {
        nameRu: "Напряжение мышц живота",
        nameEn: "Abdominal muscle tension",
        bodyZone: "ABDOMEN",
        severity: 7,
        color: "#EF4444",
        descriptionRu: "Отмечается напряжение мышц в правой части живота, болезненность при пальпации и возможное увеличение живота, что может указывать на наличие воспалительного процесса или раздражения органов брюшной полости.",
        descriptionEn: "Muscle tension is noted on the right side of the abdomen, with tenderness on palpation and possible abdominal distension, which may indicate an inflammatory process or irritation of abdominal organs.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Острый аппендицит",
      nameEn: "Acute Appendicitis",
      descriptionRu: "Воспаление червеобразного отростка, проявляющееся характерными симптомами, такими как боль в правом нижнем квадранте, требует срочного хирургического вмешательства для предотвращения осложнений, таких как перфорация или абсцесс.",
      descriptionEn: "Inflammation of the appendix, presenting with characteristic symptoms such as pain in the right lower quadrant, requires urgent surgical intervention to prevent complications like perforation or abscess formation.",
      treatmentsRu: ["Аппендэктомия", "Антибиотикотерапия", "Внутривенная инфузия"],
      treatmentsEn: ["Appendectomy", "Antibiotic therapy", "IV fluids"],
    },
    wrongDiagnoses: [
      {
        nameRu: "Гастроэнтерит",
        nameEn: "Gastroenteritis",
        descriptionRu: "Воспаление желудка и кишечника, проявляющееся болями в животе, диареей и возможной лихорадкой, обычно самокупирующееся, но может требовать симптоматического лечения для облегчения состояния пациента, что требует тщательного клинического обследования и дифференциальной диагностики.",
        descriptionEn: "Inflammation of the stomach and intestines, presenting with abdominal pain, diarrhea, and possible fever, is usually self-limiting but may require symptomatic treatment to alleviate the patient's condition.",
      },
      {
        nameRu: "Почечная колика",
        nameEn: "Renal Colic",
        descriptionRu: "Острая боль в пояснице, иррадиирующая в пах, вызванная камнем в мочеточнике, может сопровождаться тошнотой, рвотой и гематемезом, что требует немедленной медицинской оценки, что требует тщательного клинического обследования и дифференциальной диагностики.",
        descriptionEn: "Sharp flank pain radiating to the groin, caused by a ureteral stone, may be accompanied by nausea, vomiting, and hematuria, necessitating immediate medical evaluation, requiring thorough clinical examination and differential diagnosis.",
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
        descriptionRu: "Пациент испытывает постоянную боль, усиливающуюся при вдохе во время пальпации в правом верхнем квадранте живота, что указывает на возможное воспаление желчного пузыря (симптом Мёрфи), что требует тщательного клинического обследования и дифференциальной диагностики.",
        descriptionEn: "The patient experiences constant pain that worsens on inspiration during palpation in the right upper quadrant of the abdomen, indicating possible inflammation of the gallbladder (Murphy sign).",
      },
      {
        nameRu: "Тошнота и рвота желчью",
        nameEn: "Nausea and bilious vomiting",
        bodyZone: "ABDOMEN",
        severity: 5,
        color: "#F97316",
        descriptionRu: "Пациент жалуется на горечь во рту и вздутие живота, что может свидетельствовать о нарушениях в работе печени или желчного пузыря, а также о возможной гастроэзофагеальной рефлюксной болезни.",
        descriptionEn: "The patient reports a bitter taste in the mouth and abdominal bloating, which may indicate liver or gallbladder dysfunction, as well as potential gastroesophageal reflux disease.",
      },
      {
        nameRu: "Повышенная температура с ознобом",
        nameEn: "Fever with chills",
        bodyZone: "FULL_BODY",
        severity: 6,
        color: "#F97316",
        descriptionRu: "Температура тела пациента достигает 38°C и выше, сопровождается ознобом и выраженной слабостью, что может указывать на инфекционный процесс или воспаление в организме, требующее дальнейшего обследования.",
        descriptionEn: "The patient's body temperature reaches 38°C and above, accompanied by chills and significant weakness, which may indicate an infectious process or inflammation within the body, requiring further evaluation.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Острый холецистит",
      nameEn: "Acute Cholecystitis",
      descriptionRu: "Воспаление желчного пузыря, часто вызванное обструкцией камнем, может приводить к болям в правом верхнем квадранте и желтухе, что требует немедленного медицинского вмешательства и наблюдения, что требует тщательного клинического обследования и дифференциальной диагностики.",
      descriptionEn: "Inflammation of the gallbladder, often caused by stone obstruction, can lead to pain in the right upper quadrant and jaundice, necessitating immediate medical intervention and monitoring.",
      treatmentsRu: ["Холецистэктомия", "Антибиотики", "Голодная диета"],
      treatmentsEn: ["Cholecystectomy", "Antibiotics", "NPO"],
    },
    wrongDiagnoses: [
      {
        nameRu: "Язвенная болезнь",
        nameEn: "Peptic Ulcer",
        descriptionRu: "Дефект слизистой оболочки желудка или двенадцатиперстной кишки, вызывающий боль в эпигастрии, может быть связан с язвенной болезнью и требует диагностики для исключения серьезных осложнений и назначения лечения.",
        descriptionEn: "A defect in the mucosa of the stomach or duodenum causing epigastric pain may be associated with peptic ulcer disease and requires diagnosis to rule out serious complications and initiate treatment.",
      },
      {
        nameRu: "Панкреатит",
        nameEn: "Pancreatitis",
        descriptionRu: "Воспаление поджелудочной железы с опоясывающей болью может указывать на острый панкреатит, что требует немедленного обследования и лечения для предотвращения серьезных осложнений и улучшения состояния пациента.",
        descriptionEn: "Inflammation of the pancreas with girdle pain may indicate acute pancreatitis, necessitating immediate evaluation and treatment to prevent serious complications and improve the patient's condition.",
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
        descriptionRu: "Пациент испытывает постоянную боль в верхней части живота, которая иррадиирует в спину, усиливаясь при глубоком вдохе и движении, что может указывать на возможные проблемы с поджелудочной железой или желчным пузырем.",
        descriptionEn: "The patient experiences constant pain in the upper abdomen, radiating to the back, intensifying with deep breaths and movement, which may indicate potential issues with the pancreas or gallbladder.",
      },
      {
        nameRu: "Многократная рвота",
        nameEn: "Repeated vomiting",
        bodyZone: "ABDOMEN",
        severity: 7,
        color: "#EF4444",
        descriptionRu: "Пациент жалуется на рвоту без облегчения, сопровождающуюся значительным вздутием живота и ощущением тяжести, что может свидетельствовать о кишечной непроходимости, гастритах или других серьезных заболеваниях, что требует тщательного клинического обследования и дифференциальной диагностики.",
        descriptionEn: "The patient reports vomiting without relief, accompanied by significant abdominal bloating and a feeling of heaviness, which may indicate intestinal obstruction, gastritis, or other serious conditions.",
      },
      {
        nameRu: "Тахикардия и слабость",
        nameEn: "Tachycardia and weakness",
        bodyZone: "FULL_BODY",
        severity: 7,
        color: "#F97316",
        descriptionRu: "У пациента отмечается учащённый пульс, возможно, в сочетании с падением артериального давления, что может указывать на шок, тяжелую инфекцию или сердечно-сосудистые проблемы, требующие немедленного вмешательства.",
        descriptionEn: "The patient exhibits a rapid pulse, possibly accompanied by a drop in blood pressure, which may indicate shock, severe infection, or cardiovascular issues requiring immediate intervention.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Острый панкреатит",
      nameEn: "Acute Pancreatitis",
      descriptionRu: "Воспаление поджелудочной железы сопровождается активацией ферментов внутри органа, что может привести к некрозу тканей, системным осложнениям, таким как шок, инфекция или диабет, и требует тщательного наблюдения.",
      descriptionEn: "Inflammation of the pancreas is accompanied by enzyme activation within the organ, potentially leading to tissue necrosis and systemic complications such as shock, infection, or diabetes, requiring careful monitoring.",
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
        descriptionRu: "Воспаление желчного пузыря проявляется болью в правом подреберье, которая может иррадиировать в правое плечо, сопровождаясь тошнотой, лихорадкой и возможным желтухой, что указывает на возможный холецистит.",
        descriptionEn: "Gallbladder inflammation presents with pain in the right hypochondrium, which may radiate to the right shoulder, accompanied by nausea, fever, and possible jaundice, indicating possible cholecystitis.",
      },
      {
        nameRu: "Перфорация язвы",
        nameEn: "Perforated Ulcer",
        descriptionRu: "Прорыв стенки желудка вызывает кинжальную боль, которая может сопровождаться перитонеальными симптомами, такими как напряжение мышц живота и резкая болезненность при пальпации, что требует экстренной хирургической помощи.",
        descriptionEn: "Stomach wall rupture causes stabbing pain, which may be accompanied by peritoneal symptoms such as abdominal muscle rigidity and sharp tenderness on palpation, necessitating urgent surgical intervention.",
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
        descriptionRu: "Пациент испытывает внезапную, очень сильную боль в животе, сопровождающуюся напряжением мышц передней брюшной стенки, что приводит к доскообразному животу, указывающему на возможное острое хирургическое состояние.",
        descriptionEn: "The patient experiences sudden, very severe abdominal pain, accompanied by rigidity of the anterior abdominal wall, resulting in a board-like abdomen, indicative of a potential acute surgical condition.",
      },
      {
        nameRu: "Холодный пот и слабость",
        nameEn: "Cold sweat and weakness",
        bodyZone: "FULL_BODY",
        severity: 8,
        color: "#EF4444",
        descriptionRu: "Наблюдается резкое падение артериального давления, сопровождающееся признаками интоксикации, такими как спутанность сознания, тахикардия, потливость и одышка, что может указывать на шок или тяжелую инфекцию, что требует тщательного клинического обследования и дифференциальной диагностики.",
        descriptionEn: "There is a marked drop in blood pressure, accompanied by signs of intoxication, such as altered mental status, tachycardia, diaphoresis, and shortness of breath, which may indicate shock or a severe infection.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Перфорация язвы желудка",
      nameEn: "Perforated Gastric Ulcer",
      descriptionRu: "Прорыв стенки желудка или двенадцатиперстной кишки приводит к выходу содержимого в брюшную полость, что вызывает острое воспаление перитонеума и может привести к перитониту, требующему немедленного хирургического вмешательства.",
      descriptionEn: "Rupture of the stomach or duodenal wall results in leakage of contents into the abdominal cavity, causing acute peritoneal inflammation and potentially leading to peritonitis, necessitating immediate surgical intervention.",
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
        descriptionRu: "Воспаление поджелудочной железы проявляется опоясывающей болью в верхней части живота, часто иррадиирующей в спину, а также может сопровождаться тошнотой, рвотой и повышением уровня амилазы в крови.",
        descriptionEn: "Pancreatic inflammation presents with girdle pain in the upper abdomen, often radiating to the back, and may also be accompanied by nausea, vomiting, and elevated serum amylase levels.",
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
        descriptionRu: "Пациент испытывает периодически усиливающуюся боль, возникающую приступами, которая может локализоваться в животе или спине, часто сопровождаясь тошнотой и потемнением в глазах, что указывает на возможные серьезные патологии.",
        descriptionEn: "The patient experiences periodically worsening pain that occurs in attacks, potentially localized in the abdomen or back, often accompanied by nausea and dizziness, indicating possible serious underlying conditions.",
      },
      {
        nameRu: "Вздутие живота",
        nameEn: "Abdominal distension",
        bodyZone: "ABDOMEN",
        severity: 8,
        color: "#F97316",
        descriptionRu: "У пациента наблюдается увеличенный живот, при этом отсутствует стул и газообразование, что может свидетельствовать о кишечной непроходимости, сопровождающейся вздутием, дискомфортом и возможными болями в животе.",
        descriptionEn: "The patient presents with an enlarged abdomen, with no stool or gas passage, which may indicate intestinal obstruction, accompanied by bloating, discomfort, and possible abdominal pain.",
      },
      {
        nameRu: "Рвота",
        nameEn: "Vomiting",
        bodyZone: "ABDOMEN",
        severity: 6,
        color: "#F97316",
        descriptionRu: "При высокой непроходимости наблюдается ранняя рвота, которая возникает вскоре после приема пищи, в то время как при низкой непроходимости рвота появляется поздно и имеет неприятный запах, указывая на затрудненное переваривание.",
        descriptionEn: "In high obstruction, early vomiting occurs shortly after eating, while in low obstruction, vomiting appears later and has a foul smell, indicating impaired digestion and possible bacterial overgrowth.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Кишечная непроходимость",
      nameEn: "Intestinal Obstruction",
      descriptionRu: "Прекращение пассажа кишечного содержимого происходит из-за механического препятствия, например, опухоли или спаек, или нарушения моторики кишечника, что может приводить к серьезным осложнениям, таким как перфорация.",
      descriptionEn: "Cessation of intestinal content passage occurs due to mechanical obstruction, such as tumors or adhesions, or motility disorders, which can lead to serious complications like perforation.",
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
        descriptionRu: "Воспаление брюшины проявляется постоянной разлитой болью по всему животу, которая усиливается при движении или пальпации, что может указывать на наличие инфекционного процесса, перитонита или других серьезных заболеваний.",
        descriptionEn: "Peritoneal inflammation presents with constant diffuse abdominal pain that worsens with movement or palpation, potentially indicating an infectious process, peritonitis, or other serious conditions, requiring thorough clinical examination and differential diagnosis.",
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
        descriptionRu: "Пациент испытывает постоянную боль, которая распространяется по всему животу, усиливающуюся при движении, что может указывать на наличие воспалительного процесса или механической непроходимости кишечника, требующего диагностики.",
        descriptionEn: "The patient experiences constant pain that spreads throughout the abdomen, worsening with movement, which may indicate an inflammatory process or mechanical intestinal obstruction requiring further evaluation.",
      },
      {
        nameRu: "Напряжение мышц живота",
        nameEn: "Abdominal muscle rigidity",
        bodyZone: "ABDOMEN",
        severity: 8,
        color: "#EF4444",
        descriptionRu: "Живот пациента имеет доскообразную форму, что свидетельствует о наличии напряжения мышц и возможном воспалении, пациент избегает движений из-за сильной боли и дискомфорта, что требует медицинского осмотра.",
        descriptionEn: "The patient's abdomen is board-like, indicating muscle tension and possible inflammation, while the patient avoids movement due to severe pain and discomfort, necessitating a medical examination.",
      },
      {
        nameRu: "Признаки интоксикации",
        nameEn: "Signs of intoxication",
        bodyZone: "FULL_BODY",
        severity: 8,
        color: "#DC2626",
        descriptionRu: "У пациента наблюдаются высокая температура, выраженная слабость, тахикардия и резкое падение артериального давления, что может указывать на сепсис или тяжелую инфекцию, требующую немедленного лечения, что требует тщательного клинического обследования и дифференциальной диагностики.",
        descriptionEn: "The patient presents with high fever, pronounced weakness, tachycardia, and a sharp drop in blood pressure, which may indicate sepsis or a severe infection requiring immediate treatment.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Перитонит",
      nameEn: "Peritonitis",
      descriptionRu: "Воспаление брюшины является серьёзным хирургическим заболеванием, угрожающим жизни, требующим немедленной диагностики и хирургического вмешательства для предотвращения осложнений и улучшения состояния пациента, что требует тщательного клинического обследования и дифференциальной диагностики.",
      descriptionEn: "Inflammation of the peritoneum is a serious life-threatening surgical condition requiring immediate diagnosis and surgical intervention to prevent complications and improve the patient's condition, requiring thorough clinical examination and differential diagnosis.",
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
        descriptionRu: "Прекращение пассажа кишечного содержимого сопровождается схваткообразной болью, что может указывать на кишечную непроходимость или другие серьезные патологии, требующие медицинского вмешательства и наблюдения, что требует тщательного клинического обследования и дифференциальной диагностики.",
        descriptionEn: "Cessation of intestinal passage is accompanied by cramping pain, which may indicate intestinal obstruction or other serious pathologies requiring medical intervention and monitoring, requiring thorough clinical examination and differential diagnosis.",
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
        descriptionRu: "Выпуклость кожи в области живота, которая увеличивается при кашле и натуживании, может указывать на наличие грыжи или другого патологического процесса, требующего дальнейшего обследования для уточнения диагноза.",
        descriptionEn: "A skin bulge in the abdominal area that increases with coughing and straining may indicate a hernia or another pathological process requiring further evaluation to clarify the diagnosis.",
      },
      {
        nameRu: "Тянущая боль в паху",
        nameEn: "Pulling pain in groin",
        bodyZone: "PELVIS",
        severity: 4,
        color: "#F97316",
        descriptionRu: "К вечеру пациент отмечает усиление дискомфорта, сопровождающееся чувством давления в области таза при ходьбе, что может свидетельствовать о венозной недостаточности или других заболеваниях, требующих диагностики и лечения.",
        descriptionEn: "In the evening, the patient experiences increased discomfort accompanied by a pressure sensation in the pelvic area while walking, which may indicate venous insufficiency or other conditions requiring diagnosis and treatment.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Паховая грыжа",
      nameEn: "Inguinal Hernia",
      descriptionRu: "Выпячивание содержимого брюшной полости через паховый канал может быть признаком грыжи, что требует немедленного медицинского вмешательства для предотвращения осложнений, таких как ущемление или перитонит, что требует тщательного клинического обследования и дифференциальной диагностики.",
      descriptionEn: "Protrusion of abdominal contents through the inguinal canal may indicate a hernia, necessitating immediate medical intervention to prevent complications such as incarceration or peritonitis, requiring thorough clinical examination and differential diagnosis.",
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
        descriptionRu: "Осложнение грыжи проявляется острой болью в области выпячивания и невправимостью, что требует срочной хирургической оценки для предотвращения серьезных последствий, таких как некроз тканей и сепсис.",
        descriptionEn: "Hernia complication presents with acute pain at the site of protrusion and irreducibility, requiring urgent surgical evaluation to prevent serious consequences such as tissue necrosis and sepsis.",
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
        descriptionRu: "Пациент испытывает внезапную, резкую и постоянную боль в области грыжи, которая ощущается как плотное образование, не поддающееся вправлению, что может указывать на ущемление и необходимость срочного вмешательства.",
        descriptionEn: "The patient experiences sudden, sharp, constant pain in the hernia region, felt as a firm mass that cannot be reduced, indicating possible incarceration and the need for urgent surgical intervention.",
      },
      {
        nameRu: "Тошнота и рвота",
        nameEn: "Nausea and vomiting",
        bodyZone: "ABDOMEN",
        severity: 6,
        color: "#EF4444",
        descriptionRu: "Отсутствие стула и выраженное вздутие живота указывают на кишечную непроходимость, что может сопровождаться рвотой, болями и изменением перистальтики, требуя немедленного обследования и лечения для предотвращения осложнений.",
        descriptionEn: "The absence of stool and significant abdominal distension indicate intestinal obstruction, which may be accompanied by vomiting, pain, and altered peristalsis, necessitating immediate evaluation and treatment to prevent complications.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Ущемлённая грыжа",
      nameEn: "Strangulated Hernia",
      descriptionRu: "Сдавление содержимого грыжи в грыжевых воротах приводит к нарушению кровоснабжения, что может вызвать некроз тканей и требует срочной хирургической коррекции для предотвращения серьезных осложнений и улучшения состояния пациента.",
      descriptionEn: "Compression of the hernia contents at the hernia orifice leads to impaired blood supply, which may cause tissue necrosis and requires urgent surgical correction to prevent serious complications and improve patient outcomes.",
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
        descriptionRu: "Выпячивание в паху наблюдается без острой боли и признаков ущемления, что может указывать на наличие неосложненной грыжи, но требует наблюдения для предотвращения возможных осложнений в будущем.",
        descriptionEn: "The groin protrusion is noted without acute pain or signs of strangulation, suggesting the presence of an uncomplicated hernia, but requires monitoring to prevent potential complications in the future.",
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
        descriptionRu: "Наблюдаются синие сосудистые узлы, расположенные под кожей, с изменениями в виде покраснения и отека вокруг них, что может указывать на венозную недостаточность или варикозное расширение вен.",
        descriptionEn: "Visible blue vascular nodes are present beneath the skin, accompanied by redness and swelling in the surrounding area, which may indicate venous insufficiency or varicose veins.",
      },
      {
        nameRu: "Тяжесть и боль в ногах",
        nameEn: "Heaviness and pain in legs",
        bodyZone: "LEFT_LEG",
        severity: 5,
        color: "#6366F1",
        descriptionRu: "Пациент испытывает жжение и зуд в области голени, сопровождающиеся ночными судорогами и отёком, что может свидетельствовать о венозной недостаточности или других сосудистых нарушениях, таких как тромбофлебит.",
        descriptionEn: "The patient experiences burning and itching in the calf area, accompanied by night cramps and swelling, which may indicate venous insufficiency or other vascular disorders, including thrombophlebitis.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Варикозное расширение вен",
      nameEn: "Varicose Veins",
      descriptionRu: "Расширение поверхностных вен нижних конечностей наблюдается с нарушением функции клапанов, что приводит к застойным явлениям, отёкам и болям в ногах, особенно после длительного стояния или сидения, что ухудшает качество жизни.",
      descriptionEn: "Dilation of superficial leg veins is observed with valve dysfunction, leading to stasis, swelling, and leg pain, particularly after prolonged standing or sitting, which significantly impacts quality of life.",
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
        descriptionRu: "Острый тромбоз проявляется резким отёком одной ноги, сильной болью в икре и покраснением кожи, что указывает на возможное развитие тромбофлебита или венозной недостаточности, требующих немедленного лечения.",
        descriptionEn: "Acute thrombosis presents with sudden swelling of one leg, severe calf pain, and skin redness, indicating possible development of thrombophlebitis or venous insufficiency, which requires immediate medical intervention.",
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
        descriptionRu: "Увеличение объёма голени наблюдается, как правило, на одной конечности, что может указывать на венозную недостаточность или тромбофлебит, сопровождаясь покраснением и болезненностью в области. Это требует дальнейшего обследования.",
        descriptionEn: "Increased calf volume is typically observed in one limb, indicating venous insufficiency or thrombophlebitis, potentially accompanied by redness and tenderness in the affected area, warranting further evaluation.",
      },
      {
        nameRu: "Боль в икре",
        nameEn: "Calf pain",
        bodyZone: "LEFT_LEG",
        severity: 7,
        color: "#EF4444",
        descriptionRu: "Боль усиливается при ходьбе, кожа на голени красная и горячая на ощупь, что может свидетельствовать о воспалительном процессе или тромбофлебите, требующем немедленного медицинского вмешательства для предотвращения осложнений.",
        descriptionEn: "Pain worsens with walking; the skin on the calf is red and hot to touch, indicating an inflammatory process or thrombophlebitis, necessitating immediate medical intervention to prevent complications.",
      },
    ],
    correctDiagnosis: {
      nameRu: "Тромбоз глубоких вен",
      nameEn: "Deep Vein Thrombosis",
      descriptionRu: "Образование тромба в глубоких венах нижних конечностей может привести к серьезным осложнениям, таким как тромбоэмболия лёгочной артерии, что требует тщательного наблюдения и лечения для предотвращения летального исхода.",
      descriptionEn: "Blood clot formation in deep leg veins can lead to serious complications, such as pulmonary embolism, requiring careful monitoring and treatment to prevent fatal outcomes.",
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
        descriptionRu: "Хроническое расширение вен сопровождается ощущением тяжести и боли в ногах, без острого отёка, что может указывать на венозную недостаточность и требует длительного наблюдения и коррекции образа жизни.",
        descriptionEn: "Chronic vein dilation is associated with a feeling of heaviness and pain in the legs, without acute swelling, which may indicate venous insufficiency and requires long-term monitoring and lifestyle modification.",
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
