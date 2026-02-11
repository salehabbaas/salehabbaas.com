"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";

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
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const tokenResult = await credential.user.getIdTokenResult(true);
      if (tokenResult.claims.admin !== true) {
        setError("Your account is authenticated but not an admin.");
        return;
      }

      const idToken = await credential.user.getIdToken();
      const sessionResponse = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });

      if (!sessionResponse.ok) {
        const sessionPayload = await sessionResponse.json();
        throw new Error(sessionPayload.error ?? "Unable to establish admin session.");
      }

      router.replace("/admin");
    } catch (submitError) {
      console.error("Admin login failed", submitError);
      setError(getLoginErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
