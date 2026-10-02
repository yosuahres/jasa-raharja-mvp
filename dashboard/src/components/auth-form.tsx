"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

// The auth screens use a fixed light sheet on navy, independent of the app theme.
const inputClass =
  "h-9 w-full rounded-md border border-[#ced4da] bg-white px-3 text-sm text-[#1a1a1a] outline-none transition-shadow focus:border-[#86a8f7] focus:shadow-[0_0_0_3px_rgb(47_111_237/0.2)]";

const linkClass = "text-[#2f6fed] hover:underline";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm italic">{label}</span>
      {children}
    </label>
  );
}

function Input(props: React.ComponentProps<"input">) {
  return <input {...props} className={inputClass} />;
}

function Checkbox({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} className="size-4 shrink-0 accent-[#2f6fed]" />
      <span>{children}</span>
    </label>
  );
}

/** What a submit did: opened a session, needs the user to act first (e.g. confirm their email), or failed. */
type AuthResult = { ok: true } | { ok: false; error: string } | { ok: false; notice: string };

/** Auth form shell: validates, then signs in or up with Supabase and opens the dashboard. */
function AuthForm({
  title,
  submitLabel,
  validate,
  submit,
  links,
  children,
}: {
  title: string;
  submitLabel: string;
  validate?: (data: FormData) => string | null;
  submit: (data: FormData) => Promise<AuthResult>;
  links: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const problem = validate?.(data) ?? null;
    setError(problem);
    setNotice(null);
    if (problem) return;

    setPending(true);
    const result = await submit(data);
    setPending(false);
    if (result.ok) {
      router.replace("/");
      router.refresh();
    } else if ("notice" in result) {
      setNotice(result.notice);
    } else {
      setError(result.error);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-light tracking-tight">{title}</h1>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        {children}
        {error && (
          <p role="alert" className="rounded-md bg-[#fdecef] px-3 py-2 text-sm text-[#a3203a]">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-md bg-[#e8f0fe] px-3 py-2 text-sm text-[#1d4ed8]">
            {notice}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="h-9 w-fit rounded-md bg-[#2f6fed] px-4 text-sm text-white transition-colors hover:bg-[#2459c9] focus-visible:shadow-[0_0_0_4px_rgb(47_111_237/0.3)] focus-visible:outline-none disabled:opacity-60"
        >
          {pending ? "Please wait…" : submitLabel}
        </button>
      </form>

      <div className="mt-5 grid gap-1 text-sm">{links}</div>
    </div>
  );
}

const signIn = async (data: FormData): Promise<AuthResult> => {
  const { error } = await createClient().auth.signInWithPassword({
    email: String(data.get("email")),
    password: String(data.get("password")),
  });
  return error ? { ok: false, error: error.message } : { ok: true };
};

const signUp = async (data: FormData): Promise<AuthResult> => {
  const { data: result, error } = await createClient().auth.signUp({
    email: String(data.get("email")),
    password: String(data.get("password")),
    options: { data: { full_name: String(data.get("name")) } },
  });
  if (error) return { ok: false, error: error.message };
  // With email confirmation on (Supabase's default), there is no session until the link is clicked.
  if (!result.session) return { ok: false, notice: "Check your email and click the confirmation link, then sign in." };
  return { ok: true };
};

export function SignInForm() {
  return (
    <AuthForm
      title="Sign in"
      submitLabel="Sign in"
      submit={signIn}
      links={
        <>
          {/* TODO: point to the password reset flow once it exists. */}
          <button type="button" className={`w-fit ${linkClass}`}>
            Forgot your password?
          </button>
          <p>
            Don&apos;t have a Databiota account?{" "}
            <Link href="/sign-up" className={linkClass}>
              Sign up
            </Link>
          </p>
        </>
      }
    >
      <Field label="Email Address">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Checkbox name="remember">Keep me signed in</Checkbox>
    </AuthForm>
  );
}

const MIN_PASSWORD_LENGTH = 8;

const validateSignUp = (data: FormData) => {
  const password = String(data.get("password") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password !== data.get("confirm")) return "Passwords do not match.";
  return null;
};

export function SignUpForm() {
  return (
    <AuthForm
      title="Sign up"
      submitLabel="Sign up"
      validate={validateSignUp}
      submit={signUp}
      links={
        <p>
          Already have a Databiota account?{" "}
          <Link href="/sign-in" className={linkClass}>
            Sign in
          </Link>
        </p>
      }
    >
      <Field label="Full Name">
        <Input name="name" autoComplete="name" required />
      </Field>
      <Field label="Email Address">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
      </Field>
      <Field label="Confirm Password">
        <Input name="confirm" type="password" autoComplete="new-password" required />
      </Field>
    </AuthForm>
  );
}
