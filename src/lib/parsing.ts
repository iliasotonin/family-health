import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, ANTHROPIC_MODEL, parseJsonFromText } from "./anthropic";

type ContentBlock = Anthropic.Messages.ContentBlockParam;

const IMAGE_TYPES: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/gif": "image/gif",
  "image/webp": "image/webp",
};

/** Turn an uploaded file into an Anthropic content block Claude can read. */
function fileBlock(buf: Buffer, mimeType: string, fileName: string): ContentBlock {
  const b64 = buf.toString("base64");
  if (mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: b64 },
    };
  }
  const img = IMAGE_TYPES[mimeType];
  if (img) {
    return { type: "image", source: { type: "base64", media_type: img, data: b64 } };
  }
  // Fallback: treat as text (CSV/TXT genotype dumps, plain reports).
  const text = buf.toString("utf-8").slice(0, 200_000);
  return { type: "text", text: "Содержимое файла:\n\n" + text };
}

export interface ParsedMeasurement {
  code: string;
  label: string;
  category: string;
  value: number;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
}

export interface ParsedLabResult {
  collectedDate: string | null;
  sourceLab: string | null;
  summary: string;
  measurements: ParsedMeasurement[];
}

const LAB_PROMPT = `Ты — ассистент, извлекающий данные из медицинских лабораторных анализов.
Проанализируй прикреплённый документ и извлеки ВСЕ числовые лабораторные показатели.

Верни СТРОГО валидный JSON (без пояснений, без markdown) вида:
{
  "collectedDate": "YYYY-MM-DD или null (дата взятия/сдачи анализа)",
  "sourceLab": "название лаборатории или null",
  "summary": "1-2 предложения на русском: что за анализ и что бросается в глаза",
  "measurements": [
    {
      "code": "каноничный английский snake_case ключ показателя (hemoglobin, ldl, tsh, vitamin_d, glucose, alt, creatinine, ferritin, ...)",
      "label": "название показателя как в документе (на языке документа)",
      "category": "одно из: hematology, lipids, hormones, vitamins, metabolic, inflammation, liver, kidney, other",
      "value": число,
      "unit": "единица измерения или null",
      "refLow": число или null (нижняя граница нормы),
      "refHigh": число или null (верхняя граница нормы)
    }
  ]
}

Правила:
- Только числовые показатели. Качественные результаты ("отрицательно", "не обнаружено") пропускай.
- value — только число (без единиц, без символов < >). Если "менее 0.1" — используй 0.1.
- Десятичный разделитель — точка.
- code одинаковый для одного и того же показателя между разными анализами (используй общепринятые английские названия).
- Если показателей нет — верни пустой массив measurements.`;

export async function extractLabMeasurements(
  buf: Buffer,
  mimeType: string,
  fileName: string
): Promise<ParsedLabResult> {
  const client = getAnthropic();
  const msg = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: [fileBlock(buf, mimeType, fileName), { type: "text", text: LAB_PROMPT }],
      },
    ],
  });
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const parsed = parseJsonFromText<ParsedLabResult>(text);
  parsed.measurements = (parsed.measurements || []).filter(
    (m) => typeof m.value === "number" && !isNaN(m.value) && m.code
  );
  return parsed;
}

export interface ParsedVariant {
  gene: string | null;
  rsid: string | null;
  genotype: string | null;
  category: string;
  interpretation: string | null;
  impact: string | null;
}

export interface ParsedGeneticResult {
  sourceLab: string | null;
  summary: string;
  variants: ParsedVariant[];
}

const GENETIC_PROMPT = `Ты — ассистент, извлекающий данные из генетического теста (например Genotek, 23andMe).
Проанализируй прикреплённый файл (это может быть отчёт PDF или сырые данные генотипирования).

Верни СТРОГО валидный JSON (без пояснений, без markdown) вида:
{
  "sourceLab": "название сервиса (Genotek и т.п.) или null",
  "summary": "2-3 предложения на русском: ключевые находки отчёта",
  "variants": [
    {
      "gene": "ген (MTHFR, APOE, CYP2C19, ...) или null",
      "rsid": "rsID варианта (rs1801133) или null",
      "genotype": "генотип (C;T, A/A) или null",
      "category": "одно из: pharmacogenetics, carrier, risk, nutrition, trait, other",
      "interpretation": "краткая интерпретация на русском (что означает этот вариант)",
      "impact": "одно из: low, moderate, high, protective, info"
    }
  ]
}

Правила:
- Если это отчёт с интерпретациями — извлекай значимые находки с их трактовкой.
- Если это сырые данные генотипирования (тысячи строк rsid) — НЕ перечисляй всё подряд. Извлеки только клинически значимые, широко известные варианты (MTHFR, APOE, CYP2C19, CYP2D6, VKORC1, HFE, LCT, BRCA, факторы свёртывания V/II, ACTN3 и подобные), с генотипом и краткой трактовкой.
- interpretation — нейтральная, информативная, без диагнозов и назначений.
- Если ничего значимого нет — верни пустой массив variants.`;

export async function extractGeneticVariants(
  buf: Buffer,
  mimeType: string,
  fileName: string
): Promise<ParsedGeneticResult> {
  const client = getAnthropic();
  const msg = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: [fileBlock(buf, mimeType, fileName), { type: "text", text: GENETIC_PROMPT }],
      },
    ],
  });
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const parsed = parseJsonFromText<ParsedGeneticResult>(text);
  parsed.variants = (parsed.variants || []).filter((v) => v.gene || v.rsid);
  return parsed;
}
