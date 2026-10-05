import type { Metadata } from "next";

import { SignUpForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Buat akun baru",
};

export default function SignUpPage() {
  return <SignUpForm />;
}
