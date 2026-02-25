import { Metadata } from "next";
import Image from "next/image";

import { AdminLoginForm } from "@/components/auth/admin-login-form";

export const metadata: Metadata = {
  title: "Admin Login"
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card/90 p-8 shadow-sm">
        <div className="inline-flex items-center gap-2">
          <span className="relative inline-flex h-10 w-10 overflow-hidden rounded-xl">
            <Image src="/SA-Logo.svg" alt="SA Panel logo" fill sizes="40px" className="object-contain" priority />
          </span>
          <div>
            <h1 className="font-serif text-3xl">SA Panel</h1>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Admin Login</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Sign in with your Firebase admin account.</p>
        <div className="mt-6">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
