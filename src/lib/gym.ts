export type TrainingSession = {
  id: string;
  date: string;
};

export type TrainingRow = {
  id: string;
  name: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  notes: string | null;
};

export type Exercise = TrainingRow & {
  session_id: string;
};

export type ExerciseTemplate = {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  notes: string;
};

export const WEIGHT_STEP = 2.5;
export const CARDIO_STEP = 5;

export const DEFAULT_TEMPLATE: ExerciseTemplate[] = [
  { name: "Cardio", sets: 0, reps: 20, weight: 0, notes: "" },
  { name: "Seated Leg Press", sets: 5, reps: 10, weight: 60, notes: "" },
  { name: "Leg Extension", sets: 5, reps: 10, weight: 45, notes: "" },
  { name: "Seated Leg Curl", sets: 5, reps: 10, weight: 30, notes: "" },
  { name: "Abdominal", sets: 5, reps: 10, weight: 45, notes: "" },
  { name: "Back Extension", sets: 5, reps: 10, weight: 65, notes: "" },
  { name: "Hip Adduction", sets: 5, reps: 10, weight: 65, notes: "" },
  { name: "Hip Abduction", sets: 5, reps: 10, weight: 80, notes: "" },
];

export const EQUIPMENT_NAMES = [
  "Laufband",
  "Crosstrainer",
  "Ergometer",
  "Rudergerät",
  "Seated Leg Press",
  "Leg Extension",
  "Seated Leg Curl",
  "Hip Adduction",
  "Hip Abduction",
  "Chest Press",
  "Butterfly",
  "Lat Pulldown",
  "Seated Row",
  "Shoulder Press",
  "Kurzhantel",
  "Langhantel",
  "SZ-Stange",
  "Kettlebell",
  "Cable Crossover",
  "Dip Station",
  "Abdominal",
  "Back Extension",
  "Rotary Torso",
  "Multi-Hip",
  "Hyperextension",
  "TRX",
  "Faszienrolle",
  "Stretching-Matte",
];

export const DEFAULT_DEVICE_NAMES = Array.from(
  new Set([...DEFAULT_TEMPLATE.map((item) => item.name), ...EQUIPMENT_NAMES]),
).sort((a, b) => a.localeCompare(b, "de"));

export const normalize = (value: string) => value.trim().toLowerCase();
export const isCardio = (name: string) => normalize(name) === "cardio";

export const toIsoDate = (date = new Date()) => {
  const tzOffsetInMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffsetInMs).toISOString().slice(0, 10);
};

export const toInt = (value: number | null | undefined) => Math.max(0, Math.floor(value ?? 0));

export const roundToWeightStep = (value: number) => {
  return Math.round(value / WEIGHT_STEP) * WEIGHT_STEP;
};

export const formatWeight = (value: number) => {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
};

export const sortRows = <T extends Pick<TrainingRow, "name">>(rows: T[]) => {
  const orderIndex = new Map(
    DEFAULT_TEMPLATE.map((item, index) => [normalize(item.name), index]),
  );

  return [...rows].sort((a, b) => {
    const aIndex = orderIndex.get(normalize(a.name));
    const bIndex = orderIndex.get(normalize(b.name));

    if (aIndex !== undefined && bIndex !== undefined) {
      return aIndex - bIndex;
    }

    if (aIndex !== undefined) {
      return -1;
    }

    if (bIndex !== undefined) {
      return 1;
    }

    return a.name.localeCompare(b.name, "de");
  });
};

export const readExercise = (row: Record<string, unknown>): Exercise => {
  const numberOrNull = (value: unknown) => {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  };

  return {
    id: String(row.id),
    session_id: String(row.session_id),
    name: String(row.name ?? ""),
    sets: numberOrNull(row.sets),
    reps: numberOrNull(row.reps),
    weight: numberOrNull(row.weight),
    notes: typeof row.notes === "string" ? row.notes : null,
  };
};

export const createRowId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const createTemplateRows = (): TrainingRow[] =>
  DEFAULT_TEMPLATE.map((item) => ({
    id: createRowId(),
    name: item.name,
    sets: item.sets,
    reps: item.reps,
    weight: item.weight,
    notes: item.notes,
  }));

export const formatTrainingExport = (date: string, rows: TrainingRow[]) => {
  const lines = [`Training ${date}`, ""];

  sortRows(rows).forEach((row) => {
    const note = row.notes?.trim();

    if (isCardio(row.name)) {
      lines.push(`- ${row.name}: ${toInt(row.reps)} Min`);
    } else {
      lines.push(
        `- ${row.name}: ${toInt(row.sets)} x ${toInt(row.reps)} x ${formatWeight(
          Math.max(0, row.weight ?? 0),
        )} kg`,
      );
    }

    if (note) {
      lines.push(`  Notiz: ${note}`);
    }
  });

  return lines.join("\n");
};
