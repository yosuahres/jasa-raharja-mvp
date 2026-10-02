import type { Metadata } from "next";

import { SignInForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return <SignInForm />;
}
