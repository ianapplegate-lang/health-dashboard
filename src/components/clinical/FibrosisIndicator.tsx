type FibrosisStage = 0 | 1 | 2 | 3 | 4;

const STAGES: {
  num: FibrosisStage;
  label: string;
  bg: string;
  fg: string;
  border: string;
}[] = [
  { num: 0, label: "None", bg: "rgba(26,171,127,0.4)", fg: "#1aab7f", border: "rgba(26,171,127,0.55)" },
  { num: 1, label: "Mild", bg: "rgba(26,171,127,0.15)", fg: "#1aab7f", border: "rgba(26,171,127,0.25)" },
  { num: 2, label: "Moderate", bg: "rgba(227,179,65,0.15)", fg: "#e3b341", border: "rgba(227,179,65,0.25)" },
  { num: 3, label: "Bridging", bg: "rgba(227,179,65,0.25)", fg: "#e3b341", border: "rgba(227,179,65,0.4)" },
  { num: 4, label: "Cirrhosis", bg: "rgba(244,112,103,0.2)", fg: "#f47067", border: "rgba(244,112,103,0.35)" },
];

export function FibrosisIndicator({
  range,
}: {
  range: [FibrosisStage, FibrosisStage] | null;
}) {
  return (
    <div>
      <div style={{ display: "flex", gap: 3, margin: "12px 0 5px" }}>
        {STAGES.map((s) => (
          <div
            key={s.num}
            style={{
              flex: 1,
              height: 27,
              borderRadius: 4,
              background: s.bg,
              color: s.fg,
              border: `1px solid ${s.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontFamily: "var(--fm)",
              fontWeight: 500,
            }}
          >
            {s.num}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
        {STAGES.map((s) => {
          const inRange = range && s.num >= range[0] && s.num <= range[1];
          return (
            <div
              key={s.num}
              style={{
                flex: 1,
                fontSize: 9,
                textAlign: "center",
                color: s.fg,
                fontFamily: "var(--fm)",
                lineHeight: 1.3,
                opacity: inRange ? 1 : 0.5,
              }}
            >
              {s.label}
              {inRange ? <span> ← you</span> : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
