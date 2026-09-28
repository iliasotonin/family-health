import { prisma } from "./db";
import { getAnthropic, ANTHROPIC_MODEL, parseJsonFromText } from "./anthropic";
import { ageFromBirth, flagLabel } from "./domain";
import { format } from "date-fns";

/** Build a compact text digest of a member's recent health data for the model. */
async function buildDigest(memberId: string): Promise<string> {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) throw new Error("Член семьи не найден");

  const [measurements, whoop, diary, meds, variants] = await Promise.all([
    prisma.measurement.findMany({ where: { memberId }, orderBy: { measuredAt: "desc" }, take: 400 }),
    prisma.whoopDaily.findMany({ where: { memberId }, orderBy: { date: "desc" }, take: 21 }),
    prisma.diaryEntry.findMany({ where: { memberId }, orderBy: { date: "desc" }, take: 14 }),
    prisma.medication.findMany({ where: { memberId, active: true } }),
    prisma.geneticVariant.findMany({ where: { memberId } }),
  ]);

  const lines: string[] = [];
  const age = ageFromBirth(member.birthDate);
  lines.push(`ЧЕЛОВЕК: ${member.name}, пол: ${member.sex || "—"}, возраст: ${age ?? "—"}`);

  // Latest + previous per code, to show direction.
  const byCode = new Map<string, typeof measurements>();
  for (const m of measurements) {
    const arr = byCode.get(m.code) || [];
    arr.push(m);
    byCode.set(m.code, arr);
  }
  if (byCode.size) {
    lines.push("\nПОКАЗАТЕЛИ (последнее ← предыдущее):");
    for (const [, arr] of byCode) {
      const last = arr[0];
      const prev = arr[1];
      const ref =
        last.refLow != null || last.refHigh != null ? ` [норма ${last.refLow ?? "–"}–${last.refHigh ?? "–"}]` : "";
      const trend = prev ? ` ← ${prev.value}${prev.unit ? " " + prev.unit : ""} (${format(prev.measuredAt, "dd.MM.yy")})` : "";
      const flag = last.flag && last.flag !== "normal" ? ` <${flagLabel(last.flag)}>` : "";
      lines.push(
        `- ${last.label}: ${last.value}${last.unit ? " " + last.unit : ""} (${format(last.measuredAt, "dd.MM.yy")})${ref}${trend}${flag}`
      );
    }
  }

  if (whoop.length) {
    const avg = (sel: (w: (typeof whoop)[number]) => number | null) => {
      const vals = whoop.map(sel).filter((v): v is number => v != null);
      return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
    };
    lines.push(
      `\nWHOOP (среднее за ${whoop.length} дн.): recovery ${avg((w) => w.recoveryScore) ?? "—"}%, HRV ${
        avg((w) => w.hrvMs) ?? "—"
      } мс, сон ${avg((w) => w.sleepPerformance) ?? "—"}%, strain ${avg((w) => w.strain) ?? "—"}, пульс покоя ${
        avg((w) => w.restingHr) ?? "—"
      }`
    );
  }

  if (diary.length) {
    lines.push("\nДНЕВНИК (последние записи):");
    for (const d of diary.slice(0, 10)) {
      const parts = [format(d.date, "dd.MM"), d.symptoms, d.note].filter(Boolean).join(" — ");
      lines.push(`- ${parts}`);
    }
  }

  if (meds.length) {
    lines.push("\nПРИНИМАЕТ: " + meds.map((m) => `${m.name}${m.dose ? " " + m.dose : ""}`).join(", "));
  }

  const notableVariants = variants.filter((v) => v.impact === "high" || v.impact === "moderate");
  if (notableVariants.length) {
    lines.push("\nГЕНЕТИКА (значимое):");
    for (const v of notableVariants.slice(0, 20)) {
      lines.push(`- ${v.gene || v.rsid} ${v.genotype || ""}: ${v.interpretation || ""}`.trim());
    }
  }

  return lines.join("\n");
}

const SYSTEM = `Ты — внимательный ассистент по семейному здоровью. Твоя роль — помочь человеку увидеть динамику своих показателей и подготовиться к разговору с врачом.

СТРОГИЕ ПРАВИЛА:
- Ты НЕ ставишь диагнозы и НЕ назначаешь лечение. Ты помогаешь ориентироваться в данных.
- Опирайся ТОЛЬКО на предоставленные данные. Не выдумывай показателей.
- Отмечай, что выходит за норму или заметно меняется, и что стоит обсудить с врачом.
- Если данных мало — честно скажи об этом, не делай далеко идущих выводов.
- Тон спокойный, конкретный, без алармизма. Русский язык.
- Ссылайся на конкретные цифры из данных.`;

const INSTRUCTION = `Проанализируй данные ниже и верни СТРОГО валидный JSON (без markdown-обёртки):
{
  "title": "короткий заголовок сводки",
  "severity": "info | attention | urgent (urgent — только при явных критических отклонениях)",
  "summary": "2-4 абзаца обзора динамики и самочувствия (markdown допустим)",
  "flags": ["конкретные наблюдения о том, что вне нормы или заметно изменилось"],
  "recommendations": ["мягкие, неклинические шаги: образ жизни, что перепроверить, за чем следить"],
  "discussWithDoctor": ["конкретные вопросы/показатели, которые стоит обсудить с врачом"]
}
Пустые массивы допустимы. Данные:\n\n`;

interface InsightJson {
  title: string;
  severity: string;
  summary: string;
  flags: string[];
  recommendations: string[];
  discussWithDoctor: string[];
}

function composeBody(j: InsightJson): string {
  const parts: string[] = [j.summary.trim()];
  if (j.flags?.length) parts.push("\n**Вне нормы / изменения:**\n" + j.flags.map((f) => `- ${f}`).join("\n"));
  if (j.recommendations?.length)
    parts.push("\n**Рекомендации:**\n" + j.recommendations.map((r) => `- ${r}`).join("\n"));
  if (j.discussWithDoctor?.length)
    parts.push("\n**Обсудить с врачом:**\n" + j.discussWithDoctor.map((d) => `- ${d}`).join("\n"));
  return parts.join("\n");
}

export async function generateInsight(memberId: string) {
  const digest = await buildDigest(memberId);
  const client = getAnthropic();
  const msg = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 3000,
    system: SYSTEM,
    messages: [{ role: "user", content: INSTRUCTION + digest }],
  });
  const text = msg.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");
  const j = parseJsonFromText<InsightJson>(text);
  const severity = ["info", "attention", "urgent"].includes(j.severity) ? j.severity : "info";

  const insight = await prisma.insight.create({
    data: {
      memberId,
      kind: "weekly_summary",
      title: j.title || "Сводка о здоровье",
      body: composeBody(j),
      severity,
      model: ANTHROPIC_MODEL,
      dataWindowEnd: new Date(),
    },
  });
  return insight;
}
