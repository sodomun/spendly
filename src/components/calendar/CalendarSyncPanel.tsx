"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  GoogleCalendarApiError,
  importExpensesFromGoogleCalendar,
} from "@/lib/google-calendar";

function currentMonthValue() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function monthRange(value: string) {
  const m = value.match(/^(\d{4})-(\d{2})$/);

  if (!m) {
    return null;
  }

  const year = Number(m[1]);
  const month = Number(m[2]);

  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
  };
}

export function CalendarSyncPanel() {
  const {
    user,
    loading,
    googleAccessToken,
    signInWithGoogle,
  } = useAuth();

  const [targetMonth, setTargetMonth] = useState(currentMonthValue);
  const [syncing, setSyncing] = useState(false);
  const [reauthenticating, setReauthenticating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(
    () => monthRange(targetMonth),
    [targetMonth]
  );

  async function reacquireToken() {
    setError(null);
    setMessage(null);
    setReauthenticating(true);

    try {
      await signInWithGoogle();

      setMessage(
        "Google Calendarへのアクセス権を取得しました。"
      );
    } catch (e) {
      console.error("Google再ログインエラー:", e);

      setError(
        e instanceof Error
          ? `Googleへの再ログインに失敗しました: ${e.message}`
          : "Googleへの再ログインに失敗しました。"
      );
    } finally {
      setReauthenticating(false);
    }
  }

  async function sync() {
    setError(null);
    setMessage(null);

    if (!user) {
      setError("Spendlyにログインしてください。");
      return;
    }

    if (!googleAccessToken) {
      setError(
        "Google Calendarへのアクセス権がありません。Googleで再ログインしてください。"
      );
      return;
    }

    if (!range) {
      setError("同期対象の月が正しくありません。");
      return;
    }

    setSyncing(true);

    try {
      const count = await importExpensesFromGoogleCalendar(
        user.uid,
        googleAccessToken,
        range.start,
        range.end
      );

      if (count > 0) {
        setMessage(`${count}件取り込みました。`);
      } else {
        setMessage(
          "対象期間に取り込める「出費」イベントはありませんでした。"
        );
      }
    } catch (e) {
      console.error("Google Calendar同期エラー:", e);

      if (e instanceof GoogleCalendarApiError) {
        setError(e.message);
      } else if (e instanceof Error) {
        setError(
          `Google Calendar同期中にエラーが発生しました: ${e.message}`
        );
      } else {
        setError(
          "Google Calendar同期中に予期しないエラーが発生しました。"
        );
      }
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return <p>ログイン状態を確認しています...</p>;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-blue-600 underline"
      >
        ログイン画面へ
      </Link>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border p-5">
        <p className="font-semibold">
          Google Calendar:{" "}
          {googleAccessToken
            ? "利用可能"
            : "再認証が必要"}
        </p>

        {!googleAccessToken && (
          <button
            type="button"
            onClick={reacquireToken}
            disabled={reauthenticating}
            className="mt-3 rounded-xl border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {reauthenticating
              ? "再ログイン中..."
              : "Googleで再ログイン"}
          </button>
        )}
      </div>

      <div className="rounded-2xl border p-5">
        <label
          htmlFor="calendar-sync-month"
          className="font-medium"
        >
          同期対象
        </label>

        <input
          id="calendar-sync-month"
          type="month"
          value={targetMonth}
          onChange={(e) =>
            setTargetMonth(e.target.value)
          }
          disabled={syncing}
          className="ml-3 rounded border px-2 py-1"
        />

        <button
          type="button"
          onClick={sync}
          disabled={
            syncing ||
            !googleAccessToken ||
            !range
          }
          className="mt-4 block rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {syncing
            ? "同期中..."
            : "Google Calendarと同期"}
        </button>
      </div>

      {message && (
        <p
          className="rounded-xl bg-green-50 p-3 text-green-700"
          aria-live="polite"
        >
          {message}
        </p>
      )}

      {error && (
        <p
          className="rounded-xl bg-red-50 p-3 text-red-600"
          aria-live="polite"
        >
          {error}
        </p>
      )}

      <div className="rounded-2xl bg-zinc-100 p-5">
        <p className="font-medium">入力例</p>

        <pre className="mt-2 whitespace-pre-wrap">
{`タイトル: 出費

昼食 850
コーヒー 180
電車 230`}
        </pre>
      </div>
    </div>
  );
}