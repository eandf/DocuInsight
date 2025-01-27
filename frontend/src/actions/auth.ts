"use server";

import { signIn } from "@/auth";

export async function signInAction(email: string) {
  await signIn("resend", {
    email,
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
  });
}
