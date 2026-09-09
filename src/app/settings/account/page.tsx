"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function AccountPage() {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();
  const router = useRouter();

  async function handleReLogin() {
    try {
      await signInWithGoogle(true);
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === "auth/popup-closed-by-user") return;
      alert("再ログインに失敗しました。もう一度お試しください。");
    }
  }

  async function handleSignOut() {
    await signOutUser();
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/">← ダッシュボードへ戻る</Link>

        <h1 className="mt-6 text-3xl font-bold">アカウント設定</h1>

        <div className="mt-6 rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">ログイン中のアカウント</p>
          <p className="mt-1 text-sm font-medium text-gray-800">
            {loading ? "読み込み中..." : (user?.email ?? "未ログイン")}
          </p>
        </div>

        <div className="mt-4 space-y-4">
          <button
            onClick={handleReLogin}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-3 bg-white hover:bg-gray-50 font-medium"
          >
            再ログイン
          </button>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-3 border border-red-300 rounded-lg px-4 py-3 bg-white hover:bg-red-50 text-red-600 font-medium"
          >
            ログアウト
          </button>
        </div>
      </div>
    </main>
  );
}
