"use client";

import React from "react";
import { formatDateToKey } from "@/lib/dashboard-calc";

interface MonthlyCalendarProps {
  currentDate: Date;
  selectedDate: Date;
  topExpenseDays?: string[];
  topDays?: string[];
  onSelectDate: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  currentDate,
  selectedDate,
  topExpenseDays,
  topDays,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}) => {
  // topExpenseDays または topDays のどちらが渡されても安全に配列として扱う
  const safeTopDays = topExpenseDays ?? topDays ?? [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 月初日の曜日（0: 日曜日 〜 6: 土曜日）
  const firstDayIndex = new Date(year, month, 1).getDay();
  // 月の最終日
  const lastDate = new Date(year, month + 1, 0).getDate();

  const selectedKey = formatDateToKey(selectedDate);
  const todayKey = formatDateToKey(new Date());

  const daysOfWeek = ["日", "月", "火", "水", "木", "金", "土"];

  // カレンダーのマス目生成
  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= lastDate; d++) {
    daysArray.push(d);
  }

  return (
    <div className="w-full">
      {/* カレンダー上部ヘッダー（年月切り替え） */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-base font-bold text-slate-800">
          {year}年 {month + 1}月
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            aria-label="前月"
          >
            ←
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            aria-label="次月"
          >
            →
          </button>
        </div>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 text-center mb-1 text-xs font-semibold text-slate-400">
        {daysOfWeek.map((w, idx) => (
          <div
            key={w}
            className={idx === 0 ? "text-rose-500" : idx === 6 ? "text-blue-500" : ""}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-1">
        {daysArray.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-10" />;
          }

          const targetDate = new Date(year, month, day);
          const dateKey = formatDateToKey(targetDate);
          const isTop3 = safeTopDays.includes(dateKey);
          const isSelected = selectedKey === dateKey;
          const isToday = todayKey === dateKey;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(targetDate)}
              className={`h-10 rounded-xl flex flex-col items-center justify-center relative transition-all text-xs ${
                isSelected
                  ? "bg-indigo-600 text-white font-bold shadow-sm"
                  : isToday
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span>{day}</span>

              {/* 出費上位3日の赤丸マーク */}
              {isTop3 && (
                <span
                  className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                    isSelected ? "bg-white" : "bg-rose-500"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};