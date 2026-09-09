"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeExpenses } from "@/lib/expenses";
import { Expense } from "@/types/expense";
import {
  sumExpenses,
  groupExpensesByDay,
  getTopExpenseDays,
  getDateRange,
} from "@/lib/dashboard-calc";
import { MonthlyCalendar } from "@/components/dashboard/MonthlyCalendar";
import { ExpenseList } from "@/components/dashboard/ExpenseList";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("month");
  const [monthlyExpenses, setMonthlyExpenses] = useState<Expense[]>([]);

  // 認証チェック：未ログインなら /login へ遷移
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // 当月の出費をリアルタイム購読
  useEffect(() => {
    if (!user) return;

    const { start, end } = getDateRange("month", currentDate);
    const unsubscribe = subscribeExpenses(user.uid, start, end, (items) => {
      setMonthlyExpenses(items);
    });

    return () => unsubscribe();
  }, [user, currentDate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        読み込み中...
      </div>
    );
  }

  // 集計値の算出
  const totalAmount = sumExpenses(monthlyExpenses);
  const dayTotals = groupExpensesByDay(monthlyExpenses);
  const topDays = getTopExpenseDays(monthlyExpenses, 3);

  // 表示モード（日 / 週 / 月）に合わせたリスト絞り込み
  const { start: filterStart, end: filterEnd } = getDateRange(viewMode, currentDate);
  const filteredExpenses = monthlyExpenses.filter((exp) => {
    const time = exp.spentAt.getTime();
    return time >= filterStart.getTime() && time <= filterEnd.getTime();
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      <main className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        {/* ヘッダー */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-blue-600">Spendly</h1>
            <p className="text-xs text-slate-500">
              {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
            </p>
          </div>
          <Link
            href="/settings"
            className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors"
            title="設定・同期"
          >
            ⚙️
          </Link>
        </header>

        {/* 月合計カード */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
          <span className="text-xs font-semibold text-slate-400">今月の出費</span>
          <div className="text-3xl font-extrabold tracking-tight">
            ¥{totalAmount.toLocaleString()}
          </div>

          {/* 日・週・月 切替タブ */}
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            {(["day", "week", "month"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  viewMode === mode
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {mode === "day" ? "日" : mode === "week" ? "週" : "月"}
              </button>
            ))}
          </div>
        </div>

        {/* 月間カレンダー */}
        <section className="space-y-2">
          <h2 className="text-xs font-bold text-slate-500 px-1">月間カレンダー</h2>
          <MonthlyCalendar
            currentDate={currentDate}
            dayTotals={dayTotals}
            topDays={topDays}
            selectedDate={currentDate}
            onSelectDate={(date) => setCurrentDate(date)}
          />
        </section>

        {/* 出費一覧 */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800">
              {viewMode === "day"
                ? "選択日の出費"
                : viewMode === "week"
                ? "今週の出費"
                : "最近の出費"}
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              計 ¥{sumExpenses(filteredExpenses).toLocaleString()}
            </span>
          </div>
          <ExpenseList expenses={filteredExpenses} />
        </section>

        {/* 画面下部アクションボタン */}
        <div className="fixed bottom-4 left-0 right-0 max-w-xl mx-auto px-4 flex gap-3">
          <Link
            href="/expenses/new"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20 text-center text-sm transition-all"
          >
            ＋ 出費を追加
          </Link>
          <Link
            href="/settings"
            className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl border border-slate-200 text-center text-sm transition-all"
          >
            Google Calendar
          </Link>
        </div>
      </main>
    </div>
  );
}