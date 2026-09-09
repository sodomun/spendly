import { upsertCalendarExpense } from "@/lib/expenses";

const ENDPOINT = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export interface ParsedExpense {
  name: string;
  amount: number;
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string };
}

interface GoogleCalendarListResponse {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
}

export class GoogleCalendarApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GoogleCalendarApiError";
    this.status = status;
  }
}

export function parseExpenseDescription(description: string): ParsedExpense[] {
  const result: ParsedExpense[] = [];

  for (const rawLine of description.split(/\r?\n/)) {
    const line = rawLine.trim().normalize("NFKC");
    if (!line) continue;

    const match = line.match(
      /^(.+?)(?:\s+|[:,]\s*)[¥￥]?\s*([0-9][0-9,]*)\s*円?\s*$/
    );
    if (!match) continue;

    const name = match[1].trim();
    const amount = Number(match[2].replaceAll(",", ""));
    if (!name || !Number.isSafeInteger(amount) || amount <= 0) continue;

    result.push({ name, amount });
  }

  return result;
}

function parseEventStart(event: GoogleCalendarEvent): Date | null {
  if (event.start?.dateTime) {
    const d = new Date(event.start.dateTime);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (event.start?.date) {
    const m = event.start.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

export async function listGoogleCalendarEvents(
  accessToken: string,
  start: Date,
  end: Date
): Promise<GoogleCalendarEvent[]> {
  if (!accessToken.trim()) {
    throw new GoogleCalendarApiError(
      "Google CalendarのAccess Tokenがありません。Googleで再ログインしてください。"
    );
  }

  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "2500",
    });
    if (pageToken) params.set("pageToken", pageToken);

    let response: Response;
    try {
      response = await fetch(`${ENDPOINT}?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });
    } catch {
      throw new GoogleCalendarApiError(
        "Google Calendar APIへの接続に失敗しました。"
      );
    }

    if (response.status === 401) {
      throw new GoogleCalendarApiError(
        "Google Calendarの認証期限が切れています。Googleで再ログインしてください。",
        401
      );
    }
    if (response.status === 403) {
      throw new GoogleCalendarApiError(
        "Google Calendarへのアクセス権がありません。",
        403
      );
    }
    if (!response.ok) {
      throw new GoogleCalendarApiError(
        `Google Calendar APIでエラーが発生しました。(HTTP ${response.status})`,
        response.status
      );
    }

    const payload = (await response.json()) as GoogleCalendarListResponse;
    events.push(...(payload.items ?? []));
    pageToken = payload.nextPageToken;
  } while (pageToken);

  return events;
}

export async function importExpensesFromGoogleCalendar(
  uid: string,
  accessToken: string,
  start: Date,
  end: Date
): Promise<number> {
  if (!uid.trim()) {
    throw new GoogleCalendarApiError("Spendlyにログインしていません。");
  }

  const events = await listGoogleCalendarEvents(accessToken, start, end);
  let count = 0;

  for (const event of events) {
    if (event.summary !== "出費" || !event.id || !event.description) continue;

    const spentAt = parseEventStart(event);
    if (!spentAt) continue;

    const expenses = parseExpenseDescription(event.description);

    for (let itemIndex = 0; itemIndex < expenses.length; itemIndex += 1) {
      const expense = expenses[itemIndex];

      await upsertCalendarExpense(uid, {
        name: expense.name,
        amount: expense.amount,
        spentAt,
        googleEventId: event.id,
        itemIndex,
      });

      count += 1;
    }
  }

  return count;
}
