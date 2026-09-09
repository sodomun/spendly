import { Expense } from "@/types/expense";

/**
 * 出費の合計金額を算出する
 */
export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((acc, cur) => acc + cur.amount, 0);
}

/**
 * 出費を日付キー (YYYY-MM-DD) ごとに集計する
 */
export function groupExpensesByDay(expenses: Expense[]): Record<string, number> {
  const groups: Record<string, number> = {};
  for (const exp of expenses) {
    const key = formatDateToKey(exp.spentAt);
    groups[key] = (groups[key] || 0) + exp.amount;
  }
  return groups;
}

/**
 * 日別出費合計のTOP3（デフォルト3日分）の日付キー配列を取得する
 */
export function getTopExpenseDays(expenses: Expense[], count: number = 3): string[] {
  const dayGroups = groupExpensesByDay(expenses);
  return Object.entries(dayGroups)
    .filter(([, sum]) => sum > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([dateKey]) => dateKey);
}

/**
 * Date オブジェクトを YYYY-MM-DD 形式にフォーマット
 */
export function formatDateToKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 期間の開始・終了日時（日、週、月）を算出する
 */
export function getDateRange(mode: "day" | "week" | "month", referenceDate: Date) {
  const start = new Date(referenceDate);
  const end = new Date(referenceDate);

  if (mode === "day") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (mode === "week") {
    // 週の月曜日を取得 (日曜日=0の場合は前週扱い)
    const day = start.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    start.setDate(start.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);

    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (mode === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}