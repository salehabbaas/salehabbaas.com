import { Metadata } from "next";

import { AdminLoginForm } from "@/components/auth/admin-login-form";

export const metadata: Metadata = {
  title: "Admin Login"
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card/90 p-8 shadow-sm">
        <h1 className="font-serif text-3xl">Admin Login</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in with your Firebase admin account.</p>
        <div className="mt-6">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
