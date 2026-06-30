import { getCurrentDbUser } from "@/lib/session";
import {
  fitnessOverview,
  sessionsByYear,
  monthlySessionsByType,
  topRunsByDistance,
} from "@/lib/queries/fitness";
import { SportSessionsChart } from "@/components/charts/SportSessionsChart";
import { MonthlySessionsChart } from "@/components/charts/MonthlySessionsChart";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function fmtDuration(sec: number | null) {
  if (sec == null) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h
    ? `${h}h ${m.toString().padStart(2, "0")}m`
    : `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default async function FitnessPage() {
  const user = await getCurrentDbUser();
  const [overview, sessions, monthly, topRuns] = await Promise.all([
    fitnessOverview(user.id),
    sessionsByYear(user.id),
    monthlySessionsByType(user.id, 2024),
    topRunsByDistance(user.id, 10),
  ]);

  const longest = overview.longestRun;
  const longestKm = longest?.distanceM ? longest.distanceM / 1000 : null;

  return (
    <>
      <div className="mrow">
        <div className="mc a">
          <div className="ml">Longest run</div>
          <div className="mv a">
            {longestKm != null ? `${longestKm.toFixed(1)} km` : "—"}
          </div>
          <div className="ms">{fmtDate(longest?.startedAt ?? null)}</div>
        </div>
        <div className="mc b">
          <div className="ml">Peak run year</div>
          <div className="mv b">
            {overview.peakRun.km > 0 ? `${Math.round(overview.peakRun.km)} km` : "—"}
          </div>
          <div className="ms">{overview.peakRun.year || "—"}</div>
        </div>
        <div className="mc b">
          <div className="ml">Peak ride year</div>
          <div className="mv b">
            {overview.peakRide.km > 0 ? `${Math.round(overview.peakRide.km)} km` : "—"}
          </div>
          <div className="ms">{overview.peakRide.year || "—"}</div>
        </div>
        <div className="mc p">
          <div className="ml">Peak session year</div>
          <div className="mv p">{overview.peakSessions.n || "—"}</div>
          <div className="ms">{overview.peakSessions.year || "—"}</div>
        </div>
      </div>

      <div className="cs">
        <div className="ct">
          Sessions per year by sport <span className="src-pill">Strava + Health Connect</span>
        </div>
        <div className="csub">
          Toggle types · the pivot is visible: running peaked early, cycling and home
          workouts climbed from 2024 onward
        </div>
        <SportSessionsChart data={sessions} />
      </div>

      <div className="cs">
        <div className="ct">
          Monthly sessions by type — since Jan 2024{" "}
          <span className="src-pill">Strava + Health Connect</span>
        </div>
        <div className="csub">Toggle types to isolate</div>
        <MonthlySessionsChart data={monthly} />
      </div>

      <div className="cs" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 18px 6px" }}>
          <div className="ct">
            Top 10 runs by distance <span className="src-pill">Strava</span>
          </div>
        </div>
        <div className="tscroll">
        <table style={{ width: "100%", minWidth: 420, borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--b1)" }}>
              <th
                style={{
                  textAlign: "left",
                  padding: "7px 11px",
                  fontFamily: "var(--fm)",
                  fontSize: 10,
                  color: "var(--mu)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 400,
                }}
              >
                Date
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "7px 11px",
                  fontFamily: "var(--fm)",
                  fontSize: 10,
                  color: "var(--mu)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 400,
                }}
              >
                Name
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "7px 11px",
                  fontFamily: "var(--fm)",
                  fontSize: 10,
                  color: "var(--mu)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 400,
                }}
              >
                Distance
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "7px 11px",
                  fontFamily: "var(--fm)",
                  fontSize: 10,
                  color: "var(--mu)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 400,
                }}
              >
                Time
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "7px 11px",
                  fontFamily: "var(--fm)",
                  fontSize: 10,
                  color: "var(--mu)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 400,
                }}
              >
                Avg HR
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "7px 11px",
                  fontFamily: "var(--fm)",
                  fontSize: 10,
                  color: "var(--mu)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 400,
                }}
              >
                Calories
              </th>
            </tr>
          </thead>
          <tbody>
            {topRuns.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--b0)" }}>
                <td
                  style={{
                    padding: "6px 11px",
                    fontFamily: "var(--fm)",
                    fontSize: 11,
                    color: "var(--mu)",
                  }}
                >
                  {fmtDate(r.startedAt)}
                </td>
                <td style={{ padding: "6px 11px", color: "var(--tx)" }}>
                  {r.name ?? "Run"}
                </td>
                <td
                  style={{
                    padding: "6px 11px",
                    textAlign: "right",
                    fontFamily: "var(--fm)",
                  }}
                >
                  {r.distanceM ? `${(r.distanceM / 1000).toFixed(2)} km` : "—"}
                </td>
                <td
                  style={{
                    padding: "6px 11px",
                    textAlign: "right",
                    fontFamily: "var(--fm)",
                  }}
                >
                  {fmtDuration(r.durationSec)}
                </td>
                <td
                  style={{
                    padding: "6px 11px",
                    textAlign: "right",
                    fontFamily: "var(--fm)",
                  }}
                >
                  {r.avgHr ?? "—"}
                </td>
                <td
                  style={{
                    padding: "6px 11px",
                    textAlign: "right",
                    fontFamily: "var(--fm)",
                  }}
                >
                  {r.calories ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
}
