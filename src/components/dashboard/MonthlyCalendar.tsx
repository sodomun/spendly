"use client";

import React from "react";
import { formatDateToKey } from "@/lib/dashboard-calc";

interface MonthlyCalendarProps {
  currentDate: Date;
  dayTotals: Record<string, number>;
  topDays: string[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  currentDate,
  dayTotals,
  topDays,
  selectedDate,
  onSelectDate,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray: (number | null)[] = [
    ...Array(firstDayIndex).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const weekLabels = ["月", "火", "水", "木", "金", "土", "日"];
  const selectedKey = formatDateToKey(selectedDate);

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-100 p-4">
      <div className="grid grid-cols-7 gap-1 text-center font-medium text-xs text-slate-500 mb-2">
        {weekLabels.map((lbl) => (
          <div key={lbl} className="py-1">
            {lbl}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {daysArray.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-12 md:h-14" />;
          }

          const targetDate = new Date(year, month, day);
          const dateKey = formatDateToKey(targetDate);
          const isTop3 = topDays.includes(dateKey);
          const isSelected = selectedKey === dateKey;
          const total = dayTotals[dateKey] || 0;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(targetDate)}
              className={`h-12 md:h-14 p-1 flex flex-col justify-between items-center rounded-lg border text-left transition-all ${
                isSelected
                  ? "border-blue-600 bg-blue-50/50"
                  : "border-transparent hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center space-x-0.5">
                {isTop3 && (
                  <span className="text-[10px] leading-none" title="出費TOP3">
                    🔴
                  </span>
                )}
                <span
                  className={`text-xs font-semibold ${
                    isSelected ? "text-blue-600" : "text-slate-800"
                  }`}
                >
                  {day}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 truncate w-full text-center">
                {total > 0 ? `¥${total.toLocaleString()}` : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};