"use client";

import { FormEvent, useState } from "react";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";

import { auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getLoginErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/unauthorized-domain":
        return "This domain is not authorized in Firebase Auth. Add your production domain in Firebase Console -> Authentication -> Settings -> Authorized domains.";
      case "auth/invalid-api-key":
        return "Invalid Firebase API key. Verify NEXT_PUBLIC_FIREBASE_API_KEY in production and redeploy.";
      case "auth/invalid-email":
        return "Invalid email format.";
      case "auth/invalid-credential":
        return "Invalid email or password.";
      case "auth/user-disabled":
        return "This account is disabled.";
      case "auth/network-request-failed":
        return "Network error while signing in. Check your connection and try again.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again later.";
      default:
        return error.message;
    }
  }

  if (error instanceof Error && /did not match the expected pattern/i.test(error.message)) {
    return "Firebase config is malformed in production. Check NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN (host only, e.g. your-project.firebaseapp.com; no https://, path like /__/auth/handler, quotes, port, or trailing slash) and redeploy.";
  }

  return error instanceof Error ? error.message : "Unable to sign in.";
}

export function AdminLoginForm() {
  const adminSessionHintStorageKey = "sa-admin-session-active";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function wait(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function warmSessionCookie() {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await fetch("/api/admin/session", {
        method: "GET",
        cache: "no-store",
        credentials: "include"
      });
      if (response.ok) return true;
      await wait(180);
    }
    return false;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();
      const sessionResponse = await fetch("/api/admin/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });

      const sessionPayload = (await sessionResponse.json().catch(() => ({}))) as {
        error?: string;
        nextPath?: string;
      };
      if (!sessionResponse.ok) {
        throw new Error(sessionPayload.error ?? "Unable to establish admin session.");
      }

      // Warm the session cookie read path to reduce first-load redirect loops.
      await warmSessionCookie();

      const nextPath =
        typeof sessionPayload.nextPath === "string" && sessionPayload.nextPath.startsWith("/admin")
          ? sessionPayload.nextPath
          : "/admin";

      if (typeof window !== "undefined") {
        window.localStorage.setItem(adminSessionHintStorageKey, "1");
        window.location.assign(nextPath);
      }
    } catch (submitError) {
      console.error("Admin login failed", submitError);
      setError(getLoginErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="sr-only">
          Email
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" aria-hidden />
          <Input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="Admin email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="h-14 rounded-full border-white/10 bg-white/[0.04] pl-11 text-white placeholder:text-white/30 focus-visible:border-white/30 focus-visible:ring-1 focus-visible:ring-white/20"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="sr-only">
          Password
        </Label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" aria-hidden />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="h-14 rounded-full border-white/10 bg-white/[0.04] pl-11 text-white placeholder:text-white/30 focus-visible:border-white/30 focus-visible:ring-1 focus-visible:ring-white/20"
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            key="login-error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <Button
        type="submit"
        className="group h-14 w-full rounded-full bg-white text-base font-medium text-black transition hover:bg-white/90"
        disabled={loading}
      >
        <span>{loading ? "Signing in..." : "Sign in"}</span>
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
      </Button>
    </form>
  );
}
