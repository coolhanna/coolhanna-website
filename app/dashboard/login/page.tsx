"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/dashboard/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const j = await r.json();
      if (j?.ok) {
        router.replace(next);
        return;
      }
      setErr(j?.error || "로그인 실패");
    } catch (e: any) {
      setErr(e?.message || "네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm border border-rule rounded-xl bg-white p-8 shadow-sm"
    >
      <h1 className="text-2xl font-semibold mb-2 text-ink">한나 대시보드</h1>
      <p className="text-sm text-muted mb-6">비밀번호를 입력해.</p>
      <input
        type="password"
        autoFocus
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="비밀번호"
        className="w-full border border-rule rounded-lg px-3 py-2.5 mb-3 outline-none focus:border-ink"
      />
      {err && <p className="text-sm text-[#D85A30] mb-3">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full bg-ink text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {busy ? "확인 중..." : "들어가기"}
      </button>
    </form>
  );
}

export default function DashboardLogin() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-6">
      <Suspense fallback={<div className="text-sm text-muted">로딩...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
