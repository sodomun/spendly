"use client";

import React from "react";
import { Expense } from "@/types/expense";

interface ExpenseListProps {
  expenses: Expense[];
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses }) => {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-400">
        まだ出費がありません。<br />出費を登録してみましょう。
      </div>
    );
  }

  const sorted = [...expenses].sort((a, b) => b.spentAt.getTime() - a.spentAt.getTime());

  return (
    <ul className="divide-y divide-slate-100">
      {sorted.map((item) => {
        const dateStr = `${item.spentAt.getMonth() + 1}/${item.spentAt.getDate()}`;
        return (
          <li key={item.id} className="py-3 flex justify-between items-center text-sm">
            <div className="flex items-center space-x-3">
              <span className="text-slate-400 font-medium text-xs w-10">{dateStr}</span>
              <span className="text-slate-800 font-medium">{item.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              {item.source === "google-calendar" && (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                  GCal
                </span>
              )}
              <span className="text-slate-900 font-bold">¥{item.amount.toLocaleString()}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
};