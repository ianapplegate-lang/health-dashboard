import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  jsonb,
  uuid,
  uniqueIndex,
  index,
  date,
} from "drizzle-orm/pg-core";

export const providerEnum = ["strava", "withings", "health-connect", "google-calendar"] as const;
export type Provider = (typeof providerEnum)[number];

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const oauthTokens = pgTable(
  "oauth_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").$type<Provider>().notNull(),
    providerUserId: text("provider_user_id"),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    scope: text("scope"),
    raw: jsonb("raw"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("oauth_user_provider_uq").on(t.userId, t.provider)],
);

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").$type<Provider>().notNull(),
    externalId: text("external_id").notNull(),
    sport: text("sport").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    durationSec: integer("duration_sec"),
    distanceM: real("distance_m"),
    elevationGainM: real("elevation_gain_m"),
    avgHr: integer("avg_hr"),
    maxHr: integer("max_hr"),
    calories: integer("calories"),
    name: text("name"),
    raw: jsonb("raw"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("workouts_provider_external_uq").on(t.provider, t.externalId),
    index("workouts_user_started_idx").on(t.userId, t.startedAt),
  ],
);

export const dailyMetrics = pgTable(
  "daily_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    steps: integer("steps"),
    activeMinutes: integer("active_minutes"),
    restingHr: integer("resting_hr"),
    caloriesOut: integer("calories_out"),
    raw: jsonb("raw"),
  },
  (t) => [uniqueIndex("daily_metrics_user_date_uq").on(t.userId, t.date)],
);

export const sleepSessions = pgTable(
  "sleep_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
    durationSec: integer("duration_sec"),
    efficiency: real("efficiency"),
    deepSec: integer("deep_sec"),
    remSec: integer("rem_sec"),
    lightSec: integer("light_sec"),
    awakeSec: integer("awake_sec"),
    score: integer("score"),
    raw: jsonb("raw"),
  },
  (t) => [uniqueIndex("sleep_user_date_uq").on(t.userId, t.date)],
);

export const weightSamples = pgTable(
  "weight_samples",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    measuredAt: timestamp("measured_at", { withTimezone: true }).notNull(),
    weightKg: real("weight_kg").notNull(),
    bodyFatPct: real("body_fat_pct"),
    muscleMassKg: real("muscle_mass_kg"),
    boneMassKg: real("bone_mass_kg"),
    waterPct: real("water_pct"),
    raw: jsonb("raw"),
  },
  (t) => [index("weight_user_measured_idx").on(t.userId, t.measuredAt)],
);

export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").$type<Provider>().notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status").notNull(),
  itemsUpserted: integer("items_upserted").default(0).notNull(),
  error: text("error"),
});

export const clinicalRecords = pgTable(
  "clinical_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    category: text("category").notNull(),
    kind: text("kind").notNull(),
    valueNumeric: real("value_numeric"),
    valueText: text("value_text"),
    unit: text("unit"),
    referenceLow: real("reference_low"),
    referenceHigh: real("reference_high"),
    abnormalFlag: text("abnormal_flag"),
    source: text("source").notNull(),
    notes: text("notes"),
    raw: jsonb("raw"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("clinical_user_recorded_kind_source_uq").on(
      t.userId, t.recordedAt, t.kind, t.source,
    ),
    index("clinical_user_kind_idx").on(t.userId, t.kind, t.recordedAt),
    index("clinical_user_category_idx").on(t.userId, t.category, t.recordedAt),
  ],
);

export type TrainingMovement = {
  name: string;
  sets: number;
  repsTarget?: number | null;
  repsActual?: number | null;
  weightKg: number | null;
  rir?: number | null;
  notesText?: string;
};

export const trainingSessions = pgTable(
  "training_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plannedFor: timestamp("planned_for", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    sessionType: text("session_type").notNull(),
    title: text("title"),
    movements: jsonb("movements").$type<TrainingMovement[]>(),
    notes: text("notes"),
    calendarEventId: text("calendar_event_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("training_user_planned_idx").on(t.userId, t.plannedFor),
    index("training_calendar_idx").on(t.calendarEventId),
  ],
);
