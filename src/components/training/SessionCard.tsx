import type { TrainingMovement } from "@/db/schema";

const LB_PER_KG = 2.2046226218487757;

function fmtMovement(m: TrainingMovement): string {
  const reps = m.repsActual ?? m.repsTarget;
  const weight = m.weightKg != null ? `${(m.weightKg * LB_PER_KG).toFixed(0)} lb` : "";
  const repsStr = reps != null ? `× ${reps} reps` : "";
  return [`${m.sets} sets`, repsStr, weight].filter(Boolean).join(" ");
}

const NUMS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"];

export function SessionCard({
  emoji,
  title,
  subtitle,
  dates,
  movements,
  note,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  dates: string[];
  movements: TrainingMovement[];
  note?: string;
}) {
  return (
    <div className="cs">
      <div className="ct">
        {emoji} {title}{" "}
        {dates.length ? (
          <span
            style={{
              fontSize: 11,
              color: "var(--mu)",
              fontFamily: "var(--fm)",
              marginLeft: 8,
            }}
          >
            {dates.join(" · ")}
          </span>
        ) : null}
      </div>
      {subtitle ? <div className="csub">{subtitle}</div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {movements.map((m, i) => (
          <div key={i} className="pc">
            <div className="pl">
              {NUMS[i] ?? `${i + 1}.`} {m.name}
            </div>
            <div className="pv">{fmtMovement(m)}</div>
            {m.notesText ? (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--mu)",
                  fontFamily: "var(--fm)",
                  marginTop: 4,
                }}
              >
                {m.notesText}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {note ? <div className="note">{note}</div> : null}
    </div>
  );
}
