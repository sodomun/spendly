"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeExpenses, deleteExpense } from "@/lib/expenses";
import { deleteOrUpdateCalendarExpense, GoogleCalendarApiError } from "@/lib/google-calendar";
import { Expense } from "@/types/expense";
import { formatDateToKey } from "@/lib/dashboard-calc";

function DeleteExpenseContent() {
  const { user, loading, googleAccessToken, clearCalendarToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialDate = searchParams.get("date") ?? formatDateToKey(new Date());

  const [date, setDate] = useState<string>(initialDate);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const [y, m, d] = date.split("-").map(Number);
    const start = new Date(y, m - 1, d, 0, 0, 0);
    const end = new Date(y, m - 1, d, 23, 59, 59, 999);

    const unsubscribe = subscribeExpenses(user.uid, start, end, (data) => {
      const filtered = googleAccessToken
        ? data
        : data.filter((e) => e.source !== "google-calendar");
      setExpenses(filtered);
      setSelected((prev) => {
        const ids = new Set(data.map((e) => e.id));
        return new Set([...prev].filter((id) => ids.has(id)));
      });
    });

    return () => unsubscribe();
  }, [user, date, googleAccessToken]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!user || selected.size === 0) return;
    setErrorMessage(null);
    setDeleting(true);

    try {
      const toDelete = expenses.filter((e) => selected.has(e.id));

      for (const expense of toDelete) {
        if (
          expense.source === "google-calendar" &&
          expense.googleEventId !== undefined &&
          expense.itemIndex !== undefined
        ) {
          if (!googleAccessToken) {
            setErrorMessage("Google Calendarの削除にはGoogleの再ログインが必要です。");
            setDeleting(false);
            return;
          }
          try {
            await deleteOrUpdateCalendarExpense(
              googleAccessToken,
              expense.googleEventId,
              expense.itemIndex
            );
          } catch (e) {
            if (e instanceof GoogleCalendarApiError && e.status === 401) {
              clearCalendarToken();
              setErrorMessage("Google Calendarの認証期限が切れています。再ログインしてください。");
              setDeleting(false);
              return;
            }
            throw e;
          }
        }
        await deleteExpense(user.uid, expense.id);
      }

      setSelected(new Set());
    } catch (e) {
      console.error(e);
      setErrorMessage("削除に失敗しました。もう一度お試しください。");
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-md mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center space-x-3">
          <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-slate-800">
            ← 戻る
          </Link>
          <h1 className="text-xl font-extrabold text-slate-900">出費を削除</h1>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs">
            {errorMessage}
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">日付</label>
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setSelected(new Set()); }}
              className="w-full p-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {expenses.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">この日の出費はありません</p>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => (
                <label
                  key={expense.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(expense.id)}
                    onChange={() => toggleSelect(expense.id)}
                    className="w-4 h-4 accent-red-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800 truncate">{expense.name}</span>
                      {expense.source === "google-calendar" && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full shrink-0">GCal</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">¥{expense.amount.toLocaleString()}</span>
                  </div>
                </label>
              ))}
            </div>
          )}

          <button
            onClick={handleDelete}
            disabled={selected.size === 0 || deleting}
            className="w-full mt-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl text-sm transition-all"
          >
            {deleting ? "削除中..." : `削除する（${selected.size}件）`}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function DeleteExpensePage() {
  return (
    <Suspense>
      <DeleteExpenseContent />
    </Suspense>
  );
}
