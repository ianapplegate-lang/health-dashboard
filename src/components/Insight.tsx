export function InsightStat({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const colors: Record<typeof tone, string> = {
    default: "var(--tx)",
    good: "var(--teal)",
    warn: "var(--amb)",
    bad: "var(--red)",
  };
  return (
    <div
      style={{
        padding: "10px 12px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--b0)",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--mu)",
          fontFamily: "var(--fm)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 16, color: colors[tone], fontWeight: 500 }}>{value}</div>
      {detail ? (
        <div style={{ fontSize: 11, color: "var(--mu)", fontFamily: "var(--fm)", marginTop: 2 }}>
          {detail}
        </div>
      ) : null}
    </div>
  );
}

export function InsightCallout({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "good" | "warn" }) {
  const colors: Record<typeof tone, { bg: string; border: string; fg: string }> = {
    default: {
      bg: "rgba(74,158,255,0.07)",
      border: "rgba(74,158,255,0.3)",
      fg: "#4a9eff",
    },
    good: {
      bg: "rgba(26,171,127,0.08)",
      border: "rgba(26,171,127,0.3)",
      fg: "#1aab7f",
    },
    warn: {
      bg: "rgba(227,179,65,0.08)",
      border: "rgba(227,179,65,0.3)",
      fg: "#e3b341",
    },
  };
  const c = colors[tone];
  return (
    <div
      style={{
        fontSize: 12,
        color: "var(--tx)",
        padding: "10px 14px",
        background: c.bg,
        borderRadius: 8,
        borderLeft: `3px solid ${c.fg}`,
        marginTop: 8,
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
}

export function InsightGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 8,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}
