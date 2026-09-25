"use client";

import { useState, type FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Stethoscope, Heart, Pill, UserRound, Activity } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { PulseChip } from "@/components/layout/PulseChip";
import { PrimaryButton } from "@/components/ui/Button";
import { Field, inputCls } from "@/components/ui/Field";

const ROLE_HINTS = [
  { icon: ShieldCheck, label: "Admin" },
  { icon: Stethoscope, label: "Doctor" },
  { icon: Heart, label: "Nurse" },
  { icon: Pill, label: "Pharmacist" },
  { icon: UserRound, label: "Patient" },
];

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push(searchParams.get("next") || "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
      )}
      <Field label="Email">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
          placeholder="you@omnicare.dev"
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
          placeholder="••••••••"
        />
      </Field>
      <PrimaryButton type="submit" className="w-full" icon={ArrowRight} loading={loading}>
        Sign in
      </PrimaryButton>
      <p className="text-center text-sm text-slate-500">
        New patient?{" "}
        <Link href="/register" className="font-semibold text-teal-600 hover:text-teal-700">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 lg:flex">
      {/* Hero */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 px-8 py-10 lg:w-1/2 lg:px-16 lg:py-16">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20">
            <Activity className="h-5 w-5 text-teal-400" />
          </div>
          <span className="font-display text-lg font-bold text-white">OMNICARE</span>
        </div>

        <div className="relative mt-16 lg:mt-0">
          <PulseChip />
          <h1 className="font-display mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl">
            Hospital operations,
            <br />
            on one clear pulse.
          </h1>
          <p className="mt-4 max-w-md text-slate-400">
            Patients, scheduling, records, billing, pharmacy, and labs — unified for every role, with ARIA watching
            for what needs attention first.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {ROLE_HINTS.map((r) => (
              <span key={r.label} className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300">
                <r.icon className="h-3.5 w-3.5 text-teal-400" />
                {r.label}
              </span>
            ))}
          </div>
        </div>

        <p className="relative hidden text-xs text-slate-600 lg:block">© 2026 OMNICARE Health Systems</p>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12 lg:py-16">
        <div className="w-full max-w-md">
          <h2 className="font-display text-2xl font-bold text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in with your OMNICARE account.</p>

          <Suspense fallback={<div className="mt-6 p-8 text-center text-sm text-slate-400">Loading sign in...</div>}>
            <LoginForm />
          </Suspense>
          <p className="mt-4 text-center text-xs text-slate-400">
            Staff accounts (doctor, nurse, pharmacist, admin) are provisioned by an administrator, not self-registered.
          </p>
        </div>
      </div>
    </div>
  );
}
