"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Activity } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { PrimaryButton } from "@/components/ui/Button";
import { Field, inputCls } from "@/components/ui/Field";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", password: "", phone_number: "", date_of_birth: "", gender: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(form);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.fieldErrorSummary || err.message : "Couldn't create your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600/10">
            <Activity className="h-5 w-5 text-teal-600" />
          </div>
          <span className="font-display text-lg font-bold text-slate-900">OMNICARE</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="font-display text-xl font-bold text-slate-900">Create your patient account</h1>
          <p className="mt-1 text-sm text-slate-500">Book appointments, view your records, and chat with ARIA.</p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First Name">
                <input required value={form.first_name} onChange={update("first_name")} className={inputCls} />
              </Field>
              <Field label="Last Name">
                <input required value={form.last_name} onChange={update("last_name")} className={inputCls} />
              </Field>
              <Field label="Email">
                <input type="email" required value={form.email} onChange={update("email")} className={inputCls} />
              </Field>
              <Field label="Password">
                <input type="password" required minLength={8} value={form.password} onChange={update("password")} className={inputCls} />
              </Field>
              <Field label="Phone Number">
                <input value={form.phone_number} onChange={update("phone_number")} className={inputCls} placeholder="+234 803 214 9876" />
              </Field>
              <Field label="Date of Birth">
                <input type="date" value={form.date_of_birth} onChange={update("date_of_birth")} className={inputCls} />
              </Field>
              <Field label="Gender">
                <select value={form.gender} onChange={update("gender")} className={inputCls}>
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>
            <PrimaryButton type="submit" className="w-full" icon={ArrowRight} loading={loading}>
              Create Account
            </PrimaryButton>
            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-teal-600 hover:text-teal-700">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
