"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Lightbulb, LoaderCircle, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { usePortal } from "@/components/portal-provider";
import { Alert, BrandLockup } from "@/components/ui";
import type { UserRole } from "@/lib/domain";

const demoAccess: { role: UserRole; name: string; description: string; icon: typeof Lightbulb }[] = [
  { role: "user", name: "Jamie Parker", description: "Explore as a community member", icon: Lightbulb },
  { role: "admin", name: "Morgan Ellis", description: "See the admin review desk", icon: ShieldCheck },
  { role: "super_admin", name: "Ava Patel", description: "Manage access and categories", icon: KeyRound },
];

export function AuthPage() {
  const { user, demo, backendConfigured, signIn, signUp, signInDemo } = usePortal();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user) router.replace("/");
  }, [router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
        router.replace("/");
      } else {
        if (name.trim().length < 2) throw new Error("Add your name so people know who shared the idea.");
        const signedIn = await signUp(name, email.trim(), password);
        if (signedIn) router.replace("/");
        else setMessage("Check your inbox for a confirmation link. Once your email is verified, come back here to sign in.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not complete that request.");
    } finally {
      setBusy(false);
    }
  }

  function chooseDemo(role: UserRole) {
    try {
      signInDemo(role);
      router.replace("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Demo access is not available.");
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-story" aria-label="About Talk To Us">
        <BrandLockup light />
        <div className="auth-decoration" aria-hidden="true" />
        <div className="auth-plant" aria-hidden="true">
          <span className="auth-plant-stem" />
          <span className="auth-leaf leaf-one" />
          <span className="auth-leaf leaf-two" />
          <span className="auth-leaf leaf-three" />
        </div>
        <div className="auth-story-main">
          <span className="auth-story-kicker"><Sparkles size={13} /> A better way to be heard</span>
          <h1>Good ideas deserve <em>somewhere</em> to grow.</h1>
          <p>Share a thoughtful suggestion, see what your team is thinking, and follow every idea from first spark to what happens next.</p>
        </div>
        <div className="auth-quote">
          “The best changes usually start with someone saying, what if we tried this?”
          <span>Talk To Us · Shared ideas, clearer outcomes</span>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-card">
          <BrandLockup />
          <h2>{mode === "signin" ? "Welcome back" : "Join the conversation"}</h2>
          <p className="auth-card-intro">
            {mode === "signin"
              ? "Sign in to share an idea or pick up where the conversation left off."
              : "Create an account to share ideas and see what your community is working on."}
          </p>

          {error && <Alert>{error}</Alert>}
          {message && <Alert tone="success">{message}</Alert>}

          {backendConfigured ? (
            <>
              <div className="auth-tabs" role="tablist" aria-label="Account access">
                <button className={`auth-tab${mode === "signin" ? " active" : ""}`} type="button" role="tab" aria-selected={mode === "signin"} onClick={() => { setMode("signin"); setError(""); setMessage(""); }}>Sign in</button>
                <button className={`auth-tab${mode === "signup" ? " active" : ""}`} type="button" role="tab" aria-selected={mode === "signup"} onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>Create account</button>
              </div>
              <form onSubmit={handleSubmit}>
                {mode === "signup" && (
                  <label className="field">
                    <span className="field-label">Your name</span>
                    <input className="input" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Jamie Parker" required minLength={2} maxLength={80} />
                  </label>
                )}
                <label className="field">
                  <span className="field-label">Email address</span>
                  <span className="input-icon-wrap"><Mail size={15} /><input className="input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required /></span>
                </label>
                <label className="field">
                  <span className="field-label">Password</span>
                  <span className="input-icon-wrap"><KeyRound size={15} /><input className="input" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "signin" ? "Your password" : "At least 8 characters"} required minLength={8} /></span>
                </label>
                <button className="button button-primary auth-submit" type="submit" disabled={busy}>
                  {busy ? <LoaderCircle className="spin" size={15} /> : <>{mode === "signin" ? "Sign in" : "Create account"}<ArrowRight size={15} /></>}
                </button>
              </form>
              <p className="auth-footnote">Email and password sign-in. Your name is visible beside ideas you submit.</p>
            </>
          ) : demo ? (
            <>
              <div className="auth-divider"><span>Try the demo workspace</span></div>
              <div className="demo-login-list">
                {demoAccess.map(({ role, name: demoName, description, icon: Icon }) => (
                  <button className="demo-login-button" type="button" key={role} onClick={() => chooseDemo(role)}>
                    <span className={`avatar ${role === "user" ? "avatar-blue" : role === "admin" ? "avatar-peach" : "avatar-lilac"}`}>
                      {demoName.split(" ").map((part) => part[0]).join("")}
                    </span>
                    <span className="demo-login-copy"><strong>{demoName}</strong><span>{description}</span></span>
                    <Icon size={15} />
                  </button>
                ))}
              </div>
              <p className="auth-footnote">Local demo data stays in this browser. Sign-in is not connected to a live account in demo mode.</p>
            </>
          ) : (
            <div className="setup-card">
              <strong>Connect your Supabase project to sign in.</strong><br />
              Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code>. Local demo access is available while running in development.
            </div>
          )}

          <p className="auth-footnote">By continuing, you agree to use this space thoughtfully and keep private conversations private.</p>
        </div>
      </section>
    </main>
  );
}
