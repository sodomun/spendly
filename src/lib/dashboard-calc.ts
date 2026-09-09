import { Expense } from "@/types/expense";

export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((acc, cur) => acc + cur.amount, 0);
}

export function groupExpensesByDay(expenses: Expense[]): Record<string, number> {
  const groups: Record<string, number> = {};
  for (const exp of expenses) {
    const key = formatDateToKey(exp.spentAt);
    groups[key] = (groups[key] || 0) + exp.amount;
  }
  return groups;
}

export function getTopExpenseDays(expenses: Expense[], count: number = 3): string[] {
  const dayGroups = groupExpensesByDay(expenses);
  return Object.entries(dayGroups)
    .filter(([, sum]) => sum > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([dateKey]) => dateKey);
}

export function formatDateToKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 日・週・月の期間境界を計算する関数
export function getDateRange(mode: "day" | "week" | "month", referenceDate: Date) {
  const start = new Date(referenceDate);
  const end = new Date(referenceDate);

  if (mode === "day") {
    // 選択日だけ (00:00:00 〜 23:59:59)
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (mode === "week") {
    // 選択日を含む月曜日〜日曜日
    const day = referenceDate.getDay(); // 0(日) 〜 6(土)
    // 月曜日の差分: 日曜(0)なら-6日、それ以外は 1 - day
    const diffToMonday = day === 0 ? -6 : 1 - day;

    start.setDate(referenceDate.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);

    // end は確定した start (月曜日) の日時をベースに +6日 する
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (mode === "month") {
    // 選択月1日〜月末
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}