"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";

import { auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";

export function AdminLogoutButton() {
  const adminSessionHintStorageKey = "sa-admin-session-active";
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE", credentials: "include" });
    await signOut(auth);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(adminSessionHintStorageKey);
    }
    router.replace("/admin/login");
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout}>
      Logout
    </Button>
  );
}
