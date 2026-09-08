import Link from "next/link";
import { CalendarSyncPanel } from "@/components/calendar/CalendarSyncPanel";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/">← ダッシュボードへ戻る</Link>

        <h1 className="mt-6 text-3xl font-bold">Google Calendar連携</h1>

        <p className="mt-3 text-zinc-600">
          Googleログイン時に取得した権限を使って「出費」イベントを取り込みます。
        </p>

        <div className="mt-8">
          <CalendarSyncPanel />
        </div>
      </div>
    </main>
  );
}