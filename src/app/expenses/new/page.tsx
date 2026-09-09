"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { addExpense } from "@/lib/expenses";
import { formatDateToKey } from "@/lib/dashboard-calc";

function NewExpenseContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialDate = searchParams.get("date") ?? formatDateToKey(new Date());

  const [date, setDate] = useState<string>(initialDate);
  const [name, setName] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      setErrorMessage("未ログイン時は登録できません");
      return;
    }

    if (!name.trim()) {
      setErrorMessage("名称を入力してください");
      return;
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage("金額は0より大きい数値を入力してください");
      return;
    }

    setSubmitting(true);
    try {
      const [y, m, d] = date.split("-").map(Number);
      const spentAt = new Date(y, m - 1, d, 12, 0, 0);

      await addExpense(user.uid, {
        name: name.trim(),
        amount: numericAmount,
        spentAt,
      });

      setSubmitting(false);
      router.push("/");
    } catch (error) {
      console.error(error);
      setErrorMessage("登録に失敗しました。もう一度お試しください。");
      setSubmitting(false);
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
          <h1 className="text-xl font-extrabold text-slate-900">出費を追加</h1>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">日付</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full p-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">名称</label>
            <input
              type="text"
              placeholder="例: 昼食"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">金額 (円)</label>
            <input
              type="number"
              placeholder="例: 850"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              required
              className="w-full p-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl shadow-md shadow-blue-500/10 text-sm transition-all"
          >
            {submitting ? "登録中..." : "登録する"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function NewExpensePage() {
  return (
    <Suspense>
      <NewExpenseContent />
    </Suspense>
  );
}
