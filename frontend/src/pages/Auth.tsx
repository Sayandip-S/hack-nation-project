import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useStore } from "../lib/store";
import Logo3D from "../components/Logo3D";
import { DEMO_LOGIN } from "../mock/auth";

type Mode = "signin" | "signup" | "forgot";

export default function Auth() {
  const { signIn, signUp, requestPasswordReset, resetPassword } = useStore();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState(DEMO_LOGIN.name);
  const [email, setEmail] = useState(DEMO_LOGIN.email);
  const [password, setPassword] = useState(DEMO_LOGIN.password);
  const [newPassword, setNewPassword] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [resetReady, setResetReady] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const goSignIn = () => {
    setMode("signin");
    setEmail(DEMO_LOGIN.email);
    setPassword(DEMO_LOGIN.password);
    setError("");
    setInfo("");
    setResetReady(false);
    setNewPassword("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    await new Promise(r => setTimeout(r, 350));

    if (mode === "forgot") {
      if (!resetReady) {
        const result = requestPasswordReset(email.trim());
        setBusy(false);
        if (!result.ok) { setError(result.error); return; }
        setInfo(result.message);
        setResetReady(true);
        return;
      }
      const result = resetPassword(email.trim(), newPassword);
      setBusy(false);
      if (!result.ok) { setError(result.error); return; }
      setInfo(result.message);
      setPassword("");
      setNewPassword("");
      setResetReady(false);
      setMode("signin");
      return;
    }

    if (mode === "signin") {
      const result = signIn(email.trim(), password, keepLoggedIn);
      setBusy(false);
      if (!result.ok) { setError(result.error); return; }
      nav(result.onboarded ? "/" : "/onboarding");
      return;
    }

    if (!name.trim()) {
      setBusy(false);
      setError("Please enter your name.");
      return;
    }
    const result = signUp(name.trim(), email.trim(), password);
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    nav("/onboarding");
  };

  const subtitle =
    mode === "forgot" ? "Reset your password"
      : mode === "signin" ? "Sign in to continue"
        : "Create your account";

  return (
    <div className="welcome-stage min-h-screen flex items-center justify-center px-6 py-12">
      <div className="welcome-glow" aria-hidden />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <Logo3D size="sm" interactive />
          <p className="text-3xl font-semibold tracking-tight text-primary mt-4">atlas.ai</p>
          <p className="text-sm text-teal-800/70 mt-1">{subtitle}</p>
        </div>

        <div className="card p-6">
          {mode !== "forgot" && (
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 mb-5">
              <button
                type="button"
                onClick={goSignIn}
                className={`rounded-lg py-2 text-sm font-medium transition-colors ${mode === "signin" ? "bg-white text-teal-950 shadow-sm" : "text-slate-500"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setEmail(""); setPassword(""); setError(""); setInfo(""); }}
                className={`rounded-lg py-2 text-sm font-medium transition-colors ${mode === "signup" ? "bg-white text-teal-950 shadow-sm" : "text-slate-500"}`}
              >
                Create account
              </button>
            </div>
          )}

          {mode === "forgot" && (
            <button
              type="button"
              onClick={goSignIn}
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-teal-900 hover:text-teal-800"
            >
              <ArrowLeft size={14} /> Back to sign in
            </button>
          )}

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <label className="block text-sm">
                <span className="text-slate-500">Name</span>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-teal-800/40"
                  placeholder="Your name"
                  autoComplete="name"
                />
              </label>
            )}

            <label className="block text-sm">
              <span className="text-slate-500">Email</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-teal-800/40"
                placeholder="you@email.com"
                autoComplete="email"
              />
            </label>

            {mode !== "forgot" && (
              <label className="block text-sm">
                <span className="text-slate-500">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-teal-800/40"
                  placeholder="••••••••"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </label>
            )}

            {mode === "forgot" && resetReady && (
              <label className="block text-sm">
                <span className="text-slate-500">New password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-teal-800/40"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </label>
            )}

            {mode === "signin" && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={keepLoggedIn}
                    onChange={e => setKeepLoggedIn(e.target.checked)}
                    className="rounded border-slate-300 text-teal-900 focus:ring-teal-800/30"
                  />
                  Keep me logged in
                </label>
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setError(""); setInfo(""); setResetReady(false); setNewPassword(""); }}
                  className="text-sm text-teal-900 hover:text-teal-800 underline underline-offset-2"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && <p className="text-sm text-rose-600">{error}</p>}
            {info && <p className="text-sm text-teal-900 bg-teal-950/5 rounded-lg px-3 py-2">{info}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full mt-2 bg-teal-950 text-sand rounded-lg py-2.5 text-sm font-medium hover:bg-teal-900 transition-colors disabled:opacity-50"
            >
              {busy ? "Please wait…"
                : mode === "forgot"
                  ? (resetReady ? "Update password" : "Send reset link")
                  : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
