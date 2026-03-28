import { Metadata } from "next";
import Image from "next/image";

import { AdminLoginForm } from "@/components/auth/admin-login-form";
import { CanvasRevealEffect } from "@/components/ui/sign-in-flow-1";

export const metadata: Metadata = {
  title: "Admin Login"
};

export default function AdminLoginPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-black">
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-90">
          <CanvasRevealEffect
            animationSpeed={2.4}
            containerClassName="bg-black"
            colors={[
              [125, 211, 252],
              [255, 255, 255]
            ]}
            opacities={[0.12, 0.18, 0.24, 0.32, 0.42, 0.55, 0.68, 0.8, 0.92, 1]}
            dotSize={4}
            showGradient={false}
          />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(14,165,233,0.16),transparent_24%),radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_center,rgba(3,7,18,0.28)_0%,rgba(0,0,0,0.76)_62%,rgba(0,0,0,0.95)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:60px_60px] opacity-[0.08]" />
        <div className="absolute left-1/2 top-[18%] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-sky-300/12 blur-[150px]" />
        <div className="absolute bottom-[-8rem] right-[-5rem] h-[20rem] w-[20rem] rounded-full bg-white/10 blur-[120px]" />
      </div>

      <main className="relative z-10 flex min-h-dvh items-center justify-center px-6 py-10 sm:px-8">
        <div className="relative w-full max-w-md">
          <div className="absolute -inset-px rounded-[34px] bg-gradient-to-b from-white/30 via-white/10 to-transparent opacity-80 blur-sm" />
          <div className="relative rounded-[32px] border border-white/10 bg-white/[0.08] p-8 shadow-[0_35px_120px_-60px_rgba(56,189,248,0.65)] backdrop-blur-2xl sm:p-10">
            <div className="mx-auto flex w-full max-w-[18rem] flex-col items-center text-center">
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-gradient-to-br from-white/16 via-white/10 to-white/[0.03] shadow-[0_0_80px_rgba(125,211,252,0.16)]">
                <span className="relative inline-flex h-11 w-11 overflow-hidden">
                  <Image src="/SA-Logo.svg" alt="SA Panel logo" fill sizes="44px" className="object-contain" priority />
                </span>
              </div>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.32em] text-white/45">Admin</p>
                <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">Sign in</h1>
              </div>
              <div className="mt-8 w-full">
                <AdminLoginForm />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
