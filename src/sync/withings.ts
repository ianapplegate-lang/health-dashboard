import { db } from "@/db/client";
import { weightSamples } from "@/db/schema";
import { getValidAccessToken } from "./tokens";

const MEASURE_TYPES = {
  WEIGHT_KG: 1,
  FAT_RATIO: 6,
  MUSCLE_MASS_KG: 76,
  BONE_MASS_KG: 88,
  WATER_PCT: 77,
} as const;

export async function syncWithings(userId: string, sinceEpoch?: number): Promise<number> {
  const token = await getValidAccessToken(userId, "withings");
  const params = new URLSearchParams({
    action: "getmeas",
    meastypes: Object.values(MEASURE_TYPES).join(","),
    category: "1",
  });
  if (sinceEpoch) params.set("startdate", String(sinceEpoch));

  const res = await fetch("https://wbsapi.withings.net/measure", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  if (!res.ok) throw new Error(`withings getmeas failed: ${res.status}`);
  const json = await res.json();
  if (json.status !== 0) throw new Error(`withings error: ${json.status}`);

  const groups = (json.body?.measuregrps ?? []) as WithingsGroup[];
  let upserts = 0;
  for (const g of groups) {
    const measuredAt = new Date(g.date * 1000);
    const vals = pickMeasures(g);
    if (vals.weightKg == null) continue;
    await db.insert(weightSamples).values({
      userId,
      measuredAt,
      weightKg: vals.weightKg,
      bodyFatPct: vals.bodyFatPct,
      muscleMassKg: vals.muscleMassKg,
      boneMassKg: vals.boneMassKg,
      waterPct: vals.waterPct,
      raw: g,
    });
    upserts++;
  }
  return upserts;
}

type WithingsGroup = {
  date: number;
  measures: { value: number; type: number; unit: number }[];
};

function pickMeasures(g: WithingsGroup) {
  const out: {
    weightKg: number | null;
    bodyFatPct: number | null;
    muscleMassKg: number | null;
    boneMassKg: number | null;
    waterPct: number | null;
  } = {
    weightKg: null,
    bodyFatPct: null,
    muscleMassKg: null,
    boneMassKg: null,
    waterPct: null,
  };
  for (const m of g.measures) {
    const v = m.value * Math.pow(10, m.unit);
    if (m.type === MEASURE_TYPES.WEIGHT_KG) out.weightKg = v;
    else if (m.type === MEASURE_TYPES.FAT_RATIO) out.bodyFatPct = v;
    else if (m.type === MEASURE_TYPES.MUSCLE_MASS_KG) out.muscleMassKg = v;
    else if (m.type === MEASURE_TYPES.BONE_MASS_KG) out.boneMassKg = v;
    else if (m.type === MEASURE_TYPES.WATER_PCT) out.waterPct = v;
  }
  return out;
}
