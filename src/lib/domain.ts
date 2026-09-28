// Shared domain vocabulary and helpers (kept string-based to match the SQLite schema).

export const MEMBER_ROLES = [
  { value: "self", label: "Я" },
  { value: "spouse", label: "Супруг(а)" },
  { value: "child", label: "Ребёнок" },
  { value: "member", label: "Член семьи" },
] as const;

export const SEX_OPTIONS = [
  { value: "male", label: "М" },
  { value: "female", label: "Ж" },
  { value: "other", label: "—" },
] as const;

export const MEASUREMENT_CATEGORIES = [
  { value: "hematology", label: "Гематология" },
  { value: "lipids", label: "Липиды" },
  { value: "hormones", label: "Гормоны" },
  { value: "vitamins", label: "Витамины и микроэлементы" },
  { value: "metabolic", label: "Обмен веществ" },
  { value: "inflammation", label: "Воспаление" },
  { value: "liver", label: "Печень" },
  { value: "kidney", label: "Почки" },
  { value: "vitals", label: "Витальные показатели" },
  { value: "andrology", label: "Спермограмма" },
  { value: "infection", label: "Инфекции и вирусология" },
  { value: "procedure", label: "Процедуры (ЭКО)" },
  { value: "conditions", label: "Условия исследования" },
  { value: "other", label: "Прочее" },
] as const;

export const GENETIC_CATEGORIES = [
  { value: "pharmacogenetics", label: "Фармакогенетика" },
  { value: "carrier", label: "Носительство" },
  { value: "risk", label: "Предрасположенности" },
  { value: "nutrition", label: "Питание и метаболизм" },
  { value: "trait", label: "Признаки" },
  { value: "other", label: "Прочее" },
] as const;

export const DOCUMENT_KINDS = [
  { value: "lab_panel", label: "Анализы (лаборатория)" },
  { value: "genetic", label: "Генетический тест" },
  { value: "imaging", label: "Визуализация / заключение" },
  { value: "prescription", label: "Назначение / рецепт" },
  { value: "other", label: "Прочее" },
] as const;

export type Flag = "low" | "normal" | "high" | "critical";

/** Derive a low/normal/high flag from a value against its reference range. */
export function computeFlag(
  value: number,
  refLow?: number | null,
  refHigh?: number | null
): Flag | null {
  if (refLow == null && refHigh == null) return null;
  if (refLow != null && value < refLow) {
    const span = refHigh != null ? refHigh - refLow : refLow;
    return value < refLow - span * 0.25 ? "critical" : "low";
  }
  if (refHigh != null && value > refHigh) {
    const span = refLow != null ? refHigh - refLow : refHigh;
    return value > refHigh + span * 0.25 ? "critical" : "high";
  }
  return "normal";
}

export function flagPillClass(flag?: string | null): string {
  switch (flag) {
    case "low":
    case "high":
      return "pill pill-warn";
    case "critical":
      return "pill pill-bad";
    case "normal":
      return "pill pill-ok";
    default:
      return "pill pill-muted";
  }
}

export function flagLabel(flag?: string | null): string {
  switch (flag) {
    case "low":
      return "Ниже нормы";
    case "high":
      return "Выше нормы";
    case "critical":
      return "Критично";
    case "normal":
      return "В норме";
    default:
      return "—";
  }
}

export function labelFor(
  list: readonly { value: string; label: string }[],
  value: string
): string {
  return list.find((x) => x.value === value)?.label ?? value;
}

export function roleLabel(role: string): string {
  return labelFor(MEMBER_ROLES, role);
}

export function ageFromBirth(birthDate?: Date | string | null): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

// Quick-entry vitals. bp is handled specially (two measurements from one form).
export const VITAL_PRESETS = [
  { code: "weight", label: "Вес", unit: "кг", category: "vitals" },
  { code: "bp", label: "Давление", unit: "мм рт.ст.", category: "vitals" },
  { code: "temperature", label: "Температура", unit: "°C", category: "vitals" },
  { code: "resting_hr", label: "Пульс покоя", unit: "уд/мин", category: "vitals" },
  { code: "height", label: "Рост", unit: "см", category: "vitals" },
  { code: "spo2", label: "Сатурация (SpO₂)", unit: "%", category: "vitals" },
  { code: "steps", label: "Шаги", unit: "шт", category: "vitals" },
  { code: "glucose_home", label: "Глюкоза (глюкометр)", unit: "ммоль/л", category: "metabolic" },
] as const;

export const MEMBER_COLORS = [
  "#0d9488",
  "#4f46e5",
  "#db2777",
  "#ea580c",
  "#0891b2",
  "#7c3aed",
  "#65a30d",
  "#e11d48",
];
