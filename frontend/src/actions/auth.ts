"use server";

import { signIn } from "@/auth";

export async function signInAction(
  provider: string = "docusign",
  email?: string
) {
  if (provider === "email") {
    return await signIn("resend", {
      email,
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
    });
  } else {
    return await signIn("docusign", {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
    });
  }
}
