"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, loading, signOutUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">CalSpend</h1>
        <p className="text-gray-500 mb-8">{user.email}</p>
        <button
          onClick={signOutUser}
          className="bg-black text-white rounded-lg px-6 py-2 font-medium hover:bg-gray-800"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}
