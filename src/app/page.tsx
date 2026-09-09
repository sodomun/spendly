"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Expense } from "@/types/expense";
import { subscribeExpenses, deleteExpense } from "@/lib/expenses";
import {
  sumExpenses,
  getTopExpenseDays,
  getDateRange,
  formatDateToKey,
} from "@/lib/dashboard-calc";
import { MonthlyCalendar } from "@/components/dashboard/MonthlyCalendar";
import { ExpenseList } from "@/components/dashboard/ExpenseList";

export default function DashboardPage() {
  const { user, loading, googleAccessToken } = useAuth();
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("month");

  // 未ログイン時はログイン画面へ
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // 当月の出費データをリアルタイム購読
  useEffect(() => {
    if (!user) return;

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const unsubscribe = subscribeExpenses(user.uid, startOfMonth, endOfMonth, (data) => {
      const filtered = googleAccessToken
        ? data
        : data.filter((e) => e.source !== "google-calendar");
      setExpenses(filtered);
    });

    return () => unsubscribe();
  }, [user, currentDate, googleAccessToken]);

  // 日・週・月ごとの絞り込み
  const { filteredExpenses, periodLabel } = useMemo(() => {
    const referenceDate = viewMode === "month" ? currentDate : selectedDate;
    const { start, end } = getDateRange(viewMode, referenceDate);

    const filtered = expenses.filter((exp) => {
      const time = exp.spentAt.getTime();
      return time >= start.getTime() && time <= end.getTime();
    });

    let label = "";
    if (viewMode === "day") {
      label = `${referenceDate.getMonth() + 1}月${referenceDate.getDate()}日の出費`;
    } else if (viewMode === "week") {
      label = `${start.getMonth() + 1}/${start.getDate()} 〜 ${end.getMonth() + 1}/${end.getDate()}の出費`;
    } else {
      label = `${referenceDate.getFullYear()}年${referenceDate.getMonth() + 1}月の出費`;
    }

    return { filteredExpenses: filtered, periodLabel: label };
  }, [expenses, viewMode, currentDate, selectedDate]);

  // 出費上位3日（月間）
  const topExpenseDays = useMemo(() => {
    return getTopExpenseDays(expenses, 3);
  }, [expenses]);

  // 日別合計
  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const expense of expenses) {
      const key = formatDateToKey(expense.spentAt);
      totals[key] = (totals[key] ?? 0) + expense.amount;
    }
    return totals;
  }, [expenses]);

  const totalAmount = useMemo(() => {
    return sumExpenses(filteredExpenses);
  }, [filteredExpenses]);

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (window.confirm("この出費を削除しますか？")) {
      await deleteExpense(user.uid, id);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Spendly</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/settings/calendar"
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full font-medium transition-colors"
            >
              Google Calendar
            </Link>
            <Link
              href="/settings/account"
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full font-medium transition-colors"
            >
              アカウント設定
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* 日・週・月 切替タブ */}
        <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-semibold">
          {(["day", "week", "month"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                viewMode === mode
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {mode === "day" ? "日" : mode === "week" ? "週" : "月"}
            </button>
          ))}
        </div>

        {/* 合計金額カード */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <span className="text-xs font-medium text-slate-500">{periodLabel}</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-slate-900">
              ¥{totalAmount.toLocaleString()}
            </span>
          </div>
        </section>

        {/* カレンダー */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <MonthlyCalendar
            currentDate={currentDate}
            selectedDate={selectedDate}
            topExpenseDays={topExpenseDays}
            dailyTotals={dailyTotals}
            onSelectDate={(date) => {
              setSelectedDate(date);
            }}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />
        </section>

        {/* 出費一覧 */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-800">出費一覧</h2>
            <span className="text-xs text-slate-400">{filteredExpenses.length} 件</span>
          </div>
          <ExpenseList expenses={filteredExpenses} onDelete={handleDelete} />
        </section>
      </main>

      {/* フローティングボタン */}
      <div className="fixed bottom-6 right-6 flex items-center gap-3">
        <Link
          href={`/expenses/delete?date=${formatDateToKey(selectedDate)}`}
          className="flex items-center justify-center w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-transform active:scale-95 text-xl"
        >
          －
        </Link>
        <Link
          href={`/expenses/new?date=${formatDateToKey(selectedDate)}`}
          className="flex items-center justify-center w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-transform active:scale-95 text-2xl font-light"
        >
          ＋
        </Link>
      </div>
    </div>
  );
}