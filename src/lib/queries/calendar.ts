import { getValidAccessToken } from "@/sync/tokens";

export type CalendarEvent = {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  isAllDay: boolean;
};

const HEALTH_KEYWORDS = /sculpt|football|soccer|yoga|gym|run\b|ride|cycle|hike|workout|training|class|coach|swim|tennis|squash|climb|hot|barre|pilates/i;

export function isHealthRelevant(event: { summary: string }): boolean {
  return HEALTH_KEYWORDS.test(event.summary);
}

export async function fetchWeekCalendarEvents(
  userId: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<CalendarEvent[]> {
  let token: string;
  try {
    token = await getValidAccessToken(userId, "google-calendar");
  } catch {
    return []; // Not connected (no token row) — fall through silently.
  }

  const params = new URLSearchParams({
    timeMin: weekStart.toISOString(),
    timeMax: weekEnd.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return [];

  const json = (await res.json()) as {
    items?: Array<{
      id: string;
      summary?: string;
      location?: string;
      description?: string;
      start: { dateTime?: string; date?: string };
      end: { dateTime?: string; date?: string };
    }>;
  };

  return (json.items ?? [])
    .map((e) => ({
      id: e.id,
      summary: e.summary ?? "(no title)",
      start: new Date(e.start.dateTime ?? e.start.date ?? ""),
      end: new Date(e.end.dateTime ?? e.end.date ?? ""),
      location: e.location,
      description: e.description,
      isAllDay: !e.start.dateTime,
    }))
    .filter((e) => !isNaN(e.start.getTime()));
}

export function eventEmoji(summary: string): string {
  const s = summary.toLowerCase();
  if (/sculpt|yoga|hot|barre|pilates/.test(s)) return "🧘";
  if (/football|soccer/.test(s)) return "⚽";
  if (/run|jog/.test(s)) return "🏃";
  if (/ride|cycle|bike/.test(s)) return "🚴";
  if (/hike/.test(s)) return "🥾";
  if (/swim/.test(s)) return "🏊";
  if (/tennis|squash/.test(s)) return "🎾";
  if (/climb/.test(s)) return "🧗";
  if (/gym|workout|training|class|coach/.test(s)) return "💪";
  return "📅";
}
